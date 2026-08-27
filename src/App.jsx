import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/guards/ProtectedRoute";

import DashboardPage from "./pages/DashboardPage";
import PathwayDetailPage from "./pages/PathwayDetailPage";
import EnrolledCoursesPage from "./pages/EnrolledCoursesPage";
import LmsPlayerPage from "./pages/LmsPlayerPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Public Catalog Routes */}
        <Route index element={<DashboardPage />} />
        <Route path="pathways/:slug" element={<PathwayDetailPage />} />
        <Route path="courses/:slug" element={<PathwayDetailPage />} />
        <Route path="payment-success" element={<PaymentSuccessPage />} />
        <Route path="payment/success" element={<PaymentSuccessPage />} />
        <Route path="thank-you" element={<PaymentSuccessPage />} />

        {/* Auth Routes */}
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />

        {/* Protected Student Routes */}
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

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
