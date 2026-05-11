import React from "react";
import { Link } from "wouter";
import {
  BookOpen, Users, FileText, Shield, ChevronRight, GraduationCap,
  Award, Globe, Sparkles, ArrowRight, CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: BookOpen,
    title: "Course Management",
    description: "Access course materials, lecture notes, and resources in one organized place.",
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
    description: "Stay connected with lecturers and peers across all your enrolled courses.",
  },
];

const stats = [
  { value: "1,500+", label: "Active Students" },
  { value: "50+", label: "Courses Offered" },
  { value: "30+", label: "Faculty Members" },
  { value: "99.9%", label: "Platform Uptime" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 glass-card">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg p-1 shadow-sm">
              <img src="/logo.png" alt="NCST" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <p className="font-bold text-base leading-none tracking-tight">NCST</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none uppercase tracking-widest">Campus Portal</p>
            </div>
          </div>
          <Link href="/login">
            <Button className="gradient-primary text-white shadow-elegant hover:opacity-95">
              Sign In <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-blue-200/30 blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-6 py-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-border shadow-sm text-xs font-semibold mb-8">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Nasser Centre for Science &amp; Technology</span>
          </div>

          <h1 className="font-serif text-6xl md:text-7xl font-bold tracking-tight leading-[1.02] mb-8">
            Your Campus.
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-700 to-primary">
              Reimagined.
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            The official learning portal for NCST students and staff —
            access courses, submit assignments, take secure assessments, and track your
            academic journey in one beautifully designed place.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/login">
              <Button size="lg" className="text-base px-8 h-12 gradient-primary text-white shadow-premium hover:opacity-95 group">
                Sign In to Campus
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="text-base px-8 h-12 bg-white">
                Explore Features
              </Button>
            </a>
          </div>

          <div className="flex items-center justify-center gap-6 mt-12 text-xs text-muted-foreground">
            {[
              "Trusted by 1,500+ students",
              "Bank-grade security",
              "24/7 IT support",
            ].map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-border bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <div key={s.label} className={`text-center ${i > 0 ? "md:border-l md:border-border" : ""}`}>
                <div className="font-serif text-5xl font-bold text-primary tracking-tight">{s.value}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-2 font-semibold">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">What we offer</p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              One unified platform — designed for students, lecturers, and administrators alike.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map(f => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="border border-border hover:shadow-premium hover:-translate-y-0.5 transition-all duration-300 bg-white group">
                  <CardContent className="p-7 flex gap-5">
                    <div className="w-12 h-12 rounded-xl gradient-primary text-white flex items-center justify-center flex-shrink-0 shadow-elegant group-hover:scale-105 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1.5 tracking-tight">{f.title}</h3>
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
      <section className="py-20 px-6 bg-gradient-to-b from-white to-background border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Built for everyone</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
              Built for every role on campus
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                role: "Students",
                icon: GraduationCap,
                description: "Browse enrolled courses, submit files and OJT reports, take lockdown exams, and track your grades — all from one dashboard.",
                accent: "from-blue-500 to-blue-700",
              },
              {
                role: "Lecturers",
                icon: BookOpen,
                description: "Build quizzes with auto-grading, review submissions, provide feedback, export grade books, and proctor live exams.",
                accent: "from-emerald-500 to-emerald-700",
              },
              {
                role: "Administrators",
                icon: Shield,
                description: "Manage users, courses, and enrollments. Monitor academic integrity alerts and keep the campus running smoothly.",
                accent: "from-violet-500 to-violet-700",
              },
            ].map(r => {
              const Icon = r.icon;
              return (
                <Card key={r.role} className="border border-border bg-white hover:shadow-premium transition-shadow overflow-hidden">
                  <CardContent className="p-7">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${r.accent} text-white flex items-center justify-center mb-4 shadow-elegant`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg mb-2 tracking-tight">{r.role}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: GraduationCap, title: "Bahrain's leading", subtitle: "STEM institution" },
              { icon: Award, title: "Fully accredited", subtitle: "academic programs" },
              { icon: Globe, title: "International", subtitle: "curriculum standards" },
            ].map(h => {
              const Icon = h.icon;
              return (
                <div key={h.title} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-tight">{h.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{h.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 relative overflow-hidden gradient-primary">
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
        <div className="relative max-w-2xl mx-auto text-center text-white">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-5 tracking-tight">
            Ready to get started?
          </h2>
          <p className="text-white/80 mb-10 text-lg leading-relaxed">
            Sign in with your NCST institutional email and pick up exactly where you left off.
          </p>
          <Link href="/login">
            <Button size="lg" variant="secondary" className="text-base px-10 h-12 bg-white text-primary hover:bg-white/95 font-semibold shadow-premium group">
              Sign In to the Portal
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NCST" className="h-8 w-8 object-contain" />
            <div>
              <p className="font-semibold text-foreground text-sm leading-none">NCST</p>
              <p className="text-[11px] mt-1 leading-none">Nasser Centre for Science &amp; Technology</p>
            </div>
          </div>
          <p className="text-xs">
            © {new Date().getFullYear()} NCST. All rights reserved. ·{" "}
            <a href="mailto:support@ncst.edu.bh" className="text-primary hover:underline font-medium">support@ncst.edu.bh</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
