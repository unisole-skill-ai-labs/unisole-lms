import React, { useRef, useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Eye,
  Edit3,
  RemoveFormatting,
} from "lucide-react";
import { renderMarkdownToHtml } from "../../utils/formatContent";

interface RichEditorProps {
  initialValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichEditor({
  initialValue,
  onChange,
  placeholder = "Write your lesson notes, breakdown of concepts, and explanations...",
}: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"EDIT" | "PREVIEW">("EDIT");
  const [currentHtml, setCurrentHtml] = useState("");
  const isUpdatingFromProps = useRef(false);

  // Convert initial markdown/html into displayable HTML
  const getFormattedHtml = (val: string) => {
    if (!val) return "";
    return renderMarkdownToHtml(val);
  };

  // Sync initialValue when active lesson changes
  useEffect(() => {
    const formatted = getFormattedHtml(initialValue || "");
    if (editorRef.current && formatted !== editorRef.current.innerHTML) {
      isUpdatingFromProps.current = true;
      editorRef.current.innerHTML = formatted;
      setCurrentHtml(formatted);
      isUpdatingFromProps.current = false;
    }
  }, [initialValue]);

  // Execute formatting command in contentEditable
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const handleInput = () => {
    if (isUpdatingFromProps.current || !editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setCurrentHtml(html);
    onChange(html);
  };

  const handleAddLink = () => {
    const url = prompt("Enter URL:", "https://");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs">
      {/* Editor Header / Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => executeCommand("bold")}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4 font-bold" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("italic")}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("underline")}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors"
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>

          <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-1" />

          <button
            type="button"
            onClick={() => executeCommand("formatBlock", "<h2>")}
            className="px-2 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition-colors flex items-center gap-0.5"
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
            <span>H2</span>
          </button>
          <button
            type="button"
            onClick={() => executeCommand("formatBlock", "<h3>")}
            className="px-2 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition-colors flex items-center gap-0.5"
            title="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
            <span>H3</span>
          </button>
          <button
            type="button"
            onClick={() => executeCommand("formatBlock", "<p>")}
            className="px-2 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors"
            title="Normal Paragraph"
          >
            Body
          </button>

          <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-1" />

          <button
            type="button"
            onClick={() => executeCommand("insertUnorderedList")}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("insertOrderedList")}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-1" />

          <button
            type="button"
            onClick={handleAddLink}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors"
            title="Add Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => executeCommand("removeFormat")}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors"
            title="Clear Formatting"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Visual Edit vs Student Preview */}
        <div className="flex items-center gap-1 bg-zinc-200/80 dark:bg-zinc-800 p-0.5 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("EDIT")}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              activeTab === "EDIT"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PREVIEW")}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              activeTab === "PREVIEW"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Student Preview</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          className={`rich-content p-4 sm:p-6 min-h-[300px] text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none leading-relaxed ${
            activeTab === "EDIT" ? "block" : "hidden"
          }`}
          data-placeholder={placeholder}
        />
        <div
          className={`rich-content p-4 sm:p-6 min-h-[300px] text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed bg-zinc-50/50 dark:bg-zinc-900/30 ${
            activeTab === "PREVIEW" ? "block" : "hidden"
          }`}
          dangerouslySetInnerHTML={{
            __html: currentHtml || "<p class='text-zinc-400 italic'>No study notes written yet.</p>",
          }}
        />
      </div>
    </div>
  );
}
