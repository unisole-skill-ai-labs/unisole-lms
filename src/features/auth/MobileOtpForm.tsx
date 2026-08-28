import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Phone, User, KeyRound, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Sparkles, RefreshCw, MessageSquare } from "lucide-react";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { useSendOtpMutation, useVerifyOtpMutation } from "../../store/apiSlice";
import { setCredentials } from "../../store/authSlice";
import { extractErrorMessage } from "../../utils/error";

export default function MobileOtpForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const from = new URLSearchParams(location.search).get("redirect") || "/enrolled";

  // Form states
  const [step, setStep] = useState(1); // 1: Enter Phone & Name, 2: Enter OTP
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState("SMS"); // "SMS" | "WHATSAPP"
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [countdown, setCountdown] = useState(0);

  const otpInputRef = useRef<HTMLInputElement>(null);

  const [sendOtpMutation, { isLoading: isSendingOtp }] = useSendOtpMutation();
  const [verifyOtpMutation, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();

  // Resend OTP countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Focus OTP input when transitioning to step 2
  useEffect(() => {
    if (step === 2 && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      const result = await sendOtpMutation({
        phone: cleanPhone,
        channel,
      }).unwrap();

      if (result.dummyOtp) {
        setOtp(result.dummyOtp);
        setSuccessMsg(`OTP sent via ${channel}! (Dev Code: ${result.dummyOtp})`);
      } else {
        setSuccessMsg(`Verification code sent to +91 ${cleanPhone} via ${channel}`);
      }

      setStep(2);
      setCountdown(30);
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, "Failed to send OTP. Please try again."));
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) {
      setErrorMsg("Please provide a valid phone number");
      return;
    }

    if (!otp || otp.trim().length === 0) {
      setErrorMsg("Please enter the 4-digit OTP");
      return;
    }

    try {
      const response = await verifyOtpMutation({
        phone: cleanPhone,
        otp: otp.trim(),
        name: name.trim() || undefined,
      }).unwrap();

      dispatch(setCredentials(response));
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, "Invalid or expired OTP code. Please try again."));
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-md w-full mx-auto shadow-2xl border border-zinc-200/80 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-3 shadow-inner">
          <Phone className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {step === 1 ? "Sign In to Unisole LMS" : "Verify Mobile OTP"}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {step === 1
            ? "Enter your 10-digit mobile number to access your pathways and courses"
            : `We sent a 4-digit verification code to +91 ${phone.replace(/\D/g, "")}`}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <Input
            label="Full Name (Optional for new learners)"
            type="text"
            placeholder="e.g. Alex Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={User}
          />

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Mobile Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 border-r border-zinc-200 dark:border-zinc-800 pr-2 font-mono">
                🇮🇳 +91
              </div>
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                required
                className="w-full pl-20 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono font-medium"
              />
            </div>
          </div>

          {/* OTP Channel Selector */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              OTP Delivery Channel
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel("SMS")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  channel === "SMS"
                    ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-400 shadow-xs"
                    : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                <Phone className="w-3.5 h-3.5" /> SMS
              </button>
              <button
                type="button"
                onClick={() => setChannel("WHATSAPP")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  channel === "WHATSAPP"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-xs"
                    : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={isSendingOtp}
            icon={ArrowRight}
          >
            Send Verification Code
          </Button>

          <p className="text-[11px] text-center text-zinc-400 dark:text-zinc-500 pt-2">
            By signing in, you agree to Unisole's Terms of Service and Privacy Policy.
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <Input
            ref={otpInputRef}
            label="4-Digit Verification Code"
            type="text"
            placeholder="1234"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={4}
            required
            icon={KeyRound}
            className="text-center font-mono text-lg tracking-widest"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={isVerifyingOtp}
          >
            Verify & Sign In
          </Button>

          <div className="pt-2 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-semibold flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Change Number
            </button>

            {countdown > 0 ? (
              <span className="text-zinc-400 dark:text-zinc-500 font-medium font-mono">Resend in {countdown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
