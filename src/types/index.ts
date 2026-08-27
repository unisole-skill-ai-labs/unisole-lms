export type Role = "STUDENT" | "ADMIN" | "INSTRUCTOR";

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

export interface Lesson {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  moduleId?: string;
  videoUrl?: string;
  durationSeconds?: number;
  position?: number;
  isFreePreview?: boolean;
}

export interface Module {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  courseId?: string;
  position?: number;
  lessons?: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  modules?: Module[];
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
