/**
 * Helper to parse lesson content (which can be either a JSON string from the CMS studio
 * or raw legacy markdown / HTML string) and render formatted HTML safely.
 */

export interface ParsedLessonPayload {
  type: "READING" | "QUIZ" | "ASSIGNMENT";
  contentMarkdown?: string;
  contentHtml: string;
  codeLanguage?: string;
  codeSnippet?: string;
  quiz?: {
    passingScorePercent: number;
    questions: Array<{
      id: string;
      question: string;
      options: string[];
      correctOptionIndex: number;
      explanation?: string;
    }>;
  };
  assignment?: {
    instructions: string;
    allowedTypes: ("URL" | "GITHUB" | "FILE" | "TEXT")[];
    maxPoints?: number;
  };
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size?: string;
  }>;
}

/**
 * Converts markdown formatting to clean, styled HTML:
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - ### Heading 3, ## Heading 2, # Heading 1
 * - `inline code`
 * - [link](url)
 * - Bullet lists (- item)
 */
export function renderMarkdownToHtml(input: string): string {
  if (!input) return "";

  // If input is already full rich HTML (contains tags and no unparsed markdown tokens), return as is
  const hasHtml = /<(p|div|h[1-6]|ul|ol|li|strong|b|em|i|blockquote)[^>]*>/i.test(input);
  const hasMarkdown = /(\*\*|__|\*|_|###|##|#|`|^\s*-\s+)/m.test(input);

  if (hasHtml && !hasMarkdown) {
    return input;
  }

  let text = input;

  // 1. Headings
  text = text.replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-4 mb-2">$1</h3>');
  text = text.replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-5 mb-2">$1</h2>');
  text = text.replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-6 mb-3">$1</h1>');

  // 2. Bold (**text** or __text__)
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-zinc-900 dark:text-zinc-100">$1</strong>');
  text = text.replace(/__(.*?)__/g, '<strong class="font-bold text-zinc-900 dark:text-zinc-100">$1</strong>');

  // 3. Italic (*text* or _text_)
  text = text.replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, '$1<em class="italic text-zinc-800 dark:text-zinc-200">$2</em>$3');
  text = text.replace(/(^|[^_])_([^_]+)_([^_]|$)/g, '$1<em class="italic text-zinc-800 dark:text-zinc-200">$2</em>$3');

  // 4. Inline Code (`code`)
  text = text.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-mono text-xs">$1</code>');

  // 5. Markdown Links [title](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-indigo-600 dark:text-indigo-400 underline font-medium hover:text-indigo-700">$1</a>');

  // 6. Bullet Lists
  text = text.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 list-disc text-zinc-700 dark:text-zinc-300">$1</li>');

  // 7. Paragraph & Line Breaks
  if (!hasHtml) {
    const paragraphs = text.split(/\n\n+/);
    text = paragraphs
      .map((p) => {
        const trimmed = p.trim();
        if (!trimmed) return "";
        if (
          trimmed.startsWith("<h1") ||
          trimmed.startsWith("<h2") ||
          trimmed.startsWith("<h3") ||
          trimmed.startsWith("<li")
        ) {
          return trimmed.replace(/\n/g, "<br />");
        }
        return `<p class="mb-3">${trimmed.replace(/\n/g, "<br />")}</p>`;
      })
      .filter(Boolean)
      .join("");
  }

  return sanitizeHtml(text);
}

const ALLOWED_TAGS = new Set([
  "P", "BR", "STRONG", "B", "EM", "I", "U", "S",
  "H1", "H2", "H3", "H4", "H5", "H6",
  "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "CODE", "A", "SPAN", "DIV", "HR",
]);

/**
 * Sanitizes rendered HTML using a strict tag and attribute allowlist (prevents XSS).
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const cleanNode = (node: Node): void => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        if (!ALLOWED_TAGS.has(el.tagName)) {
          if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "IFRAME") {
            el.remove();
          } else {
            const textNode = doc.createTextNode(el.textContent || "");
            el.replaceWith(textNode);
          }
          continue;
        }
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          if (name.startsWith("on")) {
            el.removeAttribute(attr.name);
            continue;
          }
          if (el.tagName === "A" && name === "href") {
            const href = attr.value.trim().toLowerCase();
            if (!(href.startsWith("http://") || href.startsWith("https://") || href.startsWith("/"))) {
              el.removeAttribute(attr.name);
            }
          } else if (!["class", "target", "rel"].includes(name)) {
            el.removeAttribute(attr.name);
          }
        }
        if (el.tagName === "A") {
          el.setAttribute("rel", "noopener noreferrer");
          el.setAttribute("target", "_blank");
        }
        cleanNode(el);
      }
    }
  };
  cleanNode(doc.body);
  return doc.body.innerHTML;
}

export function parseLessonContent(raw: string | null | undefined): ParsedLessonPayload {
  if (!raw || typeof raw !== "string") {
    return {
      type: "READING",
      contentMarkdown: "",
      contentHtml: "",
    };
  }

  const trimmed = raw.trim();

  // 1. If it's a JSON string from CMS
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      const rawText = parsed.contentHtml || parsed.contentMarkdown || "";
      const finalHtml = parsed.contentHtml || renderMarkdownToHtml(parsed.contentMarkdown || "");

      return {
        type: parsed.type || "READING",
        contentMarkdown: parsed.contentMarkdown || rawText,
        contentHtml: finalHtml,
        codeLanguage: parsed.codeLanguage || "typescript",
        codeSnippet: parsed.codeSnippet || "",
        quiz: parsed.quiz,
        assignment: parsed.assignment,
        attachments: parsed.attachments || [],
      };
    } catch {
      // JSON parse error, treat as raw text below
    }
  }

  // 2. Raw markdown or HTML string
  return {
    type: "READING",
    contentMarkdown: raw,
    contentHtml: renderMarkdownToHtml(raw),
  };
}

/**
 * Utility to strip out technical/verbose prefixes from lesson titles
 * e.g. "1.1 Concept Lecture: What is an AI Agent?" -> "What is an AI Agent?"
 *      "1.2 Knowledge Check: MCQ Quiz (3 Questions)" -> "MCQ Quiz (3 Questions)"
 *      "1.3 Hands-on Practical: Build a ReAct agent" -> "Build a ReAct agent"
 */
export function cleanLessonTitle(rawTitle: string): string {
  if (!rawTitle) return "";
  let title = rawTitle.trim();
  // Strip numbers like "1.1 ", "1. ", "W1.1 ", "Week 1: "
  title = title.replace(/^(?:Week\s*\d+|Weekend\s*\d+|[wW]?\d+(\.\d+)*)\s*[:.-]?\s*/i, "");
  // Strip verbose category prefixes
  title = title.replace(
    /^(?:Concept Lecture|Lecture Videos?|Lecture|Knowledge Check|Quiz MCQ|Questions? & Quizzes|Question|Hands-on Practical|Hands-on Assignments?|Hands-on|Practical Project|Assignment|Live Class|Live Session|Live Architectural Workshop|Milestone Deliverable|Graded Quiz)\s*[:–-]\s*/i,
    ""
  );
  // Also strip any remaining leading numbering like "1.1 " if it occurred after category
  title = title.replace(/^[wW]?\d+(\.\d+)*\s*[:.-]?\s*/, "");
  return title.trim() || rawTitle;
}
