import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { setCredentials, logout } from "./authSlice";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? "https://api.unisole.org"
    : "http://localhost:3000")
).replace(/\/+$/, "");

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refreshToken = api.getState().auth.refreshToken;
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
  tagTypes: ["Pathway", "Category", "College", "Enrollment", "Lesson", "User", "Payment"],
  endpoints: (builder) => ({
    // ─── Auth Endpoints ──────────────────────────────────────────────────────────
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
      invalidatesTags: ["User", "Enrollment", "Pathway"],
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
              ...result.map(({ id }) => ({ type: "Pathway", id })),
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

    // ─── Student LMS Endpoints (Authenticated) ───────────────────────────────────
    getMyPathways: builder.query({
      query: () => "/api/lms/pathways",
      providesTags: [{ type: "Pathway", id: "MY_LIST" }, { type: "Enrollment", id: "LIST" }],
    }),
    getPathwayContent: builder.query({
      query: (pathwayId) => `/api/lms/pathways/${pathwayId}`,
      providesTags: (_result, _error, id) => [{ type: "Pathway", id: `${id}-CONTENT` }],
    }),
    getLessonContent: builder.query({
      query: (lessonId) => `/api/lms/lessons/${lessonId}`,
      providesTags: (_result, _error, id) => [{ type: "Lesson", id }],
    }),
    getMyEnrollments: builder.query({
      query: () => "/api/lms/enrollments",
      providesTags: [{ type: "Enrollment", id: "LIST" }],
    }),

    // ─── Payments & Commerce Endpoints ───────────────────────────────────────────
    createPaymentOrder: builder.mutation({
      query: (body) => ({
        url: "/api/lms/payments/create-order",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Payment"],
    }),
    verifyPayment: builder.mutation({
      query: (body) => ({
        url: "/api/lms/payments/verify",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Enrollment", id: "LIST" },
        { type: "Pathway", id: "MY_LIST" },
        "Payment",
      ],
    }),
  }),
});

export const {
  useSendOtpMutation,
  useVerifyOtpMutation,
  useGetMeQuery,
  useGetPublicPathwaysQuery,
  useGetPublicPathwayBySlugQuery,
  useGetCategoriesQuery,
  useGetCollegesQuery,
  useGetMyPathwaysQuery,
  useGetPathwayContentQuery,
  useGetLessonContentQuery,
  useGetMyEnrollmentsQuery,
  useCreatePaymentOrderMutation,
  useVerifyPaymentMutation,
} = apiSlice;
