import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  BookOpen,
  Search,
  Plus,
  ArrowRight,
  Filter,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import {
  useGetAdminCoursesQuery,
  useCreateAdminCourseMutation,
} from "../../store/apiSlice";

export default function AdminCoursesPage() {
  const { user } = useSelector((state: any) => state.auth);
  const { data: courses = [], isLoading, refetch } = useGetAdminCoursesQuery(undefined);
  const [createCourse, { isLoading: isCreating }] = useCreateAdminCourseMutation();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New course form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [formError, setFormError] = useState("");

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.role || "");

  const handleTitleChange = (val: string) => {
    setTitle(val);
    // Auto-generate slug from title
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    setSlug(generatedSlug);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      setFormError("Title and slug are required.");
      return;
    }
    setFormError("");

    try {
      await createCourse({
        title,
        slug,
        shortDescription,
        status: "DRAFT",
      }).unwrap();

      setTitle("");
      setSlug("");
      setShortDescription("");
      setShowCreateModal(false);
      refetch();
    } catch (err: any) {
      setFormError(err?.data?.error || "Failed to create course. Please try again.");
    }
  };

  const filteredCourses = courses.filter((c: any) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ? true : c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Courses
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Browse courses, edit curriculum outlines, and manage chapter lessons.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Course</span>
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="p-4 rounded-xl border border-indigo-200/70 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
          <span>
            You are logged in as <strong>Mentor</strong>. You can author and publish chapters, lessons, quizzes, and tasks inside courses.
          </span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search courses by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 self-start">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              statusFilter === "ALL"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            All ({courses.length})
          </button>
          <button
            onClick={() => setStatusFilter("PUBLISHED")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              statusFilter === "PUBLISHED"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Published
          </button>
          <button
            onClick={() => setStatusFilter("DRAFT")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              statusFilter === "DRAFT"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Drafts
          </button>
        </div>
      </div>

      {/* Course List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-zinc-400">Loading courses...</div>
      ) : filteredCourses.length === 0 ? (
        <div className="p-12 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-zinc-400 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No courses found
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Try adjusting your search query or status filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course: any) => (
            <div
              key={course.id}
              className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
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
                  <span className="text-[11px] text-zinc-400 font-mono truncate max-w-[140px]">
                    {course.slug}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                  {course.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {course.shortDescription || course.description || "No description provided."}
                </p>
              </div>

              <div className="pt-4 mt-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-mono">
                  {course.id.slice(0, 10)}
                </span>
                <Link
                  to={`/admin/courses/${course.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <span>Edit Course</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Create New Course
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium border border-red-200 dark:border-red-900">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Applied Machine Learning & Neural Networks"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  placeholder="applied-ml-neural-networks"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Short Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief summary of what students will master..."
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
