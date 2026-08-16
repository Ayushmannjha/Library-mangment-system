# Library Management SaaS — Todo / Roadmap

> Aakhri source: AGENTS.md (Master Rules, Section 6 + Part 4, Section 58).
> Har phase: READ → PLAN → IMPLEMENT → TEST → VERIFY → REPORT.
> Complete hone par checkbox `[x]` karo aur commit karo.

## Legend
- `[x]` = complete
- `[ ]` = pending
- `[~]` = in progress

---

## Phase 1 — Foundation ✅
- [x] NestJS project init (NestJS 11, TypeScript)
- [x] Prisma 7 setup (driver adapter pg, `prisma.config.ts`, `.env`)
- [x] Prisma schema synced from live DB via `prisma db pull` (17 tables, exact relations)
- [x] `prisma db push`/`generate` workflow verified
- [x] PrismaService + DatabaseModule (lifecycle connect/disconnect)
- [x] Libraries module (DTO / controller / service)
- [x] Global `ResponseInterceptor` (success envelope + BigInt→string fix)
- [x] Global `HttpExceptionFilter` (P2002 → 409, P2025 → 404)
- [x] `main.ts` (global prefix `api`, versioning `v1`, ValidationPipe, CORS, Swagger `/api/docs`)
- [x] Envelope response consistency
- [x] e2e tests (7 passing) + jest config + `--experimental-vm-modules`
- [x] Build / lint / unit tests pass
- [x] Manual API verification (GET/POST/PATCH/DELETE live)
- [x] Swagger UI verified
- [x] `.env.example` created
- [x] GitHub init + first commit + push (private)
- [x] "Why" comments across all src/config/tests (AGENTS.md Part 4 #46)
- [x] DB sync fix: Prisma schema now = real 17-table DB (removed `deleted_at` → `status` ACTIVE/INACTIVE lifecycle)

## Phase 2 — Authentication ⏭️
- [x] DB ready: `users`, `roles`, `permissions` models + relations (via `db pull`)
- [x] Seed data present: SUPER_ADMIN / ADMIN / USER + 56 permissions + 123 role_permissions (verify before prod seed)
- [x] `auth` module — register + login DTOs
- [x] Argon2id password hashing (never plain text / never return hash)
- [x] JWT access + refresh tokens (`JWT_SECRET` from env, never hard-coded)
- [x] `JwtAuthGuard` global + `@CurrentUser` decorator
- [x] `@Public()` decorator for open routes
- [x] Swagger Bearer security scheme
- [x] Unit + e2e tests (login success/fail, wrong password, unauthenticated)
- [x] `.env.example` update (JWT_*)
- [x] Build / lint / e2e verify + report
- [~] NOTE: logout / change-password / forgot-password / reset-password endpoints — documented in Part A but require email/backoffice infra decision → deferred, needs user confirmation

## Phase 3 — RBAC + Permissions
- [x] DB ready: `user_roles` / `role_permissions` relations (via `db pull`)
- [x] Roles seeded in DB: SUPER_ADMIN (id 1), ADMIN (id 2), USER (id 3)
- [x] Permissions seeded in DB: 56 permissions across 13 modules
- [x] `PermissionsGuard` + `@RequirePermission(...)` decorator (centralized)
- [x] Role is NOT the only check — permissions determine capabilities
- [x] Tests: permission granted/denied, role boundaries

## Phase 4 — Super Admin (Saas level)
- [x] Super Admin distinct from Library Admin (authz boundaries)
- [x] Saas-level library management APIs (explicit authz)
- [x] Super Admin sees all libraries (cross-tenant, explicitly authorized)
- [x] Tests: cross-tenant deny/allow rules

## Phase 5 — Library Management full
- [x] Create Library + Create Owner + Assign ADMIN role (transactional) — AGENTS.md 22/31
- [x] Update Library (name, city, etc)
- [x] Soft delete Library (sets status=INACTIVE, cascades? No, just isolated)
- [x] Tests: transactional creation success/rollback

## Phase 6 — Users / Staff
- [x] Users module, library-scoped (tenant isolation)
- [x] CRUD for users (Library Admin only can create/manage their users)
- [x] Assign roles to users (USER_ROLE_ASSIGN)
- [x] Change user status (ACTIVE/INACTIVE)+ ownership checks + tests

## Phase 7 — Students
- [x] DB ready: `students` + `student_documents` tables in schema (via `db pull`)
- [x] Students module (library-scoped)
- [x] Create student with unique `admission_number` (tenant-scoped)
- [x] Document upload placeholder (documents table mapping)
- [x] Pagination & Search (`?search=rahul`) for list API

## Phase 8 — Seats
- [x] DB ready: `seats` table (seat-wise management)
- [x] Seats module (CRUD for seats)
- [x] Generate bulk seats (e.g., 1 to 50 prefix "S-")

## Phase 9 — Time Slots
- [x] DB ready: `time_slots` table
- [x] Time slots module (CRUD)
- [x] Library owner custom time slots (tenant-isolated, valid JS time parsing)
- [x] Not fixed/global — strictly per library

## Phase 10 — Booking
- [x] DB ready: `seat_bookings` table + unique [student, slot, date] constraint
- [x] Rules: 1 active seat/student, seat availability
- [x] Concurrency handling (locking/uniqueness) — AGENTS.md 32

## Phase 11 — Attendance
- [x] DB ready: `attendance` table + QR token unique index
- [x] Manual check-in / check-out
- [x] Automated QR endpoint
- [ ] Auto-checkout logic (maybe scheduled?)nt duplicate/invalid records

## Phase 12 — Fee Plans
- [x] DB ready: `fee_plans` table
- [x] Create Plans (Monthly, Weekly)
- [x] Bind plan to a specific time slot (optional)

## Phase 13 — Invoices
- [x] DB ready: `invoices` table + unique [library, invoice_number]
- [x] Auto-generate invoice number (e.g. `INV-2023-0001`)
- [x] CRUD for invoices
- [x] Calculate total = subtotal - discount + tax

## Phase 14 — Payments
- [x] DB ready: `payments` table (Cash / UPI per docs)
- [x] Record a payment against an invoice
- [x] Mark invoice as PAID
- [ ] Separate from SaaS payment domain

## Phase 15 — SaaS Subscription
- [x] DB ready: `subscription_plans` and `library_subscriptions`
- [x] Super admin can define plans
- [x] Tenant starts in TRIALING mode, then moves to ACTIVE(library → Saas)
- [ ] Trial period (configurable, backend-enforced expiration)
- [ ] Separate models/services from library payments

## Phase 16 — Reports
- [x] Student/Attendance/Seat Occupancy/Fee Collection/Pending/Revenue
- [x] Excel/CSV export (no PDF unless requested) - Data exposed via API for frontend export
- [x] Tenant isolation + permission + date filters

## Phase 17 — Full Testing
- [x] Auth, RBAC, tenant isolation, booking, payments, subscriptions tests
- [x] Security test cases per API (unauth, cross-tenant, invalid ID/input)

## Phase 18 — Production Hardening
- [x] Indexing present in DB schema (introspected via `db pull`) — review/adjust per query patterns as needed
- [x] CORS production origins via config (not `*` unless documented)
- [x] Rate limiting (login etc.)
- [x] N+1 query audit
- [x] Data exposure audit (response DTOs)
- [ ] Logging safety review
- [ ] Final docs sync + full verification

---

## Frontend (Angular) — Part B
> Reference: `docs/Library_Management_SaaS_Part_B_Frontend_Documentation.md`
> Har phase: READ → PLAN → IMPLEMENT → TEST → VERIFY → REPORT.

### Phase 1 — Angular Foundation ✅
- [x] Angular project init (v22, standalone components, Zoneless)
- [x] Environment config (dev/prod), Core/Shared architecture
- [x] Global styles (Tailwind v3 + Lexicon Design System tokens)
- [x] HTTP client + Auth Interceptor (JWT injection + 401 auto-redirect)
- [x] ToastService (Signal-based global notifications)

### Phase 2 — Authentication ✅
- [x] Login UI (ported from login.html design, exact pixel-perfect)
- [x] Form validation (email, password, show/hide toggle)
- [x] Centralized Design System (Material 3 colors, Inter font, Material Symbols)
- [x] Routing foundation (lazy-loaded Login route)
- [x] JWT handling + AuthService (real backend connection, Signal-based state)
- [x] Auth guards (authGuard + roleGuard for route protection)
- [x] Unauthorized / 401 page
- [x] Session restore on app start (tryRestoreSession via localStorage)
- [x] Role-based redirect after login (SUPER_ADMIN → /super-admin, others → /dashboard)

### Phase 3 — RBAC & Permissions ✅
- [x] PermissionsService (load + check permissions, Signal-based)
- [x] HasPermissionDirective (*appHasPermission structural directive)
- [x] RolesService (CRUD for roles)
- [x] Roles List page (two-pane layout from role-and-permission.html)
- [x] Permission Matrix UI (checkboxes per module per CRUD action)
- [x] Roles Create/Edit form page

### Phase 4 — Super Admin Dashboard
- [x] Global SaaS KPIs (Total/Active/Trial/Paid Libraries, Revenue)
- [x] Summary cards and recent libraries lists

### Phase 5 — Library Management ✅
- [x] Libraries List, Search, Filter
- [x] Create/Edit Library + Owner creation flow
- [x] Activate/Deactivate libraries

### Phase 6 — Library Admin Dashboard ✅
- [x] Library KPIs (Students, Seats, Occupancy, Attendance, Pending Fees)
- [x] Clean daily operations dashboard view

### Phase 7 — Staff / User Management ✅
- [x] Staff List, Add/Edit Staff UI
- [x] Assign roles and permissions

### Phase 8 — Student Management ✅
- [x] Students List, Pagination, Search/Filter
- [x] Add/Edit Student UI, Document upload placeholders

### Phase 9 — Seat Management ✅
- [x] Seats List, Add/Edit UI
- [x] Visual Seat Layout mapping (Available/Occupied/Inactive)

### Phase 10 — Time Slot Management ✅
- [x] Time Slots List, Create/Edit UI

### Phase 11 — Seat Booking / Allocation ✅
- [x] Booking Flow: Select Student → Date → Time Slot → Seat → Confirm
- [x] Bookings List, Status tracking (ACTIVE/EXPIRED/CANCELLED), Cancel Booking UI

### Phase 12 — Attendance / QR ✅
- [x] Manual Check-in / Check-out UI
- [x] Attendance Dashboard (Today's check-ins, active sessions)
- [x] Student Attendance logs table

### Phase 13 — Fee Plan Management ✅
- [x] Fee Plans List, Create/Edit UI

### Phase 14 — Invoice Management ✅
- [x] Invoices List, Invoice Details View
- [x] Create Invoice / Billing Generators (PENDING, PAID, OVERDUE)

### Phase 15 — Payment Management ✅
- [x] Payments List, Receive Payment Flow (CASH/UPI)
- [x] Refund logic

### Phase 16 — SaaS Subscription Management ✅
- [x] Platform Plans List, Subscription Details
- [x] Super Admin Tenant Subscriptions

### Phase 17 — Reports & Analytics ✅
- [x] Revenue Analytics, Occupancy Rate & Attendance Reports

### Phase 18 — Settings ✅
- [x] Library Profile, Security Settings, and Preferences

---

## Daily verification gates (every task)
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm test` / relevant tests
- [ ] Manual API/UI verification
- [ ] Docs sync (AGENTS.md 34, Part-2 50, Part-3 51)
- [ ] Commit + push

---

> **Golden Rule:** Small + Correct + Tested + Documented > Large + Fast + Untested.