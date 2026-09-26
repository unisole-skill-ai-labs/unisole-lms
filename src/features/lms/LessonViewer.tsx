import React, { useState } from "react";
import {
  Play,
  ArrowLeft,
  ArrowRight,
  Clock,
  BookOpen,
  CheckCircle2,
  Video,
  FileText,
  Code2,
  Copy,
  Check,
  Download,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Send,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { parseLessonContent } from "../../utils/formatContent";

interface LessonViewerProps {
  lesson: any;
  isLoading: boolean;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

export default function LessonViewer({
  lesson,
  isLoading,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}: LessonViewerProps) {
  // State for code snippet copying
  const [copiedCode, setCopiedCode] = useState(false);

  // State for interactive Quiz
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<string, number>>({});
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);

  // State for Assignment submission
  const [assignmentSubmission, setAssignmentSubmission] = useState("");
  const [assignmentSubmitted, setAssignmentSubmitted] = useState(false);

  if (isLoading) {
    return (
      <div className="p-8 sm:p-16 flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Loading lesson content & media...</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="p-8 sm:p-16 flex flex-col items-center justify-center min-h-[400px] text-center space-y-3">
        <BookOpen className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">Select a lesson to begin learning</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
          Choose any lesson from the curriculum outline sidebar to start watching videos and reading study material.
        </p>
      </div>
    );
  }

  // Parse structured lesson content (from CMS or legacy markdown)
  const parsedContent = parseLessonContent(lesson.content);

  // Format video URL into embed iframe if it's YouTube
  const formatVideoEmbed = (url: string) => {
    if (!url) return null;

    if (url.includes("youtube.com/watch?v=")) {
      const videoId = url.split("v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
    }
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
    }
    return url;
  };

  const embedUrl = formatVideoEmbed(lesson.videoUrl);

  const handleCopyCode = () => {
    if (parsedContent.codeSnippet) {
      navigator.clipboard.writeText(parsedContent.codeSnippet);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Quiz calculations
  const quizQuestions = parsedContent.quiz?.questions || [];
  const passingScore = parsedContent.quiz?.passingScorePercent ?? 70;

  const totalQuestions = quizQuestions.length;
  let correctCount = 0;
  if (isQuizSubmitted) {
    quizQuestions.forEach((q) => {
      if (selectedQuizAnswers[q.id] === q.correctOptionIndex) {
        correctCount += 1;
      }
    });
  }
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const isPassed = scorePercent >= passingScore;

  return (
    <div className="p-2 sm:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Video Player Section */}
      {lesson.videoUrl ? (
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-zinc-200/80 dark:border-zinc-800 bg-black aspect-video relative">
          {embedUrl && embedUrl.includes("youtube.com/embed") ? (
            <iframe
              src={embedUrl}
              title={lesson.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={lesson.videoUrl}
              controls
              className="w-full h-full object-contain"
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-8 sm:p-12 text-center space-y-2">
          <FileText className="w-10 h-10 text-indigo-500 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {parsedContent.type === "QUIZ"
              ? "Interactive Knowledge Check"
              : parsedContent.type === "ASSIGNMENT"
              ? "Hands-on Practical Task"
              : "Interactive Reading & Study Lesson"}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            {parsedContent.type === "QUIZ"
              ? "Test your understanding of the concepts covered in this module."
              : parsedContent.type === "ASSIGNMENT"
              ? "Complete the practical task instructions and submit your work for mentor review."
              : "This module focuses on core concepts, architecture breakdowns, and hands-on code examples."}
          </p>
        </div>
      )}

      {/* Lesson Metadata Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="brand" size="sm">
              {parsedContent.type === "QUIZ"
                ? "Quiz"
                : parsedContent.type === "ASSIGNMENT"
                ? "Task"
                : "Lesson"}
            </Badge>
            {lesson.durationMinutes && (
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {lesson.durationMinutes} minutes
              </span>
            )}
            {parsedContent.isFreePreview && (
              <Badge variant="default" size="sm">
                Free Preview
              </Badge>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 leading-tight">
            {lesson.title}
          </h1>

          {lesson.description && (
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {lesson.description}
            </p>
          )}
        </div>

        {/* Previous / Next Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!hasPrevious}
            icon={ArrowLeft}
          >
            Previous
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onNext}
            disabled={!hasNext}
            icon={ArrowRight}
          >
            Next Lesson
          </Button>
        </div>
      </div>

      {/* ──────────────── QUIZ SECTION ──────────────── */}
      {parsedContent.type === "QUIZ" && quizQuestions.length > 0 && (
        <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
              <HelpCircle className="w-4 h-4" />
              <span>Knowledge Assessment</span>
            </div>
            <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">
              Passing criteria: {passingScore}%
            </span>
          </div>

          <div className="space-y-6">
            {quizQuestions.map((q, qIndex) => {
              const selectedOpt = selectedQuizAnswers[q.id];
              return (
                <div
                  key={q.id || qIndex}
                  className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-3"
                >
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 mr-2">
                      Q{qIndex + 1}.
                    </span>
                    {q.question || "Untitled Question"}
                  </p>

                  <div className="space-y-2 pt-1">
                    {q.options.map((opt, optIndex) => {
                      if (!opt) return null;
                      const isSelected = selectedOpt === optIndex;
                      const isCorrect = q.correctOptionIndex === optIndex;

                      let optStyles =
                        "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200";

                      if (isQuizSubmitted) {
                        if (isCorrect) {
                          optStyles =
                            "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium";
                        } else if (isSelected && !isCorrect) {
                          optStyles =
                            "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200";
                        }
                      } else if (isSelected) {
                        optStyles =
                          "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium";
                      }

                      return (
                        <button
                          key={optIndex}
                          type="button"
                          disabled={isQuizSubmitted}
                          onClick={() =>
                            setSelectedQuizAnswers((prev) => ({
                              ...prev,
                              [q.id]: optIndex,
                            }))
                          }
                          className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-3 ${optStyles}`}
                        >
                          <span>{opt}</span>
                          {isQuizSubmitted && isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          {isQuizSubmitted && isSelected && !isCorrect && (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isQuizSubmitted && q.explanation && (
                    <div className="mt-3 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-0.5">
                        Explanation:
                      </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quiz Action & Results Bar */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {!isQuizSubmitted ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsQuizSubmitted(true)}
                disabled={Object.keys(selectedQuizAnswers).length === 0}
              >
                Submit Answers
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl text-xs font-bold font-mono ${
                      isPassed
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    Score: {scorePercent}% ({correctCount}/{totalQuestions})
                  </div>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                    {isPassed
                      ? "Great job! You passed the quiz."
                      : "Did not meet passing score. Review notes and try again."}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsQuizSubmitted(false);
                    setSelectedQuizAnswers({});
                  }}
                >
                  Retry Quiz
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────── PRACTICAL ASSIGNMENT SECTION ──────────────── */}
      {parsedContent.type === "ASSIGNMENT" && parsedContent.assignment && (
        <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
              <FileCheck className="w-4 h-4" />
              <span>Practical Task & Submission</span>
            </div>
            {parsedContent.assignment.maxPoints && (
              <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">
                Max Points: {parsedContent.assignment.maxPoints}
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Instructions
              </h3>
              <div
                className="rich-content text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed bg-zinc-50 dark:bg-zinc-950/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800"
                dangerouslySetInnerHTML={{
                  __html:
                    parsedContent.assignment.instructions ||
                    "<p class='text-zinc-400 italic'>No specific instructions provided.</p>",
                }}
              />
            </div>

            {/* Submission Form */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Submit Your Work (GitHub Repository Link, Demo URL, or Solution Notes):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://github.com/your-username/repo-name"
                  value={assignmentSubmission}
                  disabled={assignmentSubmitted}
                  onChange={(e) => setAssignmentSubmission(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!assignmentSubmission.trim() || assignmentSubmitted}
                  onClick={() => setAssignmentSubmitted(true)}
                  icon={Send}
                >
                  {assignmentSubmitted ? "Submitted" : "Submit"}
                </Button>
              </div>
              {assignmentSubmitted && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Your submission has been recorded and will be reviewed by the mentor team.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── STUDY MATERIAL & CODE NOTES ──────────────── */}
      {parsedContent.contentHtml && parsedContent.contentHtml.trim() ? (
        <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <Code2 className="w-4 h-4" />
            <span>Study Material & Code Notes</span>
          </div>
          <div
            className="rich-content text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-normal"
            dangerouslySetInnerHTML={{ __html: parsedContent.contentHtml }}
          />
        </div>
      ) : (
        parsedContent.type === "READING" && (
          <div className="text-xs text-zinc-400 dark:text-zinc-600 italic p-4 text-center">
            No study notes written for this lesson.
          </div>
        )
      )}

      {/* ──────────────── CODE SNIPPET BOX ──────────────── */}
      {parsedContent.codeSnippet && parsedContent.codeSnippet.trim() && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-md">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase ml-2">
                {parsedContent.codeLanguage || "Code Example"}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 transition-colors"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          {/* Code Body */}
          <pre className="p-4 sm:p-5 text-xs font-mono text-zinc-200 bg-zinc-950 overflow-x-auto leading-relaxed">
            <code>{parsedContent.codeSnippet}</code>
          </pre>
        </div>
      )}

      {/* ──────────────── DOWNLOADABLE ATTACHMENTS ──────────────── */}
      {parsedContent.attachments && parsedContent.attachments.length > 0 && (
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl space-y-3 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
            Downloadable Resources & Files
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {parsedContent.attachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {att.name}
                  </span>
                </div>
                <Download className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600 shrink-0 ml-2" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="pt-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={!hasPrevious}
          icon={ArrowLeft}
        >
          Previous Lesson
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onNext}
          disabled={!hasNext}
          icon={ArrowRight}
        >
          Next Lesson
        </Button>
      </div>
    </div>
  );
}
