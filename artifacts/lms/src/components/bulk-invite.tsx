import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Loader2, Mail, Sparkles, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BulkInviteResult {
  succeeded: number;
  failed: number;
  results: Array<{ email: string; success: boolean; token?: string; error?: string }>;
}

function extractEmails(raw: string): string[] {
  // Extract all valid-looking email addresses from any text format
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const found = raw.match(emailRegex) ?? [];
  // Deduplicate, lowercase
  return [...new Set(found.map(e => e.toLowerCase()))];
}

const EXAMPLE = `student1@ncst.edu.bh
student2@ncst.edu.bh
student3@ncst.edu.bh

OR paste a CSV/spreadsheet column — the agent extracts all emails automatically:
Name, Email, Department
Fatima Al-Zahra, fatima@ncst.edu.bh, Engineering
Ahmed Hassan, ahmed@ncst.edu.bh, CS`;

interface Props {
  courses: Array<{ id: number; title: string; code: string }>;
  defaultCourseId?: number;
  onClose: () => void;
}

export default function BulkInvite({ courses, defaultCourseId, onClose }: Props) {
  const [step, setStep] = useState<"input" | "preview" | "done">("input");
  const [raw, setRaw] = useState("");
  const [courseId, setCourseId] = useState<string>(defaultCourseId?.toString() ?? "");
  const [emails, setEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkInviteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleParse = () => {
    if (!courseId) { setError("Please select a course first."); return; }
    const found = extractEmails(raw);
    if (found.length === 0) { setError("No valid email addresses found. Please check your input."); return; }
    setError(null);
    setEmails(found);
    setStep("preview");
  };

  const handleInvite = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/courses/${courseId}/invitations/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emails }),
      });
      const data: BulkInviteResult = await r.json();
      if (!r.ok) { setError((data as any).error ?? "Server error"); return; }
      setResult(data);
      setStep("done");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setStep("input"); setRaw(""); setEmails([]); setResult(null); setError(null); };
  const selectedCourse = courses.find(c => c.id.toString() === courseId);

  return (
    <>
      {step === "input" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Bulk Invite Agent</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Paste a list of emails in any format — one per line, CSV, a spreadsheet column, or even a whole student roster. The agent automatically extracts all email addresses.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Select Course *</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger><SelectValue placeholder="Choose a course to invite to…" /></SelectTrigger>
              <SelectContent>
                {courses.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.title} <span className="text-muted-foreground ml-1 font-mono text-xs">({c.code})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Student emails (any format)</Label>
            <Textarea
              value={raw}
              onChange={e => setRaw(e.target.value)}
              placeholder={"student1@ncst.edu.bh\nstudent2@ncst.edu.bh\n\n— or paste a CSV column with emails mixed in —\nName, Email, ID\nFatima, fatima@ncst.edu.bh, 001"}
              rows={10}
              className="font-mono text-xs"
            />
            {raw.trim() && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-primary">{extractEmails(raw).length}</span> email{extractEmails(raw).length !== 1 ? "s" : ""} detected
              </p>
            )}
          </div>

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleParse} disabled={!raw.trim() || !courseId} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Extract & Preview
            </Button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Ready to invite {emails.length} students</p>
              <p className="text-xs text-muted-foreground">Course: <span className="font-medium">{selectedCourse?.title}</span></p>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
            {emails.map((email, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 border-b last:border-0 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="font-mono text-xs">{email}</span>
              </div>
            ))}
          </div>

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={reset}>Back</Button>
            <Button onClick={handleInvite} disabled={loading || emails.length === 0} className="gap-2">
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending invitations…</>
                : <><Mail className="h-4 w-4" /> Send {emails.length} Invitations</>
              }
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-4">
          <div className="flex flex-col items-center py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <CheckCircle className="h-7 w-7 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold">Invitations Sent</h3>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium text-emerald-600">{result.succeeded}</span> invitations created
              {result.failed > 0 && <>, <span className="font-medium text-amber-600">{result.failed} skipped</span></>}.
            </p>
          </div>

          <div className="rounded-lg border bg-slate-50 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Invitation emails sent</p>
            <p className="text-xs text-muted-foreground">
              Each student has been emailed a unique invitation link. When they click it and sign in, they're automatically enrolled in the course.
            </p>
          </div>

          {result.failed > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <p className="px-3 py-2 text-xs font-semibold bg-amber-50 border-b text-amber-700">Skipped (already invited or error)</p>
              {result.results.filter(r => !r.success).map((r, i) => (
                <div key={i} className="px-3 py-2 text-xs flex items-center gap-2 border-b last:border-0">
                  <XCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  <span className="font-mono text-muted-foreground">{r.email}</span>
                  <span className="text-amber-700">— {r.error}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={reset} className="gap-1.5"><RotateCcw className="h-4 w-4" /> Invite More</Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      )}
    </>
  );
}
