import React, { useState } from "react";
import { ChevronDown, ChevronRight, Play, FileText, CheckCircle2, Clock, BookOpen, Layers } from "lucide-react";
import Badge from "../../components/ui/Badge";

export default function CurriculumSidebar({
  pathway,
  courses = [],
  activeLessonId,
  onSelectLesson,
}) {
  // Track open course & module accordions
  const [expandedCourses, setExpandedCourses] = useState(() => {
    // Open the first course by default
    const initial = {};
    if (courses.length > 0) {
      initial[courses[0].id] = true;
    }
    return initial;
  });

  const [expandedModules, setExpandedModules] = useState(() => {
    // Open the first module of the first course by default
    const initial = {};
    if (courses[0]?.modules?.length > 0) {
      initial[courses[0].modules[0].id] = true;
    }
    return initial;
  });

  const toggleCourse = (courseId) => {
    setExpandedCourses((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  return (
    <div className="w-full bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto">
      {/* Pathway Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 sticky top-0 z-10">
        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
          Pathway Curriculum
        </span>
        <h2 className="font-extrabold text-sm text-slate-900 line-clamp-2 leading-tight">
          {pathway?.title || "Learning Pathway"}
        </h2>
      </div>

      {/* Courses Accordion Tree */}
      <div className="divide-y divide-slate-100 p-2 space-y-2">
        {courses.map((course, courseIndex) => {
          const isCourseExpanded = !!expandedCourses[course.id];
          const modules = course.modules || [];

          return (
            <div key={course.id} className="rounded-xl border border-slate-200/80 overflow-hidden bg-white">
              {/* Course Header */}
              <button
                onClick={() => toggleCourse(course.id)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2 pr-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {courseIndex + 1}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 leading-snug">
                      {course.title}
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      {modules.length} {modules.length === 1 ? "Module" : "Modules"}
                    </span>
                  </div>
                </div>

                {isCourseExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>

              {/* Modules within Course */}
              {isCourseExpanded && (
                <div className="bg-slate-50/50 p-2 space-y-1.5 border-t border-slate-100">
                  {modules.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic p-2">No modules available in this course.</p>
                  ) : (
                    modules.map((module, modIndex) => {
                      const isModuleExpanded = expandedModules[module.id] ?? true;
                      const lessons = module.lessons || [];

                      return (
                        <div key={module.id} className="rounded-lg border border-slate-200/60 bg-white overflow-hidden">
                          {/* Module Bar */}
                          <button
                            onClick={() => toggleModule(module.id)}
                            className="w-full px-2.5 py-2 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="line-clamp-1">{module.title}</span>
                            </div>
                            {isModuleExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                          </button>

                          {/* Lessons in Module */}
                          {isModuleExpanded && (
                            <div className="py-1 px-1 space-y-0.5 border-t border-slate-100 bg-slate-50/30">
                              {lessons.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic p-1.5">No lessons yet.</p>
                              ) : (
                                lessons.map((lesson) => {
                                  const isActive = activeLessonId === lesson.id;
                                  return (
                                    <button
                                      key={lesson.id}
                                      onClick={() => onSelectLesson(lesson)}
                                      className={`w-full px-2.5 py-2 rounded-md flex items-center justify-between text-left transition-all text-xs ${
                                        isActive
                                          ? "bg-indigo-600 text-white font-bold shadow-xs"
                                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 pr-2 overflow-hidden">
                                        <Play className={`w-3 h-3 shrink-0 ${isActive ? "text-white" : "text-indigo-600"}`} />
                                        <span className="truncate">{lesson.title}</span>
                                      </div>

                                      {lesson.durationMinutes ? (
                                        <span className={`text-[10px] shrink-0 ${isActive ? "text-indigo-200" : "text-slate-400"}`}>
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
