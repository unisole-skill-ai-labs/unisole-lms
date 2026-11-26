import { test, expect } from "@playwright/test";
import { ADMIN_USER, LMS_URL, loginAs } from "./helpers";

test.describe("Part 2: Video Upload Panel (flag-gated + simple MP4 upload)", () => {
  test("Admin editor renders video panel according to VITE_ENABLE_VIDEO_UPLOAD and handles simple MP4 upload flow", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_USER);
    await page.goto(`${LMS_URL}/admin/courses/cs-agentic`, {
      waitUntil: "networkidle",
    });

    // Select first lecture lesson
    await page.getByRole("button", { name: /Concept Lecture/i }).first().click();

    const uploadToggle = page.getByRole("button", {
      name: /Upload MP4 Video|Upload video \(local encoder\)/i,
    });

    const isFlagEnabled = process.env.E2E_VIDEO_UPLOAD_ENABLED === "true";
    if (!isFlagEnabled) {
      await expect(uploadToggle).toHaveCount(0);
      await expect(page.getByPlaceholder("https://youtu.be/...")).toBeVisible();
      return;
    }

    await expect(uploadToggle).toBeVisible();

    // Intercept status & simple upload API calls to simulate VIDEO_UPLOAD_MODE=simple + mock Azure PUT
    await page.route("**/api/admin/lessons/*/video/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          videoProvider: "YOUTUBE",
          videoStatus: "NONE",
          videoHlsPath: null,
          videoError: null,
          videoUpdatedAt: null,
          uploadMode: "simple",
          storageMode: "stub",
          maxSizeMb: 500,
        }),
      });
    });

    await page.route("**/api/admin/videos/setup-check*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          storageMode: "stub",
          uploadMode: "simple",
          connectivity: { ok: true, message: "Mock connectivity OK" },
          corsCheck: { ok: true, message: "Mock CORS OK" },
        }),
      });
    });

    await page.route("**/api/admin/lessons/*/video/simple-upload/init", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          uploadUrl: "http://127.0.0.1:5174/__mock-azure-put/video.mp4",
          blobPath: "les_agent_w1_lec/11111111-1111-4111-8111-111111111111/video.mp4",
          expiresInSec: 1200,
          maxSizeBytes: 500 * 1024 * 1024,
          storageMode: "stub",
        }),
      });
    });

    await page.route("**/__mock-azure-put/video.mp4", async (route) => {
      await route.fulfill({ status: 201, body: "" });
    });

    await page.route("**/api/admin/lessons/*/video/simple-upload/complete", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "READY",
          videoProvider: "AZURE_MP4",
          videoHlsPath: "les_agent_w1_lec/11111111-1111-4111-8111-111111111111/video.mp4",
        }),
      });
    });

    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Concept Lecture/i }).first().click();

    // Test Check Video Setup button
    await page.getByRole("button", { name: /Check Video Setup/i }).click();
    await expect(page.getByText(/Mock connectivity OK/i)).toBeVisible();

    // Switch to Upload MP4 Video
    await page.getByRole("button", { name: /Upload MP4 Video/i }).click();

    // Reject non-mp4
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "bad.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an mp4"),
    });
    await expect(page.getByText(/Only \.mp4 files are supported/i)).toBeVisible();

    // Upload valid small mp4
    await fileInput.setInputFiles({
      name: "lecture.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("ftypisom0000"),
    });
    await expect(page.getByText("100%")).toBeVisible();
  });
});
