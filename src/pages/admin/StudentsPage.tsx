import React, { useState } from "react";
import {
  Users,
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  User as UserIcon,
} from "lucide-react";
import { useGetAdminStudentsQuery } from "../../store/apiSlice";

export default function StudentsPage() {
  const { data: students = [], isLoading } = useGetAdminStudentsQuery(undefined);
  const [search, setSearch] = useState("");

  const filteredStudents = students.filter((s: any) => {
    const nameMatch = (s.name || "").toLowerCase().includes(search.toLowerCase());
    const phoneMatch = (s.phone || "").toLowerCase().includes(search.toLowerCase());
    const emailMatch = (s.email || "").toLowerCase().includes(search.toLowerCase());
    return nameMatch || phoneMatch || emailMatch;
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Students
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Directory of enrolled students, learner status, and account activity.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by student name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-800"
        />
      </div>

      {/* Students Table */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200/80 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/40">
                <th className="p-4">Student</th>
                <th className="p-4">Phone / Contact</th>
                <th className="p-4">Role</th>
                <th className="p-4">Account Status</th>
                <th className="p-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-400">
                    Loading student roster...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-400">
                    No students found matching your query.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st: any) => (
                  <tr
                    key={st.id}
                    className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 font-semibold text-xs">
                          {(st.name || st.phone || "S")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold">{st.name || "Student"}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">
                            ID: {st.id.slice(0, 10)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                      {st.phone || st.email || "No direct phone"}
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-zinc-700">
                        {st.role || "STUDENT"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 font-mono text-[11px]">
                      {st.createdAt ? new Date(st.createdAt).toLocaleDateString() : "Active"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
