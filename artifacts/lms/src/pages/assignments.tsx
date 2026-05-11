import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUpcoming } from "../lib/api-extra";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Clock, AlertCircle, FileText, ChevronRight } from "lucide-react";

function fmtDate(d: string | Date) {
  const date = new Date(d);
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function relativeTime(d: string | Date) {
  const ms = new Date(d).getTime() - Date.now();
  const hrs = ms / (1000 * 60 * 60);
  if (hrs < 0) return "Past due";
  if (hrs < 24) return `Due in ${Math.round(hrs)} h`;
  return `Due in ${Math.round(hrs / 24)} d`;
}

export default function AssignmentsPage() {
  const { data, isLoading } = useUpcoming(60);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assignments &amp; Quizzes</h1>
        <p className="text-sm text-muted-foreground mt-1">Upcoming work across all your courses.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : !data?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="font-medium">Nothing due in the next 60 days</p>
            <p className="text-xs text-muted-foreground mt-1">You're all caught up. Check back later.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((item: any) => {
            const due = new Date(item.dueAt);
            const overdue = due < new Date();
            const soon = !overdue && (due.getTime() - Date.now()) < 48 * 3600 * 1000;
            const target = item.kind === "quiz" ? `/quiz/${item.id}` : `/assignments/${item.id}`;
            return (
              <Card key={`${item.kind}-${item.id}`}
                className="hover:shadow-sm hover:border-primary/30 cursor-pointer transition-all"
                onClick={() => navigate(target)}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                    ${item.kind === "quiz" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                    {item.kind === "quiz" ? <AlertCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-sm truncate">{item.title}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{item.kind}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{item.courseCode}</span> &bull; {item.courseName} &bull; {item.points} pts
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-semibold ${overdue ? "text-destructive" : soon ? "text-amber-600" : "text-muted-foreground"}`}>
                      <Clock className="h-3 w-3 inline mr-1" />{relativeTime(item.dueAt)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(item.dueAt)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
