import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Menu, X, BookOpen, AlertCircle, Sparkles } from "lucide-react";
import {
  useGetPathwayContentQuery,
  useGetLessonContentQuery,
} from "../store/apiSlice";
import CurriculumSidebar from "../features/lms/CurriculumSidebar";
import LessonViewer from "../features/lms/LessonViewer";
import Spinner from "../components/ui/Spinner";
import Button from "../components/ui/Button";

export default function LmsPlayerPage() {
  const { pathwayId } = useParams();
  const navigate = useNavigate();

  const {
    data: pathwayData,
    isLoading: isPathwayLoading,
    error: pathwayError,
  } = useGetPathwayContentQuery(pathwayId);

  const pathway = pathwayData?.pathway;
  const courses = pathwayData?.courses || [];

  // Flatten all lessons into an ordered array for linear next/previous navigation
  const allLessons = useMemo(() => {
    const list = [];
    courses.forEach((course) => {
      (course.modules || []).forEach((mod) => {
        (mod.lessons || []).forEach((lesson) => {
          list.push({
            ...lesson,
            courseTitle: course.title,
            moduleTitle: mod.title,
          });
        });
      });
    });
    return list;
  }, [courses]);

  const [activeLessonId, setActiveLessonId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Set the first lesson as default when pathway loads
  useEffect(() => {
    if (allLessons.length > 0 && !activeLessonId) {
      setActiveLessonId(allLessons[0].id);
    }
  }, [allLessons, activeLessonId]);

  const {
    data: lessonDetail,
    isLoading: isLessonLoading,
  } = useGetLessonContentQuery(activeLessonId, {
    skip: !activeLessonId,
  });

  const currentIndex = allLessons.findIndex((l) => l.id === activeLessonId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allLessons.length - 1;

  const handleNext = () => {
    if (hasNext) {
      setActiveLessonId(allLessons[currentIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = () => {
    if (hasPrevious) {
      setActiveLessonId(allLessons[currentIndex - 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSelectLesson = (lesson) => {
    setActiveLessonId(lesson.id);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isPathwayLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Spinner label="Loading learning workspace..." size="lg" />
      </div>
    );
  }

  if (pathwayError) {
    const isForbidden = (pathwayError as any)?.status === 403;
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">
          {isForbidden ? "Enrollment Required" : "Unable to Load Pathway"}
        </h2>
        <p className="text-xs text-slate-500">
          {isForbidden
            ? "You do not have an active enrollment in this pathway. Please enroll to access the lessons and videos."
            : "An unexpected error occurred while loading this pathway content."}
        </p>
        <div className="pt-2">
          <Link to="/">
            <Button variant="primary" size="sm" icon={ArrowLeft}>
              Explore Catalog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      {/* Mobile Sidebar Toggle Header */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <Button
          variant="primary"
          size="md"
          icon={sidebarOpen ? X : Menu}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="shadow-xl rounded-full px-4"
        >
          {sidebarOpen ? "Close Menu" : "Curriculum"}
        </Button>
      </div>

      {/* Desktop & Mobile Drawer Sidebar */}
      <div
        className={`fixed inset-y-16 left-0 z-40 w-80 lg:static lg:block transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <CurriculumSidebar
          pathway={pathway}
          courses={courses}
          activeLessonId={activeLessonId}
          onSelectLesson={handleSelectLesson}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          <LessonViewer
            lesson={lessonDetail}
            isLoading={isLessonLoading}
            onNext={handleNext}
            onPrevious={handlePrevious}
            hasNext={hasNext}
            hasPrevious={hasPrevious}
          />
        </div>
      </div>
    </div>
  );
}
