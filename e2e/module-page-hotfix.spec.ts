import { test, expect, Page } from "@playwright/test";
import {
  ADMIN_USER,
  ENROLLED_STUDENT,
  NON_ENROLLED_STUDENT,
  LMS_URL,
  apiRequest,
  loginAs,
  signJwt,
} from "./helpers";

function attachErrorGuard(page: Page, errors: string[]) {
  page.on("pageerror", (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const txt = msg.text();
      if (/Minified React error|Rendered more hooks|Rendered fewer hooks/i.test(txt)) {
        errors.push(`console.error: ${txt}`);
      }
    }
  });
}

test.describe("Part 1 Hotfix: ModulePage hooks & direct/refresh loads", () => {
  const adminToken = signJwt(ADMIN_USER);

  test("1. Enrolled student: direct load + hard refresh of module, lesson, overview, dashboard (no React #310 / pageerror)", async ({
    page,
  }) => {
    const errors: string[] = [];
    attachErrorGuard(page, errors);
    await loginAs(page, ENROLLED_STUDENT);

    // Direct load & hard refresh of ModulePage
    await page.goto(`${LMS_URL}/learn/cs-agentic/module/mod_agent_w1`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByText(/What is an AI Agent/i).first()).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText(/What is an AI Agent/i).first()).toBeVisible();
    await expect(page.getByText("Unable to load page content")).toHaveCount(0);
    await expect(page.getByText("Something went wrong on this page")).toHaveCount(0);

    // Direct load & hard refresh of Lesson URL
    await page.goto(`${LMS_URL}/learn/cs-agentic?lesson=les_agent_w1_lec`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByText(/What is an AI Agent/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Mark Complete|Completed/i })).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText(/What is an AI Agent/i).first()).toBeVisible();

    // Direct load & hard refresh of Course Overview
    await page.goto(`${LMS_URL}/learn/cs-agentic`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /AI Agent Engineering/i }).first()).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /AI Agent Engineering/i }).first()).toBeVisible();

    // Direct load & hard refresh of Dashboard
    await page.goto(`${LMS_URL}/`, { waitUntil: "networkidle" });
    await expect(page.getByText(/15-month program/i).first()).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText(/15-month program/i).first()).toBeVisible();

    // Direct load & hard refresh of Enrolled Courses page
    await page.goto(`${LMS_URL}/enrolled`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /AI Agent Engineering/i }).first()).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /AI Agent Engineering/i }).first()).toBeVisible();

    // Browser back / forward after reload
    await page.goto(`${LMS_URL}/learn/cs-agentic/module/mod_agent_w1`, {
      waitUntil: "networkidle",
    });
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText(/What is an AI Agent/i).first()).toBeVisible();
    await page.goBack({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/enrolled/);
    await page.goForward({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/learn\/cs-agentic\/module\/mod_agent_w1/);

    expect(errors).toEqual([]);
  });

  test("3. Stale lazy chunk shows 'Unable to load page content' (chunk-only message)", async ({
    page,
  }) => {
    await loginAs(page, ENROLLED_STUDENT);
    await page.route("**/assets/ProfilePage-*.js", (route) => route.abort("failed"));
    await page.goto(`${LMS_URL}/profile`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Unable to load page content")).toBeVisible();
    await expect(page.getByText("Something went wrong on this page")).toHaveCount(0);
  });

  test("2. Locked module, 404 module id, and non-enrolled student render cleanly with zero React hook errors", async ({
    browser,
  }) => {
    const futureIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await apiRequest(adminToken, "PUT", "/api/admin/modules/mod_agent_w2", {
      unlockAt: futureIso,
    });

    try {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const errors: string[] = [];
      attachErrorGuard(page, errors);
      await loginAs(page, ENROLLED_STUDENT);

      // Locked module
      await page.goto(`${LMS_URL}/learn/cs-agentic/module/mod_agent_w2`, {
        waitUntil: "networkidle",
      });
      await expect(page.getByText(/Unlocks on|become available on/i).first()).toBeVisible();
      await page.reload({ waitUntil: "networkidle" });
      await expect(page.getByText(/Unlocks on|become available on/i).first()).toBeVisible();

      // 404 module id
      await page.goto(`${LMS_URL}/learn/cs-agentic/module/does-not-exist`, {
        waitUntil: "networkidle",
      });
      await expect(page.getByText("Page Not Found")).toBeVisible();

      await ctx.close();
      expect(errors).toEqual([]);

      // Non-enrolled student
      const nonCtx = await browser.newContext();
      const nonPage = await nonCtx.newPage();
      const nonErrors: string[] = [];
      attachErrorGuard(nonPage, nonErrors);
      await loginAs(nonPage, NON_ENROLLED_STUDENT);
      await nonPage.goto(`${LMS_URL}/learn/cs-agentic/module/mod_agent_w1`, {
        waitUntil: "networkidle",
      });
      await expect(nonPage.getByText(/Course Access Required/i)).toBeVisible();
      await nonCtx.close();
      expect(nonErrors).toEqual([]);
    } finally {
      await apiRequest(adminToken, "PUT", "/api/admin/modules/mod_agent_w2", {
        unlockAt: null,
      });
    }
  });
});
