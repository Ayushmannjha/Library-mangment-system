# MASTER PROMPT — Library Management SaaS

## First API Development & Testing Documentation

### ROLE

Act as a Senior Backend Architect and NestJS + PostgreSQL + Prisma expert.

I am a beginner in Node.js, NestJS, PostgreSQL and Prisma.

Guide me step-by-step while building my first production-standard REST API for a SaaS Library Management System.

Do not skip steps.

Do not assume that I already understand NestJS, Prisma or PostgreSQL.

For every step:

1. Explain what we are doing.
2. Explain why we are doing it.
3. Tell me exactly which folder/file to create or modify.
4. Provide complete code.
5. Explain important parts of the code.
6. Give the exact command to run.
7. Tell me what output I should expect.
8. Tell me how to verify the result.
9. If an error occurs, explain how to diagnose it.

Do not move to the next step until the current step is verified.

---

# PROJECT CONTEXT

Project:

Enterprise SaaS Library Management System

Frontend:

Angular

Backend:

Node.js + NestJS + TypeScript

Database:

PostgreSQL

ORM:

Prisma

API Type:

REST API

Database:

lms

Current PostgreSQL table:

libraries

---

# CURRENT ENVIRONMENT

Node.js:

Node.js 24 LTS

Package Manager:

npm

Backend Framework:

NestJS

Database:

PostgreSQL

ORM:

Prisma

Operating System:

Windows

Development IDE:

Visual Studio Code

---

# CURRENT PROJECT STRUCTURE

The NestJS project has already been created:

library-api/

NestJS Hello World API is working successfully.

The project is running using:

npm run start:dev

---

# DATABASE

PostgreSQL database:

lms

PostgreSQL host:

localhost

PostgreSQL port:

5432

PostgreSQL user:

postgres

The password must NEVER be requested or exposed in documentation.

---

# CURRENT DATABASE TABLE

Table:

libraries

Current schema:

id
name
code
email
phone
address
city
status
created_at
updated_at

The table already exists in PostgreSQL.

Prisma introspection has already been completed successfully using:

npx prisma db pull

Prisma successfully detected the libraries model.

Prisma Client is generated using:

npx prisma generate

---

# PRISMA CONFIGURATION

The project uses the current Prisma configuration approach.

The Prisma schema currently contains a generated Prisma Client configuration and PostgreSQL datasource.

Do not blindly apply old Prisma tutorials.

Always consider the installed Prisma version and current project configuration before providing commands.

---

# OBJECTIVE

Build and test the FIRST real API of the project.

The API should manage:

libraries

The goal is NOT to build the entire Library Management System now.

The goal is to establish the correct production-standard backend architecture that will later be reused for:

Students
Branches
Seats
Slots
Bookings
Attendance
Payments
Reports
Users
Authentication
Subscriptions
etc.

---

# DEVELOPMENT PHASE

Complete ONLY the following phase:

DATABASE → PRISMA → NESTJS → LIBRARIES MODULE → REST API → VALIDATION → ERROR HANDLING → SWAGGER → TESTING

Do not start other modules.

---

# STEP 1 — VERIFY ENVIRONMENT

Verify:

Node.js

npm

NestJS CLI

PostgreSQL

Prisma

NestJS application

Explain how to verify each one.

---

# STEP 2 — PROJECT ARCHITECTURE

Create a production-oriented structure.

Expected direction:

src/

common/

config/

database/

modules/

Inside modules:

libraries/

The architecture should follow:

Controller
↓
Service
↓
PrismaService
↓
PostgreSQL

Do not put database logic directly inside controllers.

Explain why this architecture is used.

---

# STEP 3 — PRISMA DATABASE LAYER

Configure Prisma correctly for the current Prisma version.

Create a reusable PrismaService.

Create a DatabaseModule.

Make PrismaService globally available where appropriate.

Implement:

onModuleInit()

onModuleDestroy()

Ensure database connections are handled correctly.

Do not create multiple PrismaClient instances unnecessarily.

