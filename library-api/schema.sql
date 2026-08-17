-- Lexicon LMS — Complete Database Schema
-- Generated from Prisma schema.prisma
-- Database: PostgreSQL 17
-- Run: psql -U shreeauraroot -d LMS -f schema.sql

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable: libraries
CREATE TABLE "libraries" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "email" VARCHAR(150),
    "phone" VARCHAR(20),
    "address" TEXT,
    "city" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_libraries" PRIMARY KEY ("id")
);

-- CreateTable: users
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "library_id" BIGINT,
    "student_id" BIGINT,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100),
    "email" VARCHAR(150),
    "phone" VARCHAR(20),
    "password_hash" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    CONSTRAINT "pk_users" PRIMARY KEY ("id")
);

-- CreateTable: roles
CREATE TABLE "roles" (
    "id" BIGSERIAL NOT NULL,
    "library_id" BIGINT,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_system_role" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    CONSTRAINT "pk_roles" PRIMARY KEY ("id")
);

-- CreateTable: permissions
CREATE TABLE "permissions" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    CONSTRAINT "pk_permissions" PRIMARY KEY ("id")
);

-- CreateTable: role_permissions
CREATE TABLE "role_permissions" (
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" BIGINT,
    CONSTRAINT "pk_role_permissions" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable: user_roles
CREATE TABLE "user_roles" (
    "user_id" BIGINT NOT NULL,
    "role_id" BIGINT NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" BIGINT,
    CONSTRAINT "pk_user_roles" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable: students
CREATE TABLE "students" (
    "id" BIGSERIAL NOT NULL,
    "library_id" BIGINT NOT NULL,
    "admission_number" VARCHAR(50) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100),
    "gender" VARCHAR(20),
    "date_of_birth" DATE,
    "email" VARCHAR(150),
    "phone" VARCHAR(20) NOT NULL,
    "alternate_phone" VARCHAR(20),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(10),
    "profile_photo_url" TEXT,
    "admission_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    CONSTRAINT "pk_students" PRIMARY KEY ("id")
);

-- CreateTable: student_documents
CREATE TABLE "student_documents" (
    "id" BIGSERIAL NOT NULL,
    "student_id" BIGINT NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "document_number" VARCHAR(100),
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" BIGINT,
    "mime_type" VARCHAR(100),
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" BIGINT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "pk_student_documents" PRIMARY KEY ("id")
);

-- CreateTable: subscription_plans
CREATE TABLE "subscription_plans" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "billing_cycle" VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_subscription_plans" PRIMARY KEY ("id")
);

-- CreateTable: library_subscriptions
CREATE TABLE "library_subscriptions" (
    "id" BIGSERIAL NOT NULL,
    "library_id" BIGINT NOT NULL,
    "plan_id" BIGINT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'TRIALING',
    "trial_start_at" TIMESTAMPTZ(6),
    "trial_end_at" TIMESTAMPTZ(6),
    "start_at" TIMESTAMPTZ(6),
    "end_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_library_subscriptions" PRIMARY KEY ("id")
);

-- CreateTable: seats
CREATE TABLE "seats" (
    "id" BIGSERIAL NOT NULL,
    "library_id" BIGINT NOT NULL,
    "seat_number" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100),
    "description" TEXT,
    "floor" VARCHAR(50),
    "section" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    CONSTRAINT "pk_seats" PRIMARY KEY ("id")
);

-- CreateTable: time_slots
CREATE TABLE "time_slots" (
    "id" BIGSERIAL NOT NULL,
    "library_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    CONSTRAINT "pk_time_slots" PRIMARY KEY ("id")
);

-- CreateTable: seat_bookings
CREATE TABLE "seat_bookings" (
    "id" BIGSERIAL NOT NULL,
    "library_id" BIGINT NOT NULL,
    "student_id" BIGINT NOT NULL,
    "seat_id" BIGINT NOT NULL,
    "time_slot_id" BIGINT NOT NULL,
    "booking_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'BOOKED',
    "allocated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    CONSTRAINT "pk_seat_bookings" PRIMARY KEY ("id")
);

