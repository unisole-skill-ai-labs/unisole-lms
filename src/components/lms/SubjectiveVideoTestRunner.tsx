import React, { useState } from "react";
import { CheckCircle2, Send, AlertCircle } from "lucide-react";
import { renderMarkdownToHtml } from "../../utils/formatContent";

interface SubjectiveVideoTestRunnerProps {
  type: "SUBJECTIVE_TEST" | "VIDEO_TEST";
  title: string;
  description: string;
  config?: any;
  onSubmit: (data: { text?: string; videoUrl?: string }) => Promise<void> | void;
  isCompleted?: boolean;
  attachment?: React.ReactNode;
  submissionSlot?: React.ReactNode;
}

function validateHttpUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Please enter a submission URL." };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "URL must start with http:// or https://" };
    }
    return { ok: true, url: trimmed };
  } catch {
    return { ok: false, error: "Please enter a valid http:// or https:// URL." };
  }
}

export default function SubjectiveVideoTestRunner({
  type,
  title,
  description,
  onSubmit,
  isCompleted,
  attachment,
  submissionSlot,
}: SubjectiveVideoTestRunnerProps) {
  const isVideo = type === "VIDEO_TEST";
  const [mobileTab, setMobileTab] = useState<"assignment" | "submit">("assignment");
  const [responseContent, setResponseContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [submitted, setSubmitted] = useState(isCompleted || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);

    if (isVideo) {
      const check = validateHttpUrl(videoUrl);
      if (check.ok === false) {
        setErrorMsg(check.error);
        return;
      }
      setIsSubmitting(true);
      try {
        await onSubmit({
          text: responseContent.trim() || undefined,
          videoUrl: check.url,
        });
        setVideoUrl(check.url);
        setSubmitted(true);
      } catch (err: any) {
        setErrorMsg(err?.message || "Failed to submit. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const trimmedText = responseContent.trim();
    if (!trimmedText) {
      setErrorMsg("Please enter your response before submitting.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({ text: trimmedText });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 space-y-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <div
              className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed prose prose-slate dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(description) }}
            />
          )}
        </div>

        {submitted && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>Submitted</span>
          </div>
        )}
      </div>

      {/* How to submit strip */}
      <div
        data-testid="how-to-submit-strip"
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3.5 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-slate-700 dark:text-slate-200"
      >
        <span className="font-bold text-sky-600 dark:text-sky-400">How to submit:</span>
        <span>1) Read the assignment</span>
        <span>2) Add your explanation, files or links</span>
        <span>3) Submit</span>
      </div>

      {submissionSlot ? (
        <>
          {/* Mobile tabs so Submit your work is reachable in first viewport at 390x844 */}
          <div className="flex lg:hidden items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              type="button"
              data-testid="tab-assignment"
              onClick={() => setMobileTab("assignment")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                mobileTab === "assignment"
                  ? "bg-sky-500 text-slate-950"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              Assignment
            </button>
            <button
              type="button"
              data-testid="tab-submit"
              onClick={() => setMobileTab("submit")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                mobileTab === "submit"
                  ? "bg-sky-500 text-slate-950"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              Submit your work
            </button>
          </div>

          <div className={attachment ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" : "space-y-4"}>
            {attachment && (
              <div className={`${mobileTab === "assignment" ? "block" : "hidden lg:block"} lg:col-span-7`}>
                {attachment}
              </div>
            )}
            <div
              className={`${mobileTab === "submit" || !attachment ? "block" : "hidden lg:block"} ${
                attachment ? "lg:col-span-5 lg:sticky lg:top-20" : ""
              }`}
            >
              {submissionSlot}
            </div>
          </div>
        </>
      ) : (
        <>
          {attachment}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {isVideo ? (
          <div className="space-y-2">
            <label
              htmlFor="assignment-submission-url"
              className="block text-xs font-bold text-slate-900 dark:text-slate-200"
            >
              Paste your submission URL
            </label>
            <input
              id="assignment-submission-url"
              type="url"
              disabled={submitted || isSubmitting}
              placeholder="https://..."
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label
              htmlFor="subjective-response-text"
              className="block text-xs font-bold text-slate-900 dark:text-slate-200"
            >
              Your Response
            </label>
            <textarea
              id="subjective-response-text"
              rows={8}
              disabled={submitted || isSubmitting}
              placeholder="Write your response here..."
              value={responseContent}
              onChange={(e) => {
                setResponseContent(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              className="w-full p-4 rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500 leading-relaxed font-sans"
            />
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 text-xs font-semibold text-rose-500 dark:text-rose-400"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={submitted || isSubmitting}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              submitted || isSubmitting
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/20 cursor-pointer"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{submitted ? "Submitted" : isSubmitting ? "Submitting..." : "Submit"}</span>
          </button>
        </div>
      </form>
      </>
      )}
    </div>
  );
}
