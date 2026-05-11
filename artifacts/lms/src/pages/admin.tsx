import React, { useState } from "react";
import { useListUsers, useCreateUser, useDeleteUser, useListCourses, useCreateCourse, useUpdateCourse, useListAlerts, useResolveAlert, useCreateEnrollment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Users, BookOpen, Bell, GraduationCap, Sparkles } from "lucide-react";
import BulkUserImport from "../components/bulk-user-import";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  teacher: "bg-blue-100 text-blue-700",
  student: "bg-green-100 text-green-700",
};

const ALERT_COLORS: Record<string, string> = {
  tab_switch: "bg-orange-100 text-orange-700",
  noise_detected: "bg-yellow-100 text-yellow-700",
  movement_detected: "bg-yellow-100 text-yellow-700",
  force_submitted: "bg-red-100 text-red-700",
  late_entry: "bg-amber-100 text-amber-700",
  violation: "bg-red-100 text-red-700",
};

function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", department: "", studentId: "" });
  const create = useCreateUser();
  const qc = useQueryClient();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate({ data: form } as any, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/users"] });
        setOpen(false);
        setForm({ name: "", email: "", password: "", role: "student", department: "", studentId: "" });
      }
    });
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="add-user-btn"><Plus className="h-4 w-4 mr-1" />Add User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New User</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Name</Label><Input required value={form.name} onChange={f("name")} /></div>
            <div className="space-y-1"><Label>Email</Label><Input required type="email" value={form.email} onChange={f("email")} /></div>
            <div className="space-y-1"><Label>Password</Label><Input required type="password" value={form.password} onChange={f("password")} /></div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Department</Label><Input value={form.department} onChange={f("department")} /></div>
            <div className="space-y-1"><Label>Student ID</Label><Input value={form.studentId} onChange={f("studentId")} /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating..." : "Create User"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddCourseDialog({ teachers }: { teachers: any[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", code: "", description: "", teacherId: "", semester: "", academicYear: "2025-2026" });
  const create = useCreateCourse();
  const qc = useQueryClient();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate({ data: { ...form, teacherId: parseInt(form.teacherId) } } as any, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/courses"] });
        setOpen(false);
      }
    });
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Course</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Course</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2"><Label>Title</Label><Input required value={form.title} onChange={f("title")} /></div>
            <div className="space-y-1"><Label>Code</Label><Input required value={form.code} onChange={f("code")} /></div>
            <div className="space-y-1">
              <Label>Teacher</Label>
              <Select value={form.teacherId} onValueChange={v => setForm(p => ({ ...p, teacherId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Semester</Label><Input value={form.semester} onChange={f("semester")} /></div>
            <div className="space-y-1"><Label>Academic Year</Label><Input value={form.academicYear} onChange={f("academicYear")} /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating..." : "Create Course"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BulkImportDialog({ onComplete }: { onComplete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> AI Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Bulk Import Users
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-1">
          <BulkUserImport onComplete={() => { setOpen(false); onComplete(); }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Admin() {
  const { data: users, isLoading: usersLoading } = useListUsers();
  const { data: courses, isLoading: coursesLoading } = useListCourses();
  const { data: alerts, isLoading: alertsLoading } = useListAlerts();
  const deleteUser = useDeleteUser();
  const resolveAlert = useResolveAlert();
  const createEnrollment = useCreateEnrollment();
  const updateCourse = useUpdateCourse();
  const qc = useQueryClient();

  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [enrollCourseId, setEnrollCourseId] = useState("");

  const teachers = users?.filter((u: any) => u.role === "teacher") ?? [];
  const students = users?.filter((u: any) => u.role === "student") ?? [];
  const unresolvedAlerts = alerts?.filter((a: any) => !a.resolved) ?? [];

  return (
    <div data-testid="admin-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage users, courses, and monitor system activity.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users?.length ?? "-", icon: Users, color: "text-blue-600" },
          { label: "Total Courses", value: courses?.length ?? "-", icon: BookOpen, color: "text-green-600" },
          { label: "Unresolved Alerts", value: unresolvedAlerts.length, icon: Bell, color: "text-red-600" },
          { label: "Students", value: students.length, icon: GraduationCap, color: "text-purple-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold mt-1">{value}</p>
                </div>
                <Icon className={`h-8 w-8 ${color} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts {unresolvedAlerts.length > 0 && <Badge variant="destructive" className="ml-1 h-4 text-xs px-1">{unresolvedAlerts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base">All Users</CardTitle>
              <div className="flex items-center gap-2">
                <BulkImportDialog onComplete={() => qc.invalidateQueries()} />
                <AddUserDialog />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {usersLoading ? <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? ""}`}>{u.role}</span></TableCell>
                        <TableCell className="text-sm">{u.department ?? "-"}</TableCell>
                        <TableCell className="text-sm font-mono">{u.studentId ?? "-"}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                            onClick={() => deleteUser.mutate({ id: u.id } as any, { onSuccess: () => qc.invalidateQueries() })}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base">All Courses</CardTitle>
              <AddCourseDialog teachers={teachers} />
            </CardHeader>
            <CardContent className="p-0">
              {coursesLoading ? <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses?.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.title}</TableCell>
                        <TableCell className="font-mono text-sm">{c.code}</TableCell>
                        <TableCell className="text-sm">{c.teacherName}</TableCell>
                        <TableCell className="text-sm">{c.semester} {c.academicYear}</TableCell>
                        <TableCell className="text-sm">{c.enrollmentCount}</TableCell>
                        <TableCell>
                          <button
                            className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                            onClick={() => updateCourse.mutate({ id: c.id, data: { isActive: !c.isActive } } as any, { onSuccess: () => qc.invalidateQueries() })}
                          >
                            {c.isActive ? "Active" : "Inactive"}
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Unresolved Alerts</h2>
          </div>
          {alertsLoading && [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          {unresolvedAlerts.length === 0 && !alertsLoading && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No unresolved alerts.</CardContent></Card>
          )}
          {unresolvedAlerts.map((alert: any) => (
            <Card key={alert.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ALERT_COLORS[alert.alertType] ?? "bg-gray-100 text-gray-700"}`}>
                    {alert.alertType.replace(/_/g, " ")}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{alert.studentName}</p>
                    <p className="text-xs text-muted-foreground">{alert.message} &bull; {new Date(alert.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => resolveAlert.mutate({ id: alert.id, data: {} } as any, { onSuccess: () => qc.invalidateQueries() })}>
                  Resolve
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Enrollments Tab */}
        <TabsContent value="enrollments" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Enroll Student</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select value={enrollStudentId} onValueChange={setEnrollStudentId}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Course</Label>
                  <Select value={enrollCourseId} onValueChange={setEnrollCourseId}>
                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>
                      {courses?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.title} ({c.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                disabled={!enrollStudentId || !enrollCourseId || createEnrollment.isPending}
                onClick={() => createEnrollment.mutate({ data: { studentId: parseInt(enrollStudentId), courseId: parseInt(enrollCourseId) } } as any, {
                  onSuccess: () => { setEnrollStudentId(""); setEnrollCourseId(""); qc.invalidateQueries(); }
                })}
              >
                {createEnrollment.isPending ? "Enrolling..." : "Enroll Student"}
              </Button>
              {createEnrollment.isSuccess && <p className="text-sm text-green-600">Student enrolled successfully.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
