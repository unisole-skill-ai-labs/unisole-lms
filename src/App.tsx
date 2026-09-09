import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "./store/authSlice";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/guards/ProtectedRoute";

import DashboardPage from "./pages/DashboardPage";
import PathwayDetailPage from "./pages/PathwayDetailPage";
import EnrolledCoursesPage from "./pages/EnrolledCoursesPage";
import LmsPlayerPage from "./pages/LmsPlayerPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import NotFoundPage from "./pages/NotFoundPage";

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
    <Routes>
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
          path="learn/:pathwayId"
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
  );
}
