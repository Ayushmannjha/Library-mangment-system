import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Landing page behind the SINGLE desk QR code (same URL for every student).
 *
 * A QR is just a pointer, not a credential: this endpoint is public and
 * read-only, and only hands the student off to the portal. The actual
 * attendance write happens on POST /student/attendance with a valid JWT.
 *
 * NOTE: the base path GET /attendance already belongs to the admin
 * AttendanceController (auth-protected), so the public landing lives at the
 * more specific GET /attendance/qr.
 *
 * Written via @Res() so it bypasses the { success, message, data } JSON
 * envelope and is served to a browser as HTML.
 */
@ApiTags('Attendance QR')
@Controller('attendance')
export class AttendanceLandingController {
  constructor(private readonly config: ConfigService) {}

  @Get('qr')
  @Public()
  @ApiOperation({
    summary: 'Public landing page behind the single desk check-in QR code',
  })
  landing(@Res() res: Response): void {
    const portalUrl =
      this.config.get<string>('STUDENT_PORTAL_URL') ?? 'http://localhost:4202';
    const confirmUrl = `${portalUrl.replace(/\/$/, '')}/attendance/confirm`;

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Library Attendance</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .card {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 16px;
        padding: 32px;
        max-width: 420px;
        width: 100%;
        text-align: center;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
      }
      .brand {
        width: 52px; height: 52px;
        margin: 0 auto 16px;
        border-radius: 14px;
        background: linear-gradient(135deg, #fbbf24, #f59e0b, #d97706);
        display: flex; align-items: center; justify-content: center;
        font-size: 26px;
      }
      .tag {
        display: inline-block;
        font-size: 11px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: #fbbf24;
        font-weight: 700;
        margin-bottom: 8px;
      }
      h1 { font-size: 22px; margin-bottom: 10px; }
      p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 20px; }
      .btn {
        display: inline-block;
        background: #f59e0b;
        color: #1f2937;
        font-weight: 700;
        font-size: 14px;
        text-decoration: none;
        padding: 13px 28px;
        border-radius: 12px;
        transition: background 0.2s;
      }
      .btn:hover { background: #fbbf24; }
      .note { font-size: 12px; color: #64748b; margin: 18px 0 0; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="brand">📚</div>
      <span class="tag">Library Attendance</span>
      <h1>Confirm your check-in</h1>
      <p>You scanned the library attendance QR code. Continue to your Student Portal to mark your attendance for today.</p>
      <a class="btn" href="${confirmUrl}">Continue in Student Portal</a>
      <p class="note">Not signed in yet? The portal will ask you to log in with your student account.</p>
    </div>
  </body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
