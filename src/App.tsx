import React, { useEffect, Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "./store/authSlice";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/guards/ProtectedRoute";

// Lazy-loaded student routes (A1: Code Splitting)
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const CatalogPage = lazy(() => import("./pages/CatalogPage"));
const PathwayDetailPage = lazy(() => import("./pages/PathwayDetailPage"));
const EnrolledCoursesPage = lazy(() => import("./pages/EnrolledCoursesPage"));
const ActivitiesPage = lazy(() => import("./pages/ActivitiesPage"));
const LmsPlayerPage = lazy(() => import("./pages/LmsPlayerPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const ArticlesPage = lazy(() => import("./pages/ArticlesPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

// Lazy-loaded Admin & Mentor Portal (Isolated from student bundle)
const AdminLayout = lazy(() => import("./components/layout/AdminLayout"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminCoursesPage = lazy(() => import("./pages/admin/AdminCoursesPage"));
const EditCoursePage = lazy(() => import("./pages/admin/EditCoursePage"));
const SubmissionsPage = lazy(() => import("./pages/admin/SubmissionsPage"));
const FilesPage = lazy(() => import("./pages/admin/FilesPage"));
const StudentsPage = lazy(() => import("./pages/admin/StudentsPage"));
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage"));

function PageLoader() {
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-6 animate-fade-in transition-opacity duration-200">
      <div className="w-7 h-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-2.5" />
      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 font-mono tracking-wider">Loading...</span>
    </div>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const location = useLocation();

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
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Dedicated Admin & Mentor Login */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Admin & Mentor Portal */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "SUPER_ADMIN", "MENTOR", "MEMBER", "COURSE_MANAGER", "PROGRAM_MANAGER"]}
              redirectTo="/dashboard"
            >
              <AdminLayout />
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
          <Route
            path="catalog"
            element={
              <ProtectedRoute>
                <CatalogPage />
              </ProtectedRoute>
            }
          />
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
            path="courses/:slug"
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
            path="activities"
            element={
              <ProtectedRoute>
                <ActivitiesPage />
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
            path="calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
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
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="payment-success"
            element={
              <ProtectedRoute>
                <PaymentSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="payment/success"
            element={
              <ProtectedRoute>
                <PaymentSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="thank-you"
            element={
              <ProtectedRoute>
                <PaymentSuccessPage />
              </ProtectedRoute>
            }
          />

          {/* 404 Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