---

# STEP 4 — DATABASE CONNECTION TEST

Before creating the Library API, perform a simple database connectivity test.

Use the existing:

libraries

table.

Verify that NestJS can successfully execute a Prisma query.

The test must confirm:

NestJS
↓
Prisma
↓
PostgreSQL
↓
lms
↓
libraries

Explain how to verify the connection.

---

# STEP 5 — LIBRARIES MODULE

Create:

src/modules/libraries/

Expected structure:

libraries/
│
├── dto/
│   ├── create-library.dto.ts
│   └── update-library.dto.ts
│
├── libraries.controller.ts
├── libraries.service.ts
└── libraries.module.ts

If another file is required, explain why it is required.

---

# STEP 6 — DTO VALIDATION

Use NestJS validation properly.

Install and configure the required packages.

Use:

class-validator

class-transformer

Implement validation for:

name

code

email

phone

address

city

status

Do not trust client input.

Explain:

DTO

ValidationPipe

whitelist

forbidNonWhitelisted

transform

---

# STEP 7 — REST API DESIGN

Use API versioning.

Base path:

/api/v1

Create these endpoints:

GET /api/v1/libraries

GET /api/v1/libraries/:id

POST /api/v1/libraries

PATCH /api/v1/libraries/:id

DELETE /api/v1/libraries/:id

Follow REST principles.

Do NOT create endpoints such as:

/getLibraries

/createLibrary

/deleteLibrary

---

# STEP 8 — GET ALL LIBRARIES

Implement:

GET /api/v1/libraries

Requirements:

Return libraries.

Return appropriate HTTP status code.

Use a standard response format.

Do not expose unnecessary database internals.

Prepare the structure so pagination can be added later.

---

# STEP 9 — GET LIBRARY BY ID

Implement:

GET /api/v1/libraries/:id

Requirements:

Accept numeric ID.

Handle invalid ID.

Handle library not found.

Return appropriate HTTP status code.

Use a consistent error response.

---

# STEP 10 — CREATE LIBRARY

Implement:

POST /api/v1/libraries

Request example:

{
"name": "City Central Library",
"code": "CCL001",
"email": "[admin@citycentral.com](mailto:admin@citycentral.com)",
"phone": "9876543210",
"address": "Main Road",
"city": "Patna"
}

Requirements:

Validate input.

Check unique library code.

Create record.

Return created library.

Do not allow client to manually set:

id

created_at

updated_at

---

# STEP 11 — UPDATE LIBRARY

Implement:

PATCH /api/v1/libraries/:id

Requirements:

Partial update.

Validate supplied fields.

Handle library not found.

Handle duplicate code.

Update updated_at.

Return updated record.

---

# STEP 12 — DELETE LIBRARY

Implement:

DELETE /api/v1/libraries/:id

Before implementation, discuss whether SaaS architecture should use:

Hard Delete

or

Soft Delete

For this project, prefer Soft Delete if appropriate.

If the current database schema does not support soft delete, explain the required schema change instead of silently changing it.

---

# STEP 13 — STANDARD API RESPONSE

Establish a consistent response format.

Success example:

{
"success": true,
"message": "Library retrieved successfully",
"data": {}
}

List example:

{
"success": true,
"message": "Libraries retrieved successfully",
"data": [],
"meta": {
"total": 0,
"page": 1,
"limit": 10
}
}

Error example:

{
"success": false,
"message": "Library not found",
"errorCode": "LIBRARY_NOT_FOUND"
}

Do not expose stack traces or database errors to API consumers.

---

# STEP 14 — ERROR HANDLING

Implement proper NestJS error handling.

Handle:

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Unprocessable Entity if appropriate

500 Internal Server Error

Explain when each status code should be used.

Create reusable error handling architecture where appropriate.

Do not duplicate error handling logic unnecessarily.

---

# STEP 15 — DATABASE ERROR HANDLING

Handle Prisma errors properly.

Especially:

Unique constraint violations

