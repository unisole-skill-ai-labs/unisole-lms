import { test, expect } from "@playwright/test";
import { ADMIN_USER, LMS_URL, loginAs } from "./helpers";

test.describe("Video Upload Panel (3-mode UI & simple MP4 validation)", () => {
  test("Admin editor shows Paste link, Upload video (.mp4), and Upload encoded HLS folder on localhost", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_USER);
    await page.goto(`${LMS_URL}/admin/courses/cs-agentic`, {
      waitUntil: "networkidle",
    });

    await page.getByRole("button", { name: /Concept Lecture/i }).first().click();

    await expect(page.getByRole("button", { name: "Paste link" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload video (.mp4)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload encoded HLS folder" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Check Video Setup/i })).toBeVisible();

    // Verify MP4 rejects non-mp4 client-side
    await page.getByRole("button", { name: "Upload video (.mp4)" }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "bad.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an mp4"),
    });
    await expect(page.getByText(/Only \.mp4 files are supported/i)).toBeVisible();
  });
});
