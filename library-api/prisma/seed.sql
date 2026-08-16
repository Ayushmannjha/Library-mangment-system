-- ============================================================================
-- Library Management System (LMS) - Bootstrap / Seed SQL
-- Purpose: insert the rows required to access EVERY page of the Angular
--          frontend against the NestJS + Prisma (PostgreSQL) backend.
--
--   DB      : lms
--   Run as   : psql postgresql://postgres:PASSWORD@localhost:5432/lms -f seed.sql
--   Re-runs  : idempotent (uses ON CONFLICT / NOT EXISTS guards)
--   Login    : superadmin@library.io / Admin@123
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. PERMISSIONS - every code referenced by @RequirePermission() in the API
-- ----------------------------------------------------------------------------
INSERT INTO permissions (code, name, module, description, status) VALUES
  -- Libraries (SaaS)
  ('LIBRARY_VIEW',            'View Libraries',           'LIBRARY',       'View library list and details',          'ACTIVE'),
  ('LIBRARY_CREATE',          'Create Libraries',         'LIBRARY',       'Create a new library',                   'ACTIVE'),
  ('LIBRARY_UPDATE',          'Update Libraries',         'LIBRARY',       'Edit library details',                   'ACTIVE'),
  ('LIBRARY_STATUS_UPDATE',   'Change Library Status',    'LIBRARY',       'Activate / deactivate a library',        'ACTIVE'),
  -- Users & Roles (RBAC)
  ('USER_CREATE',             'Create Users',             'USERS',         'Create staff / admin users',             'ACTIVE'),
  ('USER_VIEW',               'View Users',               'USERS',         'List and view users',                    'ACTIVE'),
  ('USER_UPDATE',             'Update Users',             'USERS',         'Edit user details',                      'ACTIVE'),
  ('USER_STATUS_UPDATE',      'Change User Status',       'USERS',         'Activate / deactivate users',            'ACTIVE'),
  ('USER_ROLE_ASSIGN',        'Assign User Roles',        'USERS',         'Assign roles to a user',                 'ACTIVE'),
  -- Students
  ('STUDENT_CREATE',          'Create Students',          'STUDENTS',      'Admit a new student',                    'ACTIVE'),
  ('STUDENT_VIEW',            'View Students',            'STUDENTS',      'List and view students',                 'ACTIVE'),
  ('STUDENT_UPDATE',          'Update Students',          'STUDENTS',      'Edit student details',                   'ACTIVE'),
  ('STUDENT_STATUS_UPDATE',   'Change Student Status',    'STUDENTS',      'Activate / deactivate a student',        'ACTIVE'),
  ('STUDENT_DOCUMENT_MANAGE', 'Manage Student Documents', 'STUDENTS',      'Upload / delete student documents',      'ACTIVE'),
  ('STUDENT_SELF_VIEW',       'View Own Student Portal',  'STUDENTS',      'Student views own profile, attendance, seat and fees', 'ACTIVE'),
  -- Seats
  ('SEAT_MANAGE',             'Manage Seats',             'SEATS',         'Create / update / delete seats',         'ACTIVE'),
  ('SEAT_VIEW',               'View Seats',               'SEATS',         'List and view seats',                    'ACTIVE'),
  -- Time Slots
  ('TIMESLOT_MANAGE',         'Manage Time Slots',        'TIME_SLOTS',    'Create / update / delete time slots',    'ACTIVE'),
  ('TIMESLOT_VIEW',           'View Time Slots',          'TIME_SLOTS',    'List and view time slots',               'ACTIVE'),
  -- Bookings
  ('BOOKING_MANAGE',          'Manage Bookings',          'BOOKINGS',      'Create / cancel seat bookings',          'ACTIVE'),
  ('BOOKING_VIEW',            'View Bookings',            'BOOKINGS',      'List and view seat bookings',            'ACTIVE'),
  -- Attendance
  ('ATTENDANCE_MANAGE',       'Manage Attendance',        'ATTENDANCE',    'Check in / check out students',          'ACTIVE'),
  ('ATTENDANCE_VIEW',         'View Attendance',          'ATTENDANCE',    'List and view attendance records',       'ACTIVE'),
  ('STUDENT_SELF_CHECKIN',    'QR Self Check-in',         'ATTENDANCE',    'Student checks in by scanning their QR code', 'ACTIVE'),
  -- Fee Plans
  ('FEE_PLAN_MANAGE',         'Manage Fee Plans',         'FEE_PLANS',     'Create / update / delete fee plans',     'ACTIVE'),
  ('FEE_PLAN_VIEW',           'View Fee Plans',           'FEE_PLANS',     'List and view fee plans',                'ACTIVE'),
  -- Invoices
  ('INVOICE_MANAGE',          'Manage Invoices',          'INVOICES',      'Create / update / delete invoices',      'ACTIVE'),
  ('INVOICE_VIEW',            'View Invoices',            'INVOICES',      'List and view invoices',                 'ACTIVE'),
  -- Payments
  ('PAYMENT_MANAGE',          'Manage Payments',          'PAYMENTS',      'Record / manage payments',               'ACTIVE'),
  ('PAYMENT_VIEW',            'View Payments',            'PAYMENTS',      'List and view payments',                 'ACTIVE'),
  -- SaaS / Subscriptions
  ('SAAS_PLAN_MANAGE',        'Manage SaaS Plans',        'SUBSCRIPTIONS', 'Create / update subscription plans',     'ACTIVE'),
  ('SAAS_PLAN_VIEW',          'View SaaS Plans',          'SUBSCRIPTIONS', 'List and view subscription plans',       'ACTIVE'),
  ('SAAS_SUBSCRIPTION_MANAGE','Manage Subscriptions',     'SUBSCRIPTIONS', 'Assign / manage library subscriptions',  'ACTIVE'),
  -- Reports & Dashboard
  ('REPORT_VIEW',             'View Reports',             'REPORTS',       'Access analytics and reports',           'ACTIVE'),
  ('DASHBOARD_VIEW',          'View Dashboard',           'DASHBOARD',     'View dashboard KPIs',                    'ACTIVE')
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. LIBRARY (tenant) - created before roles/users that reference it
-- ----------------------------------------------------------------------------
INSERT INTO libraries (name, code, email, phone, address, city, status)
SELECT 'Central Library', 'MAIN', 'library@example.com', '+919876543210',
       '123 Knowledge Street', 'New Delhi', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM libraries WHERE code = 'MAIN');

