import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { setCredentials, logout } from "./authSlice";

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined"
    ? window.location.hostname.includes("stg")
      ? "https://stg.engine.unisole.org"
      : window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
      ? "https://api.unisole.org"
      : "http://localhost:3000"
    : "http://localhost:3000")
).replace(/\/+$/, "");

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as any)?.auth?.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refreshToken = (api.getState() as any)?.auth?.refreshToken;
    if (refreshToken) {
      // Try to get a new access token
      const refreshResult = await rawBaseQuery(
        {
          url: "/api/auth/refresh",
          method: "POST",
          body: { refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        // Store the new tokens
        api.dispatch(setCredentials(refreshResult.data));
        // Retry the original query with new token
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logout());
      }
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  keepUnusedDataFor: 300,
  tagTypes: [
    "Pathway",
    "Category",
    "College",
    "Branch",
    "Enrollment",
    "Lesson",
    "User",
    "AdminCourses",
    "AdminModules",
    "AdminLessons",
    "AdminStudents",
    "Progress",
    "Submissions",
    "Activities",
    "Notes",
    "Cohort",
    "CalendarEvents",
    "DashboardSummary",
  ],
  endpoints: (builder) => ({
    // ─── Auth Endpoints ──────────────────────────────────────────────────────────
    checkUser: builder.mutation({
      query: (body) => ({
        url: "/api/auth/check-user",
        method: "POST",
        body,
      }),
    }),
    login: builder.mutation({
      query: (body) => ({
        url: "/api/auth/login",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch {
          // Handled in component
        }
      },
      invalidatesTags: ["User", "Enrollment", "Pathway"],
    }),
    adminLogin: builder.mutation({
      query: (body) => ({
        url: "/api/auth/admin-login",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch {
          // Handled in component
        }
      },
      invalidatesTags: ["User", "AdminCourses"],
    }),
    sendOtp: builder.mutation({
      query: (body) => ({
        url: "/api/auth/send-otp",
        method: "POST",
        body,
      }),
    }),
    verifyOtp: builder.mutation({
      query: (body) => ({
        url: "/api/auth/verify-otp",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch {
          // Handled in component
        }
      },
      invalidatesTags: ["User", "Enrollment", "Pathway"],
    }),
    exchangeSsoCode: builder.mutation({
      query: (body: { code: string }) => ({
        url: "/api/auth/sso/exchange",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch {
          // Handled in component
        }
      },
      invalidatesTags: ["User", "Enrollment", "Pathway", "DashboardSummary"],
    }),
    getMe: builder.query({
      query: () => "/api/auth/me",
      providesTags: ["User"],
    }),

    // ─── Public Catalog Endpoints ────────────────────────────────────────────────
    getPublicPathways: builder.query({
      query: () => "/api/public/pathways",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }: { id: string }) => ({ type: "Pathway" as const, id })),
              { type: "Pathway", id: "LIST" },
            ]
          : [{ type: "Pathway", id: "LIST" }],
    }),
    getPublicPathwayBySlug: builder.query({
      query: (slug) => `/api/public/pathways/${slug}`,
      providesTags: (_result, _error, slug) => [{ type: "Pathway", id: slug }],
    }),
    getCategories: builder.query({
      query: () => "/api/public/categories",
      providesTags: [{ type: "Category", id: "LIST" }],
    }),
    getColleges: builder.query({
      query: () => "/api/public/colleges",
      providesTags: [{ type: "College", id: "LIST" }],
    }),
    getBranches: builder.query({
      query: (collegeId) =>
        collegeId ? `/api/public/branches?collegeId=${collegeId}` : "/api/public/branches",
      providesTags: [{ type: "Branch", id: "LIST" }],
    }),

    // ─── Student LMS Endpoints (Authenticated) ───────────────────────────────────
    getDashboardSummary: builder.query({
      query: (params) => {
        const pId = typeof params === "string" ? params : params?.pathwayId;
        return pId
          ? `/api/lms/dashboard/summary?pathwayId=${encodeURIComponent(pId)}`
          : "/api/lms/dashboard/summary";
      },
      providesTags: ["DashboardSummary", "Progress", "Submissions", "Activities", "CalendarEvents"],
    }),
    getMyPathways: builder.query({
      query: () => "/api/lms/pathways",
      providesTags: [{ type: "Pathway", id: "MY_LIST" }, { type: "Enrollment", id: "LIST" }],
    }),
    getPathwayContent: builder.query({
      query: (arg) => {
        if (typeof arg === "object" && arg !== null) {
          const qs = arg.summary ? "?summary=true" : "";
          return `/api/lms/pathways/${arg.pathwayId || arg.id}${qs}`;
        }
        return `/api/lms/pathways/${arg}`;
      },
      providesTags: (_result, _error, arg) => {
        const id = typeof arg === "object" && arg !== null ? (arg.pathwayId || arg.id) : arg;
        return ["Pathway", { type: "Pathway", id: `${id}-CONTENT` }];
      },
    }),
    getLessonContent: builder.query({
      query: (lessonId) => `/api/lms/lessons/${lessonId}`,
      providesTags: (_result, _error, id) => [{ type: "Lesson", id }],
    }),
    getMyEnrollments: builder.query({
      query: () => "/api/lms/enrollments",
      providesTags: [{ type: "Enrollment", id: "LIST" }],
    }),
    recordModuleVisit: builder.mutation({
      query: (body) => ({
        url: "/api/lms/module-visit",
        method: "POST",
        body,
      }),
      invalidatesTags: ["DashboardSummary"],
    }),

    // ─── Student Progress, Submissions & Activities ──────────────────────────────
    getStudentProgress: builder.query({
      query: (pathwayId) => (pathwayId ? `/api/lms/progress/${pathwayId}` : "/api/lms/progress"),
      providesTags: ["Progress"],
    }),
    markLessonProgress: builder.mutation({
      query: (body) => ({
        url: "/api/lms/progress",
        method: "POST",
        body,
      }),
      invalidatesTags: ["DashboardSummary", "Progress", "Activities"],
    }),
    getStudentSubmissions: builder.query({
      query: (pathwayId) => (pathwayId ? `/api/lms/submissions/${pathwayId}` : "/api/lms/submissions"),
      providesTags: ["Submissions"],
    }),
    submitAssignment: builder.mutation({
      query: (body) => ({
        url: "/api/lms/submissions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["DashboardSummary", "Submissions", "Progress", "Activities"],
    }),
    getStudentActivities: builder.query({
      query: () => "/api/lms/activities",
      providesTags: ["Activities"],
    }),
    updateProfile: builder.mutation({
      query: (body) => ({
        url: "/api/lms/me",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    getNotes: builder.query({
      query: (pathwayId) => (pathwayId ? `/api/lms/notes/${pathwayId}` : "/api/lms/notes"),
      providesTags: ["Notes"],
    }),
    saveNote: builder.mutation({
      query: (body) => ({
        url: "/api/lms/notes",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Notes"],
    }),
    getCohortData: builder.query({
      query: (pathwayId) => (pathwayId ? `/api/lms/cohort/${pathwayId}` : "/api/lms/cohort"),
      providesTags: ["Cohort"],
    }),

    // ─── Admin & Mentor CMS Studio Endpoints ─────────────────────────────────────
    getAdminDashboardStats: builder.query({
      query: (arg = "Monthly") => {
        if (typeof arg === "string") {
          return `/api/admin/dashboard/stats?period=${arg}`;
        }
        const { period = "Monthly", courseId } = (arg as any) || {};
        const params: any = { period };
        if (courseId && courseId !== "ALL") params.courseId = courseId;
        return {
          url: "/api/admin/dashboard/stats",
          params,
        };
      },
      providesTags: ["AdminCourses", "AdminLessons", "AdminStudents", "Submissions", "Enrollment"],
    }),
    getAdminCourses: builder.query({
      query: () => "/api/admin/courses",
      providesTags: ["AdminCourses"],
    }),
    getAdminCourseById: builder.query({
      query: (id) => `/api/admin/courses/${id}`,
      providesTags: (_res, _err, id) => [{ type: "AdminCourses", id }],
    }),
    createAdminCourse: builder.mutation({
      query: (body) => ({
        url: "/api/admin/courses",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AdminCourses"],
    }),
    updateAdminCourse: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/admin/courses/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => ["AdminCourses", { type: "AdminCourses", id }],
    }),
    duplicateAdminCourse: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/admin/courses/${id}/duplicate`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["AdminCourses"],
    }),
    importAdminCourse: builder.mutation({
      query: (body) => ({
        url: "/api/admin/courses/import",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AdminCourses", "AdminModules", "AdminLessons"],
    }),
    deleteAdminCourse: builder.mutation({
      query: (id: string) => ({
        url: `/api/admin/courses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AdminCourses"],
    }),
    getAdminCourseModules: builder.query({
      query: (id) => `/api/admin/courses/${id}/modules`,
      providesTags: (result, _err, id) =>
        result && Array.isArray(result)
          ? [
              ...result.map((m: any) => ({ type: "AdminModules" as const, id: m.moduleId || m.id })),
              { type: "AdminModules" as const, id: `${id}-modules` },
              { type: "AdminModules" as const, id: "LIST" },
            ]
          : [
              { type: "AdminModules" as const, id: `${id}-modules` },
              { type: "AdminModules" as const, id: "LIST" },
            ],
    }),
    attachAdminCourseModule: builder.mutation({
      query: ({ courseId, moduleId, position }) => ({
        url: `/api/admin/courses/${courseId}/modules`,
        method: "POST",
        body: { moduleId, position },
      }),
      invalidatesTags: (_res, _err, { courseId }) => [
        "AdminCourses",
        "AdminModules",
        { type: "AdminModules", id: `${courseId}-modules` },
        { type: "AdminModules", id: "LIST" },
        "Pathway",
        "DashboardSummary",
      ],
      async onQueryStarted({ courseId, moduleId, position }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData("getAdminCourseModules", courseId, (draft) => {
            if (Array.isArray(draft) && !draft.some((m: any) => (m.moduleId || m.id) === moduleId)) {
              draft.push({ moduleId, position, title: "New Module", status: "PUBLISHED" });
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    detachAdminCourseModule: builder.mutation({
      query: ({ courseId, moduleId }) => ({
        url: `/api/admin/courses/${courseId}/modules/${moduleId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, { courseId, moduleId }) => [
        "AdminCourses",
        "AdminModules",
        { type: "AdminModules", id: moduleId },
        { type: "AdminModules", id: `${courseId}-modules` },
        { type: "AdminModules", id: "LIST" },
        "Pathway",
        "DashboardSummary",
      ],
      async onQueryStarted({ courseId, moduleId }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData("getAdminCourseModules", courseId, (draft) => {
            if (Array.isArray(draft)) {
              const idx = draft.findIndex((m: any) => (m.moduleId || m.id) === moduleId);
              if (idx !== -1) draft.splice(idx, 1);
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    clearAdminCourseModules: builder.mutation({
      query: (courseId) => ({
        url: `/api/admin/courses/${courseId}/modules`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, courseId) => [
        "AdminCourses",
        "AdminModules",
        "AdminLessons",
        { type: "AdminModules", id: `${courseId}-modules` },
        { type: "AdminModules", id: "LIST" },
        "Pathway",
        "DashboardSummary",
      ],
    }),
    reorderAdminCourseModules: builder.mutation({
      query: ({ courseId, moduleIds }) => ({
        url: `/api/admin/courses/${courseId}/reorder-modules`,
        method: "POST",
        body: { moduleIds },
      }),
      invalidatesTags: (_res, _err, { courseId }) => [
        "AdminCourses",
        "AdminModules",
        { type: "AdminModules", id: `${courseId}-modules` },
        "Pathway",
        "DashboardSummary",
      ],
      async onQueryStarted({ courseId, moduleIds }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData("getAdminCourseModules", courseId, (draft) => {
            if (Array.isArray(draft)) {
              const map = new Map(draft.map((m: any) => [m.moduleId || m.id, m]));
              const reordered: any[] = [];
              moduleIds.forEach((id: string, idx: number) => {
                const item = map.get(id);
                if (item) {
                  item.position = idx + 1;
                  reordered.push(item);
                }
              });
              draft.splice(0, draft.length, ...reordered);
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Modules
    getAdminModules: builder.query({
      query: () => "/api/admin/modules",
      providesTags: ["AdminModules", { type: "AdminModules", id: "LIST" }],
    }),
    createAdminModule: builder.mutation({
      query: (body) => ({
        url: "/api/admin/modules",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AdminModules", { type: "AdminModules", id: "LIST" }, "Pathway"],
    }),
    updateAdminModule: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/admin/modules/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        "AdminModules",
        { type: "AdminModules", id },
        { type: "AdminModules", id: "LIST" },
        "Pathway",
        "DashboardSummary",
      ],
    }),
    getAdminModuleLessons: builder.query({
      query: (id) => `/api/admin/modules/${id}/lessons`,
      providesTags: (result, _err, id) =>
        result && Array.isArray(result)
          ? [
              ...result.map((l: any) => ({ type: "AdminLessons" as const, id: l.lessonId || l.id })),
              { type: "AdminLessons" as const, id: `${id}-lessons` },
              { type: "AdminLessons" as const, id: "LIST" },
            ]
          : [
              { type: "AdminLessons" as const, id: `${id}-lessons` },
              { type: "AdminLessons" as const, id: "LIST" },
            ],
    }),
    createAndAttachAdminModuleLesson: builder.mutation({
      query: ({ moduleId, ...body }) => ({
        url: `/api/admin/modules/${moduleId}/create-lesson`,
        method: "POST",
        body,
      }),
      invalidatesTags: (res, _err, { moduleId }) => [
        "AdminModules",
        "AdminLessons",
        { type: "AdminLessons", id: `${moduleId}-lessons` },
        ...(res?.id ? [{ type: "AdminLessons" as const, id: res.id }] : []),
        { type: "AdminLessons", id: "LIST" },
        "Pathway",
        "Lesson",
        "DashboardSummary",
        "Activities",
      ],
      async onQueryStarted({ moduleId, title, slug, content, videoUrl, durationMinutes }, { dispatch, queryFulfilled }) {
        const tempId = `temp_${Date.now()}`;
        const patchResult = dispatch(
          apiSlice.util.updateQueryData("getAdminModuleLessons", moduleId, (draft) => {
            if (Array.isArray(draft)) {
              const maxPos = draft.reduce((m: number, l: any) => Math.max(m, Number(l?.position) || 0), 0);
              draft.push({
                id: tempId,
                lessonId: tempId,
                position: maxPos + 1,
                title,
                slug,
                status: "PUBLISHED",
                content,
                videoUrl,
                durationMinutes,
              });
            }
          })
        );
        try {
          const { data } = await queryFulfilled;
          if (data) {
            dispatch(
              apiSlice.util.updateQueryData("getAdminModuleLessons", moduleId, (draft) => {
                if (Array.isArray(draft)) {
                  const idx = draft.findIndex((l: any) => l.lessonId === tempId || l.id === tempId);
                  if (idx !== -1) {
                    draft[idx] = { ...data, lessonId: data.id || data.lessonId };
                  }
                }
              })
            );
          }
        } catch {
          patchResult.undo();
        }
      },
    }),
    attachAdminModuleLesson: builder.mutation({
      query: ({ moduleId, lessonId, position }) => ({
        url: `/api/admin/modules/${moduleId}/lessons`,
        method: "POST",
        body: { lessonId, position },
      }),
      invalidatesTags: (_res, _err, { moduleId, lessonId }) => [
        "AdminModules",
        "AdminLessons",
        { type: "AdminLessons", id: `${moduleId}-lessons` },
        { type: "AdminLessons", id: lessonId },
        { type: "AdminLessons", id: "LIST" },
        "Pathway",
        "Lesson",
        "DashboardSummary",
      ],
      async onQueryStarted({ moduleId, lessonId, position }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData("getAdminModuleLessons", moduleId, (draft) => {
            if (Array.isArray(draft) && !draft.some((l: any) => (l.lessonId || l.id) === lessonId)) {
              draft.push({ lessonId, position, title: "New Lesson", status: "PUBLISHED" });
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    detachAdminModuleLesson: builder.mutation({
      query: ({ moduleId, lessonId }) => ({
        url: `/api/admin/modules/${moduleId}/lessons/${lessonId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, { moduleId, lessonId }) => [
        "AdminModules",
        "AdminLessons",
        { type: "AdminLessons", id: `${moduleId}-lessons` },
        { type: "AdminLessons", id: lessonId },
        { type: "AdminLessons", id: "LIST" },
        "Pathway",
        "Lesson",
        "DashboardSummary",
      ],
      async onQueryStarted({ moduleId, lessonId }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData("getAdminModuleLessons", moduleId, (draft) => {
            if (Array.isArray(draft)) {
              const idx = draft.findIndex((l: any) => (l.lessonId || l.id) === lessonId);
              if (idx !== -1) draft.splice(idx, 1);
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    reorderAdminModuleLessons: builder.mutation({
      query: ({ moduleId, lessonIds }) => ({
        url: `/api/admin/modules/${moduleId}/reorder-lessons`,
        method: "POST",
        body: { lessonIds },
      }),
      invalidatesTags: (_res, _err, { moduleId }) => [
        "AdminModules",
        "AdminLessons",
        { type: "AdminLessons", id: `${moduleId}-lessons` },
        "Pathway",
        "DashboardSummary",
      ],
      async onQueryStarted({ moduleId, lessonIds }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData("getAdminModuleLessons", moduleId, (draft) => {
            if (Array.isArray(draft)) {
              const map = new Map(draft.map((l: any) => [l.lessonId || l.id, l]));
              const reordered: any[] = [];
              lessonIds.forEach((id: string, idx: number) => {
                const item = map.get(id);
                if (item) {
                  item.position = idx + 1;
                  reordered.push(item);
                }
              });
              draft.splice(0, draft.length, ...reordered);
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    moveAdminModuleLesson: builder.mutation({
      query: ({ sourceModuleId, targetModuleId, lessonId, targetPosition }) => ({
        url: `/api/admin/modules/${sourceModuleId}/move-lesson`,
        method: "POST",
        body: { targetModuleId, lessonId, targetPosition },
      }),
      invalidatesTags: (_res, _err, { sourceModuleId, targetModuleId, lessonId }) => [
        "AdminModules",
        "AdminLessons",
        { type: "AdminLessons", id: `${sourceModuleId}-lessons` },
        { type: "AdminLessons", id: `${targetModuleId}-lessons` },
        { type: "AdminLessons", id: lessonId },
        "Pathway",
        "Lesson",
        "DashboardSummary",
      ],
    }),

    // Lessons
    getAdminLessons: builder.query({
      query: () => "/api/admin/lessons",
      providesTags: ["AdminLessons", { type: "AdminLessons", id: "LIST" }],
    }),
    getAdminLessonById: builder.query({
      query: (id) => `/api/admin/lessons/${id}`,
      providesTags: (_res, _err, id) => [{ type: "AdminLessons", id }],
    }),
    createAdminLesson: builder.mutation({
      query: (body) => ({
        url: "/api/admin/lessons",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AdminLessons", { type: "AdminLessons", id: "LIST" }, "Pathway"],
    }),
    updateAdminLesson: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/admin/lessons/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        "AdminLessons",
        { type: "AdminLessons", id },
        { type: "Lesson", id },
        "Pathway",
        "DashboardSummary",
        "Activities",
      ],
    }),

    // Students & Roster
    getAdminStudents: builder.query({
      query: (params) => ({
        url: "/api/admin/students",
        params,
      }),
      providesTags: ["AdminStudents"],
    }),
    getAdminEnrollments: builder.query({
      query: () => "/api/admin/enrollments",
      providesTags: ["AdminStudents"],
    }),

    // Mentorship & Cockpit
    getStudentMentor: builder.query({
      query: () => "/api/lms/mentor/me",
      providesTags: ["Cohort"],
    }),
    getMentorCockpit: builder.query({
      query: (params) => ({
        url: "/api/lms/mentor/cockpit",
        params,
      }),
      providesTags: ["Cohort", "Submissions"],
    }),
    getSubmissionsAudit: builder.query({
      query: (params) => ({
        url: "/api/lms/submissions/audit",
        params,
      }),
      providesTags: ["Submissions"],
    }),
    getAdminSubmissions: builder.query({
      query: (params) => ({
        url: "/api/admin/submissions",
        params,
      }),
      providesTags: ["Submissions"],
    }),
    getAdminSubmissionActivities: builder.query({
      query: (params) => ({
        url: "/api/admin/submissions/activities",
        params,
      }),
      providesTags: ["Submissions"],
    }),
    getAdminActivityDetail: builder.query({
      query: ({ activityId, ...params }: { activityId: string; [key: string]: any }) => ({
        url: `/api/admin/submissions/activities/${encodeURIComponent(activityId)}`,
        params,
      }),
      providesTags: ["Submissions"],
    }),
    getAdminActivityNotSubmitted: builder.query({
      query: ({ activityId, ...params }: { activityId: string; [key: string]: any }) => ({
        url: `/api/admin/submissions/activities/${encodeURIComponent(activityId)}/not-submitted`,
        params,
      }),
      providesTags: ["Submissions"],
    }),

    // Mentorship Allocation Endpoints
    getAdminMentors: builder.query({
      query: () => "/api/lms/mentors",
      providesTags: ["Cohort"],
    }),
    assignMentor: builder.mutation({
      query: (body) => ({
        url: "/api/admin/mentorship/assign",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AdminStudents", "Cohort", "Submissions"],
    }),
    unassignMentor: builder.mutation({
      query: (body) => ({
        url: "/api/admin/mentorship/unassign",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AdminStudents", "Cohort", "Submissions"],
    }),
    unenrollStudent: builder.mutation({
      query: ({ studentId, courseId }: { studentId: string; courseId?: string }) => ({
        url: `/api/admin/students/${studentId}/unenroll`,
        method: "POST",
        body: { courseId },
      }),
      invalidatesTags: ["AdminStudents", "Cohort", "AdminCourses"],
    }),

    // Course Assignments Studio (Practice vs Test)
    getCourseAssignments: builder.query({
      query: (params) => ({
        url: "/api/lms/assignments",
        params,
      }),
      providesTags: ["Lesson"],
    }),
    createCourseAssignment: builder.mutation({
      query: (body) => ({
        url: "/api/lms/assignments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Lesson"],
    }),
    submitAssessmentTask: builder.mutation({
      query: (body) => ({
        url: "/api/lms/assignments/submit",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Submissions", "Progress", "Activities"],
    }),
    gradeSubmission: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/lms/submissions/${id}/grade`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Submissions", "Cohort", "Activities"],
    }),

    // Calendar & Scheduling
    getCalendarEvents: builder.query({
      query: (params) => ({
        url: "/api/lms/calendar/events",
        params,
      }),
      providesTags: ["CalendarEvents"],
    }),
    createCalendarEvent: builder.mutation({
      query: (body) => ({
        url: "/api/lms/calendar/events",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CalendarEvents"],
    }),
    updateCalendarEvent: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/lms/calendar/events/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["CalendarEvents"],
    }),
    deleteCalendarEvent: builder.mutation({
      query: (id) => ({
        url: `/api/lms/calendar/events/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CalendarEvents"],
    }),

    // Lesson HLS & Simple MP4 Video hooks
    getLessonVideoStatus: builder.query({
      query: (lessonId: string) => `/api/admin/lessons/${lessonId}/video/status`,
    }),
    createLessonVideoCliToken: builder.mutation({
      query: (lessonId: string) => ({
        url: `/api/admin/lessons/${lessonId}/video/cli-token`,
        method: "POST",
      }),
    }),
    initSimpleVideoUpload: builder.mutation({
      query: ({
        lessonId,
        ...body
      }: {
        lessonId: string;
        fileName: string;
        contentType: string;
        sizeBytes: number;
      }) => ({
        url: `/api/admin/lessons/${lessonId}/video/simple-upload/init`,
        method: "POST",
        body,
      }),
    }),
    completeSimpleVideoUpload: builder.mutation({
      query: ({
        lessonId,
        blobPath,
        durationMinutes,
      }: {
        lessonId: string;
        blobPath: string;
        durationMinutes?: number;
      }) => ({
        url: `/api/admin/lessons/${lessonId}/video/simple-upload/complete`,
        method: "POST",
        body: { blobPath, durationMinutes },
      }),
    }),
    failSimpleVideoUpload: builder.mutation({
      query: ({ lessonId, error }: { lessonId: string; error: string }) => ({
        url: `/api/admin/lessons/${lessonId}/video/simple-upload/fail`,
        method: "POST",
        body: { error },
      }),
    }),
    getVideoSetupStatus: builder.query({
      query: () => `/api/admin/videos/setup-check`,
    }),
    checkVideoSetup: builder.mutation({
      query: () => ({
        url: `/api/admin/videos/setup-check?probe=1`,
        method: "POST",
      }),
    }),
    switchLessonVideoToLink: builder.mutation({
      query: (lessonId: string) => ({
        url: `/api/admin/lessons/${lessonId}/video/switch-to-link`,
        method: "POST",
      }),
    }),
    replaceLessonVideo: builder.mutation({
      query: (lessonId: string) => ({
        url: `/api/admin/lessons/${lessonId}/video/replace`,
        method: "POST",
      }),
    }),
    getLessonVideoAccess: builder.mutation({
      query: (lessonId: string) => ({
        url: `/api/lms/lessons/${lessonId}/video-access`,
        method: "POST",
      }),
    }),
  }),
});

export const {
  useCheckUserMutation,
  useLoginMutation,
  useAdminLoginMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useExchangeSsoCodeMutation,
  useGetMeQuery,
  useGetPublicPathwaysQuery,
  useGetPublicPathwayBySlugQuery,
  useGetCategoriesQuery,
  useGetCollegesQuery,
  useGetBranchesQuery,
  useGetMyPathwaysQuery,
  useGetPathwayContentQuery,
  useGetLessonContentQuery,
  useGetMyEnrollmentsQuery,

  // Admin & Mentor hooks
  useGetAdminDashboardStatsQuery,
  useGetAdminCoursesQuery,
  useGetAdminCourseByIdQuery,
  useCreateAdminCourseMutation,
  useUpdateAdminCourseMutation,
  useDuplicateAdminCourseMutation,
  useImportAdminCourseMutation,
  useDeleteAdminCourseMutation,
  useGetAdminCourseModulesQuery,
  useAttachAdminCourseModuleMutation,
  useDetachAdminCourseModuleMutation,
  useClearAdminCourseModulesMutation,
  useReorderAdminCourseModulesMutation,
  useGetAdminModulesQuery,
  useCreateAdminModuleMutation,
  useUpdateAdminModuleMutation,
  useGetAdminModuleLessonsQuery,
  useCreateAndAttachAdminModuleLessonMutation,
  useAttachAdminModuleLessonMutation,
  useDetachAdminModuleLessonMutation,
  useReorderAdminModuleLessonsMutation,
  useMoveAdminModuleLessonMutation,
  useGetAdminLessonsQuery,
  useGetAdminLessonByIdQuery,
  useCreateAdminLessonMutation,
  useUpdateAdminLessonMutation,
  useGetAdminStudentsQuery,
  useGetAdminEnrollmentsQuery,

  // Student LMS Progress & Submissions hooks
  useGetDashboardSummaryQuery,
  useRecordModuleVisitMutation,
  useGetStudentProgressQuery,
  useMarkLessonProgressMutation,
  useGetStudentSubmissionsQuery,
  useSubmitAssignmentMutation,
  useGetStudentActivitiesQuery,
  useUpdateProfileMutation,
  useGetNotesQuery,
  useSaveNoteMutation,
  useGetCohortDataQuery,

  // Mentorship & Assessment Studio hooks
  useGetStudentMentorQuery,
  useGetMentorCockpitQuery,
  useGetSubmissionsAuditQuery,
  useGetAdminSubmissionsQuery,
  useGetAdminSubmissionActivitiesQuery,
  useGetAdminActivityDetailQuery,
  useGetAdminActivityNotSubmittedQuery,
  useGetAdminMentorsQuery,
  useAssignMentorMutation,
  useUnassignMentorMutation,
  useUnenrollStudentMutation,
  useGetCourseAssignmentsQuery,
  useCreateCourseAssignmentMutation,
  useSubmitAssessmentTaskMutation,
  useGradeSubmissionMutation,

  // Calendar hooks
  useGetCalendarEventsQuery,
  useCreateCalendarEventMutation,
  useUpdateCalendarEventMutation,
  useDeleteCalendarEventMutation,
  useGetLessonVideoStatusQuery,
  useCreateLessonVideoCliTokenMutation,
  useInitSimpleVideoUploadMutation,
  useCompleteSimpleVideoUploadMutation,
  useFailSimpleVideoUploadMutation,
  useGetVideoSetupStatusQuery,
  useCheckVideoSetupMutation,
  useSwitchLessonVideoToLinkMutation,
  useReplaceLessonVideoMutation,
  useGetLessonVideoAccessMutation,
} = apiSlice;
