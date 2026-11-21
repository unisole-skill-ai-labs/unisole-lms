import { useMemo } from "react";
import { useSelector } from "react-redux";
import {
  useGetAdminDashboardStatsQuery,
  useGetAdminCoursesQuery,
  useGetAdminStudentsQuery,
} from "../store/apiSlice";

export interface UseAdminAnalyticsOptions {
  period?: "Weekly" | "Monthly" | "Yearly";
  courseId?: string;
}

/**
 * useAdminAnalytics (Part F - Shared Frontend Data Hook)
 *
 * Single Source of Truth for:
 * - Canonical enrollment counts
 * - Needs Attention alerts (inactive 7+, overdue, unassigned)
 * - Progress Funnel & drop-off
 * - Academic evaluation benchmarks
 * - Per-course cards and highlight statistics
 */
export function useAdminAnalytics(options?: UseAdminAnalyticsOptions) {
  const period = options?.period || "Monthly";
  const courseId = options?.courseId && options.courseId !== "ALL" ? options.courseId : undefined;
  const { isAuthenticated, user } = useSelector((state: any) => state.auth);

  const {
    data: statsData,
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats,
  } = useGetAdminDashboardStatsQuery(
    { period, courseId },
    { skip: !isAuthenticated }
  );

  const stats = statsData?.data || statsData;

  const summary = useMemo(() => {
    return (
      stats?.summary || {
        totalCourses: 0,
        publishedCourses: 0,
        totalModules: 0,
        totalLessons: 0,
        publishedLessons: 0,
        enrolledStudents: 0,
        totalRegisteredUsers: 0,
        activeEnrollments: 0,
        pendingSubmissions: 0,
        gradedSubmissions: 0,
      }
    );
  }, [stats]);

  const needsAttention = useMemo(() => {
    return (
      stats?.needsAttention || {
        inactive7Days: 0,
        overdueSubmissions: 0,
        unassignedStudents: 0,
        reviewQueueSize: 0,
      }
    );
  }, [stats]);

  const funnel = useMemo(() => {
    return (
      stats?.funnel || {
        enrolled: summary.enrolledStudents || 0,
        activeLearners: 0,
        assessed: 0,
        certified: 0,
        enrolledPct: 100,
        activePct: 0,
        assessedPct: 0,
        certifiedPct: 0,
        dropOff: {
          enrolledToActive: 0,
          enrolledToActivePct: 0,
          activeToAssessed: 0,
          activeToAssessedPct: 0,
          assessedToCertified: 0,
          assessedToCertifiedPct: 0,
        },
      }
    );
  }, [stats, summary.enrolledStudents]);

  const benchmarks = useMemo(() => {
    return (
      stats?.benchmarks || {
        avgScore: 0,
        vivaTotal: 0,
        vivaPassRate: 0,
        codingTotal: 0,
        codingPassRate: 0,
        avgTurnaroundHours: 0,
        totalEvaluations: 0,
      }
    );
  }, [stats]);

  const highlightCards = useMemo(() => {
    return stats?.highlightCards || [];
  }, [stats]);

  const velocity = useMemo(() => {
    return (
      stats?.velocity || {
        period,
        totalActivity: 0,
        data: [],
      }
    );
  }, [stats, period]);

  const courses = useMemo(() => {
    return stats?.courses || [];
  }, [stats]);

  return {
    rawStats: stats,
    summary,
    needsAttention,
    funnel,
    benchmarks,
    highlightCards,
    velocity,
    courses,
    canonicalEnrolledCount: summary.enrolledStudents,
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats,
  };
}
