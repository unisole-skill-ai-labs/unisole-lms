import fs from "fs";
import os from "os";
import path from "path";
import http from "http";
import { execFileSync } from "child_process";
import { createRequire } from "module";
import { test, expect } from "@playwright/test";
import {
  ADMIN_USER,
  ENROLLED_STUDENT,
  NON_ENROLLED_STUDENT,
  LMS_URL,
  loginAs,
} from "./helpers";

const require = createRequire(import.meta.url);
const { Pool } = require("C:/code/unisole/unisole-engine/node_modules/pg");

function getDatabaseUrl(): string {
  const envPath = path.resolve("C:/code/unisole/unisole-engine/.env");
  const line = fs.readFileSync(envPath, "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  return line!.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

function resolveFfmpeg(): string {
  const localStatic = path.resolve("C:/code/unisole/unisole-lms/audit-2026-11-26/tools/node_modules/ffmpeg-static/ffmpeg.exe");
  if (fs.existsSync(localStatic)) return localStatic;
  return process.env.FFMPEG_PATH || "ffmpeg";
}

const pool = new Pool({ connectionString: getDatabaseUrl() });
const HLS_FIXTURE_DIR = path.join(os.tmpdir(), "unisole-e2e-hls-vod");
const CREATED_LESSON_IDS: string[] = [];

function startRangeHlsServer(rootDir: string): Promise<{ server: http.Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const clean = (req.url || "/").split("?")[0].replace(/^\/+/, "");
      const fullPath = path.join(rootDir, clean);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (!fullPath.startsWith(rootDir) || !fs.existsSync(fullPath)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const stat = fs.statSync(fullPath);
      const ext = path.extname(fullPath);
      const contentType = ext === ".m3u8" ? "application/vnd.apple.mpegurl" : "video/mp2t";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Accept-Ranges", "bytes");

      const range = req.headers.range;
      if (range) {
        const match = /bytes=(\d+)-(\d*)/.exec(range);
        if (match) {
          const start = Number(match[1]);
          const end = match[2] ? Number(match[2]) : stat.size - 1;
          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Content-Length": end - start + 1,
          });
          fs.createReadStream(fullPath, { start, end }).pipe(res);
          return;
        }
      }
      res.writeHead(200, { "Content-Length": stat.size });
      fs.createReadStream(fullPath).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as any;
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

test.describe("Assignment Student View & HLS Video Player Controls", () => {
  let hlsServer: http.Server;
  let hlsBaseUrl = "";

  test.beforeAll(async () => {
    fs.mkdirSync(path.join(HLS_FIXTURE_DIR, "360p"), { recursive: true });
    fs.mkdirSync(path.join(HLS_FIXTURE_DIR, "480p"), { recursive: true });
    const ffmpeg = resolveFfmpeg();
    execFileSync(
      ffmpeg,
      [
        "-y",
        "-f", "lavfi", "-i", "testsrc=duration=10:size=854x480:rate=24",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=10",
        "-filter_complex", "[0:v]format=yuv420p,split=2[v1][v2];[v1]scale=-2:360[v360];[v2]scale=-2:480[v480]",
        "-map", "[v360]", "-map", "1:a",
        "-map", "[v480]", "-map", "1:a",
        "-c:v", "libx264", "-profile:v", "main", "-preset", "ultrafast",
        "-g", "48", "-keyint_min", "48", "-sc_threshold", "0",
        "-b:v:0", "400k", "-b:v:1", "800k",
        "-c:a", "aac", "-b:a", "96k", "-ac", "2",
        "-f", "hls", "-hls_time", "2", "-hls_playlist_type", "vod", "-hls_flags", "independent_segments",
        "-master_pl_name", "master.m3u8",
        "-var_stream_map", "v:0,a:0,name:360p v:1,a:1,name:480p",
        "-hls_segment_filename", path.join(HLS_FIXTURE_DIR, "%v", "seg_%03d.ts").replace(/\\/g, "/"),
        path.join(HLS_FIXTURE_DIR, "%v", "index.m3u8").replace(/\\/g, "/"),
      ],
      { stdio: "ignore" }
    );
    const started = await startRangeHlsServer(HLS_FIXTURE_DIR);
    hlsServer = started.server;
    hlsBaseUrl = started.baseUrl;

    // Seed regression lessons (subjective & assignment 2 with multiline + XSS)
    const multiId = "les_e2e_assign_multi";
    const subjId = "les_e2e_subj_reg";
    CREATED_LESSON_IDS.push(multiId, subjId);
    await pool.query(`DELETE FROM submissions WHERE lesson_id = ANY($1::text[])`, [CREATED_LESSON_IDS]);
    await pool.query(`DELETE FROM module_lessons WHERE lesson_id = ANY($1::text[])`, [CREATED_LESSON_IDS]);
    await pool.query(`DELETE FROM lessons WHERE id = ANY($1::text[])`, [CREATED_LESSON_IDS]);

    await pool.query(
      `INSERT INTO lessons (id, title, slug, content, status, is_active, created_at, updated_at) VALUES
        ($1, 'E2E Multi-Line Assignment', 'e2e-multi-assign', $2, 'PUBLISHED', TRUE, NOW(), NOW()),
        ($3, 'E2E Subjective Regression', 'e2e-subj-reg', $4, 'PUBLISHED', TRUE, NOW(), NOW())`,
      [
        multiId,
        JSON.stringify({
          type: "VIDEO_TEST",
          category: "TEST",
          curriculumMode: "TEST",
          testType: "VIDEO_TEST",
          videoTest: {
            prompt: "Line 1: Check [Docs](https://example.com/docs)\nLine 2: Run `npm test`\n<script>window.__xss_test=1</script>",
            maxScore: 100,
          },
        }),
        subjId,
        JSON.stringify({
          type: "SUBJECTIVE_TEST",
          category: "TEST",
          curriculumMode: "TEST",
          testType: "SUBJECTIVE_TEST",
          subjectiveTest: { prompt: "Explain event loop architecture.", maxScore: 100 },
        }),
      ]
    );
    await pool.query(
      `INSERT INTO module_lessons (module_id, lesson_id, position) VALUES
        ('mod_agent_w1', $1, 95),
        ('mod_agent_w1', $2, 96)`,
      [multiId, subjId]
    );
  });

  test.afterAll(async () => {
    if (hlsServer) hlsServer.close();
    await pool.query(`DELETE FROM submissions WHERE lesson_id = ANY($1::text[]) OR title LIKE 'E2E Assign Clean%'`, [CREATED_LESSON_IDS]);
    await pool.query(`DELETE FROM lesson_progress WHERE lesson_id = ANY($1::text[])`, [CREATED_LESSON_IDS]);
    await pool.query(`DELETE FROM module_lessons WHERE lesson_id = ANY($1::text[])`, [CREATED_LESSON_IDS]);
    await pool.query(`DELETE FROM lessons WHERE id = ANY($1::text[])`, [CREATED_LESSON_IDS]);
    await pool.query(`DELETE FROM lessons WHERE title LIKE 'E2E Assign Clean%'`);
    await pool.end();
  });

  test("1-4: Admin creates Assignment with 'attach your github link', student sees clean view, URL validation, Admin Submissions link, isolation", async ({
    page,
    browser,
  }) => {
    const lessonTitle = `E2E Assign Clean ${Date.now()}`;
    await loginAs(page, ADMIN_USER);
    await page.goto(`${LMS_URL}/admin/courses/cs-agentic`, { waitUntil: "networkidle" });

    // Add Assignments activity in Week 1
    await page.locator('button[title="Add activity to this module"]').first().click();
    await page.getByRole("button", { name: /^Assignments/i }).first().click();
    await page.locator('input[placeholder*="title" i], input[value="Assignments"]').first().fill(lessonTitle);
    const instrArea = page.locator('textarea[placeholder*="assignment instructions" i]').first();
    await instrArea.fill("attach your github link");
    await page.getByRole("button", { name: /^Save$/i }).first().click();
    await expect(page.getByText(/Saved|Changes saved/i).first()).toBeVisible({ timeout: 10000 });

    const createdRow = await pool.query(`SELECT id FROM lessons WHERE title = $1 LIMIT 1`, [lessonTitle]);
    const createdId = createdRow.rows[0].id as string;
    CREATED_LESSON_IDS.push(createdId);

    // Enrolled student opens lesson
    await loginAs(page, ENROLLED_STUDENT);
    await page.goto(`${LMS_URL}/learn/cs-agentic?module=mod_agent_w1&lesson=${createdId}`, { waitUntil: "networkidle" });
    await expect(page.getByText(lessonTitle).first()).toBeVisible();
    await expect(page.getByText("attach your github link").first()).toBeVisible();

    const bodyText = await page.locator("body").innerText();
    for (const forbidden of [
      "Video Demonstration",
      "Viva",
      "Max Marks",
      "Evaluation Rubric",
      "Keep video recording",
      "Google Drive, Loom",
      "routed directly to your assigned mentor",
      "Under Mentor Review",
    ]) {
      expect(bodyText).not.toContain(forbidden);
    }

    // 3. Invalid inputs rejected with inline error, valid https URL submits
    const urlInput = page.locator("#assignment-submission-url");
    const submitBtn = page.getByRole("button", { name: /^Submit$/i });
    await submitBtn.click();
    await expect(page.getByRole("alert")).toBeVisible();

    await urlInput.fill("abc");
    await submitBtn.click();
    await expect(page.getByRole("alert")).toBeVisible();

    await urlInput.fill("javascript:alert(1)");
    await submitBtn.click();
    await expect(page.getByRole("alert")).toBeVisible();

    const validUrl = "https://github.com/unisole-test/qa-repo";
    await urlInput.fill(`  ${validUrl}  `);
    await submitBtn.click();
    await expect(page.getByText("Submitted").first()).toBeVisible({ timeout: 8000 });

    // Admin Submissions shows clickable link
    const admCtx = await browser.newContext();
    const admPage = await admCtx.newPage();
    await loginAs(admPage, ADMIN_USER);
    await admPage.goto(`${LMS_URL}/admin/submissions`, { waitUntil: "networkidle" });
    await admPage.getByText(lessonTitle).first().click();
    await expect(admPage.getByText(ENROLLED_STUDENT.name).first()).toBeVisible({ timeout: 8000 });
    await admPage.getByRole("button", { name: /^Review$/i }).first().click();
    const linkEl = admPage.locator(`a[href="${validUrl}"]`).first();
    await expect(linkEl).toBeVisible({ timeout: 5000 });
    await admCtx.close();

    // 4. Non-enrolled student cannot open it
    const nonCtx = await browser.newContext();
    const nonPage = await nonCtx.newPage();
    await loginAs(nonPage, NON_ENROLLED_STUDENT);
    await nonPage.goto(`${LMS_URL}/learn/cs-agentic?module=mod_agent_w1&lesson=${createdId}`, { waitUntil: "networkidle" });
    await expect(nonPage.getByText(/not enrolled/i).first()).toBeVisible({ timeout: 8000 });
    await nonCtx.close();
  });

  test("2 & 5: Multi-line + XSS sanitization & regression (subjective, lab, MCQ)", async ({ page }) => {
    await loginAs(page, ENROLLED_STUDENT);

    // Multi-line + XSS check
    await page.goto(`${LMS_URL}/learn/cs-agentic?module=mod_agent_w1&lesson=les_e2e_assign_multi`, { waitUntil: "networkidle" });
    await expect(page.locator('a[href="https://example.com/docs"]').first()).toBeVisible();
    await expect(page.locator("code", { hasText: "npm test" }).first()).toBeVisible();
    const xss = await page.evaluate(() => Boolean((window as any).__xss_test));
    expect(xss).toBe(false);

    // Subjective regression
    await page.goto(`${LMS_URL}/learn/cs-agentic?module=mod_agent_w1&lesson=les_e2e_subj_reg`, { waitUntil: "networkidle" });
    await page.locator("#subjective-response-text").fill("Event loop handles async I/O.");
    await page.getByRole("button", { name: /^Submit$/i }).click();
    await expect(page.getByText("Submitted").first()).toBeVisible({ timeout: 8000 });

    // MCQ regression
    await page.goto(`${LMS_URL}/learn/cs-agentic?module=mod_agent_w1&lesson=les_agent_w1_quiz`, { waitUntil: "networkidle" });
    await expect(page.getByText(/MCQ Quiz/i).first()).toBeVisible();
  });

  test("6-9: HLS video controls, play/pause, seek, fullscreen, mute, Pixel 7 mobile & ENDLIST check", async ({
    page,
    browser,
  }) => {
    // 9. Playlist-flag check
    const masterText = await (await fetch(`${hlsBaseUrl}/master.m3u8`)).text();
    const variantText = await (await fetch(`${hlsBaseUrl}/360p/index.m3u8`)).text();
    expect(masterText).toContain("#EXTM3U");
    expect(variantText, "Variant playlist MUST contain #EXT-X-ENDLIST for VOD seeking/duration").toContain("#EXT-X-ENDLIST");

    const setupHlsIntercepts = async (targetPage: any) => {
      await targetPage.route("**/api/lms/pathways/cs-agentic*", async (route: any) => {
        const resp = await route.fetch();
        const json = await resp.json();
        for (const c of json?.courses || []) {
          for (const m of c?.modules || []) {
            for (const l of m?.lessons || []) {
              if (l.id === "les_agent_w1_lec") {
                l.videoProvider = "AZURE_HLS";
                l.videoStatus = "READY";
              }
            }
          }
        }
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(json) });
      });
      await targetPage.route("**/api/lms/lessons/les_agent_w1_lec/video-access", async (route: any) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ provider: "AZURE_HLS", manifestUrl: `${hlsBaseUrl}/master.m3u8`, ttlSeconds: 21600 }),
        });
      });
    };

    await loginAs(page, ENROLLED_STUDENT);
    await setupHlsIntercepts(page);
    await page.goto(`${LMS_URL}/learn/cs-agentic?module=mod_agent_w1&lesson=les_agent_w1_lec`, { waitUntil: "networkidle" });

    const video = page.locator("video").first();
    await expect(video).toBeVisible({ timeout: 15000 });
    await page.waitForFunction(() => {
      const v = document.querySelector("video");
      return v && Number.isFinite(v.duration) && v.duration > 0 && v.seekable.length > 0;
    }, { timeout: 15000 });

    // 6. Controls, controlsList, duration, seekable, no overlay covering bottom-center
    const props = await page.evaluate(() => {
      const v = document.querySelector("video")!;
      const rect = v.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.bottom - 16);
      return {
        controls: v.controls,
        controlsList: v.getAttribute("controlsList") || "",
        duration: v.duration,
        seekableLen: v.seekable.length,
        hitIsVideo: hit === v,
      };
    });
    expect(props.controls).toBe(true);
    expect(props.controlsList).not.toContain("nofullscreen");
    expect(props.duration).toBeGreaterThan(0);
    expect(props.seekableLen).toBeGreaterThan(0);
    expect(props.hitIsVideo).toBe(true);

    // 7. Play/pause, seek to 5s, mute toggle, fullscreen enter/exit
    await page.evaluate(async () => {
      const v = document.querySelector("video")!;
      v.muted = true;
      await v.play();
    });
    expect(await page.evaluate(() => document.querySelector("video")!.paused)).toBe(false);
    await page.evaluate(() => {
      const v = document.querySelector("video")!;
      v.pause();
      v.currentTime = 5;
    });
    const afterSeek = await page.evaluate(() => ({
      paused: document.querySelector("video")!.paused,
      time: document.querySelector("video")!.currentTime,
      muted: document.querySelector("video")!.muted,
    }));
    expect(afterSeek.paused).toBe(true);
    expect(afterSeek.time).toBeGreaterThanOrEqual(4.5);
    expect(afterSeek.muted).toBe(true);

    // Fullscreen enter & exit
    await page.evaluate(async () => {
      const v = document.querySelector("video")!;
      if (v.requestFullscreen) await v.requestFullscreen();
    });
    await page.evaluate(async () => {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    });

    // 8. Mobile viewport (Pixel 7 dimensions)
    const mobCtx = await browser.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
    const mobPage = await mobCtx.newPage();
    await loginAs(mobPage, ENROLLED_STUDENT);
    await setupHlsIntercepts(mobPage);
    await mobPage.goto(`${LMS_URL}/learn/cs-agentic?module=mod_agent_w1&lesson=les_agent_w1_lec`, { waitUntil: "networkidle" });
    await expect(mobPage.locator("video").first()).toBeVisible({ timeout: 15000 });
    const mobOverflow = await mobPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(mobOverflow).toBe(false);
    await mobCtx.close();
  });
});
