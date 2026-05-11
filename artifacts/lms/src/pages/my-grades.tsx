import React, { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useAllGrades } from "../lib/api-extra";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, TrendingUp, BookOpen, ClipboardList, FileQuestion } from "lucide-react";

export default function MyGrades() {
  const { user } = useAuth();
  const { data, isLoading } = useAllGrades(user?.id ?? 0);

  const grouped = useMemo(() => {
    const m: Record<number, { courseName: string; courseCode: string; rows: any[] }> = {};
    (data ?? []).forEach((r: any) => {
      const key = r.courseId;
      if (!m[key]) m[key] = { courseName: r.courseName, courseCode: r.courseCode, rows: [] };
      m[key].rows.push(r);
    });
    return m;
  }, [data]);

  const avg = useMemo(() => {
    const graded = (data ?? []).filter((r: any) => r.grade != null && r.max_points);
    if (!graded.length) return null;
    const pct = graded.reduce((s: number, r: any) => s + (r.grade / r.max_points) * 100, 0) / graded.length;
    return pct;
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Award className="h-6 w-6" />My Grades</h1>
        <p className="text-sm text-muted-foreground mt-1">All your assignment and quiz results across every course.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={BookOpen} label="Courses" value={Object.keys(grouped).length} color="text-blue-600 bg-blue-50" />
        <StatCard icon={ClipboardList} label="Items graded" value={(data ?? []).filter((r: any) => r.grade != null).length} color="text-emerald-600 bg-emerald-50" />
        <StatCard icon={TrendingUp} label="Average" value={avg != null ? `${avg.toFixed(1)}%` : "—"} color="text-violet-600 bg-violet-50" />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !data?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Award className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="font-medium">No grades yet</p>
            <p className="text-xs text-muted-foreground mt-1">Submit assignments and quizzes to see your results.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cid, group]) => {
            const courseAvg = group.rows.filter((r: any) => r.grade != null && r.max_points)
              .reduce((acc: any, r: any, _, arr) => acc + (r.grade / r.max_points) * 100 / arr.length, 0);
            return (
              <Card key={cid}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{group.courseName}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{group.courseCode}</p>
                    </div>
                    {courseAvg > 0 && (
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{courseAvg.toFixed(0)}%</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Course Avg</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 text-left">
                        <tr>
                          <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item</th>
                          <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                          <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Score</th>
                          <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {group.rows.map((r: any, i: number) => {
                          const pct = r.grade != null && r.max_points ? (r.grade / r.max_points) * 100 : null;
                          const Icon = r.kind === "quiz" ? FileQuestion : ClipboardList;
                          return (
                            <tr key={`${r.kind}-${r.item_id}-${i}`} className="hover:bg-muted/30">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="font-medium">{r.title}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <Badge variant="outline" className="text-[10px] capitalize">{r.kind}</Badge>
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-xs">
                                {r.grade != null ? `${r.grade} / ${r.max_points}` : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {pct != null ? (
                                  <span className={`font-semibold text-sm ${pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-destructive"}`}>
                                    {pct.toFixed(0)}%
                                  </span>
                                ) : <span className="text-xs text-muted-foreground">Pending</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}
