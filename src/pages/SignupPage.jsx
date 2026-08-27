import React from "react";
import MobileOtpForm from "../features/auth/MobileOtpForm";

export default function SignupPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <MobileOtpForm />
    </div>
  );
}

