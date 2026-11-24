import React, { useEffect, Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "./store/authSlice";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/guards/ProtectedRoute";
import ChunkErrorBoundary from "./components/common/ChunkErrorBoundary";
import PageSkeletonFallback from "./components/common/PageSkeletonFallback";
import { routeLoaders, prefetchCoreRoutesOnIdle } from "./utils/routePrefetch";

// Lazy-loaded student routes (A1: Code Splitting + Part 2: Shared Prefetch Cache)
const DashboardPage = lazy(routeLoaders.dashboard);
const PathwayDetailPage = lazy(routeLoaders.pathwayDetail);
const EnrolledCoursesPage = lazy(routeLoaders.enrolled);
const ActivitiesPage = lazy(routeLoaders.activities);
const LmsPlayerPage = lazy(routeLoaders.player);
const LoginPage = lazy(routeLoaders.login);
const RegisterPage = lazy(routeLoaders.register);
const ProfilePage = lazy(routeLoaders.profile);
const NotFoundPage = lazy(routeLoaders.notFound);
const CalendarPage = lazy(routeLoaders.calendar);
const ArticlesPage = lazy(routeLoaders.articles);
const NotificationsPage = lazy(routeLoaders.notifications);
const SupportPage = lazy(routeLoaders.support);
const SsoExchangePage = lazy(routeLoaders.sso);

// Lazy-loaded Admin & Mentor Portal (Isolated from student bundle)
const AdminLayout = lazy(routeLoaders.adminLayout);
const AdminDashboardPage = lazy(routeLoaders.adminDashboard);
const AdminCoursesPage = lazy(routeLoaders.adminCourses);
const EditCoursePage = lazy(routeLoaders.adminEditCourse);
const SubmissionsPage = lazy(routeLoaders.adminSubmissions);
const FilesPage = lazy(routeLoaders.adminFiles);
const StudentsPage = lazy(routeLoaders.adminStudents);
const AdminLoginPage = lazy(routeLoaders.adminLogin);

export default function App() {
  const dispatch = useDispatch();
  const location = useLocation();

  // Prefetch core routes in the background during idle time
  useEffect(() => {
    prefetchCoreRoutesOnIdle();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token") || params.get("auth_token");
    if (token) {
      dispatch(setCredentials({ token }));
      params.delete("token");
      params.delete("auth_token");
      const newSearch = params.toString() ? `?${params.toString()}` : "";
      window.history.replaceState({}, "", `${location.pathname}${newSearch}`);
    }
  }, [location, dispatch]);

  return (
    <Routes>
      {/* Dedicated Admin & Mentor Login */}
      <Route
        path="/admin/login"
        element={
          <ChunkErrorBoundary>
            <Suspense fallback={<PageSkeletonFallback />}>
              <AdminLoginPage />
            </Suspense>
          </ChunkErrorBoundary>
        }
      />

      {/* SSO Cross-Portal Code Exchange (outside auth guard, without heavy layout) */}
      <Route
        path="/sso"
        element={
          <ChunkErrorBoundary>
            <Suspense fallback={<PageSkeletonFallback />}>
              <SsoExchangePage />
            </Suspense>
          </ChunkErrorBoundary>
        }
      />

      {/* Admin & Mentor Portal */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN", "SUPER_ADMIN", "MENTOR", "MEMBER", "COURSE_MANAGER", "PROGRAM_MANAGER"]}
            redirectTo="/dashboard"
            loginPath="/admin/login"
          >
            <ChunkErrorBoundary>
              <Suspense fallback={<PageSkeletonFallback />}>
                <AdminLayout />
              </Suspense>
            </ChunkErrorBoundary>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="courses" element={<AdminCoursesPage />} />
        <Route path="courses/:courseId" element={<EditCoursePage />} />
        <Route path="submissions" element={<SubmissionsPage />} />
        <Route path="mentor-view" element={<SubmissionsPage initialMode="student" />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="students" element={<StudentsPage />} />
      </Route>

      {/* Main Student LMS Shell */}
      <Route path="/" element={<Layout />}>
        {/* sargam - Public Auth Entrypoints */}
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="signup" element={<Navigate to="/register" replace />} />

        {/* Protected LMS Routes - Full LMS Wall behind Login / Register */}
        <Route
          index
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="catalog" element={<Navigate to="/" replace />} />
        <Route
          path="articles"
          element={
            <ProtectedRoute>
              <ArticlesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pathways/:slug"
          element={
            <ProtectedRoute>
              <PathwayDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="enrolled"
          element={
            <ProtectedRoute>
              <EnrolledCoursesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="courses"
          element={
            <ProtectedRoute>
              <EnrolledCoursesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="activities"
          element={
            <ProtectedRoute>
              <ActivitiesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="learn/:pathwayId"
          element={
            <ProtectedRoute>
              <LmsPlayerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="player/:pathwayId"
          element={
            <ProtectedRoute>
              <LmsPlayerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="calendar"
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="support"
          element={
            <ProtectedRoute>
              <SupportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
