import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * qr-page.ts
 * QR Check-in page.
 *
 * There is now ONE desk QR code for ALL students — it encodes the PUBLIC
 * landing URL (GET /api/v1/attendance) and carries no identity. Identity for
 * the actual check-in always comes from the logged-in session:
 *
 * 1) Renders that single desk QR so it can be displayed or tested.
 * 2) Camera-based scan via `html5-qrcode` — scanning any library desk QR
 *    triggers the token-only check-in POST /student/attendance.
 * 3) A one-tap "Check in now" button as a camera-less alternative.
 */
import { Component, OnInit, OnDestroy, inject, signal, ElementRef, viewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { environment } from '../../../../environments/environment';
import { StudentService } from '../../../core/services/student.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-qr-page',
  standalone: true,
  imports: [Sidebar, CommonModule],
  templateUrl: './qr-page.html',
  styleUrl: './qr-page.css'
})
export class QrPage implements OnInit, OnDestroy {
  public studentService = inject(StudentService);
  public themeService = inject(ThemeService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  /** Camera preview container reference (element with id="qr-scanner") */
  public scannerRegion = viewChild<ElementRef<HTMLDivElement>>('scannerRegion');

  /**
   * The single desk QR URL — identical for every student. Points to the
   * PUBLIC landing page (no token needed); it never carries student data.
   */
  public deskUrl = `${environment.apiUrl}/attendance/qr`;

  /** Rendered desk QR code as a data URL */
  public qrDataUrl = signal<string | null>(null);

  /** True while the camera scanner is running */
  public isScanning = signal<boolean>(false);

  /** Camera errors (permission denied, not supported, etc.) */
  public cameraError = signal<string | null>(null);

  /** Last check-in result message */
  public lastResult = signal<string | null>(null);

  /** Result type for styling: success | error */
  public lastResultType = signal<'success' | 'error'>('success');

  /** Instance of the html5-qrcode scanner (cleaned up on destroy) */
  private html5QrCode: Html5Qrcode | null = null;

  ngOnInit() {
    // Render the single desk QR code (same for every student)
    QRCode.toDataURL(this.deskUrl, {
      width: 420,
      margin: 2,
      errorCorrectionLevel: 'M'
    })
      .then(url => this.qrDataUrl.set(url))
      .catch(() => this.cameraError.set('Failed to render QR code'));

    // Auto-start the camera when opened from the bottom-nav Scan QR button
    // (/qr?scan=1)
    this.route.queryParams.subscribe(params => {
      if (params['scan'] === '1') {
        setTimeout(() => void this.startScanning(), 300);
      }
    });
  }

  ngOnDestroy() {
    void this.stopScanner();
  }

  /**
   * One-tap check-in. Identity comes from the logged-in session — no QR
   * payload is sent, the backend reads the student from the JWT.
   */
  public quickCheckIn() {
    this.studentService.checkIn().subscribe({
      next: (res) => {
        if (res.success) {
          this.lastResultType.set('success');
          this.lastResult.set(`Checked in successfully at ${this.formatTime(res.data?.check_in_at)}. Have a great study session!`);
        }
      }
    });
  }

  /** Start the camera and begin scanning. */
  public async startScanning() {
    this.cameraError.set(null);
    this.lastResult.set(null);
    this.isScanning.set(true);

    // The scanner container is kept in the DOM (see template) but only shown
    // while scanning. Run change detection now so the element is visible and
    // measurable before html5-qrcode attaches to it.
    this.cdr.detectChanges();

    const region = this.scannerRegion()?.nativeElement;
    if (!region) {
      this.cameraError.set('Camera preview unavailable. Please try again.');
      this.isScanning.set(false);
      return;
    }

    try {
      this.html5QrCode = new Html5Qrcode('qr-scanner');
      await this.html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Successful decode — stop scanning and submit
          void this.handleDecoded(decodedText);
        },
        () => {
          // Per-frame error callbacks are expected while scanning; ignore them.
        }
      );
    } catch (err: any) {
      this.isScanning.set(false);
      this.cameraError.set(err?.message || 'Unable to access the camera. Please grant camera permission.');
    }
  }

  /** Stop the camera scanner and reset UI state. */
  public async stopScanner() {
    if (this.html5QrCode) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
      } catch {
        // Scanner already stopped / never started — ignore
      }
      this.html5QrCode = null;
    }
    this.isScanning.set(false);
  }

  /**
   * Handle a successfully decoded QR payload.
   *
   * STRICT match: only the single library desk QR URL is accepted. Scanning
   * any other QR must never create attendance, so the decoded text has to
   * equal the expected desk URL exactly (ignoring trailing slashes).
   */
  private handleDecoded(decodedText: string) {
    void this.stopScanner();

    const expected = this.deskUrl.replace(/\/+$/, '');
    const decoded = decodedText.trim().replace(/\/+$/, '');

    if (decoded !== expected) {
      this.lastResultType.set('error');
      this.lastResult.set('This is not the library attendance QR code.');
      return;
    }

    this.quickCheckIn();
  }

  /** Format ISO datetime as a readable local time. */
  private formatTime(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
