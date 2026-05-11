import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";
import { useLogout } from "@workspace/api-client-react";
import {
  BookOpen, Home, Settings, Users, LogOut, Bell,
  Upload, LayoutDashboard, GraduationCap, ChevronDown,
} from "lucide-react";
import { Button } from "./ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navGroups: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["student", "teacher", "admin"] },
      { label: "Courses", href: "/courses", icon: BookOpen, roles: ["student", "teacher", "admin"] },
      { label: "Submissions", href: "/submissions", icon: Upload, roles: ["student", "teacher", "admin"] },
    ],
  },
  {
    label: "Teaching",
    items: [
      { label: "My Panel", href: "/teacher", icon: GraduationCap, roles: ["teacher", "admin"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Admin Panel", href: "/admin", icon: Users, roles: ["admin"] },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, roles: ["student", "teacher", "admin"] },
    ],
  },
];

const roleColors: Record<string, string> = {
  student: "bg-blue-100 text-blue-700",
  teacher: "bg-emerald-100 text-emerald-700",
  admin: "bg-violet-100 text-violet-700",
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, setUser } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => setUser(null) });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-7 h-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/dashboard"
      ? location === "/dashboard"
      : location.startsWith(href);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-60 bg-white dark:bg-card border-r border-slate-200 dark:border-border flex flex-col hidden md:flex flex-shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-slate-100 dark:border-border gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-none">
            <span className="font-bold text-sm tracking-tight block">NCST Portal</span>
            <span className="text-[10px] text-muted-foreground">Learning Management</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navGroups.map((group, gi) => {
            const visibleItems = group.items.filter(item => item.roles.includes(user.role));
            if (visibleItems.length === 0) return null;
            return (
              <div key={gi} className={gi > 0 ? "pt-4" : ""}>
                {group.label && (
                  <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {group.label}
                  </p>
                )}
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-100 ${
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-muted hover:text-slate-900 dark:hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-100 dark:border-border p-3">
          <div className="flex items-center gap-2.5 p-2 rounded-md">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-semibold text-primary-foreground text-sm flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none truncate">{user.name}</p>
              <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${roleColors[user.role] ?? "bg-muted text-muted-foreground"}`}>
                {user.role}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-slate-200 dark:border-border bg-white dark:bg-card flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="text-sm text-muted-foreground font-medium">
            Nasser Centre for Science &amp; Technology
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 relative text-muted-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
