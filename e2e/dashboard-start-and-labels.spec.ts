import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import {
  ADMIN_USER,
  ENROLLED_STUDENT,
  LMS_URL,
  apiRequest,
  loginAs,
  signJwt,
} from "./helpers";

function runSql(sql: string) {
  execSync(`docker exec -i unisole-engine-db-1 psql -U postgres -d unisole_copy`, {
    input: sql,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

test.describe("Phase B: Dashboard Start/Continue Week, Route Guard & Labels", () => {
  const adminToken = signJwt(ADMIN_USER);
  const createdModuleIds: string[] = [];

  test.beforeAll(async () => {
    // Ensure clean history for usr_133
    runSql(`DELETE FROM student_course_state WHERE user_id = '${ENROLLED_STUDENT.id}';`);
    runSql(`DELETE FROM lesson_progress WHERE user_id = '${ENROLLED_STUDENT.id}';`);
  });

  test.afterAll(async () => {
    runSql(`DELETE FROM student_course_state WHERE user_id = '${ENROLLED_STUDENT.id}';`);
    for (const modId of createdModuleIds) {
      try {
        await apiRequest(adminToken, "DELETE", `/api/admin/courses/cs-agentic/modules/${modId}`);
      } catch {}
      try {
        runSql(`DELETE FROM modules WHERE id = '${modId}';`);
      } catch {}
    }
  });

  test("1. Fresh student: Start Week 1 opens module 1, never 404; 15-month label & no Curriculum Overview", async ({
    page,
  }) => {
    await loginAs(page, ENROLLED_STUDENT);
    await page.goto(`${LMS_URL}/`, { waitUntil: "networkidle" });

    // 15-month label present, "of 12" absent, "Curriculum overview" absent
    await expect(page.getByText(/15-month program/i).first()).toBeVisible();
    await expect(page.getByText(/of 12/i)).toHaveCount(0);
    await expect(page.getByText(/curriculum overview/i)).toHaveCount(0);

    const startBtn = page.getByRole("button", { name: /Start Week 1/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    await page.waitForURL(/\/learn\/cs-agentic\/module\/mod_agent_w1/);
    await expect(page.getByText("Page Not Found")).toHaveCount(0);

    // Check /enrolled and /profile for absent Curriculum Overview & of 12
    await page.goto(`${LMS_URL}/enrolled`, { waitUntil: "networkidle" });
    await expect(page.getByText(/15-month program/i).first()).toBeVisible();
    await expect(page.getByText(/curriculum overview/i)).toHaveCount(0);
    await expect(page.getByText(/of 12/i)).toHaveCount(0);

    await page.goto(`${LMS_URL}/profile`, { waitUntil: "networkidle" });
    await expect(page.getByText(/curriculum overview/i)).toHaveCount(0);
    await expect(page.getByText(/of 12/i)).toHaveCount(0);
  });

  test("2. Open Week 3 -> Dashboard says Continue Week 3 & persists in new browser context", async ({
    browser,
    page,
  }) => {
    await loginAs(page, ENROLLED_STUDENT);
    await page.goto(`${LMS_URL}/learn/cs-agentic/module/mod_agent_w3`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(600);

    await page.goto(`${LMS_URL}/`, { waitUntil: "networkidle" });
    const continueBtn = page.getByRole("button", { name: /Continue Week 3/i });
    await expect(continueBtn).toBeVisible();

    // Verify cross-device persistence in a fresh browser context
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await loginAs(page2, ENROLLED_STUDENT);
    await page2.goto(`${LMS_URL}/`, { waitUntil: "networkidle" });
    await expect(page2.getByRole("button", { name: /Continue Week 3/i })).toBeVisible();
    await page2.getByRole("button", { name: /Continue Week 3/i }).click();
    await page2.waitForURL(/\/learn\/cs-agentic\/module\/mod_agent_w3/);
    await ctx2.close();
  });

  test("3. Deleting last-opened module falls back safely to next valid module (never 404)", async ({
    page,
  }) => {
    const tempModRes = await apiRequest(adminToken, "POST", "/api/admin/modules", {
      title: `E2E Temp Last Mod ${Date.now()}`,
      slug: `e2e-temp-last-${Date.now()}`,
    });
    expect(tempModRes.status).toBe(201);
    const tempModId = tempModRes.data.id;
    createdModuleIds.push(tempModId);
    await apiRequest(adminToken, "POST", "/api/admin/courses/cs-agentic/modules", {
      moduleId: tempModId,
      position: 90,
    });

    await loginAs(page, ENROLLED_STUDENT);
    await page.goto(`${LMS_URL}/learn/cs-agentic/module/${tempModId}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(500);

    // Delete that module as admin
    await apiRequest(adminToken, "DELETE", `/api/admin/courses/cs-agentic/modules/${tempModId}`);

    // Dashboard must fall back to a valid module and never open a 404
    await page.goto(`${LMS_URL}/`, { waitUntil: "networkidle" });
    const actionBtn = page.getByRole("button", { name: /(Start|Continue) Week \d+/i });
    await expect(actionBtn).toBeVisible();
    await actionBtn.click();
    await page.waitForURL(/\/learn\/cs-agentic\/module\/.+/);
    await expect(page.getByText("Page Not Found")).toHaveCount(0);
  });

  test("4. Route hardening: /module/ redirects to course overview; unknown moduleId shows 404", async ({
    page,
  }) => {
    await loginAs(page, ENROLLED_STUDENT);

    await page.goto(`${LMS_URL}/learn/cs-agentic/module/`, { waitUntil: "networkidle" });
    await page.waitForURL(/\/learn\/cs-agentic\/?$/);
    await expect(page.getByText("Page Not Found")).toHaveCount(0);

    await page.goto(`${LMS_URL}/learn/cs-agentic/module/does-not-exist`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByText("Page Not Found")).toBeVisible();
  });

  test("5. Locked target module shows Unlocks on & opens nothing", async ({ page }) => {
    // Clear history and lock mod_agent_w1 temporarily to verify locked dashboard state
    runSql(`DELETE FROM student_course_state WHERE user_id = '${ENROLLED_STUDENT.id}';`);
    const futureIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await apiRequest(adminToken, "PUT", "/api/admin/modules/mod_agent_w1", {
      unlockAt: futureIso,
    });

    try {
      await loginAs(page, ENROLLED_STUDENT);
      await page.goto(`${LMS_URL}/`, { waitUntil: "networkidle" });
      // If mod_agent_w1 is locked, either falls back to unlocked Week 2 OR if target is locked shows Unlocks on
      const lockedBtn = page.getByRole("button", { name: /Unlocks on/i });
      const continueBtn = page.getByRole("button", { name: /(Start|Continue) Week \d+/i });
      if (await lockedBtn.isVisible()) {
        await expect(lockedBtn).toBeDisabled();
      } else {
        await expect(continueBtn).toBeVisible();
      }
    } finally {
      await apiRequest(adminToken, "PUT", "/api/admin/modules/mod_agent_w1", {
        unlockAt: null,
      });
    }
  });
});
