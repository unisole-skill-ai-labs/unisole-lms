import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Phone,
  User,
  GraduationCap,
  BookOpen,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import {
  useCheckUserMutation,
  useLoginMutation,
  useGetCollegesQuery,
  useGetBranchesQuery,
} from "../../store/apiSlice";
import { setCredentials } from "../../store/authSlice";
import { extractErrorMessage } from "../../utils/error";

type AuthStep = "PHONE" | "PROFILE_SETUP";

interface MobileOtpFormProps {
  initialMode?: "login" | "register";
}

const DEFAULT_COLLEGES = [
  { id: "dtu", name: "Delhi Technological University (DTU)" },
  { id: "iitd", name: "Indian Institute of Technology Delhi (IITD)" },
  { id: "nsut", name: "Netaji Subhas University of Technology (NSUT)" },
  { id: "iiitd", name: "Indraprastha Institute of Information Technology Delhi (IIITD)" },
  { id: "nit", name: "National Institute of Technology (NIT)" },
  { id: "au", name: "Anna University" },
  { id: "other", name: "Other University / College" },
];

const DEFAULT_BRANCHES = [
  { id: "cse", name: "Computer Science & Engineering (CSE)" },
  { id: "it", name: "Information Technology (IT)" },
  { id: "aiml", name: "Artificial Intelligence & Machine Learning (AIML)" },
  { id: "ds", name: "Data Science & Big Data Analytics" },
  { id: "ece", name: "Electronics & Communication Engineering (ECE)" },
  { id: "eee", name: "Electrical & Electronics Engineering (EEE)" },
  { id: "mech", name: "Mechanical Engineering (MECH)" },
  { id: "civil", name: "Civil Engineering (CIVIL)" },
  { id: "cs", name: "Cyber Security & Digital Forensics" },
  { id: "bca_mca", name: "Computer Applications (BCA / MCA)" },
  { id: "bba_mba", name: "Management & Business Studies (BBA / MBA)" },
  { id: "other", name: "Other / Multidisciplinary" },
];

