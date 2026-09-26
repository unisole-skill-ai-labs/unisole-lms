import { StudentSubmission } from "../types";

const STORAGE_KEY = "unisole_student_submissions";

const DEFAULT_SUBMISSIONS: StudentSubmission[] = [
  {
    id: "sub-1",
    assignmentId: "asg-1",
    studentId: "u-101",
    studentName: "Aman Sharma",
    studentEmail: "aman.sharma@example.com",
    courseTitle: "Full-Stack AI Engineering",
    lessonTitle: "Project Setup & Fastify Integration",
    submissionUrl: "https://github.com/amansharma/unisole-fastify-demo",
    submissionText: "Completed Docker compose and Fastify route rate-limiter setup as required.",
    status: "PENDING",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "sub-2",
    assignmentId: "asg-2",
    studentId: "u-102",
    studentName: "Priya Patel",
    studentEmail: "priya.p@example.com",
    courseTitle: "Applied Machine Learning",
    lessonTitle: "PyTorch Model Training & Evaluation",
    submissionUrl: "https://github.com/priyapatel/ml-evaluation-pipeline",
    submissionText: "Trained on CIFAR-10 with ResNet18 reaching 91.2% accuracy.",
    status: "APPROVED",
    mentorFeedback: "Excellent accuracy and clean modular code structure. Well done!",
    reviewedBy: "Mentor",
    reviewedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
  },
  {
    id: "sub-3",
    assignmentId: "asg-3",
    studentId: "u-103",
    studentName: "Rohan Verma",
    studentEmail: "rohan.v@example.com",
    courseTitle: "Full-Stack AI Engineering",
    lessonTitle: "Vector Database Setup & RAG Search",
    submissionUrl: "https://github.com/rohanverma/rag-agent-prototype",
    submissionText: "Added ChromaDB with embedding pipeline.",
    status: "CHANGES_REQUESTED",
    mentorFeedback: "Please include error handling for missing OpenAI API keys in the .env file.",
    reviewedBy: "Mentor",
    reviewedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 52).toISOString(),
  },
];

export function getSubmissions(): StudentSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUBMISSIONS));
      return DEFAULT_SUBMISSIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_SUBMISSIONS;
  } catch {
    return DEFAULT_SUBMISSIONS;
  }
}

export function getSubmissionForLesson(lessonId: string): StudentSubmission | undefined {
  if (!lessonId) return undefined;
  const subs = getSubmissions();
  return subs.find((s) => s.assignmentId === lessonId);
}

export function saveSubmission(sub: {
  assignmentId: string;
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  courseTitle?: string;
  lessonTitle: string;
  submissionUrl: string;
  submissionText?: string;
}): StudentSubmission {
  const subs = getSubmissions();
  const existingIndex = subs.findIndex((s) => s.assignmentId === sub.assignmentId);

  const newSub: StudentSubmission = {
    id: existingIndex >= 0 ? subs[existingIndex].id : `sub-${Date.now()}`,
    assignmentId: sub.assignmentId,
    studentId: sub.studentId || "student-user",
    studentName: sub.studentName || "Student",
    studentEmail: sub.studentEmail || "student@unisole.org",
    courseTitle: sub.courseTitle || "Course Curriculum",
    lessonTitle: sub.lessonTitle,
    submissionUrl: sub.submissionUrl,
    submissionText: sub.submissionText || "",
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  let updated: StudentSubmission[];
  if (existingIndex >= 0) {
    updated = [...subs];
    updated[existingIndex] = newSub;
  } else {
    updated = [newSub, ...subs];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newSub;
}

export function updateSubmissionReview(
  id: string,
  status: "APPROVED" | "CHANGES_REQUESTED",
  mentorFeedback: string,
  reviewedBy: string
): StudentSubmission | undefined {
  const subs = getSubmissions();
  const index = subs.findIndex((s) => s.id === id);
  if (index === -1) return undefined;

  subs[index] = {
    ...subs[index],
    status,
    mentorFeedback,
    reviewedBy,
    reviewedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
  return subs[index];
}
