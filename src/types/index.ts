export type Role = "STUDENT" | "ADMIN" | "SUPER_ADMIN" | "MENTOR" | "MEMBER" | "SALES";

export interface User {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  role: Role;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
}

export interface College {
  id: string;
  name: string;
  slug?: string;
  description?: string;
}

export type LessonType = "READING" | "QUIZ" | "ASSIGNMENT";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface LessonQuiz {
  passingScorePercent: number;
  questions: QuizQuestion[];
}

export interface LessonAssignment {
  instructions: string;
  allowedTypes: ("URL" | "GITHUB" | "FILE" | "TEXT")[];
  maxPoints?: number;
}

export interface LessonAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes?: number;
  fileType?: string;
}

export interface Lesson {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  content?: string;
  contentMarkdown?: string;
  videoUrl?: string;
  durationMinutes?: number;
  position?: number;
  type?: LessonType;
  status?: ContentStatus;
  isFreePreview?: boolean;
  quiz?: LessonQuiz;
  assignment?: LessonAssignment;
  attachments?: LessonAttachment[];
  updatedAt?: string;
}

export interface Module {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  position?: number;
  status?: ContentStatus;
  lessons?: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  pricePaise?: number;
  mrpPaise?: number;
  status?: ContentStatus;
  isActive?: boolean;
  modules?: Module[];
  instructors?: { id: string; name?: string; isLead?: boolean }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  courseTitle?: string;
  lessonTitle?: string;
  submissionUrl?: string;
  submissionText?: string;
  status: "PENDING" | "APPROVED" | "CHANGES_REQUESTED";
  mentorFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface Pathway {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  pricePaise?: number;
  isPublished?: boolean;
  categories?: Category[];
  colleges?: College[];
  courses?: Course[];
}

export interface Enrollment {
  id: string;
  enrollmentId?: string;
  studentId?: string;
  pathwayId?: string;
  pathway?: Pathway;
  status: string;
  enrolledAt?: string;
}

