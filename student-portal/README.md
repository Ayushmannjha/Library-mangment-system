# Student Portal

Self-service frontend for library students (Lexicon LMS). Students log in with the
credentials emailed to them on admission, view their personal QR code, scan it to
mark attendance, and check their seat allotment and fee details.

Built with Angular 22, Tailwind CSS v3, and the same project structure as the
`library-frontend` admin app (`core` / `features` / `shared`).

## Features

- **Login** — uses the shared `POST /api/v1/auth/login` (email + password).
- **QR Check-in** — renders the student's personal QR code (`GET /api/v1/student/me/qr`)
  and scans it with the camera via `html5-qrcode` to check in
  (`POST /api/v1/student/attendance/qr-check-in`). A camera-less "Check in with my QR"
  button is also provided.
- **My Attendance** — `GET /api/v1/student/attendance` visit history.
- **My Seat** — `GET /api/v1/student/seat` current seat allocation + time slot.
- **Fees & Dues** — `GET /api/v1/student/fees` invoices and payment history.

## Development server

```bash
npm start
```

Runs on `http://127.0.0.1:4202` (backend default `http://localhost:3000/api/v1`,
configurable in `src/environments/environment.development.ts`).

## Build

```bash
npm run build
```

## Unit tests

```bash
npm test
```

## Sample seeded student login

Email: `rahul@example.com` / Password: `Student@123`
