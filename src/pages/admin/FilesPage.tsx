import React, { useState } from "react";
import {
  FolderArchive,
  Search,
  Plus,
  Copy,
  Check,
  FileText,
  FileCode,
  FileArchive,
  Trash2,
  ExternalLink,
  X,
} from "lucide-react";

interface MediaFile {
  id: string;
  name: string;
  type: "PDF" | "SLIDES" | "CODE" | "OTHER";
  url: string;
  size: string;
  uploadedAt: string;
}

export default function FilesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PDF" | "SLIDES" | "CODE">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState<"PDF" | "SLIDES" | "CODE">("PDF");
  const [fileSize, setFileSize] = useState("2.4 MB");

  // Initial files catalog
  const [files, setFiles] = useState<MediaFile[]>([
    {
      id: "f-1",
      name: "Unisole_AI_Foundations_Slides.pdf",
      type: "SLIDES",
      url: "https://assets.unisole.org/curriculum/ai-foundations-v2.pdf",
      size: "8.4 MB",
      uploadedAt: "2026-09-20",
    },
    {
      id: "f-2",
      name: "Docker_Fastify_Starter_Project.zip",
      type: "CODE",
      url: "https://assets.unisole.org/templates/docker-fastify-starter.zip",
      size: "1.2 MB",
      uploadedAt: "2026-09-18",
    },
    {
      id: "f-3",
      name: "PyTorch_Tensor_Operations_Cheatsheet.pdf",
      type: "PDF",
      url: "https://assets.unisole.org/notes/pytorch-cheatsheet.pdf",
      size: "450 KB",
      uploadedAt: "2026-09-15",
    },
    {
      id: "f-4",
      name: "RAG_Vector_Search_Lab_Setup.zip",
      type: "CODE",
      url: "https://assets.unisole.org/templates/rag-chroma-setup.zip",
      size: "3.1 MB",
      uploadedAt: "2026-09-12",
    },
  ]);

  const handleCopyLink = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim() || !fileUrl.trim()) return;

    setFiles((prev) => [
      {
        id: `f-${Date.now()}`,
        name: fileName.trim(),
        type: fileType,
        url: fileUrl.trim(),
        size: fileSize || "1.0 MB",
        uploadedAt: new Date().toISOString().split("T")[0],
      },
      ...prev,
    ]);

    setFileName("");
    setFileUrl("");
    setShowAddModal(false);
  };

  const handleDeleteFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "ALL" ? true : f.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Files & Resources
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Media library for uploaded lecture slides, cheatsheet PDFs, and starter project ZIPs.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Upload File</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search files by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-800"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 self-start">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              filter === "ALL"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            All ({files.length})
          </button>
          <button
            onClick={() => setFilter("PDF")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              filter === "PDF"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            PDFs
          </button>
          <button
            onClick={() => setFilter("SLIDES")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              filter === "SLIDES"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Slides
          </button>
          <button
            onClick={() => setFilter("CODE")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              filter === "CODE"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Code ZIPs
          </button>
        </div>
      </div>

      {/* Files Table */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200/80 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/40">
                <th className="p-4">File Name</th>
                <th className="p-4">Type</th>
                <th className="p-4">Size</th>
                <th className="p-4">Uploaded</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-400">
                    No files found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
                      {file.type === "PDF" ? (
                        <FileText className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      ) : file.type === "SLIDES" ? (
                        <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      ) : (
                        <FileArchive className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                      <span className="truncate max-w-sm">{file.name}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-zinc-700">
                        {file.type}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                      {file.size}
                    </td>
                    <td className="p-4 text-zinc-400 font-mono text-[11px]">
                      {file.uploadedAt}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleCopyLink(file.id, file.url)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Copy direct file URL"
                      >
                        {copiedId === file.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        title="Open file in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-1 text-zinc-400 hover:text-red-500"
                        title="Delete file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload File Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Upload New File
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  File Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 1 Slides.pdf"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  File URL or CDN Link *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://assets.unisole.org/..."
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Category Type
                  </label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="SLIDES">Lecture Slides</option>
                    <option value="CODE">Code ZIP Archive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Approximate Size
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3.5 MB"
                    value={fileSize}
                    onChange={(e) => setFileSize(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  Save File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
