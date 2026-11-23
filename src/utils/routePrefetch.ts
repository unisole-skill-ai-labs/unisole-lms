/**
 * Route Prefetcher and Dynamic Import Map (Part 2)
 *
 * Centralizes route chunk loading, prefetching on hover/focus/touch,
 * and idle background prefetching for instant page navigation without full-screen spinners.
 */

// Central dynamic import map shared between React.lazy and prefetch triggers
export const routeLoaders = {
  dashboard: () => import("../pages/DashboardPage"),
  pathwayDetail: () => import("../pages/PathwayDetailPage"),
  enrolled: () => import("../pages/EnrolledCoursesPage"),
  activities: () => import("../pages/ActivitiesPage"),
  player: () => import("../pages/LmsPlayerPage"),
  login: () => import("../pages/LoginPage"),
  register: () => import("../pages/RegisterPage"),
  profile: () => import("../pages/ProfilePage"),
  paymentSuccess: () => import("../pages/PaymentSuccessPage"),
  calendar: () => import("../pages/CalendarPage"),
  articles: () => import("../pages/ArticlesPage"),
  notifications: () => import("../pages/NotificationsPage"),
  support: () => import("../pages/SupportPage"),
  notFound: () => import("../pages/NotFoundPage"),

  // Admin & Mentor Studio
  adminLayout: () => import("../components/layout/AdminLayout"),
  adminDashboard: () => import("../pages/admin/AdminDashboardPage"),
  adminCourses: () => import("../pages/admin/AdminCoursesPage"),
  adminEditCourse: () => import("../pages/admin/EditCoursePage"),
  adminSubmissions: () => import("../pages/admin/SubmissionsPage"),
  adminFiles: () => import("../pages/admin/FilesPage"),
  adminStudents: () => import("../pages/admin/StudentsPage"),
  adminLogin: () => import("../pages/admin/AdminLoginPage"),
};

// Cache to prevent duplicate prefetch calls
const prefetchedChunks = new Set<string>();

/**
 * Prefetches the route chunk based on URL path.
 */
export function prefetchByPath(path: string): void {
  if (!path || typeof path !== "string") return;

  const cleanPath = path.split("?")[0].toLowerCase();
  if (prefetchedChunks.has(cleanPath)) return;
  prefetchedChunks.add(cleanPath);

  try {
    if (cleanPath === "/" || cleanPath === "/dashboard") {
      routeLoaders.dashboard();
    } else if (cleanPath.startsWith("/pathway/")) {
      routeLoaders.pathwayDetail();
    } else if (cleanPath === "/enrolled" || cleanPath.startsWith("/courses")) {
      routeLoaders.enrolled();
    } else if (cleanPath.startsWith("/learn/") || cleanPath.startsWith("/player/")) {
      routeLoaders.player();
    } else if (cleanPath === "/activities") {
      routeLoaders.activities();
    } else if (cleanPath === "/calendar") {
      routeLoaders.calendar();
    } else if (cleanPath === "/notifications") {
      routeLoaders.notifications();
    } else if (cleanPath === "/support") {
      routeLoaders.support();
    } else if (cleanPath === "/profile") {
      routeLoaders.profile();
    } else if (cleanPath === "/login") {
      routeLoaders.login();
    } else if (cleanPath.startsWith("/admin")) {
      routeLoaders.adminLayout();
      if (cleanPath.includes("courses")) routeLoaders.adminCourses();
      else if (cleanPath.includes("students")) routeLoaders.adminStudents();
      else if (cleanPath.includes("submissions")) routeLoaders.adminSubmissions();
      else if (cleanPath.includes("files")) routeLoaders.adminFiles();
      else routeLoaders.adminDashboard();
    }
  } catch (err) {
    // Silently ignore prefetch errors
  }
}

/**
 * Returns event handlers to attach to Links / NavLinks for hover, focus, and touch prefetching.
 */
export function getPrefetchHandlers(path: string) {
  return {
    onMouseEnter: () => prefetchByPath(path),
    onFocus: () => prefetchByPath(path),
    onTouchStart: () => prefetchByPath(path),
  };
}

/**
 * Automatically prefetches core student routes during browser idle time after first paint.
 */
export function prefetchCoreRoutesOnIdle(): void {
  if (typeof window === "undefined") return;

  const prefetchCore = () => {
    try {
      routeLoaders.dashboard();
      routeLoaders.enrolled();
      routeLoaders.player();
      routeLoaders.calendar();
      routeLoaders.activities();
      routeLoaders.notifications();
    } catch {
      // Ignore background prefetch errors
    }
  };

  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(() => prefetchCore(), { timeout: 3000 });
  } else {
    setTimeout(prefetchCore, 1200);
  }
}