-- ----------------------------------------------------------------------------
-- 3. SUBSCRIPTION PLANS (SaaS plans page)
-- ----------------------------------------------------------------------------
INSERT INTO subscription_plans (code, name, description, price, currency, billing_cycle, status) VALUES
  ('STARTER',    'Starter',     'Up to 100 students',       999.00,  'INR', 'MONTHLY', 'ACTIVE'),
  ('PRO',        'Professional','Up to 500 students',       1999.00, 'INR', 'MONTHLY', 'ACTIVE'),
  ('ENTERPRISE', 'Enterprise',  'Unlimited students',       4999.00, 'INR', 'MONTHLY', 'ACTIVE')
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. ACTIVE SUBSCRIPTION for the main library
--    (partial unique index allows only ONE active subscription per library)
-- ----------------------------------------------------------------------------
INSERT INTO library_subscriptions
  (library_id, plan_id, status, start_at, end_at, price, currency)
SELECT l.id, p.id, 'ACTIVE', NOW(), NOW() + INTERVAL '1 year', p.price, 'INR'
FROM libraries l
JOIN subscription_plans p ON p.code = 'PRO'
WHERE l.code = 'MAIN'
  AND NOT EXISTS (
    SELECT 1 FROM library_subscriptions ls
    WHERE ls.library_id = l.id AND ls.status IN ('TRIALING', 'ACTIVE')
  );

