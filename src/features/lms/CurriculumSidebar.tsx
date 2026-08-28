import React, { useState } from "react";
import { ChevronDown, ChevronRight, Play, FileText, CheckCircle2, Clock, BookOpen, Layers } from "lucide-react";
import Badge from "../../components/ui/Badge";

interface CurriculumSidebarProps {
  pathway: any;
  courses: any[];
  activeLessonId: string | null;
  onSelectLesson: (lesson: any) => void;
}

export default function CurriculumSidebar({
  pathway,
  courses = [],
  activeLessonId,
  onSelectLesson,
}: CurriculumSidebarProps) {
  // Track open course & module accordions
  const [expandedCourses, setExpandedCourses] = useState<{ [key: string]: boolean }>(() => {
    const initial: { [key: string]: boolean } = {};
    if (courses.length > 0) {
      initial[courses[0].id] = true;
    }
    return initial;
  });

  const [expandedModules, setExpandedModules] = useState<{ [key: string]: boolean }>(() => {
    const initial: { [key: string]: boolean } = {};
    if (courses[0]?.modules?.length > 0) {
      initial[courses[0].modules[0].id] = true;
    }
    return initial;
  });

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-900 flex flex-col h-full overflow-y-auto">
      {/* Pathway Header */}
      <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 sticky top-0 z-10">
        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1 font-mono">
          Curriculum Outline
        </span>
        <h2 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-tight">
          {pathway?.title || "Learning Pathway"}
        </h2>
      </div>

      {/* Courses Accordion Tree */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800 p-2 space-y-2">
        {courses.map((course: any, courseIndex: number) => {
          const isCourseExpanded = !!expandedCourses[course.id];
          const modules = course.modules || [];

          return (
            <div
              key={course.id}
              className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-xs"
            >
              {/* Course Header */}
              <button
                onClick={() => toggleCourse(course.id)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 pr-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                    {courseIndex + 1}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-snug">
                      {course.title}
                    </h3>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                      {modules.length} {modules.length === 1 ? "Module" : "Modules"}
                    </span>
                  </div>
                </div>

                {isCourseExpanded ? (
                  <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                )}
              </button>

              {/* Modules within Course */}
              {isCourseExpanded && (
                <div className="bg-zinc-50/50 dark:bg-zinc-950/40 p-2 space-y-1.5 border-t border-zinc-100 dark:border-zinc-800">
                  {modules.length === 0 ? (
                    <p className="text-[11px] text-zinc-400 italic p-2">No modules available in this course.</p>
                  ) : (
                    modules.map((module: any) => {
                      const isModuleExpanded = expandedModules[module.id] ?? true;
                      const lessons = module.lessons || [];

                      return (
                        <div
                          key={module.id}
                          className="rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 overflow-hidden"
                        >
                          {/* Module Bar */}
                          <button
                            onClick={() => toggleModule(module.id)}
                            className="w-full px-2.5 py-2 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                              <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="line-clamp-1">{module.title}</span>
                            </div>
                            {isModuleExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            )}
                          </button>

                          {/* Lessons in Module */}
                          {isModuleExpanded && (
                            <div className="py-1 px-1 space-y-0.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/30">
                              {lessons.length === 0 ? (
                                <p className="text-[10px] text-zinc-400 italic p-1.5">No lessons yet.</p>
                              ) : (
                                lessons.map((lesson: any) => {
                                  const isActive = activeLessonId === lesson.id;
                                  return (
                                    <button
                                      key={lesson.id}
                                      onClick={() => onSelectLesson(lesson)}
                                      className={`w-full px-2.5 py-2 rounded-md flex items-center justify-between text-left transition-all text-xs ${
                                        isActive
                                          ? "bg-indigo-600 text-white font-bold shadow-xs"
                                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 pr-2 overflow-hidden">
                                        <Play className={`w-3 h-3 shrink-0 ${isActive ? "text-white" : "text-indigo-500"}`} />
                                        <span className="truncate">{lesson.title}</span>
                                      </div>

                                      {lesson.durationMinutes ? (
                                        <span className={`text-[10px] shrink-0 font-mono ${isActive ? "text-indigo-200" : "text-zinc-400 dark:text-zinc-500"}`}>
                                          {lesson.durationMinutes}m
                                        </span>
                                      ) : null}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
