import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Check,
  Eye,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Bold,
  Italic,
  Code,
  Heading,
  List,
  Link as LinkIcon,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileCode,
} from "lucide-react";
import {
  useGetAdminCourseByIdQuery,
  useGetAdminCourseModulesQuery,
  useAttachAdminCourseModuleMutation,
  useCreateAdminModuleMutation,
  useGetAdminModuleLessonsQuery,
  useAttachAdminModuleLessonMutation,
  useCreateAdminLessonMutation,
  useGetAdminLessonByIdQuery,
  useUpdateAdminLessonMutation,
} from "../../store/apiSlice";
import { useAutosave } from "../../utils/useAutosave";
import { LessonType, ContentStatus, QuizQuestion } from "../../types";

export default function EditCoursePage() {
  const { courseId = "" } = useParams();

  // Queries
  const { data: course, isLoading: isCourseLoading } = useGetAdminCourseByIdQuery(courseId, {
    skip: !courseId,
  });
  const { data: courseModules = [], refetch: refetchModules } = useGetAdminCourseModulesQuery(
    courseId,
    { skip: !courseId }
  );

  // Mutations
  const [createModule] = useCreateAdminModuleMutation();
  const [attachModule] = useAttachAdminCourseModuleMutation();
  const [createLesson] = useCreateAdminLessonMutation();
  const [attachLesson] = useAttachAdminModuleLessonMutation();
  const [updateLessonMutation] = useUpdateAdminLessonMutation();

  // Selected State
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [addingLessonForModuleId, setAddingLessonForModuleId] = useState<string | null>(null);

  // Active Lesson Form State
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonStatus, setLessonStatus] = useState<ContentStatus>("DRAFT");
  const [isFreePreview, setIsFreePreview] = useState(false);
  const [lessonType, setLessonType] = useState<LessonType>("READING");
  const [contentMarkdown, setContentMarkdown] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [videoUrl, setVideoUrl] = useState("");

  // Code Block State
  const [codeLanguage, setCodeLanguage] = useState("typescript");
  const [codeSnippet, setCodeSnippet] = useState("");

  // Quiz State
  const [passingScore, setPassingScore] = useState(70);
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: "q-1",
      question: "",
      options: ["", "", "", ""],
      correctOptionIndex: 0,
      explanation: "",
    },
  ]);

  // Task / Assignment State
  const [taskInstructions, setTaskInstructions] = useState("");
  const [allowedTypes, setAllowedTypes] = useState<("GITHUB" | "FILE" | "TEXT")[]>([
    "GITHUB",
  ]);
  const [maxPoints, setMaxPoints] = useState(100);

  // Attachments State
  const [attachments, setAttachments] = useState<
    Array<{ id: string; name: string; url: string; size?: string }>
  >([]);
  const [newAttachmentName, setNewAttachmentName] = useState("");
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [showAddAttachment, setShowAddAttachment] = useState(false);

  // Fetch full details of active lesson
  const { data: activeLessonData, refetch: refetchActiveLesson } = useGetAdminLessonByIdQuery(
    activeLessonId || "",
    { skip: !activeLessonId }
  );

  // Populate editor when active lesson changes
  useEffect(() => {
    if (activeLessonData) {
      setLessonTitle(activeLessonData.title || "");
      setLessonStatus(activeLessonData.status || "DRAFT");
      setDurationMinutes(activeLessonData.durationMinutes || 15);
      setVideoUrl(activeLessonData.videoUrl || "");

      // Try to parse structured content
      try {
        if (activeLessonData.content && activeLessonData.content.startsWith("{")) {
          const parsed = JSON.parse(activeLessonData.content);
          setLessonType(parsed.type || "READING");
          setIsFreePreview(!!parsed.isFreePreview);
          setContentMarkdown(parsed.contentMarkdown || "");
          setCodeLanguage(parsed.codeLanguage || "typescript");
          setCodeSnippet(parsed.codeSnippet || "");
          if (parsed.quiz) {
            setPassingScore(parsed.quiz.passingScorePercent || 70);
            setQuestions(parsed.quiz.questions || []);
          }
          if (parsed.assignment) {
            setTaskInstructions(parsed.assignment.instructions || "");
            setAllowedTypes(parsed.assignment.allowedTypes || ["GITHUB"]);
            setMaxPoints(parsed.assignment.maxPoints || 100);
          }
          if (parsed.attachments) {
            setAttachments(parsed.attachments);
          }
        } else {
          setContentMarkdown(activeLessonData.content || activeLessonData.description || "");
          setLessonType("READING");
        }
      } catch {
        setContentMarkdown(activeLessonData.content || "");
      }
    }
  }, [activeLessonData]);

  // Aggregate formData for autosave
  const formData = {
    title: lessonTitle,
    status: lessonStatus,
    durationMinutes,
    videoUrl,
    type: lessonType,
    isFreePreview,
    contentMarkdown,
    codeLanguage,
    codeSnippet,
    quiz: {
      passingScorePercent: passingScore,
      questions,
    },
    assignment: {
      instructions: taskInstructions,
      allowedTypes,
      maxPoints,
    },
    attachments,
  };

  // Autosave handler
  const handleSaveLesson = async (currentData: typeof formData) => {
    if (!activeLessonId) return;

    const payloadContent = JSON.stringify({
      type: currentData.type,
      isFreePreview: currentData.isFreePreview,
      contentMarkdown: currentData.contentMarkdown,
      codeLanguage: currentData.codeLanguage,
      codeSnippet: currentData.codeSnippet,
      quiz: currentData.quiz,
      assignment: currentData.assignment,
      attachments: currentData.attachments,
    });

    await updateLessonMutation({
      id: activeLessonId,
      body: {
        title: currentData.title,
        status: currentData.status,
        durationMinutes: currentData.durationMinutes,
        videoUrl: currentData.videoUrl,
        content: payloadContent,
        description: currentData.contentMarkdown.slice(0, 200),
      },
    }).unwrap();
  };

  const { status: saveStatus, forceSave } = useAutosave({
    data: formData,
    onSave: handleSaveLesson,
    enabled: !!activeLessonId,
    delayMs: 1200,
  });

  // Create & attach a new Chapter (Module)
  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim()) return;

    try {
      const slug = `${course?.slug || "course"}-ch-${Date.now()}`;
      const createdMod = await createModule({
        title: newChapterTitle.trim(),
        slug,
        status: "DRAFT",
      }).unwrap();

      const nextPosition = (courseModules?.length || 0) + 1;
      await attachModule({
        courseId,
        moduleId: createdMod.id,
        position: nextPosition,
      }).unwrap();

      setNewChapterTitle("");
      setShowAddChapter(false);
      refetchModules();
    } catch (err) {
      console.error("Failed to add chapter:", err);
    }
  };

  // Create & attach a new Lesson
  const handleAddLesson = async (moduleId: string) => {
    if (!newLessonTitle.trim()) return;

    try {
      const slug = `${course?.slug || "course"}-les-${Date.now()}`;
      const defaultContent = JSON.stringify({
        type: "READING",
        isFreePreview: false,
        contentMarkdown: "Write lesson reading notes here...",
        codeLanguage: "typescript",
        codeSnippet: "",
      });

      const created = await createLesson({
        title: newLessonTitle.trim(),
        slug,
        status: "DRAFT",
        content: defaultContent,
        durationMinutes: 15,
      }).unwrap();

      await attachLesson({
        moduleId,
        lessonId: created.id,
        position: 1,
      }).unwrap();

      setNewLessonTitle("");
      setAddingLessonForModuleId(null);
      setActiveLessonId(created.id);
      refetchModules();
    } catch (err) {
      console.error("Failed to create lesson:", err);
    }
  };

  // Helper formatting for Notes textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const insertFormatting = (prefix: string, suffix = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const selected = current.slice(start, end);
    const replacement = `${prefix}${selected || "text"}${suffix}`;
    const nextVal = current.slice(0, start) + replacement + current.slice(end);
    setContentMarkdown(nextVal);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selected.length || 4)
      );
    }, 10);
  };

  // Quiz question management
  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}`,
        question: "",
        options: ["", "", "", ""],
        correctOptionIndex: 0,
        explanation: "",
      },
    ]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestionText = (idx: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx].question = text;
      return copy;
    });
  };

  const updateQuestionOption = (qIdx: number, optIdx: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx].options[optIdx] = text;
      return copy;
    });
  };

  const setCorrectOption = (qIdx: number, optIdx: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx].correctOptionIndex = optIdx;
      return copy;
    });
  };

  const updateQuestionExplanation = (idx: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx].explanation = text;
      return copy;
    });
  };

  // Attachment management
  const handleAddAttachment = () => {
    if (!newAttachmentName.trim() || !newAttachmentUrl.trim()) return;
    setAttachments((prev) => [
      ...prev,
      {
        id: `att-${Date.now()}`,
        name: newAttachmentName.trim(),
        url: newAttachmentUrl.trim(),
      },
    ]);
    setNewAttachmentName("");
    setNewAttachmentUrl("");
    setShowAddAttachment(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  if (isCourseLoading) {
    return (
      <div className="p-10 text-center text-xs text-zinc-400">
        Loading course editor...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Top Bar */}
      <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/courses"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400">Course /</span>
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-xs">
              {course?.title || "Untitled Course"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Autosave Status Pill */}
          {activeLessonId && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium">
              {saveStatus === "saving" && (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Save failed
                </span>
              )}
            </div>
          )}

          {/* Quick Manual Save */}
          {activeLessonId && (
            <button
              onClick={forceSave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-800"
              title="Save changes (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          )}

          {/* Student View Link */}
          <Link
            to="/enrolled"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Student View</span>
          </Link>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column (30%): Chapters & Lessons Outline */}
        <div className="w-full md:w-80 lg:w-96 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex flex-col md:h-[calc(100vh-56px)] overflow-y-auto">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Chapters & Lessons
            </span>
            <button
              onClick={() => setShowAddChapter(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Chapter</span>
            </button>
          </div>

          {/* Inline Add Chapter Form */}
          {showAddChapter && (
            <form onSubmit={handleAddChapter} className="p-3 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
              <input
                type="text"
                autoFocus
                placeholder="Chapter title..."
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-800"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddChapter(false)}
                  className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded"
                >
                  Add
                </button>
              </div>
            </form>
          )}

          {/* Chapters & Lessons Tree */}
          <div className="p-3 space-y-4 flex-1">
            {courseModules.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400 space-y-2">
                <p>No chapters in this course yet.</p>
                <button
                  onClick={() => setShowAddChapter(true)}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  + Add First Chapter
                </button>
              </div>
            ) : (
              courseModules.map((cMod: any, idx: number) => (
                <ChapterSection
                  key={cMod.moduleId}
                  moduleId={cMod.moduleId}
                  position={idx + 1}
                  activeLessonId={activeLessonId}
                  onSelectLesson={(lessonId) => setActiveLessonId(lessonId)}
                  addingLessonForModuleId={addingLessonForModuleId}
                  setAddingLessonForModuleId={setAddingLessonForModuleId}
                  newLessonTitle={newLessonTitle}
                  setNewLessonTitle={setNewLessonTitle}
                  onAddLesson={handleAddLesson}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column (70%): Lesson Editor */}
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 md:h-[calc(100vh-56px)] overflow-y-auto">
          {!activeLessonId ? (
            <div className="m-auto text-center p-8 max-w-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mx-auto">
                <FileCode className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Select a lesson to edit
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose any lesson from the outline on the left, or add a new lesson to start writing notes, creating quizzes, or setting tasks.
              </p>
            </div>
          ) : (
            <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
              {/* Lesson Details Header */}
              <div className="space-y-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Type Selector (No Emojis) */}
                  <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 self-start">
                    <button
                      onClick={() => setLessonType("READING")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        lessonType === "READING"
                          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      Notes
                    </button>
                    <button
                      onClick={() => setLessonType("QUIZ")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        lessonType === "QUIZ"
                          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      Quiz
                    </button>
                    <button
                      onClick={() => setLessonType("ASSIGNMENT")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        lessonType === "ASSIGNMENT"
                          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      Task
                    </button>
                  </div>

                  {/* Status & Free Preview Controls */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={isFreePreview}
                        onChange={(e) => setIsFreePreview(e.target.checked)}
                        className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Free Preview</span>
                    </label>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          setLessonStatus(lessonStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED")
                        }
                        className={`text-xs font-semibold font-mono px-3 py-1 rounded-lg border transition-colors ${
                          lessonStatus === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        {lessonStatus === "PUBLISHED" ? "Published" : "Draft"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lesson Title Input */}
                <div>
                  <input
                    type="text"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="Lesson Title..."
                    className="w-full text-xl sm:text-2xl font-bold bg-transparent border-0 border-b border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none px-0 py-1 transition-colors"
                  />
                </div>

                {/* Optional Video Link & Estimated Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Video URL (Optional: YouTube Unlisted, Vimeo, or MP4 link)
                    </label>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtu.be/..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                    />
                  </div>
                </div>
              </div>

              {/* ──────────────── TYPE === NOTES ──────────────── */}
              {lessonType === "READING" && (
                <div className="space-y-6">
                  {/* Clean Formatting Toolbar */}
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <button
                      onClick={() => insertFormatting("**", "**")}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-bold"
                      title="Bold (Ctrl+B)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => insertFormatting("*", "*")}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs"
                      title="Italic (Ctrl+I)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => insertFormatting("### ")}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-semibold"
                      title="Heading"
                    >
                      <Heading className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => insertFormatting("- ")}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs"
                      title="Bullet List"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => insertFormatting("`", "`")}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs"
                      title="Inline Code"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => insertFormatting("[", "](https://)")}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs"
                      title="Add Link"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Main Notes Editor Textarea */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Lesson Notes & Explanation
                    </label>
                    <textarea
                      ref={textareaRef}
                      rows={12}
                      value={contentMarkdown}
                      onChange={(e) => setContentMarkdown(e.target.value)}
                      placeholder="Write your study notes, breakdown of concepts, architecture points, and instructions..."
                      className="w-full p-4 text-xs font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-800 dark:focus:ring-zinc-200 leading-relaxed"
                    />
                  </div>

                  {/* Code Box with Language Selector */}
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        Code Example (Optional)
                      </span>
                      <select
                        value={codeLanguage}
                        onChange={(e) => setCodeLanguage(e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono"
                      >
                        <option value="typescript">TypeScript</option>
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="sql">SQL</option>
                        <option value="bash">Bash</option>
                        <option value="cpp">C++</option>
                      </select>
                    </div>
                    <textarea
                      rows={6}
                      value={codeSnippet}
                      onChange={(e) => setCodeSnippet(e.target.value)}
                      placeholder={`// Paste sample ${codeLanguage} code here...`}
                      className="w-full p-3 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    />
                  </div>

                  {/* Attachments Section */}
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-zinc-500" />
                        Files & Downloadable Resources
                      </span>
                      <button
                        onClick={() => setShowAddAttachment(!showAddAttachment)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        + Add File Link
                      </button>
                    </div>

                    {showAddAttachment && (
                      <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-2">
                        <input
                          type="text"
                          placeholder="File name (e.g. Module 1 Slides.pdf)"
                          value={newAttachmentName}
                          onChange={(e) => setNewAttachmentName(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                        />
                        <input
                          type="url"
                          placeholder="Public file URL (PDF, GitHub repo, Google Drive, ZIP)"
                          value={newAttachmentUrl}
                          onChange={(e) => setNewAttachmentUrl(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setShowAddAttachment(false)}
                            className="px-2.5 py-1 text-xs text-zinc-500"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddAttachment}
                            className="px-3 py-1 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded"
                          >
                            Attach File
                          </button>
                        </div>
                      </div>
                    )}

                    {attachments.length === 0 ? (
                      <div className="text-xs text-zinc-400 py-1">
                        No supplementary files attached.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {attachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center justify-between p-2 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 text-xs"
                          >
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">
                              {att.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 dark:text-indigo-400 font-mono hover:underline text-[11px]"
                              >
                                View
                              </a>
                              <button
                                onClick={() => removeAttachment(att.id)}
                                className="text-zinc-400 hover:text-red-500 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ──────────────── TYPE === QUIZ ──────────────── */}
              {lessonType === "QUIZ" && (
                <div className="space-y-6">
                  {/* Passing Score Box */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Passing Score Percentage
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Score required for students to mark this quiz as completed.
                      </p>
                    </div>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="number"
                        min={10}
                        max={100}
                        value={passingScore}
                        onChange={(e) => setPassingScore(Number(e.target.value))}
                        className="w-16 px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-center font-bold"
                      />
                      <span className="text-xs text-zinc-500">%</span>
                    </div>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-4">
                    {questions.map((q, qIdx) => (
                      <div
                        key={q.id}
                        className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-500 font-mono">
                            Question {qIdx + 1}
                          </span>
                          {questions.length > 1 && (
                            <button
                              onClick={() => removeQuestion(qIdx)}
                              className="text-zinc-400 hover:text-red-500 p-1 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Question Prompt */}
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                          placeholder="Type question prompt..."
                          className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                        />

                        {/* 4 Choices */}
                        <div className="space-y-2">
                          <span className="text-[11px] text-zinc-400 font-medium">
                            Choices (Select the radio button for the correct answer):
                          </span>
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                checked={q.correctOptionIndex === optIdx}
                                onChange={() => setCorrectOption(qIdx, optIdx)}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => updateQuestionOption(qIdx, optIdx, e.target.value)}
                                placeholder={`Option ${optIdx + 1}`}
                                className="flex-1 px-3 py-1.5 text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Explanation */}
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                            Explanation (Optional: shown after answering)
                          </label>
                          <textarea
                            rows={2}
                            value={q.explanation || ""}
                            onChange={(e) => updateQuestionExplanation(qIdx, e.target.value)}
                            placeholder="Why is this option correct?"
                            className="w-full px-3 py-1.5 text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addQuestion}
                      className="w-full py-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                    >
                      + Add Another Question
                    </button>
                  </div>
                </div>
              )}

              {/* ──────────────── TYPE === TASK / ASSIGNMENT ──────────────── */}
              {lessonType === "ASSIGNMENT" && (
                <div className="space-y-6">
                  {/* Instructions */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Task Prompt & Problem Statement
                    </label>
                    <textarea
                      rows={8}
                      value={taskInstructions}
                      onChange={(e) => setTaskInstructions(e.target.value)}
                      placeholder="Detail the project requirements, architecture specifications, expected outputs, and submission instructions..."
                      className="w-full p-4 text-xs font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-800 dark:focus:ring-zinc-200"
                    />
                  </div>

                  {/* Submission Type & Points */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                        Allowed Submissions
                      </span>
                      <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowedTypes.includes("GITHUB")}
                            onChange={(e) => {
                              if (e.target.checked) setAllowedTypes([...allowedTypes, "GITHUB"]);
                              else setAllowedTypes(allowedTypes.filter((t) => t !== "GITHUB"));
                            }}
                            className="rounded border-zinc-300 text-indigo-600"
                          />
                          <span>GitHub Repository URL</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowedTypes.includes("FILE")}
                            onChange={(e) => {
                              if (e.target.checked) setAllowedTypes([...allowedTypes, "FILE"]);
                              else setAllowedTypes(allowedTypes.filter((t) => t !== "FILE"));
                            }}
                            className="rounded border-zinc-300 text-indigo-600"
                          />
                          <span>File / Project ZIP Upload</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowedTypes.includes("TEXT")}
                            onChange={(e) => {
                              if (e.target.checked) setAllowedTypes([...allowedTypes, "TEXT"]);
                              else setAllowedTypes(allowedTypes.filter((t) => t !== "TEXT"));
                            }}
                            className="rounded border-zinc-300 text-indigo-600"
                          />
                          <span>Text Writeup</span>
                        </label>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                        Maximum Score
                      </span>
                      <input
                        type="number"
                        min={10}
                        max={1000}
                        value={maxPoints}
                        onChange={(e) => setMaxPoints(Number(e.target.value))}
                        className="w-24 px-3 py-1.5 text-xs font-mono font-bold rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                      />
                      <p className="text-[11px] text-zinc-400">
                        Default grading points for mentor assessment.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────── SUBCOMPONENT: Chapter Section with Lessons ────────────────
interface ChapterSectionProps {
  moduleId: string;
  position: number;
  activeLessonId: string | null;
  onSelectLesson: (id: string) => void;
  addingLessonForModuleId: string | null;
  setAddingLessonForModuleId: (id: string | null) => void;
  newLessonTitle: string;
  setNewLessonTitle: (title: string) => void;
  onAddLesson: (moduleId: string) => void;
}

function ChapterSection({
  moduleId,
  position,
  activeLessonId,
  onSelectLesson,
  addingLessonForModuleId,
  setAddingLessonForModuleId,
  newLessonTitle,
  setNewLessonTitle,
  onAddLesson,
}: ChapterSectionProps) {
  const { data: moduleLessons = [], refetch } = useGetAdminModuleLessonsQuery(moduleId);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 overflow-hidden">
      {/* Chapter Bar */}
      <div className="p-3 flex items-center justify-between bg-zinc-100/60 dark:bg-zinc-900/60 border-b border-zinc-200/50 dark:border-zinc-800/50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-left truncate flex-1"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
            Chapter {position}
          </span>
        </button>

        <button
          onClick={() => setAddingLessonForModuleId(moduleId)}
          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline px-1"
        >
          + Lesson
        </button>
      </div>

      {!collapsed && (
        <div className="p-2 space-y-1">
          {/* Lessons List */}
          {moduleLessons.length === 0 ? (
            <div className="py-3 px-2 text-[11px] text-zinc-400 text-center">
              No lessons yet. Click + Lesson to add.
            </div>
          ) : (
            moduleLessons.map((les: any) => {
              const isSelected = activeLessonId === les.lessonId;
              return (
                <button
                  key={les.lessonId}
                  onClick={() => onSelectLesson(les.lessonId)}
                  className={`w-full text-left p-2 rounded-lg transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <span className="text-xs font-medium truncate flex-1">
                    {les.lessonId}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                        isSelected
                          ? "bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      Lesson
                    </span>
                  </div>
                </button>
              );
            })
          )}

          {/* Inline Add Lesson Input */}
          {addingLessonForModuleId === moduleId && (
            <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-2 mt-1">
              <input
                type="text"
                autoFocus
                placeholder="Lesson title..."
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                className="w-full px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 focus:outline-none"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setAddingLessonForModuleId(null)}
                  className="px-2 py-0.5 text-xs text-zinc-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onAddLesson(moduleId)}
                  className="px-2.5 py-0.5 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded"
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
