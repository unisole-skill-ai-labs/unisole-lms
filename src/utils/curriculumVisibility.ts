export function isPublishedVisible(entity: any): boolean {
  return Boolean(entity && entity.status === "PUBLISHED" && entity.isActive !== false);
}

/**
 * Static curriculumData.ts fallback is strictly dev-only (localhost) so production
 * never masks or mixes with real database courses, modules, or lessons.
 */
export function allowDevCurriculumFallback(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  );
}

export function filterVisibleModules(courses: any[], pathwayId?: string): any[] {
  const normalizedPathway = (pathwayId || "").toLowerCase();
  const targetCourses = (courses || []).filter((c: any) => {
    const cId = (c.id || "").toLowerCase();
    const cSlug = (c.slug || "").toLowerCase();
    if (normalizedPathway === "cs-agentic" || normalizedPathway === "course1") {
      return cId === "cs-agentic" || cSlug === "cs-agentic" || cId === "course1";
    }
    return cId === normalizedPathway || cSlug === normalizedPathway;
  });
  const effectiveCourses = targetCourses.length > 0 ? targetCourses : (courses || []);
  const allCourseModules = effectiveCourses.flatMap((c: any) => c.modules || []);
  return allCourseModules.filter(
    (m: any) =>
      m &&
      m.title &&
      isPublishedVisible(m) &&
      !m.title.toLowerCase().includes("intro to ai")
  );
}
