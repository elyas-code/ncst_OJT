import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { User as UserIcon, Mail, Building, Hash } from "lucide-react";

export default function Settings() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const updateUser = useUpdateUser();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name);
      setDepartment(user.department || "");
    }
  }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    updateUser.mutate(
      { id: user.id, data: { name: name.trim(), department: department.trim() } as any },
      {
        onSuccess: (updated: any) => {
          setUser(updated);
          toast({ title: "Profile updated", description: "Your changes have been saved." });
        },
        onError: (err: any) => {
          toast({ title: "Could not save", description: err?.message ?? "Please try again.", variant: "destructive" });
        },
      },
    );
  };

  if (!user) return null;

  return (
    <div data-testid="settings-page" className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and profile.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal details. Some fields are locked by the institution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-sm">
                  <span className="text-3xl font-bold text-primary">{user.name.charAt(0)}</span>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2 uppercase tracking-wider">{user.role}</Badge>
                  <h3 className="text-xl font-semibold">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                    Full Name
                  </Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email Address
                  </Label>
                  <Input id="email" defaultValue={user.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Contact IT to change institutional email.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentId" className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    {user.role === 'student' ? 'Student ID' : 'Employee ID'}
                  </Label>
                  <Input id="studentId" defaultValue={user.studentId || ''} disabled className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    Department / Major
                  </Label>
                  <Input id="department" value={department} onChange={e => setDepartment(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={updateUser.isPending}>{updateUser.isPending ? "Saving…" : "Save Changes"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