-- ----------------------------------------------------------------------------
-- 5. ROLES
--    SUPER_ADMIN = platform level (no library). ADMIN + USER = tenant scoped.
--    Insert SUPER_ADMIN first so it gets the lowest id and becomes the user's
--    primary role (used by the frontend roleGuard to route to /super-admin).
-- ----------------------------------------------------------------------------
INSERT INTO roles (library_id, code, name, description, is_system_role, status)
SELECT l.id, v.code, v.name, v.description, v.is_system_role, 'ACTIVE'
FROM (VALUES
  (NULL, 'SUPER_ADMIN', 'Super Admin',   'Platform-level administrator with full access', TRUE),
  ((SELECT id FROM libraries WHERE code = 'MAIN'), 'ADMIN', 'Library Admin', 'Tenant administrator with full library access', FALSE),
  ((SELECT id FROM libraries WHERE code = 'MAIN'), 'USER',  'Staff User',    'Standard library staff user',                  FALSE),
  ((SELECT id FROM libraries WHERE code = 'MAIN'), 'STUDENT', 'Student',    'Student portal access: QR check-in, own attendance, seat and fees', TRUE)
) AS v(library_id, code, name, description, is_system_role)
LEFT JOIN libraries l ON l.id = v.library_id
WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.code = v.code);

-- ----------------------------------------------------------------------------
-- 6. USER - single "god" account used to log in.
--    Has a library_id (so tenant-isolated endpoints work) + SUPER_ADMIN role
--    (so the permission guard and super-admin routes are bypassed).
--    Password: Admin@123 (Argon2id hash)
-- ----------------------------------------------------------------------------
INSERT INTO users (library_id, first_name, last_name, email, phone, password_hash, status)
SELECT id, 'Super', 'Admin', 'superadmin@library.io', '+919876543210',
       '$argon2id$v=19$m=65536,p=4,t=3$GifGVzeW0+GVPdvL/fPiGA$qvTBliTM2TH5I07CumxHQflfgo9YXWGfJ7O/EWmcD5g',
       'ACTIVE'
FROM libraries
WHERE code = 'MAIN'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'superadmin@library.io');

-- ----------------------------------------------------------------------------
-- 7. USER ROLES - link the user to all three roles
-- ----------------------------------------------------------------------------
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.code IN ('SUPER_ADMIN', 'ADMIN', 'USER')
WHERE u.email = 'superadmin@library.io'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.id AND ur.role_id = r.id
  );

-- ----------------------------------------------------------------------------
-- 8. ROLE PERMISSIONS - grant every permission to SUPER_ADMIN and ADMIN
-- ----------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- ----------------------------------------------------------------------------
-- 8b. STUDENT ROLE PERMISSIONS - self-service portal permissions only.
--      Students must NOT be granted staff-level permissions (no create/update
--      of other records) — the service methods enforce self-scoping on top.
-- ----------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'STUDENT'
  AND p.code IN ('STUDENT_SELF_VIEW', 'STUDENT_SELF_CHECKIN')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- ----------------------------------------------------------------------------
-- 9. SAMPLE DATA so list/detail pages render rows (optional but recommended)
-- ----------------------------------------------------------------------------

-- Time Slots
WITH lib AS (SELECT id FROM libraries WHERE code = 'MAIN')
INSERT INTO time_slots (library_id, name, start_time, end_time, status)
SELECT id, v.name, v.start_time::time, v.end_time::time, 'ACTIVE'
FROM lib
CROSS JOIN (VALUES
  ('Morning',   '09:00:00', '13:00:00'),
  ('Afternoon', '13:00:00', '17:00:00'),
  ('Evening',   '17:00:00', '21:00:00')
) AS v(name, start_time, end_time)
WHERE NOT EXISTS (
  SELECT 1 FROM time_slots ts
  WHERE ts.library_id = lib.id AND ts.name = v.name
);

