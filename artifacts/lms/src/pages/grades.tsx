import React from "react";
import { useRoute, Link } from "wouter";
import { useGetCourse, useListCourseGrades, useExportGrades, useListQuizzes } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";

function pct(score?: number | null, max?: number | null) {
  if (score == null || max == null || max === 0) return null;
  return Math.round((score / max) * 100);
}

function CellColor({ score, max }: { score?: number | null; max?: number | null }) {
  const p = pct(score, max);
  if (p == null) return <span className="text-muted-foreground">-</span>;
  const cls = p >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
    : p >= 60 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {score}/{max}
    </span>
  );
}

export default function Grades() {
  const [, params] = useRoute("/courses/:courseId/grades");
  const courseId = params?.courseId ? parseInt(params.courseId) : 0;

  const { data: course } = useGetCourse(courseId, { query: { enabled: !!courseId } as any });
  const { data: quizzes } = useListQuizzes(courseId, { query: { enabled: !!courseId } as any });
  const { data: grades, isLoading } = useListCourseGrades(courseId, { query: { enabled: !!courseId } as any });
  const { refetch: doExport, isFetching: exportPending } = useExportGrades(courseId, { query: { enabled: false } as any });

  function handleExport() {
    doExport().then(({ data }: { data: any }) => {
      if (!data) return;
      const { courseName, rows } = data;
      if (!rows?.length) return;

      const headers = ["Student Name", "Student Email", "Quiz", "Score", "Max Score", "Percentage", "Status", "Submitted At"];
      const csvRows = [
        headers.join(","),
        ...rows.map((r: any) => [
          `"${r.studentName}"`,
          `"${r.studentEmail}"`,
          `"${r.quizTitle}"`,
          r.score ?? "",
          r.maxScore ?? "",
          r.maxScore ? `${Math.round((r.score / r.maxScore) * 100)}%` : "",
          r.status,
          r.submittedAt ?? "",
        ].join(","))
      ].join("\n");

      const blob = new Blob([csvRows], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${courseName.replace(/\s+/g, "_")}_grades.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Build pivot table
  const quizTitles = [...new Set(grades?.map((r: any) => r.quizTitle) ?? [])];
  const studentMap = new Map<string, { name: string; email: string; grades: Record<string, any> }>();

  grades?.forEach((r: any) => {
    const key = String(r.studentId);
    if (!studentMap.has(key)) {
      studentMap.set(key, { name: r.studentName, email: r.studentEmail, grades: {} });
    }
    studentMap.get(key)!.grades[r.quizTitle] = r;
  });

  const students = [...studentMap.values()];

  return (
    <div data-testid="grades-page" className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/courses" className="hover:text-foreground">Courses</Link>
        <span>/</span>
        <Link href={`/courses/${courseId}`} className="hover:text-foreground">{course?.title}</Link>
        <span>/</span>
        <span className="text-foreground">Grades</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grade Book</h1>
          <p className="text-muted-foreground text-sm">{course?.title} &bull; {students.length} students &bull; {quizTitles.length} assessments</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exportPending} data-testid="export-grades-btn">
          <Download className="h-4 w-4 mr-2" />
          {exportPending ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No grade data available yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-48">Student</th>
                  {quizTitles.map(qt => (
                    <th key={qt} className="text-center px-4 py-3 font-semibold text-muted-foreground min-w-32">
                      <span className="block truncate max-w-32" title={qt}>{qt}</span>
                    </th>
                  ))}
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((student, i) => {
                  const scores = quizTitles.map(qt => student.grades[qt]);
                  const graded = scores.filter(s => s?.score != null && s?.maxScore != null);
                  const avgPct = graded.length > 0
                    ? Math.round(graded.reduce((sum, s) => sum + (s.score / s.maxScore) * 100, 0) / graded.length)
                    : null;

                  return (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </td>
                      {quizTitles.map(qt => {
                        const s = student.grades[qt];
                        return (
                          <td key={qt} className="px-4 py-3 text-center">
                            <CellColor score={s?.score} max={s?.maxScore} />
                            {s && s.status === "submitted" && <span className="ml-1 text-xs text-muted-foreground">(pending)</span>}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        {avgPct != null ? (
                          <span className={`font-semibold ${avgPct >= 80 ? "text-green-600" : avgPct >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                            {avgPct}%
                          </span>
                        ) : <span className="text-muted-foreground">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
