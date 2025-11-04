import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription, timer } from 'rxjs';
import { ScanResultService } from '../../services/scan-result.service';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';

// Type declaration for native BarcodeDetector API
declare global {
  interface Window {
    BarcodeDetector: any;
  }
}

interface BarcodeDetector {
  detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
}

interface ScanApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    customerId?: number;
    fullName?: string;
    matchType?: string;
    qrGeneratedAt?: string | null;
  } | null;
  debug?: unknown;
}

@Component({
  selector: 'app-scan',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './scan.component.html',
  styleUrls: ['./scan.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScanComponent implements OnInit, OnDestroy {
  private readonly apiUrl = 'https://website-2eb58030.ich.rqh.mybluehost.me/api.php';
  private readonly headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  @ViewChild('videoElement') private videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') private canvasElement?: ElementRef<HTMLCanvasElement>;

  devices: MediaDeviceInfo[] = [];
  selectedDeviceId: string | null = null;
  cameraActive = false;
  cameraError: string | null = null;

  isProcessingScan = false;
  scanStatusMessage = '';
  scanError: string | null = null;
  toastMessage: string | null = null;
  showToast = false;

  private stream: MediaStream | null = null;
  private navigationSub: Subscription | null = null;
  private barcodeDetector: BarcodeDetector | null = null;
  private zxingReader: BrowserMultiFormatReader | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly scanResults: ScanResultService,
    private readonly cdr: ChangeDetectorRef
  ) {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        this.barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch (error) {
        console.warn('⚠️ BarcodeDetector not available:', error);
        this.barcodeDetector = null;
      }
    }
  }

  ngOnInit(): void {
    // Automatically open camera when component loads
    // This makes it feel seamless - user just needs to position QR and click Scan Now
    this.openCamera();
  }

  ngOnDestroy(): void {
    this.navigationSub?.unsubscribe();
    this.closeCamera();
  }

  async openCamera(): Promise<void> {
    if (this.cameraActive) {
      return;
    }

    this.cameraActive = true;
    this.cameraError = null;
    this.scanError = null;
    this.scanStatusMessage = '';
    this.cdr.markForCheck();

    // Wait a moment to ensure any previous camera use is fully released
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const stream = await this.getPreferredCameraStream();
      this.stream = stream;

      const video = this.videoElement?.nativeElement;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch (error) {
          console.warn('⚠️ Video play request failed:', error);
        }
      }

      await this.refreshDeviceList(stream);
      this.scanStatusMessage = 'Camera ready. Position QR code and tap Scan Now.';
    } catch (error) {
      console.error('❌ Failed to open camera:', error);
      this.cameraError = this.describeCameraError(error);
      this.showToastMessage(this.cameraError);
      this.cameraActive = false;
      this.stopCamera();
    } finally {
      this.cdr.markForCheck();
    }
  }

  closeCamera(): void {
    this.cameraActive = false;
    this.scanStatusMessage = '';
    this.scanError = null;
    this.isProcessingScan = false;
    this.stopCamera();
    this.cdr.markForCheck();
  }

  async scanNow(): Promise<void> {
    if (!this.cameraActive || this.isProcessingScan) {
      return;
    }

    const video = this.videoElement?.nativeElement;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.showToastMessage('Camera not ready. Please wait a moment.');
      return;
    }

    this.isProcessingScan = true;
    this.scanError = null;
    this.scanStatusMessage = 'Scanning QR code...';
    this.cdr.markForCheck();

    try {
      const payload = await this.detectQrPayload(video);
      if (payload) {
        await this.handleDetectedPayload(payload);
      } else {
        this.scanError = 'No QR code detected. Please try again.';
        this.showToastMessage(this.scanError);
        this.isProcessingScan = false;
      }
    } catch (error) {
      console.error('❌ QR detection error:', error);
      this.scanError = 'Failed to scan QR code. Please try again.';
      this.showToastMessage(this.scanError);
      this.isProcessingScan = false;
    } finally {
      this.cdr.markForCheck();
    }
  }

  async toggleCamera(): Promise<void> {
    if (!this.cameraActive || this.devices.length < 2) {
      return;
    }

    const nextDeviceId = this.getNextDeviceId();
    if (!nextDeviceId) {
      return;
    }

    this.scanStatusMessage = 'Switching camera...';
    this.cdr.markForCheck();

    try {
      this.stopCamera();
      await new Promise(resolve => setTimeout(resolve, 200));

      const stream = await this.getPreferredCameraStream(nextDeviceId);
      this.stream = stream;

      const video = this.videoElement?.nativeElement;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }

      await this.refreshDeviceList(stream);
      this.scanStatusMessage = 'Camera ready. Position QR code and tap Scan Now.';
    } catch (error) {
      console.error('❌ Failed to switch camera:', error);
      this.cameraError = this.describeCameraError(error);
      this.showToastMessage(this.cameraError);
    } finally {
      this.cdr.markForCheck();
    }
  }

  private async refreshDeviceList(activeStream: MediaStream | null): Promise<void> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      this.devices = [];
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    this.devices = devices.filter(device => device.kind === 'videoinput');

    const activeTrack = activeStream?.getVideoTracks()[0];
    const settings = activeTrack?.getSettings();

    if (settings?.deviceId) {
      this.selectedDeviceId = settings.deviceId;
    } else if (!this.selectedDeviceId && this.devices.length) {
      this.selectedDeviceId = this.pickPreferredDeviceId(this.devices);
    } else if (this.selectedDeviceId && !this.devices.some(d => d.deviceId === this.selectedDeviceId)) {
      this.selectedDeviceId = this.devices[0].deviceId;
    }
  }

  private pickPreferredDeviceId(devices: MediaDeviceInfo[]): string {
    const backFacingRegex = /(back|rear|environment)/i;
    const preferred = devices.find(device => backFacingRegex.test(device.label));
    return preferred?.deviceId ?? devices[0].deviceId;
  }

  private getNextDeviceId(): string | null {
    if (!this.devices.length) {
      return null;
    }

    if (!this.selectedDeviceId) {
      return this.devices[0].deviceId;
    }

    const currentIndex = this.devices.findIndex(device => device.deviceId === this.selectedDeviceId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % this.devices.length : 0;
    return this.devices[nextIndex]?.deviceId ?? null;
  }

  private async getPreferredCameraStream(deviceId?: string): Promise<MediaStream> {
    const baseConstraints: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 }
    };

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera access is not supported in this browser.');
    }

    const fallbackReasons = new Set([
      'OverconstrainedError',
      'NotFoundError',
      'NotReadableError',
      'ConstraintNotSatisfiedError'
    ]);

    const attempts: Array<{ constraint: MediaTrackConstraints; onSuccess?: (stream: MediaStream) => void }> = [];

    if (deviceId) {
      attempts.push({
        constraint: {
          ...baseConstraints,
          deviceId: { exact: deviceId }
        }
      });
    } else {
      attempts.push(
        {
          constraint: {
            ...baseConstraints,
            facingMode: { exact: 'environment' }
          }
        },
        {
          constraint: {
            ...baseConstraints,
            facingMode: { ideal: 'environment' }
          }
        }
      );
    }

    attempts.push({
      constraint: {
        ...baseConstraints,
        facingMode: 'user'
      }
    });

    let lastError: any = null;

    for (const attempt of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: attempt.constraint });
        return stream;
      } catch (error: any) {
        lastError = error;
        if (!error || !fallbackReasons.has(error.name)) {
          throw error;
        }
        console.warn('⚠️ Camera constraint failed, trying next option:', error?.name ?? error);
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error('Unable to acquire camera stream.');
  }

  private async detectQrPayload(video: HTMLVideoElement): Promise<string | null> {
    if (this.barcodeDetector) {
      try {
        const results = await this.barcodeDetector.detect(video);
        if (results.length) {
          return results[0].rawValue ?? null;
        }
      } catch (error) {
        console.warn('⚠️ BarcodeDetector detection error:', error);
      }
    }

    return this.detectWithZXing(video);
  }

  private async detectWithZXing(video: HTMLVideoElement): Promise<string | null> {
    const canvas = this.canvasElement?.nativeElement;
    if (!canvas) {
      return null;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      return null;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    context.drawImage(video, 0, 0, width, height);

    this.zxingReader ??= new BrowserMultiFormatReader();

    try {
      const result = await this.zxingReader.decodeFromCanvas(canvas);
      return result?.getText?.() ?? null;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  private async handleDetectedPayload(rawPayload: string): Promise<void> {
    const payload = (rawPayload ?? '').trim();

    if (!payload) {
      return;
    }

    // ===== STEP 1: DEBUG - Just log what we got from QR code =====
    console.log('🎯 ===== QR CODE DETECTED =====');
    console.log('📦 Raw Payload:', payload);
    console.log('📏 Payload Length:', payload.length);
    console.log('🔤 Payload Type:', typeof payload);
    console.log('===============================');

    // Show success message
    this.scanStatusMessage = `QR Code Read: ${payload.substring(0, 50)}${payload.length > 50 ? '...' : ''}`;
    this.showToastMessage(`QR Code detected! Check console for details.`);
    this.isProcessingScan = false;
    this.cdr.markForCheck();

    // TODO: Next step will be to send this to API for lookup
    // this.http
    //   .post<ScanApiResponse>(`${this.apiUrl}?action=scan-qr`, JSON.stringify({ payload }), {
    //     headers: this.headers
    //   })
    //   .subscribe({
    //     next: response => this.handleScanResponse(response, payload),
    //     error: error => this.handleScanError(error)
    //   });
  }

  private handleScanResponse(response: ScanApiResponse, payload: string): void {
    console.log('🧾 Scan API response:', response);

    if (response.success && response.data?.customerId) {
      const customerId = Number(response.data.customerId);
      const customerName = response.data.fullName;

      const successMessage =
        response.message ?? (customerName ? `Opening ${customerName}'s profile...` : 'Customer found!');

      this.scanStatusMessage = successMessage;
      this.toastMessage = successMessage;
      this.showToast = true;
      this.scanResults.setResult({
        status: 'found',
        message: successMessage,
        customerId,
        rawPayload: payload
      });
      this.cdr.markForCheck();

      this.navigationSub = timer(500).subscribe(() => {
        this.router.navigate(['/register', customerId], { state: { source: 'scan' } }).catch(err => {
          console.error('❌ Navigation error:', err);
          this.scanError = 'Unable to open customer profile.';
          this.scanResults.setResult({
            status: 'error',
            message: 'Navigation failed after scanning.',
            rawPayload: payload
          });
          this.showToastMessage(this.scanError);
          this.isProcessingScan = false;
        });
      });

      return;
    }

    const message = response.message || 'No customer found for this QR code.';
    this.scanError = message;
    this.showToastMessage(message);
    this.scanResults.setResult({
      status: 'not-found',
      message,
      rawPayload: payload
    });
    this.isProcessingScan = false;
    this.cdr.markForCheck();
  }

  private handleScanError(error: unknown): void {
    console.error('❌ QR scan lookup failed:', error);
    const message = 'Unable to look up this QR code. Please try again.';
    this.scanError = message;
    this.showToastMessage(message);
    this.scanResults.setResult({
      status: 'error',
      message
    });
    this.isProcessingScan = false;
    this.cdr.markForCheck();
  }

  private stopCamera(): void {
    // Stop this component's stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Also stop any orphaned streams from video element
    const video = this.videoElement?.nativeElement;
    if (video) {
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      video.srcObject = null;
    }
  }

  private describeCameraError(error: unknown): string {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          return 'Camera access was blocked. Please allow access and try again.';
        case 'NotFoundError':
          return 'No usable camera was found on this device.';
        case 'NotReadableError':
          return 'Unable to start the camera. Make sure no other app is using it, then try again.';
        case 'OverconstrainedError':
          return 'Camera does not support the requested settings. Try switching cameras.';
        default:
          return error.message || 'Unable to access the camera.';
      }
    }

    if (typeof error === 'object' && error && 'message' in error) {
      return String((error as { message?: unknown }).message) || 'Unable to access the camera.';
    }

    return 'Unable to access the camera.';
  }

  private showToastMessage(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    this.cdr.markForCheck();
  }
}
