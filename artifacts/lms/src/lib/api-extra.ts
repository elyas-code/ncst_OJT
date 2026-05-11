import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = "/api";

async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T = any>(p: string) => apiFetch<T>(p),
  post: <T = any>(p: string, body?: any) => apiFetch<T>(p, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T = any>(p: string, body?: any) => apiFetch<T>(p, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  del: <T = any>(p: string) => apiFetch<T>(p, { method: "DELETE" }),
};

/* Assignments */
export function useAssignments(courseId: number) {
  return useQuery({ queryKey: ["assignments", courseId], queryFn: () => api.get(`/courses/${courseId}/assignments`), enabled: !!courseId });
}
export function useAssignment(id: number) {
  return useQuery({ queryKey: ["assignment", id], queryFn: () => api.get(`/assignments/${id}`), enabled: !!id });
}
export function useAssignmentSubmissions(id: number) {
  return useQuery({ queryKey: ["assignment-submissions", id], queryFn: () => api.get(`/assignments/${id}/submissions`), enabled: !!id });
}
export function useMySubmission(id: number) {
  return useQuery({ queryKey: ["my-submission", id], queryFn: () => api.get(`/assignments/${id}/my-submission`), enabled: !!id });
}
export function useCreateAssignment(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post(`/courses/${courseId}/assignments`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments", courseId] }),
  });
}
export function useDeleteAssignment(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/assignments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments", courseId] }),
  });
}
export function useSubmitAssignment(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post(`/assignments/${id}/submissions`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-submission", id] });
      qc.invalidateQueries({ queryKey: ["assignment-submissions", id] });
    },
  });
}
export function useGradeSubmission(assignmentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, grade, feedback }: { submissionId: number; grade: number; feedback?: string }) =>
      api.patch(`/assignment-submissions/${submissionId}/grade`, { grade, feedback }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignment-submissions", assignmentId] }),
  });
}

/* Discussions */
export function useDiscussions(courseId: number) {
  return useQuery({ queryKey: ["discussions", courseId], queryFn: () => api.get(`/courses/${courseId}/discussions`), enabled: !!courseId });
}
export function useDiscussion(id: number) {
  return useQuery({ queryKey: ["discussion", id], queryFn: () => api.get(`/discussions/${id}`), enabled: !!id });
}
export function useDiscussionReplies(id: number) {
  return useQuery({ queryKey: ["discussion-replies", id], queryFn: () => api.get(`/discussions/${id}/replies`), enabled: !!id });
}
export function useCreateDiscussion(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post(`/courses/${courseId}/discussions`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discussions", courseId] }),
  });
}
export function useReplyDiscussion(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post(`/discussions/${id}/replies`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discussion-replies", id] }),
  });
}
export function useDeleteDiscussion(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/discussions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discussions", courseId] }),
  });
}

/* Messages */
export function useThreads() {
  return useQuery({ queryKey: ["threads"], queryFn: () => api.get(`/messages/threads`), refetchInterval: 15000 });
}
export function useThread(partnerId: number) {
  return useQuery({ queryKey: ["thread", partnerId], queryFn: () => api.get(`/messages/with/${partnerId}`), enabled: !!partnerId, refetchInterval: 5000 });
}
export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recipientId, body }: { recipientId: number; body: string }) => api.post(`/messages`, { recipientId, body }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["thread", vars.recipientId] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });
}
export function useUnreadCount() {
  return useQuery<{ count: number }>({ queryKey: ["unread-count"], queryFn: () => api.get(`/messages/unread-count`), refetchInterval: 30000 });
}
export function useContacts(q: string) {
  return useQuery({ queryKey: ["contacts", q], queryFn: () => api.get(`/messages/contacts?q=${encodeURIComponent(q)}`) });
}

/* Calendar / All grades */
export function useUpcoming(days = 14) {
  return useQuery({ queryKey: ["upcoming", days], queryFn: () => api.get(`/calendar/upcoming?days=${days}`) });
}
export function useAllGrades(userId: number) {
  return useQuery({ queryKey: ["all-grades", userId], queryFn: () => api.get(`/users/${userId}/all-grades`), enabled: !!userId });
}
