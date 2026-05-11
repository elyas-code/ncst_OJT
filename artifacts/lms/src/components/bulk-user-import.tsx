import React, { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload, CheckCircle, XCircle, Loader2, Users, Sparkles,
  AlertTriangle, ChevronRight, RotateCcw, Info,
} from "lucide-react";

interface ParsedUser {
  name: string;
  email: string;
  password: string;
  role: "student" | "teacher" | "admin";
  studentId?: string;
  department?: string;
  _valid: boolean;
  _error?: string;
}

function parseUsers(raw: string, defaultRole: string): ParsedUser[] {
  const lines = raw.trim().split(/\r?\n/).filter(l => l.trim() && !l.startsWith("#"));
  if (lines.length === 0) return [];

  // Try JSON first
  try {
    const json = JSON.parse(raw);
    if (Array.isArray(json)) {
      return json.map(u => validateUser({
        name: u.name ?? u.fullName ?? u.full_name ?? "",
        email: u.email ?? u.Email ?? "",
        password: u.password ?? u.Password ?? u.pass ?? "",
        role: u.role ?? u.Role ?? defaultRole,
        studentId: u.studentId ?? u.student_id ?? u.id ?? undefined,
        department: u.department ?? u.dept ?? undefined,
      }));
    }
  } catch (_) {}

  // Detect delimiter — prefer CSV, then TSV, then pipe
  const sample = lines[0];
  const delimiters = [",", "\t", "|", ";"];
  const delimiter = delimiters.find(d => sample.includes(d)) ?? ",";

  const cols = sample.split(delimiter).map(c => c.trim().toLowerCase().replace(/[^a-z_]/g, ""));

  // Known header patterns
  const headerMap: Record<string, string> = {
    name: "name", fullname: "name", full_name: "name", studentname: "name",
    email: "email", emailaddress: "email", email_address: "email",
    password: "password", pass: "password", pwd: "password",
    role: "role", type: "role", usertype: "role",
    studentid: "studentId", student_id: "studentId", id: "studentId", sid: "studentId",
    department: "department", dept: "department", faculty: "department",
  };

  const isHeader = cols.some(c => headerMap[c] !== undefined);
  const dataLines = isHeader ? lines.slice(1) : lines;
  const mappedCols = isHeader ? cols.map(c => headerMap[c] ?? c) : null;

  return dataLines.map((line, idx) => {
    const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ""));

    if (mappedCols) {
      const obj: Record<string, string> = {};
      mappedCols.forEach((col, i) => { if (col) obj[col] = parts[i] ?? ""; });
      return validateUser({
        name: obj.name ?? "",
        email: obj.email ?? "",
        password: obj.password ?? "",
        role: (obj.role as any) ?? defaultRole,
        studentId: obj.studentId || undefined,
        department: obj.department || undefined,
      });
    }

    // No header — infer from position
    // Try to find email in parts
    const emailIdx = parts.findIndex(p => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p));
    const email = emailIdx >= 0 ? parts[emailIdx] : parts[1] ?? "";
    const name = emailIdx === 0 ? parts[1] ?? "" : parts[0] ?? "";
    const password = emailIdx >= 0 ? (parts[emailIdx + 1] ?? parts[2] ?? "") : (parts[2] ?? "");
    const role = parts.find(p => ["student", "teacher", "admin"].includes(p.toLowerCase())) ?? defaultRole;

    return validateUser({ name, email, password, role: role as any });
  }).filter(u => u.email || u.name);
}

function validateUser(u: Partial<ParsedUser>): ParsedUser {
  const errors: string[] = [];
  if (!u.name?.trim()) errors.push("missing name");
  if (!u.email?.trim()) errors.push("missing email");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email)) errors.push("invalid email");
  if (!u.password?.trim()) errors.push("missing password");
  if (!["student", "teacher", "admin"].includes(u.role ?? "")) errors.push("invalid role");
  return {
    name: u.name?.trim() ?? "",
    email: u.email?.trim().toLowerCase() ?? "",
    password: u.password?.trim() ?? "",
    role: (["student", "teacher", "admin"].includes(u.role ?? "") ? u.role : "student") as ParsedUser["role"],
    studentId: u.studentId || undefined,
    department: u.department || undefined,
    _valid: errors.length === 0,
    _error: errors.length ? errors.join(", ") : undefined,
  };
}

const ROLE_COLORS: Record<string, string> = {
  student: "bg-blue-100 text-blue-700",
  teacher: "bg-emerald-100 text-emerald-700",
  admin: "bg-violet-100 text-violet-700",
};

