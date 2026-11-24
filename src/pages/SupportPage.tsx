import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  HelpCircle,
  ChevronDown,
  ExternalLink,
  MessageSquare,
  Clock,
  Sparkles,
  BookOpen,
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "How do I access and submit assignments or quizzes?",
    answer:
      "Navigate to your enrolled course player or the Activities tab. Open any quiz or lab activity, follow the interactive instructions, and click 'Submit' or 'Mark Complete' once finished. Your progress will be recorded automatically.",
  },
  {
    question: "When do upcoming weeks and course modules unlock?",
    answer:
      "Course modules follow a structured weekly schedule. Each module's unlock date is shown in your course overview and dashboard card ('Up next · Unlocks date'). Core materials and workshops become accessible on the scheduled date.",
  },
  {
    question: "How do live interactive workshops and mentor sessions work?",
    answer:
      "Live workshop sessions take place via Google Meet. When a live session is scheduled, a 'Join Live Class' button activates 10 minutes prior to the start time on your Dashboard and Calendar.",
  },
  {
    question: "How can I earn my verifiable course certificate?",
    answer:
      "To earn your certificate, complete all core lecture items, knowledge check quizzes, and hands-on capstone labs across all course modules. Once complete, your certificate will appear in your profile.",
  },
  {
    question: "What should I do if I encounter technical or playback issues?",
    answer:
      "Try refreshing the page or clearing browser cache. Ensure you have a stable network connection. If the issue persists, email our engineering mentor desk at support@unisole.in with your account details.",
  },
];

export default function SupportPage() {
  const navigate = useNavigate();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-[#0B0D13] py-4 sm:py-8 transition-colors">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Top Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            aria-label="Back to Dashboard"
            className="p-2 -ml-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Help & Support
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Assistance with your coursework, platform access, and mentorship
            </p>
          </div>
        </div>

        {/* Contact Support Card */}
        <section className="bg-white dark:bg-[#121622] rounded-3xl p-5 sm:p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Mail className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Mentor Desk & Technical Support
              </h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Have questions or doubts? Reach out directly
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Our engineering mentors and academic support team are available to help you with code reviews, lab setups, syllabus questions, and account inquiries.
          </p>

          <a
            href="mailto:support@unisole.in"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 transition-colors text-xs font-semibold text-slate-800 dark:text-slate-200 group"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Email Mentor Desk: <strong className="text-blue-600 dark:text-blue-400 font-bold">support@unisole.in</strong></span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          </a>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Typical response time: within 24 hours on business days</span>
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section className="bg-white dark:bg-[#121622] rounded-3xl p-5 sm:p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <HelpCircle className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="space-y-2">
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-3.5 text-left text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  >
                    <span className="pr-3">{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-3.5 pb-3.5 pt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
