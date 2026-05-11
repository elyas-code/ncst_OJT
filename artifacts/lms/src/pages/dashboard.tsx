import React from "react";
import { useAuth } from "../context/AuthContext";
import { useListCourses, useListAlerts, useGetCourseDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { BookOpen, Users, Bell, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.name}</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening today.</p>
      </div>

      {user.role === "student" && <StudentDashboard />}
      {user.role === "teacher" && <TeacherDashboard />}
      {user.role === "admin" && <AdminDashboard />}
    </div>
  );
}

function StudentDashboard() {
  const { data: courses, isLoading } = useListCourses();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const enrolledCourses = courses?.filter(c => true) || []; // In a real app, filter by enrollment

  if (enrolledCourses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <BookOpen className="h-12 w-12 mb-4 opacity-20" />
          <p>You are not enrolled in any courses yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {enrolledCourses.map(course => (
        <Link key={course.id} href={`/courses/${course.id}`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col">
            <CardHeader className="pb-3 flex-1">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                <Badge variant="outline">{course.code}</Badge>
              </div>
              <CardDescription className="mt-2">{course.teacherName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Course Progress</span>
                  <span>0%</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function TeacherDashboard() {
  const { data: courses, isLoading: coursesLoading } = useListCourses();
  
  if (coursesLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your Courses</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses?.map(course => (
          <TeacherCourseCard key={course.id} course={course} />
        ))}
        {courses?.length === 0 && (
          <p className="text-muted-foreground col-span-2">You are not teaching any courses.</p>
        )}
      </div>
    </div>
  );
}

function TeacherCourseCard({ course }: { course: any }) {
  const { data: dashboard, isLoading } = useGetCourseDashboard(course.id, { query: { enabled: !!course.id } as any });

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{course.title}</CardTitle>
            <CardDescription>{course.code} • {course.semester}</CardDescription>
          </div>
          {dashboard?.pendingGrades ? (
            <Badge variant="destructive">
              {dashboard.pendingGrades} Pending Grades
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-muted/50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{dashboard?.enrolledStudents || 0}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Students</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{dashboard?.recentAlerts || 0}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Alerts</div>
            </div>
          </div>
        )}
        <div className="flex gap-2 mt-auto">
          <Link href={`/courses/${course.id}`} className="flex-1">
            <div className="w-full text-center bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
              Go to Course
            </div>
          </Link>
          <Link href={`/courses/${course.id}/grades`} className="flex-1">
            <div className="w-full text-center border border-input bg-background py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors">
              Grade Submissions
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminDashboard() {
  const { data: alerts, isLoading: alertsLoading } = useListAlerts();
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Manage Users</div>
            <Link href="/admin" className="text-xs text-primary hover:underline mt-1 inline-block">Go to Admin Panel</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Manage Courses</div>
            <Link href="/admin" className="text-xs text-primary hover:underline mt-1 inline-block">Go to Admin Panel</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">System Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Unresolved alerts</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Recent Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : alerts && alerts.length > 0 ? (
            <div className="space-y-4">
              {alerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium">{alert.studentName} - {alert.quizTitle}</div>
                    <div className="text-sm text-muted-foreground">{alert.message}</div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {alert.alertType.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No recent alerts.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
