import React, { useState } from "react";
import { useUpcoming } from "../lib/api-extra";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import { useLocation } from "wouter";

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function Calendar() {
  const [cursor, setCursor] = useState(new Date());
  const { data, isLoading } = useUpcoming(180);
  const [, navigate] = useLocation();

  const items: any[] = (data ?? []).map((i: any) => ({ ...i, dueDate: new Date(i.dueAt) }));

  const first = startOfMonth(cursor);
  const totalDays = daysInMonth(cursor);
  const startWeekday = first.getDay(); // Sunday-start
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  function shift(n: number) {
    const c = new Date(cursor); c.setMonth(c.getMonth() + n); setCursor(c);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><CalIcon className="h-6 w-6" />Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">All due dates across your courses.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-semibold w-32 text-center">{cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
          <Button variant="outline" size="sm" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d =>
              <div key={d} className="text-xs font-semibold text-center text-muted-foreground py-2">{d}</div>
            )}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell) return <div key={i} className="min-h-24" />;
              const todayMatch = sameDay(cell, new Date());
              const dayItems = items.filter(it => sameDay(it.dueDate, cell));
              return (
                <div key={i} className={`min-h-24 border rounded p-1.5 ${todayMatch ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className={`text-xs font-semibold mb-1 ${todayMatch ? "text-primary" : "text-foreground"}`}>{cell.getDate()}</div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((it: any) => (
                      <button key={`${it.kind}-${it.id}`}
                        onClick={() => navigate(it.kind === "quiz" ? `/quiz/${it.id}` : `/assignments/${it.id}`)}
                        className={`block w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate hover:opacity-80 transition-opacity
                          ${it.kind === "quiz" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                        {it.title}
                      </button>
                    ))}
                    {dayItems.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{dayItems.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {isLoading && <Skeleton className="h-12 w-full" />}

      <div>
        <h2 className="text-sm font-semibold mb-3">Upcoming this month</h2>
        <div className="space-y-2">
          {items.filter(it => it.dueDate.getMonth() === cursor.getMonth() && it.dueDate.getFullYear() === cursor.getFullYear()).map((it: any) => (
            <Card key={`${it.kind}-${it.id}`} className="cursor-pointer hover:border-primary/40 transition-all"
              onClick={() => navigate(it.kind === "quiz" ? `/quiz/${it.id}` : `/assignments/${it.id}`)}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`text-xs font-semibold w-12 text-center ${it.kind === "quiz" ? "text-amber-700" : "text-blue-700"}`}>
                  {it.dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{it.title}</p>
                  <p className="text-xs text-muted-foreground">{it.courseCode} &bull; {it.courseName}</p>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{it.kind}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