-- CreateTable: attendance
CREATE TABLE "attendance" (
    "id" BIGSERIAL NOT NULL,
    "library_id" BIGINT NOT NULL,
    "student_id" BIGINT NOT NULL,
    "booking_id" BIGINT,
    "attendance_date" DATE NOT NULL,
    "check_in_at" TIMESTAMPTZ(6) NOT NULL,
    "check_out_at" TIMESTAMPTZ(6),
    "attendance_status" VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
    "check_in_method" VARCHAR(20) NOT NULL DEFAULT 'QR',
    "qr_token" VARCHAR(255),
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    CONSTRAINT "pk_attendance" PRIMARY KEY ("id")
);

-- CreateTable: fee_plans
CREATE TABLE "fee_plans" (
    "id" BIGSERIAL NOT NULL,
    "library_id" BIGINT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "billing_cycle" VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    "duration_days" INTEGER,
    "time_slot_id" BIGINT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    CONSTRAINT "pk_fee_plans" PRIMARY KEY ("id")
);

-- CreateTable: invoices
CREATE TABLE "invoices" (
    "id" BIGSERIAL NOT NULL,
    "library_id" BIGINT NOT NULL,
    "student_id" BIGINT NOT NULL,
    "fee_plan_id" BIGINT,
    "invoice_number" VARCHAR(50) NOT NULL,
    "invoice_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "due_date" DATE,
    "description" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    CONSTRAINT "pk_invoices" PRIMARY KEY ("id")
);

-- CreateTable: payments
CREATE TABLE "payments" (
    "id" BIGSERIAL NOT NULL,
    "library_id" BIGINT NOT NULL,
    "invoice_id" BIGINT NOT NULL,
    "student_id" BIGINT NOT NULL,
    "payment_number" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "payment_method" VARCHAR(20) NOT NULL,
    "transaction_reference" VARCHAR(150),
    "payment_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    CONSTRAINT "pk_payments" PRIMARY KEY ("id")
);

-- CreateTable: password_resets
CREATE TABLE "password_resets" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "otp_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_password_resets" PRIMARY KEY ("id")
);

-- ============ INDEXES ============

CREATE UNIQUE INDEX "uq_libraries_code" ON "libraries"("code");
CREATE INDEX "ix_libraries_name" ON "libraries"("name");
CREATE INDEX "ix_libraries_status" ON "libraries"("status");

CREATE UNIQUE INDEX "uq_users_student" ON "users"("student_id");
CREATE INDEX "ix_users_email" ON "users"("email");
CREATE INDEX "ix_users_library_id" ON "users"("library_id");
CREATE INDEX "ix_users_phone" ON "users"("phone");
CREATE INDEX "ix_users_status" ON "users"("status");

CREATE INDEX "ix_roles_library_id" ON "roles"("library_id");
CREATE INDEX "ix_roles_status" ON "roles"("status");

CREATE UNIQUE INDEX "uq_permissions_code" ON "permissions"("code");
CREATE INDEX "ix_permissions_module" ON "permissions"("module");
CREATE INDEX "ix_permissions_status" ON "permissions"("status");

CREATE INDEX "ix_role_permissions_permission_id" ON "role_permissions"("permission_id");
CREATE INDEX "ix_user_roles_role_id" ON "user_roles"("role_id");

CREATE INDEX "ix_students_email" ON "students"("email");
CREATE INDEX "ix_students_library_id" ON "students"("library_id");
CREATE INDEX "ix_students_name" ON "students"("first_name", "last_name");
CREATE INDEX "ix_students_phone" ON "students"("phone");
CREATE INDEX "ix_students_phone_library" ON "students"("library_id", "phone");
CREATE INDEX "ix_students_status" ON "students"("status");
CREATE UNIQUE INDEX "uq_students_library_admission_number" ON "students"("library_id", "admission_number");

CREATE INDEX "ix_student_documents_document_type" ON "student_documents"("document_type");
CREATE INDEX "ix_student_documents_status" ON "student_documents"("status");
CREATE INDEX "ix_student_documents_student_id" ON "student_documents"("student_id");

CREATE UNIQUE INDEX "uq_subscription_plans_code" ON "subscription_plans"("code");
CREATE INDEX "ix_subscription_plans_name" ON "subscription_plans"("name");
CREATE INDEX "ix_subscription_plans_status" ON "subscription_plans"("status");