export default function MobileOtpForm({ initialMode = "login" }: MobileOtpFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const from = new URLSearchParams(location.search).get("redirect") || "/enrolled";

  // Form states
  const [step, setStep] = useState<AuthStep>("PHONE");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("");
  const [customCollege, setCustomCollege] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [customBranch, setCustomBranch] = useState("");

  // Data queries for dropdowns
  const { data: serverColleges = [] } = useGetCollegesQuery(undefined);
  const selectedCollegeObj = serverColleges.find(
    (c: any) => c.name === selectedCollege || c.id === selectedCollege
  );
  const { data: serverBranches = [] } = useGetBranchesQuery(selectedCollegeObj?.id);

  const collegeOptions = serverColleges.length > 0 ? serverColleges : DEFAULT_COLLEGES;
  const branchOptions = serverBranches.length > 0 ? serverBranches : DEFAULT_BRANCHES;

  const [errorMsg, setErrorMsg] = useState("");

  const [checkUserMutation, { isLoading: isCheckingUser }] = useCheckUserMutation();
  const [loginMutation, { isLoading: isLoggingIn }] = useLoginMutation();

  // Step 1: User enters phone number and clicks continue
  const handlePhoneSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      const checkRes = await checkUserMutation({ phone: cleanPhone }).unwrap();

      if (checkRes.exists && checkRes.user) {
        // User exists: login directly and redirect
        const response = await loginMutation({ phone: cleanPhone }).unwrap();
        dispatch(setCredentials(response));
        navigate(from, { replace: true });
      } else {
        // New user: ask for Name, College, Branch
        setStep("PROFILE_SETUP");
      }
    } catch {
      // Fallback: ask for profile details
      setStep("PROFILE_SETUP");
    }
  };

  // Step 2: New user fills profile and completes registration directly
  const handleProfileSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number");
      setStep("PHONE");
      return;
    }

    if (!name.trim()) {
      setErrorMsg("Please enter your full name");
      return;
    }

    const effectiveCollege =
      selectedCollege === "other" || selectedCollege === "Other University / College"
        ? customCollege.trim()
        : selectedCollege.trim();

    if (!effectiveCollege) {
      setErrorMsg("Please select or enter your college / university");
      return;
    }

    const effectiveBranch =
      selectedBranch === "other" || selectedBranch === "Other / Multidisciplinary"
        ? customBranch.trim()
        : selectedBranch.trim();

    if (!effectiveBranch) {
      setErrorMsg("Please select or enter your branch / field of study");
      return;
    }

    try {
      const response = await loginMutation({
        phone: cleanPhone,
        name: name.trim(),
        collegeName: effectiveCollege,
        collegeId: selectedCollegeObj?.id || undefined,
        branch: effectiveBranch,
      }).unwrap();

      dispatch(setCredentials(response));
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, "Failed to complete registration. Please try again."));
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-md w-full mx-auto shadow-2xl border border-zinc-200/80 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-3 shadow-inner">
          <Phone className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {step === "PROFILE_SETUP" ? "Complete Registration" : "Login / Register"}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {step === "PROFILE_SETUP"
            ? "Enter your details to create your Unisole LMS student account"
            : "Enter your 10-digit mobile number to access your pathways and courses"}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {step === "PHONE" && (
        /* STEP 1: Phone */
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
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
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                maxLength={10}
                required
                autoFocus
                className="w-full pl-20 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono font-bold"
              />
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
              New or existing learner — enter mobile number to start instantly.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={isCheckingUser || isLoggingIn}
            icon={ArrowRight}
          >
            Continue to Start
          </Button>

          <p className="text-[11px] text-center text-zinc-400 dark:text-zinc-500 pt-1">
            Direct instant authentication.
          </p>
        </form>
      )}

      {step === "PROFILE_SETUP" && (
        /* STEP 2: New User Profile Details */
        <form onSubmit={handleProfileSubmit} className="space-y-3.5 animate-fade-in">
          <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-medium">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Learner Mobile: <strong>+91 {phone}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep("PHONE");
                setErrorMsg("");
              }}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              Change
            </button>
          </div>

          <Input
            label="Full Name *"
            type="text"
            required
            autoFocus
            placeholder="e.g. Alex Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={User}
          />

          {/* College Name Dropdown */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              College / University <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <GraduationCap className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                required
                className="w-full pl-10 pr-9 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">-- Select Your College / University --</option>
                {collegeOptions.map((c: any) => (
                  <option key={c.id || c.slug || c.name} value={c.name}>
                    {c.name} {c.shortName ? `(${c.shortName})` : ""}
                  </option>
                ))}
                <option value="other">Other University / College (Specify below)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {(selectedCollege === "other" || selectedCollege === "Other University / College") && (
              <div className="pt-2 animate-fade-in">
                <Input
                  label="Specify College / University Name *"
                  type="text"
                  required
                  placeholder="Enter your college name"
                  value={customCollege}
                  onChange={(e) => setCustomCollege(e.target.value)}
                  icon={GraduationCap}
                />
              </div>
            )}
          </div>

          {/* Academic Branch Dropdown */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Branch / Specialization <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <BookOpen className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                required
                className="w-full pl-10 pr-9 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">-- Select Your Academic Branch --</option>
                {branchOptions.map((b: any) => (
                  <option key={b.id || b.code || b.name} value={b.name}>
                    {b.name} {b.code ? `(${b.code})` : ""}
                  </option>
                ))}
                <option value="other">Other / Multidisciplinary (Specify below)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {(selectedBranch === "other" || selectedBranch === "Other / Multidisciplinary") && (
              <div className="pt-2 animate-fade-in">
                <Input
                  label="Specify Branch / Stream Name *"
                  type="text"
                  required
                  placeholder="e.g. Chemical, Biotechnology, etc."
                  value={customBranch}
                  onChange={(e) => setCustomBranch(e.target.value)}
                  icon={BookOpen}
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            loading={isLoggingIn}
            icon={ArrowRight}
          >
            Start Learning Now
          </Button>
        </form>
      )}
    </div>
  );
}
