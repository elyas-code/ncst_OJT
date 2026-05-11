# NCST LMS

A full-featured Learning Management System for the Nasser Centre for Science & Technology — similar to Moodle/Canvas, built for students, teachers, and admins.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/lms run dev` — run the LMS frontend (proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — re-seed the database with sample data
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, Wouter router, TanStack Query, shadcn/ui, Tailwind CSS
- API: Express 5, session-based auth (express-session + bcrypt)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle for API server)

## Where things live

- `artifacts/lms/` — React+Vite frontend, all pages in `src/pages/`
- `artifacts/api-server/` — Express API server, routes in `src/routes/`
- `lib/db/` — Drizzle ORM schema (`src/schema.ts`) and DB client
- `lib/api-spec/` — OpenAPI YAML spec (source of truth for all API contracts)
- `lib/api-client-react/` — Generated React Query hooks and Zod schemas
- `scripts/src/seed.ts` — Database seed script

## Architecture decisions

- Session-based auth (not JWT): express-session with httpOnly cookies; `credentials: "include"` on all fetches
- Contract-first API: OpenAPI spec → Orval codegen → typed hooks; never write raw fetch calls in the frontend
- All query options need `as any` cast on `{ enabled: ... }` due to strict `queryKey` requirement in the generated `UseQueryOptions` type
- `useExportGrades` is a query (GET) not a mutation — use `refetch()` pattern to trigger download
- Lockdown exam uses `visibilitychange` event + 7-second countdown; force-submit via API + create alert on tab switch

## Product

- **Public**: Landing page at `/` visible without login — NCST branding, feature overview, sign-in CTA
- **Students**: Browse courses, access module files, take lockdown quizzes/exams with tab-switch protection, submit text/file assignments, view all grades across courses, see upcoming work on dashboard + calendar, post in course discussions, message teachers/peers via inbox
- **Teachers / Reviewers**: Upload files, build quizzes (Google Forms-style), create assignments + grade submissions with feedback, view grade book with CSV export, proctor live exams with alert monitoring, review student file submissions (approve / reject / request revision), pin/lock discussion threads, message students
- **Admins**: Full user/course CRUD, enroll students, view and resolve integrity alerts, view any student's grade history

## Authorization model

All sensitive routes go through `artifacts/api-server/src/lib/authz.ts`:
- `requireAuth(req,res)` — session check
- `courseAccess(userId, courseId)` — returns `"admin" | "teacher" | "student" | null` (teacher = owns the course; student = enrolled)
- `isStaff(level)` — true for admin/teacher
- Plus `getAssignmentCourseId`, `getDiscussionCourseId`, `getReplyContext`, `getSubmissionContext` for resource → course lookups

Rules enforced: assignments — staff only for create/edit/delete/list-submissions/grade; students see only published; submit requires enrolled student. Discussions — course access required; pin/lock are staff-only; mutate/delete requires author OR staff; replies blocked when locked. `/users/:id/all-grades` — self, admin, or teacher of a course the student is enrolled in.

## Login credentials

- `admin@ncst.edu.bh` / `password123` — Admin (primary)
- `nv23158@ncst.edu.bh` / `password123` — Admin
- `deltest@example.com` / `password123` — Teacher
- `nv23132@ncst.edu.bh` / `password123` — Student (enrolled in cs101)
- `nv23126@ncst.edu.bh` / `password123` — Student (no enrollments)

Run `pnpm --filter @workspace/scripts run seed` to reset to a fresh richer set.

## Gotchas

- All Orval-generated query hooks require `{ query: { enabled: ... } as any }` to avoid the `queryKey` TypeScript error
- bcrypt is in `onlyBuiltDependencies` in pnpm-workspace.yaml — required for native build
- The shared proxy routes `/api` to port 8080 and `/` to the LMS port; always use relative URLs in frontend code
- `pnpm run dev` at workspace root does not exist by design — use workflows or `--filter` commands

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- API spec: `lib/api-spec/openapi.yaml`
- DB schema: `lib/db/src/schema.ts`