CREATE UNIQUE INDEX "ux_library_active_subscription" ON "library_subscriptions"("library_id") WHERE ((status)::text = ANY ((ARRAY['TRIALING'::character varying, 'ACTIVE'::character varying])::text[]));
CREATE INDEX "ix_library_subscriptions_end_at" ON "library_subscriptions"("end_at");
CREATE INDEX "ix_library_subscriptions_library_id" ON "library_subscriptions"("library_id");
CREATE INDEX "ix_library_subscriptions_plan_id" ON "library_subscriptions"("plan_id");
CREATE INDEX "ix_library_subscriptions_status" ON "library_subscriptions"("status");

CREATE INDEX "ix_seats_library_id" ON "seats"("library_id");
CREATE INDEX "ix_seats_section" ON "seats"("library_id", "section");
CREATE INDEX "ix_seats_status" ON "seats"("status");
CREATE UNIQUE INDEX "uq_seats_library_seat_number" ON "seats"("library_id", "seat_number");

CREATE INDEX "ix_time_slots_library_id" ON "time_slots"("library_id");
CREATE INDEX "ix_time_slots_start_time" ON "time_slots"("library_id", "start_time");
CREATE INDEX "ix_time_slots_status" ON "time_slots"("status");
CREATE UNIQUE INDEX "uq_time_slots_library_name" ON "time_slots"("library_id", "name");

CREATE INDEX "ix_seat_bookings_booking_date" ON "seat_bookings"("booking_date");
CREATE INDEX "ix_seat_bookings_library_date" ON "seat_bookings"("library_id", "booking_date");
CREATE INDEX "ix_seat_bookings_library_id" ON "seat_bookings"("library_id");
CREATE INDEX "ix_seat_bookings_seat_date_slot" ON "seat_bookings"("seat_id", "booking_date", "time_slot_id");
CREATE INDEX "ix_seat_bookings_seat_id" ON "seat_bookings"("seat_id");
CREATE INDEX "ix_seat_bookings_status" ON "seat_bookings"("status");
CREATE INDEX "ix_seat_bookings_student_id" ON "seat_bookings"("student_id");
CREATE INDEX "ix_seat_bookings_time_slot_id" ON "seat_bookings"("time_slot_id");
CREATE UNIQUE INDEX "uq_seat_bookings_student_slot_date" ON "seat_bookings"("student_id", "time_slot_id", "booking_date");

CREATE UNIQUE INDEX "ux_attendance_qr_token" ON "attendance"("qr_token") WHERE (qr_token IS NOT NULL);
CREATE INDEX "ix_attendance_booking_id" ON "attendance"("booking_id");
CREATE INDEX "ix_attendance_date" ON "attendance"("attendance_date");
CREATE INDEX "ix_attendance_library_date" ON "attendance"("library_id", "attendance_date");
CREATE INDEX "ix_attendance_library_id" ON "attendance"("library_id");
CREATE INDEX "ix_attendance_qr_token" ON "attendance"("qr_token");
CREATE INDEX "ix_attendance_status" ON "attendance"("attendance_status");
CREATE INDEX "ix_attendance_student_id" ON "attendance"("student_id");

CREATE INDEX "ix_fee_plans_library_id" ON "fee_plans"("library_id");
CREATE INDEX "ix_fee_plans_name" ON "fee_plans"("library_id", "name");
CREATE INDEX "ix_fee_plans_status" ON "fee_plans"("status");
CREATE INDEX "ix_fee_plans_time_slot_id" ON "fee_plans"("time_slot_id");
CREATE UNIQUE INDEX "uq_fee_plans_library_code" ON "fee_plans"("library_id", "code");

CREATE INDEX "ix_invoices_due_date" ON "invoices"("due_date");
CREATE INDEX "ix_invoices_fee_plan_id" ON "invoices"("fee_plan_id");
CREATE INDEX "ix_invoices_invoice_date" ON "invoices"("invoice_date");
CREATE INDEX "ix_invoices_library_id" ON "invoices"("library_id");
CREATE INDEX "ix_invoices_library_status" ON "invoices"("library_id", "status");
CREATE INDEX "ix_invoices_status" ON "invoices"("status");
CREATE INDEX "ix_invoices_student_id" ON "invoices"("student_id");
CREATE UNIQUE INDEX "uq_invoices_library_invoice_number" ON "invoices"("library_id", "invoice_number");