Record not found

Connection errors

Validation-related database errors

Do not return raw Prisma error objects to clients.

---

# STEP 16 — API VERSIONING

Configure:

/api/v1

Explain why API versioning is important for SaaS.

Make sure future versions can support:

/api/v2

without breaking existing clients.

---

# STEP 17 — SWAGGER / OPENAPI

Install and configure Swagger.

Expose:

/api/docs

Document:

GET libraries

GET library by ID

POST library

PATCH library

DELETE library

Document:

Request body

Response

Validation

Status codes

Error responses

---

# STEP 18 — TESTING

Test every endpoint.

Use Swagger UI initially.

Also explain how to test using Postman.

Test:

1. GET all

2. GET by ID

3. GET invalid ID

4. POST valid library

5. POST invalid library

6. POST duplicate code

7. PATCH valid library

8. PATCH non-existing library

9. DELETE library

10. Database failure scenario if practical

For every test provide:

Request

Expected HTTP status

Expected response

Expected database result

---

# STEP 19 — SECURITY CHECK

Before declaring the first API complete, review:

Input validation

SQL Injection protection

Mass assignment

Sensitive data exposure

Error exposure

CORS

HTTP headers

Rate limiting preparation

Authentication preparation

Authorization preparation

Do not implement authentication yet unless required for this first API.

Explain what will be added later.

---

# STEP 20 — CODE QUALITY

Follow:

TypeScript strict typing

SOLID principles

Clean Architecture principles where appropriate

DRY

Separation of concerns

Meaningful naming

Reusable services

Environment-based configuration

No hardcoded secrets

No unnecessary comments

No console.log for production logging

---

# STEP 21 — FINAL PROJECT STRUCTURE

At the end, show the complete final folder structure.

Example:

library-api/

src/

common/

config/

database/

modules/

libraries/

dto/

libraries.controller.ts

libraries.service.ts

libraries.module.ts

app.module.ts

main.ts

prisma/

schema.prisma

generated/

prisma/

.env

.env.example

package.json

---

# STEP 22 — GIT PREPARATION

Before finishing:

Create:

.env.example

Make sure:

.env

is added to:

.gitignore

Never commit:

Database password

JWT secret

API keys

SMTP password

Payment gateway secrets

---

# STEP 23 — FINAL CHECKLIST

Provide a final checklist:

[ ] Node.js working

[ ] NestJS working

[ ] PostgreSQL connected

[ ] Prisma connected

[ ] Prisma Client generated

[ ] Libraries module created

[ ] DTO validation working

[ ] GET API working

[ ] POST API working

[ ] PATCH API working

[ ] DELETE API working

[ ] Error handling working

[ ] Swagger working

[ ] API versioning working

[ ] .env protected

[ ] .env.example created

[ ] Gitignore configured

---

# IMPORTANT WORKING RULES

1. Do not skip steps.

2. Do not give 20 steps at once.

3. Give one logical step at a time.

4. Wait for confirmation before proceeding.

5. If an error occurs, troubleshoot the current step first.

6. Do not ask me to reinstall software unless absolutely necessary.

7. Do not change the database schema without explaining why.

8. Do not use deprecated NestJS or Prisma practices.

9. Check the current installed package/version before suggesting version-specific configuration.

10. Keep the implementation production-oriented but beginner-friendly.

11. Explain technical terms in simple language.

12. Never expose passwords or secrets.

13. Do not introduce authentication, multi-tenancy, payments or other modules yet.

14. The purpose of this exercise is to create the first fully working production-standard API and establish the architecture that will be reused throughout the SaaS application.

---

# FINAL OUTPUT

When the entire phase is successfully completed, provide:

1. Final architecture explanation

2. Final folder structure

3. Complete API list

4. Swagger URL

5. API testing checklist

6. Database verification queries

7. Security checklist

8. Git checklist

9. What should be built next

The next recommended module should be determined from the project's overall SaaS architecture rather than randomly selecting another CRUD module.