-- Seats
WITH lib AS (SELECT id FROM libraries WHERE code = 'MAIN')
INSERT INTO seats (library_id, seat_number, name, section, floor, status)
SELECT id, v.seat_number, v.name, 'Section A', '1', 'ACTIVE'
FROM lib
CROSS JOIN (VALUES
  ('A-01', 'Window Seat 1'),
  ('A-02', 'Window Seat 2'),
  ('A-03', 'Standard Seat 3'),
  ('A-04', 'Standard Seat 4'),
  ('A-05', 'Standard Seat 5')
) AS v(seat_number, name)
WHERE NOT EXISTS (
  SELECT 1 FROM seats s
  WHERE s.library_id = lib.id AND s.seat_number = v.seat_number
);

-- Fee Plans
WITH lib AS (SELECT id FROM libraries WHERE code = 'MAIN')
INSERT INTO fee_plans (library_id, name, code, description, amount, currency, billing_cycle, status)
SELECT id, v.name, v.code, v.description, v.amount, 'INR', 'MONTHLY', 'ACTIVE'
FROM lib
CROSS JOIN (VALUES
  ('Monthly Membership',  'MONTHLY_MEMBERSHIP', 'Standard monthly membership',  500.00),
  ('Quarterly Membership','QUARTERLY_MEMBERSHIP', 'Quarterly membership',      1350.00),
  ('Yearly Membership',   'YEARLY_MEMBERSHIP',  'Yearly membership',           4800.00)
) AS v(name, code, description, amount)
WHERE NOT EXISTS (
  SELECT 1 FROM fee_plans fp
  WHERE fp.library_id = lib.id AND fp.code = v.code
);

-- Students
WITH lib AS (SELECT id FROM libraries WHERE code = 'MAIN')
INSERT INTO students
  (library_id, admission_number, first_name, last_name, gender, date_of_birth,
   email, phone, address, city, state, pincode, status)
SELECT id, v.admission_number, v.first_name, v.last_name, 'MALE', CURRENT_DATE - INTERVAL '18 years',
       v.email, v.phone, '221B Baker Street', 'New Delhi', 'Delhi', '110001', 'ACTIVE'
FROM lib
CROSS JOIN (VALUES
  ('ADM-0001', 'Rahul',   'Sharma', 'rahul@example.com',  '+919000000001'),
  ('ADM-0002', 'Priya',   'Verma',  'priya@example.com',  '+919000000002'),
  ('ADM-0003', 'Amit',    'Kumar',  'amit@example.com',   '+919000000003')
) AS v(admission_number, first_name, last_name, email, phone)
WHERE NOT EXISTS (
  SELECT 1 FROM students s
  WHERE s.library_id = lib.id AND s.admission_number = v.admission_number
);

-- ----------------------------------------------------------------------------
-- 9b. SAMPLE STUDENT LOGINS - link the seeded students to user accounts so the
--      student portal is immediately testable. Password for all: Student@123
--      (Argon2id hash). In production these are created automatically with a
--      random password by POST /students (students.service.ts) and emailed.
-- ----------------------------------------------------------------------------
INSERT INTO users (library_id, student_id, first_name, last_name, email, phone, password_hash, status)
SELECT s.library_id, s.id, s.first_name, s.last_name, s.email, s.phone,
       '$argon2id$v=19$m=65536,p=4,t=3$GfpMnswG9J0f7MorfbGrfw$YRDp7ZlQ6eDOAcrp8n4FUAk/u3PcGeMwiV6qsk27iTs',
       'ACTIVE'
FROM students s
WHERE s.email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.student_id = s.id);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.code = 'STUDENT'
WHERE u.student_id IS NOT NULL
  AND r.library_id = u.library_id
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.id AND ur.role_id = r.id
  );

COMMIT;