CREATE INDEX "ix_payments_invoice_id" ON "payments"("invoice_id");
CREATE INDEX "ix_payments_library_date" ON "payments"("library_id", "payment_date");
CREATE INDEX "ix_payments_library_id" ON "payments"("library_id");
CREATE INDEX "ix_payments_payment_date" ON "payments"("payment_date");
CREATE INDEX "ix_payments_status" ON "payments"("status");
CREATE INDEX "ix_payments_student_id" ON "payments"("student_id");
CREATE INDEX "ix_payments_transaction_reference" ON "payments"("transaction_reference");
CREATE UNIQUE INDEX "uq_payments_library_payment_number" ON "payments"("library_id", "payment_number");
CREATE UNIQUE INDEX "ux_payments_library_transaction_reference" ON "payments"("library_id", "transaction_reference") WHERE (transaction_reference IS NOT NULL);

CREATE INDEX "ix_password_resets_user_id" ON "password_resets"("user_id");
CREATE INDEX "ix_password_resets_created_at" ON "password_resets"("created_at");

-- ============ FOREIGN KEYS ============

ALTER TABLE "libraries" ADD CONSTRAINT "fk_libraries_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "libraries" ADD CONSTRAINT "fk_libraries_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "users" ADD CONSTRAINT "fk_users_library" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "users" ADD CONSTRAINT "fk_users_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "roles" ADD CONSTRAINT "fk_roles_library" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_assigned_by" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "user_roles" ADD CONSTRAINT "fk_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "user_roles" ADD CONSTRAINT "fk_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "user_roles" ADD CONSTRAINT "fk_user_roles_assigned_by" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "students" ADD CONSTRAINT "fk_students_library" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "students" ADD CONSTRAINT "fk_students_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "students" ADD CONSTRAINT "fk_students_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "student_documents" ADD CONSTRAINT "fk_student_documents_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "student_documents" ADD CONSTRAINT "fk_student_documents_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "subscription_plans" ADD CONSTRAINT "fk_subscription_plans_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "subscription_plans" ADD CONSTRAINT "fk_subscription_plans_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "library_subscriptions" ADD CONSTRAINT "fk_library_subscriptions_library" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "library_subscriptions" ADD CONSTRAINT "fk_library_subscriptions_plan" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "library_subscriptions" ADD CONSTRAINT "fk_library_subscriptions_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "library_subscriptions" ADD CONSTRAINT "fk_library_subscriptions_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "seats" ADD CONSTRAINT "fk_seats_library" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "seats" ADD CONSTRAINT "fk_seats_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "seats" ADD CONSTRAINT "fk_seats_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "time_slots" ADD CONSTRAINT "fk_time_slots_library" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "time_slots" ADD CONSTRAINT "fk_time_slots_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "time_slots" ADD CONSTRAINT "fk_time_slots_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "seat_bookings" ADD CONSTRAINT "fk_seat_bookings_library" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "seat_bookings" ADD CONSTRAINT "fk_seat_bookings_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "seat_bookings" ADD CONSTRAINT "fk_seat_bookings_seat" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "seat_bookings" ADD CONSTRAINT "fk_seat_bookings_time_slot" FOREIGN KEY ("time_slot_id") REFERENCES "time_slots"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "seat_bookings" ADD CONSTRAINT "fk_seat_bookings_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "seat_bookings" ADD CONSTRAINT "fk_seat_bookings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "attendance" ADD CONSTRAINT "fk_attendance_library" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "attendance" ADD CONSTRAINT "fk_attendance_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "attendance" ADD CONSTRAINT "fk_attendance_booking" FOREIGN KEY ("booking_id") REFERENCES "seat_bookings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "attendance" ADD CONSTRAINT "fk_attendance_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "attendance" ADD CONSTRAINT "fk_attendance_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "fee_plans" ADD CONSTRAINT "fk_fee_plans_library" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "fee_plans" ADD CONSTRAINT "fk_fee_plans_time_slot" FOREIGN KEY ("time_slot_id") REFERENCES "time_slots"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "fee_plans" ADD CONSTRAINT "fk_fee_plans_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "fee_plans" ADD CONSTRAINT "fk_fee_plans_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "invoices" ADD CONSTRAINT "fk_invoices_library" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "invoices" ADD CONSTRAINT "fk_invoices_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "invoices" ADD CONSTRAINT "fk_invoices_fee_plan" FOREIGN KEY ("fee_plan_id") REFERENCES "fee_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "invoices" ADD CONSTRAINT "fk_invoices_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "invoices" ADD CONSTRAINT "fk_invoices_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_library" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "password_resets" ADD CONSTRAINT "fk_password_resets_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
