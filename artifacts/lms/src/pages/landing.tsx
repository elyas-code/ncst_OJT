import React from "react";
import { Link } from "wouter";
import { BookOpen, Users, FileText, Shield, ChevronRight, GraduationCap, Award, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: BookOpen,
    title: "Course Management",
    description: "Access course materials, lecture notes, and resources all in one place.",
  },
  {
    icon: FileText,
    title: "File Submissions",
    description: "Submit assignments and OJT reports digitally with real-time status tracking.",
  },
  {
    icon: Shield,
    title: "Secure Assessments",
    description: "Take lockdown quizzes and exams with integrity monitoring built in.",
  },
  {
    icon: Users,
    title: "Collaborative Learning",
    description: "Stay connected with your lecturers and peers across all your enrolled courses.",
  },
];

const stats = [
  { value: "1,500+", label: "Students" },
  { value: "50+", label: "Courses" },
  { value: "30+", label: "Lecturers" },
  { value: "99.9%", label: "Uptime" },
];

const highlights = [
  { icon: GraduationCap, label: "Bahrain's Leading STEM Institution" },
  { icon: Award, label: "Accredited Academic Programs" },
  { icon: Globe, label: "International Curriculum Standards" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">NCST Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button>Sign In <ChevronRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <Badge variant="secondary" className="mb-6 px-4 py-1 text-sm">
            Nasser Centre for Science & Technology
          </Badge>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Your Campus,<br />
            <span className="text-primary">Digitally Connected</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            The official learning management portal for NCST students and staff —
            access courses, submit assignments, take assessments, and track your
            academic progress all in one place.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/login">
              <Button size="lg" className="text-base px-8">
                Sign In to Campus <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map(s => (
              <div key={s.label}>
                <div className="text-4xl font-extrabold text-primary">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Everything You Need to Succeed</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              One unified platform designed for students, lecturers, and administrators.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map(f => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="border border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-6 flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base mb-1">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Role callouts */}
      <section className="py-16 px-6 bg-muted/30 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-10">Built for Every Role on Campus</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                role: "Students",
                description: "Browse enrolled courses, submit files and OJT reports, take lockdown exams, and track your grades — all from one dashboard.",
                color: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
              },
              {
                role: "Lecturers",
                description: "Create quizzes with auto-grading, review student submissions, provide feedback, export grade books, and proctor live exams.",
                color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              },
              {
                role: "Administrators",
                description: "Manage users, courses, and enrollments. Monitor academic integrity alerts and keep the campus platform running smoothly.",
                color: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
              },
            ].map(r => (
              <Card key={r.role} className="border border-border">
                <CardContent className="p-6">
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-3 ${r.color}`}>
                    {r.role}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          {highlights.map(h => {
            const Icon = h.icon;
            return (
              <div key={h.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{h.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Sign in with your NCST institutional email to access your courses and resources.
          </p>
          <Link href="/login">
            <Button size="lg" variant="secondary" className="text-base px-10">
              Sign In to the Portal
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Nasser Centre for Science & Technology. All rights reserved.</p>
        <p className="mt-1">For technical support, contact <a href="mailto:support@ncst.edu.bh" className="text-primary hover:underline">support@ncst.edu.bh</a></p>
      </footer>
    </div>
  );
}
