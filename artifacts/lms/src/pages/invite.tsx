import React, { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";
import { BookOpen, CheckCircle, XCircle, Loader2, LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Invite() {
  const [, params] = useRoute("/invite/:token");
  const token = params?.token ?? "";
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [invitation, setInvitation] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invitations/${token}`, { credentials: "include" })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) setLoadError(data.error ?? "Failed to load invitation");
        else setInvitation(data);
      })
      .catch(() => setLoadError("Could not reach the server. Please try again."));
  }, [token]);

  const handleAccept = async () => {
    if (!user) { setLocation(`/login?redirect=/invite/${token}`); return; }
    setAccepting(true);
    setAcceptError(null);
    try {
      const r = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await r.json();
      if (!r.ok) { setAcceptError(data.error ?? "Could not accept invitation"); }
      else { setAccepted(true); }
    } catch {
      setAcceptError("Could not reach the server. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center h-16 px-6 gap-3">
          <img src="/logo.png" alt="NCST" className="h-8 w-auto object-contain" />
          <span className="font-bold text-lg tracking-tight">NCST Portal</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {/* Loading */}
          {!invitation && !loadError && (
            <Card className="shadow-lg border-0">
              <CardContent className="flex flex-col items-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading invitation…</p>
              </CardContent>
            </Card>
          )}

          {/* Error loading */}
          {loadError && (
            <Card className="shadow-lg border-0">
              <CardContent className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Invitation Unavailable</h2>
                <p className="text-muted-foreground mb-6 text-sm leading-relaxed">{loadError}</p>
                <Button variant="outline" onClick={() => setLocation("/")}>Go to Homepage</Button>
              </CardContent>
            </Card>
          )}

          {/* Accepted success */}
          {accepted && invitation && (
            <Card className="shadow-lg border-0">
              <CardContent className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-semibold mb-1">You're enrolled!</h2>
                <p className="text-muted-foreground text-sm mb-2">
                  You've been added to <span className="font-medium text-foreground">{invitation.courseTitle}</span>.
                </p>
                <Badge variant="secondary" className="mb-6 font-mono">{invitation.courseCode}</Badge>
                <Button onClick={() => setLocation(`/courses/${invitation.courseId}`)}>
                  Go to Course
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Invitation details */}
          {invitation && !accepted && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium mb-1">Course Invitation</p>
                <h1 className="text-2xl font-bold tracking-tight">You've been invited</h1>
              </div>

              <Card className="shadow-lg border-0">
                <CardContent className="p-6 space-y-5">
                  {/* Course info */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg leading-tight">{invitation.courseTitle}</p>
                      <p className="text-sm text-muted-foreground font-mono mt-0.5">{invitation.courseCode}</p>
                      {invitation.inviterName && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Invited by <span className="font-medium text-foreground">{invitation.inviterName}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">Sent to:</span>
                      <span className="font-medium">{invitation.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground ml-6">Expires:</span>
                      <span className="font-medium">
                        {new Date(invitation.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* Auth check */}
                  {!user ? (
                    <div className="border-t pt-4 space-y-3">
                      <p className="text-sm text-muted-foreground text-center">
                        Sign in with your NCST account to accept this invitation.
                      </p>
                      <Button className="w-full" onClick={() => setLocation(`/login?redirect=/invite/${token}`)}>
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign In to Accept
                      </Button>
                    </div>
                  ) : user.email.toLowerCase() !== invitation.email.toLowerCase() ? (
                    <div className="border-t pt-4">
                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                        <p className="font-medium mb-0.5">Wrong account</p>
                        <p>This invitation was sent to <span className="font-semibold">{invitation.email}</span>. You're signed in as <span className="font-semibold">{user.email}</span>.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t pt-4 space-y-3">
                      <p className="text-sm text-muted-foreground text-center">
                        Accepting as <span className="font-medium text-foreground">{user.name}</span>
                      </p>
                      {acceptError && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{acceptError}</div>
                      )}
                      <Button className="w-full" onClick={handleAccept} disabled={accepting}>
                        {accepting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enrolling…</> : <><CheckCircle className="mr-2 h-4 w-4" /> Accept & Enroll</>}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <p className="text-center text-xs text-muted-foreground">
                Nasser Centre for Science & Technology · <a href="mailto:support@ncst.edu.bh" className="hover:underline">support@ncst.edu.bh</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
