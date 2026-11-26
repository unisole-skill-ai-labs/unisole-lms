import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  ADMIN_USER,
  ENGINE_URL,
  ENROLLED_STUDENT,
  LMS_URL,
  NON_ENROLLED_STUDENT,
  apiRequest,
  loginAs,
  signJwt,
} from "./helpers";

const SCREENSHOT_DIR = "c:/code/unisole/e2e-screenshots";
const TEST_MP4_PATH = path.join(SCREENSHOT_DIR, "test-10s.mp4");
const TEST_HLS_DIR = path.join(SCREENSHOT_DIR, "test-10s-hls");

function collectHlsInputFiles(dir: string) {
  const out: Array<{ name: string; mimeType: string; buffer: Buffer }> = [];
  function walk(curr: string) {
    for (const entry of fs.readdirSync(curr, { withFileTypes: true })) {
      const full = path.join(curr, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const rel = path.relative(dir, full).replace(/\\/g, "/");
        out.push({
          name: `test-10s-hls/${rel}`,
          mimeType: rel.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t",
          buffer: fs.readFileSync(full),
        });
      }
    }
  }
  walk(dir);
  return out;
}

test.describe("Step 4: Full Azurite E2E (HLS folder + MP4 + playback + security + cleanup)", () => {
  const adminToken = signJwt(ADMIN_USER);
  const studentToken = signJwt(ENROLLED_STUDENT);
  const nonEnrolledToken = signJwt(NON_ENROLLED_STUDENT);

  test("End-to-end HLS folder & MP4 upload, playback, negative cases, security, and cleanup", async ({
    browser,
    browserName,
  }) => {
    test.setTimeout(120_000);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const suffix = `${browserName}-${Date.now()}`;
    const lessonTitle = `E2E Video Lecture ${suffix}`;

    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await loginAs(adminPage, ADMIN_USER);
    await adminPage.goto(`${LMS_URL}/admin/courses/cs-agentic`, {
      waitUntil: "networkidle",
    });

    // 1. Add a new Video Lecture activity (unsaved first)
    await adminPage.getByRole("button", { name: "Activity" }).first().click();
    await adminPage.getByRole("button", { name: /Video Lecture/i }).first().click();
    await adminPage.getByPlaceholder("Lesson Title...").fill(lessonTitle);

    // Before saving: switch to HLS folder upload and confirm "Save the lesson first, then upload"
    await adminPage.getByRole("button", { name: "Upload encoded HLS folder" }).click();
    await expect(adminPage.getByText("Save the lesson first, then upload")).toBeVisible();

    // Click Save if enabled and wait for Saved badge
    const saveBtn = adminPage.getByRole("button", { name: /^Save$/i }).first();
    if (await saveBtn.isEnabled()) {
      await saveBtn.click();
    }
    await expect(adminPage.getByText("Saved", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByText("Save the lesson first, then upload")).toHaveCount(0);

    // Locate the created lessonId via API
    const lessonsRes = await apiRequest(adminToken, "GET", "/api/admin/lessons");
    const lessonsList = Array.isArray(lessonsRes.data) ? lessonsRes.data : lessonsRes.data?.data || [];
    const created = lessonsList.find((l: any) => l.title === lessonTitle);
    const lessonId = created?.id as string;
    const modId = "mod_agent_w1";
    if (!lessonId) {
      throw new Error(`Lesson not found in /api/admin/lessons for title ${lessonTitle}`);
    }

    try {
      // 2. Negative cases on HLS folder validation (using real temp directories for webkitdirectory)
      await adminPage.getByRole("button", { name: "Upload encoded HLS folder" }).click();
      const folderInput = adminPage.locator('input[type="file"][webkitdirectory]');

      const badNoMasterDir = path.join(SCREENSHOT_DIR, "bad-no-master");
      fs.mkdirSync(path.join(badNoMasterDir, "360p"), { recursive: true });
      fs.writeFileSync(path.join(badNoMasterDir, "360p", "index.m3u8"), "#EXTM3U");
      fs.writeFileSync(path.join(badNoMasterDir, "360p", "seg_000.ts"), "ts");
      await folderInput.setInputFiles(badNoMasterDir);
      await expect(adminPage.getByText("master.m3u8 not found")).toBeVisible();

      const badAviDir = path.join(SCREENSHOT_DIR, "bad-avi");
      fs.mkdirSync(badAviDir, { recursive: true });
      fs.writeFileSync(path.join(badAviDir, "master.m3u8"), "#EXTM3U");
      fs.writeFileSync(path.join(badAviDir, "clip.avi"), "avi");
      await folderInput.setInputFiles(badAviDir);
      await expect(adminPage.getByText(/Unsupported file in HLS folder/i)).toBeVisible();

      // 3. Valid encoded HLS folder upload to Azurite
      await folderInput.setInputFiles(TEST_HLS_DIR);
      await expect(adminPage.getByText(/Detected \d+ file\(s\)/i)).toBeVisible();

      await adminPage.getByRole("button", { name: "Upload folder" }).click();
      const verifyBtn = adminPage.getByRole("button", { name: "Verify and publish" });
      await expect(verifyBtn).toBeVisible({ timeout: 30_000 });
      await verifyBtn.click();
      await expect(adminPage.getByText("Ready", { exact: true })).toBeVisible({ timeout: 15_000 });

      if (browserName === "chromium") {
        await adminPage.screenshot({
          path: path.join(SCREENSHOT_DIR, "admin-hls-ready.png"),
          fullPage: false,
        });
      }

      // 4. Negative: 503 storage not configured message
      await adminPage.route("**/api/admin/lessons/*/video/simple-upload/init", (route) =>
        route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Unavailable" }) })
      );
      await adminPage.getByRole("button", { name: "Upload video (.mp4)" }).click();
      await adminPage.locator('input[type="file"][accept*="mp4"]').setInputFiles(TEST_MP4_PATH);
      await expect(
        adminPage.getByText("Video storage is not set up yet. Ask the developer to configure Azure.")
      ).toBeVisible();
      await adminPage.unroute("**/api/admin/lessons/*/video/simple-upload/init");

      // Switch back to HLS for student HLS playback test
      await adminPage.getByRole("button", { name: "Upload encoded HLS folder" }).click();
      await folderInput.setInputFiles(TEST_HLS_DIR);
      await adminPage.getByRole("button", { name: "Upload folder" }).click();
      await expect(adminPage.getByRole("button", { name: "Verify and publish" })).toBeVisible({ timeout: 30_000 });
      await adminPage.getByRole("button", { name: "Verify and publish" }).click();
      await expect(adminPage.getByText("Ready", { exact: true })).toBeVisible({ timeout: 15_000 });

      // 5. Enrolled student HLS playback + seeking + no download button
      const stCheck = await apiRequest(adminToken, "GET", `/api/admin/lessons/${lessonId}/video/status`);
      expect(stCheck.data?.videoProvider).toBe("AZURE_HLS");
      expect(stCheck.data?.videoStatus).toBe("READY");
      const pwCheck = await apiRequest(studentToken, "GET", "/api/lms/pathways/cs-agentic");
      const allCourses = pwCheck.data?.courses || pwCheck.data?.pathway?.courses || [];
      const allMods = allCourses.flatMap((c: any) => c.modules || []);
      const pwLesson = allMods
        .flatMap((m: any) => m.lessons || m.items || [])
        .find((l: any) => l.id === lessonId);
      expect(pwLesson?.videoProvider).toBe("AZURE_HLS");
      expect(pwLesson?.videoStatus).toBe("READY");

      const stuCtx = await browser.newContext();
      const stuPage = await stuCtx.newPage();
      const stuErrors: string[] = [];
      stuPage.on("pageerror", (e) => stuErrors.push(e.message));
      stuPage.on("console", (m) => {
        if (m.type() === "error") stuErrors.push(m.text());
      });

      await loginAs(stuPage, ENROLLED_STUDENT);
      await stuPage.goto(`${LMS_URL}/learn/cs-agentic?lesson=${lessonId}`, {
        waitUntil: "networkidle",
      });

      const video = stuPage.locator("video");
      if (browserName === "webkit") {
        // Windows Playwright WebKit lacks MSE & GStreamer H.264/HLS; verify player renders cleanly without crashes
        await expect(
          video.or(stuPage.getByText("Your browser does not support adaptive HLS playback."))
        ).toBeVisible({ timeout: 15_000 });
      } else {
        await expect(video).toBeVisible({ timeout: 15_000 });
        const controlsList = await video.getAttribute("controlsList");
        expect(controlsList || "").toContain("nodownload");
        await expect(stuPage.locator("a[download], button:has-text('Download')")).toHaveCount(0);

        try {
          await stuPage.waitForFunction(
            () => {
              const v = document.querySelector("video") as HTMLVideoElement | null;
              return Boolean(v && (v.src || v.currentSrc) && v.readyState >= 1);
            },
            null,
            { timeout: 15_000 }
          );
        } catch (e) {
          const vInfo = await stuPage.evaluate(() => {
            const v = document.querySelector("video") as HTMLVideoElement | null;
            return v ? { src: v.src, currentSrc: v.currentSrc, readyState: v.readyState, networkState: v.networkState, err: v.error?.message || v.error?.code } : null;
          });
          throw new Error(`Video not ready (${JSON.stringify(vInfo)}). Console/page errors: ${JSON.stringify(stuErrors)}; body: ${(await stuPage.locator("main").innerText()).slice(0, 300)}`);
        }
        await stuPage.evaluate(async () => {
          const v = document.querySelector("video") as HTMLVideoElement;
          v.muted = true;
          await v.play();
        });
        await stuPage.waitForFunction(
          () => {
            const v = document.querySelector("video") as HTMLVideoElement | null;
            return Boolean(v && v.currentTime > 0.2);
          },
          { timeout: 15_000 }
        );
        await stuPage.evaluate(() => {
          const v = document.querySelector("video") as HTMLVideoElement;
          v.currentTime = 4;
        });
        await stuPage.waitForFunction(
          () => {
            const v = document.querySelector("video") as HTMLVideoElement | null;
            return Boolean(v && v.currentTime >= 3);
          },
          { timeout: 10_000 }
        );

        await stuPage.screenshot({
          path: path.join(SCREENSHOT_DIR, "student-hls-player.png"),
          fullPage: false,
        });
      }
      expect(stuErrors).toEqual([]);

      // 6. Security checks: non-enrolled, unauthenticated, expired token
      const nonEnrolledRes = await stuPage.request.post(
        `${ENGINE_URL}/api/lms/lessons/${lessonId}/video-access`,
        { headers: { Authorization: `Bearer ${nonEnrolledToken}` } }
      );
      expect(nonEnrolledRes.status()).toBe(403);

      const unauthPlaylist = await stuPage.request.get(
        `${ENGINE_URL}/api/lms/lessons/${lessonId}/hls/master.m3u8`
      );
      expect(unauthPlaylist.status()).toBeGreaterThanOrEqual(400);

      const expiredPlaylist = await stuPage.request.get(
        `${ENGINE_URL}/api/lms/lessons/${lessonId}/hls/master.m3u8?token=expired.invalid.token`
      );
      expect(expiredPlaylist.status()).toBe(403);

      // 7. MP4 upload end-to-end + student playback
      await adminPage.getByRole("button", { name: "Upload video (.mp4)" }).click();
      await adminPage.locator('input[type="file"][accept*="mp4"]').setInputFiles(TEST_MP4_PATH);
      await expect(adminPage.getByText("100%")).toBeVisible({ timeout: 30_000 });
      await expect(adminPage.getByText("Ready", { exact: true })).toBeVisible({ timeout: 15_000 });

      if (browserName === "chromium") {
        await adminPage.screenshot({
          path: path.join(SCREENSHOT_DIR, "admin-mp4-ready.png"),
          fullPage: false,
        });
      }

      await stuPage.reload({ waitUntil: "networkidle" });
      await expect(video).toBeVisible({ timeout: 15_000 });
      if (browserName !== "webkit") {
        await stuPage.waitForFunction(
          () => {
            const v = document.querySelector("video") as HTMLVideoElement | null;
            return Boolean(v && (v.src || v.currentSrc) && v.readyState >= 1);
          },
          null,
          { timeout: 15_000 }
        );
        await stuPage.evaluate(async () => {
          const v = document.querySelector("video") as HTMLVideoElement;
          v.muted = true;
          await v.play();
        });
        await stuPage.waitForFunction(
          () => {
            const v = document.querySelector("video") as HTMLVideoElement | null;
            return Boolean(v && v.currentTime > 0.2);
          },
          { timeout: 15_000 }
        );
        await stuPage.screenshot({
          path: path.join(SCREENSHOT_DIR, "student-mp4-player.png"),
          fullPage: false,
        });
      }

      // Sanity check enrolled student API returns AZURE_MP4
      const mp4Access = await apiRequest(
        studentToken,
        "POST",
        `/api/lms/lessons/${lessonId}/video-access`
      );
      expect(mp4Access.data?.provider).toBe("AZURE_MP4");
      expect(mp4Access.data?.videoUrl).toContain("127.0.0.1:10000");

      await stuCtx.close();
    } finally {
      // 8. Delete lesson and verify Azurite blobs are removed (not orphaned)
      await apiRequest(adminToken, "DELETE", `/api/admin/modules/${modId}/lessons/${lessonId}`).catch(
        () => {}
      );
      const orphansRes = await apiRequest(adminToken, "GET", "/api/admin/videos/orphans").catch(
        () => ({ data: { orphans: [] } })
      );
      const leftover = (orphansRes.data?.orphans || []).filter((p: string) =>
        p.startsWith(`${lessonId}/`)
      );
      expect(leftover).toEqual([]);
      await adminCtx.close();
    }
  });
});
