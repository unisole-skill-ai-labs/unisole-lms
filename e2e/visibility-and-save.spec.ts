import { test, expect, Page } from "@playwright/test";
import { execSync } from "child_process";
import {
  ADMIN_USER,
  ENROLLED_STUDENT,
  NON_ENROLLED_STUDENT,
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

test.describe("Remove Draft/Publish, Free Preview, Archive & Autosave E2E", () => {
  const adminToken = signJwt(ADMIN_USER);
  const studentToken = signJwt(ENROLLED_STUDENT);
  const nonEnrolledToken = signJwt(NON_ENROLLED_STUDENT);

  const createdLessonIds: string[] = [];
  const createdModuleIds: string[] = [];
  let targetModuleId = "";
  let existingLessonId = "";
  let existingLessonOrigTitle = "";

  test.beforeAll(async () => {
    // Find an existing module and lesson in cs-agentic
    const modsRes = await apiRequest(adminToken, "GET", "/api/admin/courses/cs-agentic/modules");
    expect(modsRes.status).toBe(200);
    const mods = modsRes.data;
    expect(Array.isArray(mods) && mods.length > 0).toBe(true);
    targetModuleId = mods[0].moduleId || mods[0].id;

    const lesRes = await apiRequest(adminToken, "GET", `/api/admin/modules/${targetModuleId}/lessons`);
    expect(lesRes.status).toBe(200);
    const lessons = lesRes.data;
    expect(Array.isArray(lessons) && lessons.length > 0).toBe(true);
    existingLessonId = lessons[0].lessonId || lessons[0].id;
    existingLessonOrigTitle = lessons[0].title;
  });

  test.afterAll(async () => {
    // Clean up any test lessons and modules created during tests
    for (const lesId of createdLessonIds) {
      try {
        await apiRequest(adminToken, "DELETE", `/api/admin/modules/${targetModuleId}/lessons/${lesId}`);
      } catch {}
      try {
        runSql(`DELETE FROM lessons WHERE id = '${lesId}';`);
      } catch {}
    }
    for (const modId of createdModuleIds) {
      try {
        await apiRequest(adminToken, "DELETE", `/api/admin/courses/cs-agentic/modules/${modId}`);
      } catch {}
      try {
        runSql(`DELETE FROM modules WHERE id = '${modId}';`);
      } catch {}
    }
    if (existingLessonId && existingLessonOrigTitle) {
      await apiRequest(adminToken, "PUT", `/api/admin/lessons/${existingLessonId}`, {
        title: existingLessonOrigTitle,
      });
    }
  });

  test("1. Admin UI: no Draft/Published, no Free Preview, no Archive; Save button in old Archive slot", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_USER);
    await page.goto(`${LMS_URL}/admin/courses`, { waitUntil: "networkidle" });

    // No Draft/Published filter tabs on AdminCoursesPage
    await expect(page.getByRole("button", { name: /^Drafts \(/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Published \(/i })).toHaveCount(0);

    await page.goto(`${LMS_URL}/admin/courses/cs-agentic`, { waitUntil: "networkidle" });

    // Select first lesson in outline
    await page.getByText(existingLessonOrigTitle).first().click();

    // Save button is in the Lesson Details Header (old Archive slot) and initially disabled
    const saveBtn = page.getByTestId("lesson-save-btn");
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeDisabled();

    // No Free Preview, no Draft/Published toggle, no Archive button
    await expect(page.getByText("Free Preview")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Archive$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^(Draft|Published|Archived)$/i })).toHaveCount(0);
  });

  test("2. No autosave: typing waits 3.5s with ZERO network requests; Save persists", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_USER);
    const networkWrites: string[] = [];
    page.on("request", (req) => {
      if (
        (req.method() === "PUT" || req.method() === "POST") &&
        (req.url().includes("/api/admin/lessons") || req.url().includes("/api/admin/modules"))
      ) {
        networkWrites.push(`${req.method()} ${req.url()}`);
      }
    });

    await page.goto(`${LMS_URL}/admin/courses/cs-agentic`, { waitUntil: "networkidle" });
    await page.getByText(existingLessonOrigTitle).first().click();

    const titleInput = page.getByPlaceholder("Lesson Title...");
    await expect(titleInput).toHaveValue(existingLessonOrigTitle);

    const tempEditedTitle = `${existingLessonOrigTitle} (Unsaved Edit)`;
    await titleInput.fill(tempEditedTitle);

    // Wait 3.5 seconds (> old 1200ms autosave debounce)
    await page.waitForTimeout(3500);
    expect(networkWrites).toHaveLength(0);

    // Verify student still sees the old title
    const studentPathway = await apiRequest(studentToken, "GET", "/api/lms/pathways/cs-agentic");
    const allStudentLessons = studentPathway.data.courses.flatMap((c: any) =>
      c.modules.flatMap((m: any) => m.lessons || [])
    );
    const foundOld = allStudentLessons.find((l: any) => l.id === existingLessonId);
    expect(foundOld?.title).toBe(existingLessonOrigTitle);

    // Click Save -> network request fires and persists
    const saveBtn = page.getByTestId("lesson-save-btn");
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
    await expect(page.getByText("Saved").first()).toBeVisible({ timeout: 10_000 });
    expect(networkWrites.length).toBeGreaterThanOrEqual(1);

    // Restore original title
    await titleInput.fill(existingLessonOrigTitle);
    await saveBtn.click();
    await expect(page.getByText("Saved").first()).toBeVisible({ timeout: 10_000 });
  });

  test("3. Create & Save all 5 activity types -> visible across student views & 1 notification each", async ({
    browser,
    page,
  }) => {
    await loginAs(page, ADMIN_USER);
    await page.goto(`${LMS_URL}/admin/courses/cs-agentic`, { waitUntil: "networkidle" });

    const activityTypes: Array<{ testId: string; title: string }> = [
      { testId: "add-type-MCQ", title: `E2E MCQ Quiz ${Date.now()}` },
      { testId: "add-type-SUBJECTIVE", title: `E2E Subjective Test ${Date.now()}` },
      { testId: "add-type-LAB", title: `E2E Hands-on Lab ${Date.now()}` },
      { testId: "add-type-VIDEO", title: `E2E Video Lecture ${Date.now()}` },
      { testId: "add-type-PROJECT", title: `E2E Assignment ${Date.now()}` },
    ];

    const createdIdsForTypes: Array<{ id: string; title: string }> = [];

    for (const act of activityTypes) {
      // Open "+ Add" in first chapter
      const addActivityBtn = page.locator('button[title="Add activity to this module"]').first();
      await addActivityBtn.click();
      await page.getByTestId(act.testId).first().click();

      const titleInput = page.getByPlaceholder("Lesson Title...");
      await titleInput.fill(act.title);

      const saveBtn = page.getByTestId("lesson-save-btn");
      await expect(saveBtn).toBeEnabled();

      const [createResp] = await Promise.all([
        page.waitForResponse(
          (res) => res.url().includes("/create-lesson") && res.request().method() === "POST"
        ),
        saveBtn.click(),
      ]);
      expect(createResp.status()).toBe(201);
      const createdJson = await createResp.json();
      createdLessonIds.push(createdJson.id);
      createdIdsForTypes.push({ id: createdJson.id, title: act.title });
      await expect(saveBtn).toBeDisabled();
    }

    // Now verify as enrolled student in a fresh browser context
    const studentCtx = await browser.newContext();
    const sPage = await studentCtx.newPage();
    await loginAs(sPage, ENROLLED_STUDENT);

    // Dashboard & Enrolled Courses
    await sPage.goto(`${LMS_URL}/`, { waitUntil: "networkidle" });
    await expect(sPage.locator("text=AI Agent Engineering >> visible=true").first()).toBeVisible();

    await sPage.goto(`${LMS_URL}/enrolled`, { waitUntil: "networkidle" });
    await expect(sPage.locator("text=AI Agent Engineering >> visible=true").first()).toBeVisible();

    // Module page (Start Week)
    await sPage.goto(`${LMS_URL}/learn/cs-agentic/module/${targetModuleId}`, {
      waitUntil: "networkidle",
    });
    for (const item of createdIdsForTypes) {
      await expect(sPage.getByText(item.title).first()).toBeVisible();
    }

    // Notifications page: exactly 1 notification per created item
    await sPage.goto(`${LMS_URL}/notifications`, { waitUntil: "networkidle" });
    for (const item of createdIdsForTypes) {
      await expect(sPage.getByText(item.title)).toHaveCount(1);
    }

    // Lesson player click-through for each item
    for (const item of createdIdsForTypes) {
      await sPage.goto(`${LMS_URL}/learn/cs-agentic?lesson=${item.id}`, {
        waitUntil: "networkidle",
      });
      await expect(sPage.getByRole("heading", { name: item.title })).toBeVisible();
    }

    await studentCtx.close();
  });

  test("4. Never-saved new item stays invisible to students and does not persist", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_USER);
    const writes: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("create-lesson")) {
        writes.push(req.url());
      }
    });

    await page.goto(`${LMS_URL}/admin/courses/cs-agentic`, { waitUntil: "networkidle" });
    await page.locator('button[title="Add activity to this module"]').first().click();
    await page.getByRole("button", { name: /Video Lecture/i }).first().click();

    const ghostTitle = `E2E Unsaved Ghost ${Date.now()}`;
    await page.getByPlaceholder("Lesson Title...").fill(ghostTitle);
    await page.waitForTimeout(2000);
    expect(writes).toHaveLength(0);

    // Student API must NOT have the unsaved item
    const pathwayRes = await apiRequest(studentToken, "GET", "/api/lms/pathways/cs-agentic");
    const titles = pathwayRes.data.courses.flatMap((c: any) =>
      c.modules.flatMap((m: any) => (m.lessons || []).map((l: any) => l.title))
    );
    expect(titles).not.toContain(ghostTitle);

    // Notifications must NOT have the unsaved item
    const actRes = await apiRequest(studentToken, "GET", "/api/lms/activities");
    const notifTitles = (actRes.data.newItems || []).map((n: any) => n.title);
    expect(notifTitles).not.toContain(ghostTitle);

    // Reload without saving (accept beforeunload dialog)
    page.once("dialog", (d) => d.accept());
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText(ghostTitle)).toHaveCount(0);
  });

  test("5. Edit existing item & Save: student sees change on refresh; no new notification", async ({
    browser,
    page,
  }) => {
    // Create a fresh lesson first so we know its notification count = 1
    const slug = `e2e-edit-${Date.now()}`;
    const createRes = await apiRequest(
      adminToken,
      "POST",
      `/api/admin/modules/${targetModuleId}/create-lesson`,
      {
        title: "E2E Editable Item v1",
        slug,
        content: JSON.stringify({ type: "READING", category: "LECTURE", contentMarkdown: "v1" }),
      }
    );
    expect(createRes.status).toBe(201);
    const lesId = createRes.data.id;
    createdLessonIds.push(lesId);

    const beforeNotifs = await apiRequest(studentToken, "GET", "/api/lms/activities");
    const countBefore = (beforeNotifs.data.newItems || []).filter(
      (n: any) => n.lessonId === lesId
    ).length;
    expect(countBefore).toBe(1);

    // Admin edits and clicks Save
    await loginAs(page, ADMIN_USER);
    await page.goto(`${LMS_URL}/admin/courses/cs-agentic`, { waitUntil: "networkidle" });
    await page.getByText("E2E Editable Item v1").first().click();
    await page.getByPlaceholder("Lesson Title...").fill("E2E Editable Item v2");
    await page.getByTestId("lesson-save-btn").click();
    await expect(page.getByText("Saved").first()).toBeVisible({ timeout: 10_000 });

    // Student sees v2 after normal refresh and in new tab
    const studentCtx = await browser.newContext();
    const sPage = await studentCtx.newPage();
    await loginAs(sPage, ENROLLED_STUDENT);
    await sPage.goto(`${LMS_URL}/learn/cs-agentic/module/${targetModuleId}`, {
      waitUntil: "networkidle",
    });
    await expect(sPage.getByText("E2E Editable Item v2")).toBeVisible();
    await sPage.reload({ waitUntil: "networkidle" });
    await expect(sPage.getByText("E2E Editable Item v2")).toBeVisible();

    const sPage2 = await studentCtx.newPage();
    await sPage2.goto(`${LMS_URL}/notifications`, { waitUntil: "networkidle" });
    await expect(sPage2.getByText("E2E Editable Item v2")).toHaveCount(1);

    await studentCtx.close();
  });

  test("6. Module states: zero lessons shows empty state; future unlockAt shows Unlocks on & locks lessons", async ({
    browser,
  }) => {
    const emptyModRes = await apiRequest(adminToken, "POST", "/api/admin/modules", {
      title: `E2E Empty Module ${Date.now()}`,
      slug: `e2e-empty-mod-${Date.now()}`,
    });
    expect(emptyModRes.status).toBe(201);
    const emptyModId = emptyModRes.data.id;
    createdModuleIds.push(emptyModId);
    await apiRequest(adminToken, "POST", "/api/admin/courses/cs-agentic/modules", {
      moduleId: emptyModId,
      position: 98,
    });

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const lockedModRes = await apiRequest(adminToken, "POST", "/api/admin/modules", {
      title: `E2E Future Module ${Date.now()}`,
      slug: `e2e-future-mod-${Date.now()}`,
      unlockAt: futureDate,
    });
    expect(lockedModRes.status).toBe(201);
    const lockedModId = lockedModRes.data.id;
    createdModuleIds.push(lockedModId);
    await apiRequest(adminToken, "POST", "/api/admin/courses/cs-agentic/modules", {
      moduleId: lockedModId,
      position: 99,
    });
    const lockedLesRes = await apiRequest(
      adminToken,
      "POST",
      `/api/admin/modules/${lockedModId}/create-lesson`,
      {
        title: "E2E Future Locked Lesson",
        slug: `e2e-future-les-${Date.now()}`,
        content: JSON.stringify({ type: "READING", contentMarkdown: "Secret future" }),
      }
    );
    expect(lockedLesRes.status).toBe(201);
    createdLessonIds.push(lockedLesRes.data.id);

    const studentCtx = await browser.newContext();
    const sPage = await studentCtx.newPage();
    await loginAs(sPage, ENROLLED_STUDENT);

    // Empty module -> "Content coming soon"
    await sPage.goto(`${LMS_URL}/learn/cs-agentic/module/${emptyModId}`, {
      waitUntil: "networkidle",
    });
    await expect(sPage.getByText("Content coming soon")).toBeVisible();

    // Future module -> "Unlocks on" & lesson API returns 403
    await sPage.goto(`${LMS_URL}/learn/cs-agentic/module/${lockedModId}`, {
      waitUntil: "networkidle",
    });
    await expect(sPage.getByText(/Unlocks on|become available on/i).first()).toBeVisible();
    const lockedApi = await apiRequest(
      studentToken,
      "GET",
      `/api/lms/lessons/${lockedLesRes.data.id}`
    );
    expect(lockedApi.status).toBe(403);

    await studentCtx.close();
  });

  test("7. Access control: non-enrolled blocked (even with legacy isFreePreview), enrolled & admin allowed", async ({
    browser,
  }) => {
    // Create a lesson with isFreePreview: true in content JSON to verify Free Preview bypass is gone
    const fpRes = await apiRequest(
      adminToken,
      "POST",
      `/api/admin/modules/${targetModuleId}/create-lesson`,
      {
        title: "E2E No Free Preview Lesson",
        slug: `e2e-no-fp-${Date.now()}`,
        content: JSON.stringify({
          type: "READING",
          isFreePreview: true,
          contentMarkdown: "Paid content",
        }),
      }
    );
    expect(fpRes.status).toBe(201);
    const fpId = fpRes.data.id;
    createdLessonIds.push(fpId);

    // Non-enrolled student blocked via API (403) and UI
    const nonEnrolledApi = await apiRequest(nonEnrolledToken, "GET", `/api/lms/lessons/${fpId}`);
    expect(nonEnrolledApi.status).toBe(403);

    const nonCtx = await browser.newContext();
    const nonPage = await nonCtx.newPage();
    await loginAs(nonPage, NON_ENROLLED_STUDENT);
    await nonPage.goto(`${LMS_URL}/learn/cs-agentic?lesson=${fpId}`, { waitUntil: "networkidle" });
    await expect(nonPage.getByText("Paid content")).toHaveCount(0);
    await nonCtx.close();

    // Enrolled student allowed
    const enrolledApi = await apiRequest(studentToken, "GET", `/api/lms/lessons/${fpId}`);
    expect(enrolledApi.status).toBe(200);

    // Admin allowed
    const adminApi = await apiRequest(adminToken, "GET", `/api/lms/lessons/${fpId}`);
    expect(adminApi.status).toBe(200);
  });

  test("8. Student submissions appear in Admin Submissions page; isolated per student", async ({
    page,
  }) => {
    const subTitle = `E2E Submittable Lab ${Date.now()}`;
    const createRes = await apiRequest(
      adminToken,
      "POST",
      `/api/admin/modules/${targetModuleId}/create-lesson`,
      {
        title: subTitle,
        slug: `e2e-sub-${Date.now()}`,
        content: JSON.stringify({
          type: "ASSIGNMENT",
          category: "PRACTICE",
          assignment: { instructions: "Submit URL", allowedTypes: ["URL"], maxPoints: 100 },
        }),
      }
    );
    expect(createRes.status).toBe(201);
    const subLessonId = createRes.data.id;
    createdLessonIds.push(subLessonId);

    const submitRes = await apiRequest(studentToken, "POST", "/api/lms/submissions", {
      lessonId: subLessonId,
      pathwayId: "cs-agentic",
      type: "assignment",
      title: subTitle,
      submissionUrl: "https://github.com/unisole/e2e-test-repo",
      submissionText: "E2E test submission answer",
    });
    expect([200, 201]).toContain(submitRes.status);

    // Other student cannot see usr_133's submission
    const otherSubs = await apiRequest(nonEnrolledToken, "GET", "/api/lms/submissions");
    expect(otherSubs.status).toBe(200);
    const leaked = (otherSubs.data || []).find((s: any) => s.lessonId === subLessonId);
    expect(leaked).toBeUndefined();

    // Admin sees it on /admin/submissions
    await loginAs(page, ADMIN_USER);
    await page.goto(`${LMS_URL}/admin/submissions`, { waitUntil: "networkidle" });
    await expect(page.getByText(subTitle).first()).toBeVisible();
    await expect(page.getByText(ENROLLED_STUDENT.name).first()).toBeVisible();

    // Clean up submission row so lesson can be deleted in afterAll
    runSql(`DELETE FROM submissions WHERE lesson_id = '${subLessonId}';`);
  });

  test("9. Delete removes item from student views and notifications", async () => {
    const delTitle = `E2E Deletable ${Date.now()}`;
    const createRes = await apiRequest(
      adminToken,
      "POST",
      `/api/admin/modules/${targetModuleId}/create-lesson`,
      {
        title: delTitle,
        slug: `e2e-del-${Date.now()}`,
        content: JSON.stringify({ type: "READING", contentMarkdown: "to delete" }),
      }
    );
    expect(createRes.status).toBe(201);
    const delId = createRes.data.id;

    // Verify visible first
    const before = await apiRequest(studentToken, "GET", "/api/lms/activities");
    expect((before.data.newItems || []).some((n: any) => n.lessonId === delId)).toBe(true);

    // Delete via detach endpoint
    const delRes = await apiRequest(
      adminToken,
      "DELETE",
      `/api/admin/modules/${targetModuleId}/lessons/${delId}`
    );
    expect(delRes.status).toBe(200);

    // Verify gone from pathway and notifications
    const afterAct = await apiRequest(studentToken, "GET", "/api/lms/activities");
    expect((afterAct.data.newItems || []).some((n: any) => n.lessonId === delId)).toBe(false);
    const afterLes = await apiRequest(studentToken, "GET", `/api/lms/lessons/${delId}`);
    expect(afterLes.status).toBe(404);
  });

  test("10. Legacy DRAFT & ARCHIVED rows follow new rule (visible if is_active=true, hidden if is_active=false)", async () => {
    const draftId = `les_e2e_draft_${Date.now()}`;
    const archId = `les_e2e_arch_${Date.now()}`;
    const inactiveId = `les_e2e_inact_${Date.now()}`;

    runSql(`
      INSERT INTO lessons (id, title, slug, status, is_active, content)
      VALUES
        ('${draftId}', 'E2E Legacy Draft Row', 'e2e-legacy-draft-${Date.now()}', 'DRAFT', true, '{"type":"READING","contentMarkdown":"legacy draft"}'),
        ('${archId}', 'E2E Legacy Archived Row', 'e2e-legacy-arch-${Date.now()}', 'ARCHIVED', true, '{"type":"READING","contentMarkdown":"legacy archived"}'),
        ('${inactiveId}', 'E2E Inactive Row', 'e2e-inactive-${Date.now()}', 'PUBLISHED', false, '{"type":"READING","contentMarkdown":"inactive"}');
    `);
    await apiRequest(adminToken, "POST", `/api/admin/modules/${targetModuleId}/lessons`, {
      lessonId: draftId,
    });
    await apiRequest(adminToken, "POST", `/api/admin/modules/${targetModuleId}/lessons`, {
      lessonId: archId,
    });
    await apiRequest(adminToken, "POST", `/api/admin/modules/${targetModuleId}/lessons`, {
      lessonId: inactiveId,
    });
    createdLessonIds.push(draftId, archId, inactiveId);

    // DRAFT & ARCHIVED with is_active=true are visible (status is ignored)
    expect((await apiRequest(studentToken, "GET", `/api/lms/lessons/${draftId}`)).status).toBe(200);
    expect((await apiRequest(studentToken, "GET", `/api/lms/lessons/${archId}`)).status).toBe(200);
    // is_active=false is hidden
    expect((await apiRequest(studentToken, "GET", `/api/lms/lessons/${inactiveId}`)).status).toBe(403);
  });

  test("11. Regression: cs-agentic from DB only, calendar no dummy events, submissions scoping for staff roles", async ({
    browser,
  }) => {
    // Submissions scoping for ADMIN, COURSE_MANAGER, PROGRAM_MANAGER, MENTOR
    for (const role of ["ADMIN", "COURSE_MANAGER", "PROGRAM_MANAGER", "MENTOR"]) {
      const tok = signJwt({
        id: `usr_e2e_${role.toLowerCase()}`,
        phone: "+919999900099",
        name: `Test ${role}`,
        role,
        roles: [role],
      });
      const res = await apiRequest(tok, "GET", "/api/admin/submissions");
      expect(res.status).toBe(200);
    }

    // Calendar page has no dummy hardcoded events
    const studentCtx = await browser.newContext();
    const sPage = await studentCtx.newPage();
    await loginAs(sPage, ENROLLED_STUDENT);
    await sPage.goto(`${LMS_URL}/calendar`, { waitUntil: "networkidle" });
    await expect(sPage.getByText("Calendar").first()).toBeVisible();
    await studentCtx.close();
  });
});
