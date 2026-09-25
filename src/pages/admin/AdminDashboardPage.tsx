import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  BookOpen,
  ClipboardCheck,
  FolderArchive,
  Users,
  ArrowRight,
  Plus,
  Layers,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  useGetAdminCoursesQuery,
  useGetAdminLessonsQuery,
  useGetAdminStudentsQuery,
} from "../../store/apiSlice";

export default function AdminDashboardPage() {
  const { user } = useSelector((state: any) => state.auth);
  const { data: courses = [], isLoading: coursesLoading } = useGetAdminCoursesQuery(undefined);
  const { data: lessons = [], isLoading: lessonsLoading } = useGetAdminLessonsQuery(undefined);
  const { data: students = [], isLoading: studentsLoading } = useGetAdminStudentsQuery(undefined);

  const publishedCourses = courses.filter((c: any) => c.status === "PUBLISHED").length;
  const publishedLessons = lessons.filter((l: any) => l.status === "PUBLISHED").length;
  const draftLessons = lessons.filter((l: any) => l.status === "DRAFT").length;

  const stats = [
    {
      title: "Total Courses",
      value: courses.length,
      detail: `${publishedCourses} published`,
      icon: BookOpen,
      href: "/admin/courses",
    },
    {
      title: "Course Lessons",
      value: lessons.length,
      detail: `${publishedLessons} live, ${draftLessons} drafts`,
      icon: Layers,
      href: "/admin/courses",
    },
    {
      title: "Enrolled Students",
      value: students.length,
      detail: "Active accounts",
      icon: Users,
      href: "/admin/students",
    },
    {
      title: "Pending Tasks",
      value: 0,
      detail: "All submissions cleared",
      icon: ClipboardCheck,
      href: "/admin/submissions",
    },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Welcome back, {user?.name || "Staff Member"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your courses, edit chapter lessons, and track student task submissions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/courses"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg transition-colors shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span>Manage Courses</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.title}
              to={stat.href}
              className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {stat.title}
                </span>
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-3 font-mono">
                {stat.value}
              </div>
              <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {stat.detail}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Navigation / Recent Courses */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Active Courses
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Select any course to edit its chapters and lesson content.
            </p>
          </div>
          <Link
            to="/admin/courses"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {coursesLoading ? (
          <div className="py-8 text-center text-xs text-zinc-400">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            No courses found. Create or assign courses to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {courses.slice(0, 6).map((course: any) => (
              <div
                key={course.id}
                className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                        course.status === "PUBLISHED"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      }`}
                    >
                      {course.status === "PUBLISHED" ? "Published" : "Draft"}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {course.slug}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-2 line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {course.shortDescription || course.description || "No description provided."}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">
                    ID: {course.id.slice(0, 8)}...
                  </span>
                  <Link
                    to={`/admin/courses/${course.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                  >
                    <span>Edit Course</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
