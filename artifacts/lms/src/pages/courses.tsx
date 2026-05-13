import React, { useState } from "react";
import { useListCourses, useCreateCourse, useListUsers } from "@workspace/api-client-react";
import { useAuth } from "../context/AuthContext";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Courses() {
  const { user } = useAuth();
  const { data: courses, isLoading } = useListCourses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canCreate = user?.role === "teacher" || user?.role === "admin";

  return (
    <div data-testid="courses-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-1">Manage and view all courses.</p>
        </div>
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Course
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
                <DialogDescription>Fill in the details to create a new course.</DialogDescription>
              </DialogHeader>
              <CreateCourseForm onSuccess={() => setIsDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col">
                <CardHeader className="pb-3 flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg line-clamp-2 leading-tight">{course.title}</CardTitle>
                    {course.isActive ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </div>
                  <CardDescription className="flex flex-col gap-1 mt-2">
                    <span className="font-mono text-xs bg-muted w-fit px-2 py-0.5 rounded">{course.code}</span>
                    <span className="mt-1">{course.teacherName}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="border-t pt-4 text-sm text-muted-foreground flex justify-between">
                  <span>{course.semester} {course.academicYear}</span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {course.enrollmentCount || 0}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No courses found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {canCreate 
                ? "Get started by creating your first course."
                : "You don't have access to any courses yet."}
            </p>
            {canCreate && (
              <Button onClick={() => setIsDialogOpen(true)} className="mt-4" variant="outline">
                Create Course
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CreateCourseForm({ onSuccess }: { onSuccess: () => void }) {
  const { data: users } = useListUsers();
  const teachers = users?.filter(u => u.role === "teacher" || u.role === "admin") || [];
  const { user } = useAuth();
  
  const createCourse = useCreateCourse();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    code: "",
    description: "",
    semester: "Semester 1",
    academicYear: new Date().getFullYear().toString(),
    teacherId: user?.role === "teacher" ? user.id.toString() : "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCourse.mutate({
      data: {
        ...formData,
        teacherId: parseInt(formData.teacherId),
      }
    }, {
      onSuccess: () => {
        toast({ title: "Course created successfully" });
        onSuccess();
      },
      onError: () => {
        toast({ title: "Failed to create course", variant: "destructive" });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="title">Course Title</Label>
        <Input 
          id="title" 
          required 
          value={formData.title} 
          onChange={e => setFormData({ ...formData, title: e.target.value })} 
          placeholder="e.g. Introduction to Computer Science"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Course Code</Label>
          <Input 
            id="code" 
            required 
            value={formData.code} 
            onChange={e => setFormData({ ...formData, code: e.target.value })}
            placeholder="e.g. CS101" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher">Teacher</Label>
          <Select 
            value={formData.teacherId} 
            onValueChange={v => setFormData({ ...formData, teacherId: v })}
            required
          >
            <SelectTrigger id="teacher">
              <SelectValue placeholder="Select teacher" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map(t => (
                <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea 
          id="description" 
          value={formData.description} 
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="Course description..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="semester">Semester</Label>
          <Select 
            value={formData.semester} 
            onValueChange={v => setFormData({ ...formData, semester: v })}
          >
            <SelectTrigger id="semester">
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semester 1">Semester 1</SelectItem>
              <SelectItem value="Semester 2">Semester 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="year">Academic Year</Label>
          <Input 
            id="year" 
            required 
            value={formData.academicYear} 
            onChange={e => setFormData({ ...formData, academicYear: e.target.value })} 
          />
        </div>
      </div>

      <div className="pt-4 flex justify-end gap-2 border-t mt-6">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
        <Button type="submit" disabled={createCourse.isPending}>
          {createCourse.isPending ? "Creating..." : "Create Course"}
        </Button>
      </div>
    </form>
  );
}
