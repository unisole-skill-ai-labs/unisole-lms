import React from "react";
import { Play, ArrowLeft, ArrowRight, Clock, BookOpen, CheckCircle, Video, FileText, Code2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";

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
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Interactive Reading & Lab Lesson</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            This module focuses on core concepts, architecture breakdowns, and hands-on code examples.
          </p>
        </div>
      )}

      {/* Lesson Metadata Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="brand" size="sm">
              Current Lesson
            </Badge>
            {lesson.durationMinutes && (
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {lesson.durationMinutes} minutes
              </span>
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

      {/* Lesson Study Material / Code Notes */}
      {lesson.content ? (
        <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
            <Code2 className="w-4 h-4" />
            <span>Study Material & Code Notes</span>
          </div>
          <div className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed space-y-4 whitespace-pre-line font-normal">
            {lesson.content}
          </div>
        </div>
      ) : (
        <div className="text-xs text-zinc-400 dark:text-zinc-600 italic">
          No written transcript or notes for this lesson.
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
