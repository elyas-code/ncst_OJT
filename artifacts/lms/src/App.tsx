import React, { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/layout";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Courses from "./pages/courses";
import Settings from "./pages/settings";

const CourseDetail = lazy(() => import("./pages/course-detail"));
const QuizBuilder = lazy(() => import("./pages/quiz-builder"));
const QuizTake = lazy(() => import("./pages/quiz-take"));
const QuizResults = lazy(() => import("./pages/quiz-results"));
const Grades = lazy(() => import("./pages/grades"));
const Proctor = lazy(() => import("./pages/proctor"));
const Admin = lazy(() => import("./pages/admin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ component: Component, roles, ...rest }: { component: React.ComponentType<any>; roles?: string[] }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (roles && !roles.includes(user.role)) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p className="text-xl font-semibold">Access Denied</p>
          <p className="mt-2">You do not have permission to view this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <Component {...rest} />
      </Suspense>
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/courses" component={() => <ProtectedRoute component={Courses} />} />
      <Route path="/courses/:courseId/quiz-builder" component={() => <ProtectedRoute component={QuizBuilder} roles={["teacher", "admin"]} />} />
      <Route path="/courses/:courseId/grades" component={() => <ProtectedRoute component={Grades} roles={["teacher", "admin"]} />} />
      <Route path="/courses/:courseId/proctor" component={() => <ProtectedRoute component={Proctor} roles={["teacher", "admin"]} />} />
      <Route path="/courses/:id" component={() => <ProtectedRoute component={CourseDetail} />} />
      <Route path="/quiz/:quizId/results" component={() => <ProtectedRoute component={QuizResults} />} />
      <Route path="/quiz/:quizId" component={() => <ProtectedRoute component={QuizTake} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={Admin} roles={["admin"]} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