const EXAMPLE = `Name,Email,Password,Role,StudentID
Fatima Al-Zahra,fatima@ncst.edu.bh,Pass@2025,student,S001
Ahmed Al-Rashid,ahmed@ncst.edu.bh,Pass@2025,teacher
Sara Mohammed,sara@ncst.edu.bh,Pass@2025,student,S002`;

interface BulkImportResult {
  succeeded: number;
  failed: number;
  results: Array<{ success: boolean; email: string; error?: string }>;
}

export default function BulkUserImport({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<"input" | "preview" | "done">("input");
  const [raw, setRaw] = useState("");
  const [defaultRole, setDefaultRole] = useState("student");
  const [parsed, setParsed] = useState<ParsedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParse = () => {
    const users = parseUsers(raw, defaultRole);
    if (users.length === 0) { setError("Could not parse any users. Check the format."); return; }
    setError(null);
    setParsed(users);
    setStep("preview");
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    try {
      const validUsers = parsed.filter(u => u._valid).map(({ _valid, _error, ...u }) => u);
      const r = await fetch("/api/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ users: validUsers }),
      });
      const data: BulkImportResult = await r.json();
      if (!r.ok) { setError((data as any).error ?? "Server error"); return; }
      setResult(data);
      setStep("done");
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setStep("input"); setRaw(""); setParsed([]); setResult(null); setError(null); };

  const validCount = parsed.filter(u => u._valid).length;
  const invalidCount = parsed.filter(u => !u._valid).length;

  return (
    <div className="space-y-4">
      {/* Step: Input */}
      {step === "input" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Smart Import — any format accepted</p>
                <p className="text-muted-foreground mt-0.5">
                  Paste a list of users in CSV, tab-separated, JSON, or plain text. The system auto-detects columns for name, email, password, and role.
                </p>
              </div>
            </div>
            <div className="ml-6">
              <p className="text-xs text-muted-foreground font-medium mb-1">Example (CSV with header):</p>
              <pre className="text-xs bg-white border rounded p-2 text-slate-600 overflow-x-auto">{EXAMPLE}</pre>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Default Role</Label>
              <Select value={defaultRole} onValueChange={setDefaultRole}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Paste your list here</Label>
            <Textarea
              value={raw}
              onChange={e => setRaw(e.target.value)}
              placeholder="Name,Email,Password,Role&#10;John Doe,john@ncst.edu.bh,Pass123,student&#10;..."
              rows={10}
              className="font-mono text-xs"
            />
          </div>

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="flex gap-2 justify-end">
            <Button onClick={handleParse} disabled={!raw.trim()} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Parse & Preview
            </Button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> {validCount} valid</Badge>
              {invalidCount > 0 && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> {invalidCount} errors</Badge>}
            </div>
            <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>

          {invalidCount > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {invalidCount} row{invalidCount > 1 ? "s" : ""} have errors and will be skipped. Fix the data and re-paste to include them.
              </AlertDescription>
            </Alert>
          )}

          <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Name</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Email</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Role</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {parsed.map((u, i) => (
                  <tr key={i} className={u._valid ? "" : "bg-red-50"}>
                    <td className="px-3 py-1.5 font-medium">{u.name || <span className="text-muted-foreground italic">—</span>}</td>
                    <td className="px-3 py-1.5 text-muted-foreground font-mono">{u.email || <span className="italic">—</span>}</td>
                    <td className="px-3 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ROLE_COLORS[u.role] ?? ""}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      {u._valid
                        ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> OK</span>
                        : <span className="text-red-600 flex items-center gap-1"><XCircle className="h-3 w-3" /> {u._error}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={reset}>Back</Button>
            <Button onClick={handleImport} disabled={loading || validCount === 0} className="gap-2">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</> : <><Users className="h-4 w-4" /> Import {validCount} Users</>}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && result && (
        <div className="space-y-4">
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <CheckCircle className="h-7 w-7 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold">Import Complete</h3>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium text-emerald-600">{result.succeeded} users</span> created successfully
              {result.failed > 0 && <>, <span className="font-medium text-red-600">{result.failed} failed</span></>}.
            </p>
          </div>

          {result.failed > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <p className="px-3 py-2 text-xs font-semibold bg-red-50 border-b text-red-700">Failed entries</p>
              {result.results.filter(r => !r.success).map((r, i) => (
                <div key={i} className="px-3 py-2 text-xs flex items-center gap-2 border-b last:border-0">
                  <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                  <span className="font-mono text-muted-foreground">{r.email}</span>
                  <span className="text-red-600">— {r.error}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={reset} className="gap-1.5"><RotateCcw className="h-4 w-4" /> Import More</Button>
            <Button onClick={onComplete}>Done</Button>
          </div>
        </div>
      )}
    </div>
  );
}
