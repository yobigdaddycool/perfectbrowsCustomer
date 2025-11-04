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

interface DetectedBarcode {
  rawValue: string;
  boundingBox?: DOMRectReadOnly;
  cornerPoints?: Array<{ x: number; y: number }>;
}

interface BarcodeDetector {
  detect(image: ImageBitmapSource): Promise<Array<DetectedBarcode>>;
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

  // Continuous scanning
  private scanningActive = false;
  private animationFrameId: number | null = null;
  private lastDetectedPayload: string | null = null;
  private detectionCooldown = false;

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
    this.stopContinuousScanning();
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
      this.scanStatusMessage = 'Camera ready. Position QR code in the frame.';

      // Start continuous scanning
      this.startContinuousScanning();
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
    this.stopContinuousScanning();
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
    this.stopContinuousScanning();
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
      this.scanStatusMessage = 'Camera ready. Position QR code in the frame.';

      // Restart continuous scanning
      this.startContinuousScanning();
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

  private async detectWithZXingInFrame(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ): Promise<string | null> {
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    this.zxingReader ??= new BrowserMultiFormatReader();

    try {
      const result = await this.zxingReader.decodeFromCanvas(canvas);
      return result?.getText?.() ?? null;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      // For other errors, just log and return null (don't throw in continuous scanning)
      console.warn('⚠️ ZXing decode error:', error);
      return null;
    }
  }

  private drawSimpleDetectionBox(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Draw a yellow box in the center of the frame to indicate detection
    const boxSize = Math.min(width, height) * 0.6;
    const x = (width - boxSize) / 2;
    const y = (height - boxSize) / 2;

    // Yellow color like on phones
    ctx.strokeStyle = '#FFD700'; // Gold/yellow color
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, boxSize, boxSize);

    // Add semi-transparent yellow fill
    ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
    ctx.fillRect(x, y, boxSize, boxSize);

    // Add corner markers for a more phone-like appearance
    const cornerLength = 30;
    const cornerOffset = 8;

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 5;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(x - cornerOffset, y + cornerLength);
    ctx.lineTo(x - cornerOffset, y - cornerOffset);
    ctx.lineTo(x + cornerLength, y - cornerOffset);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(x + boxSize - cornerLength, y - cornerOffset);
    ctx.lineTo(x + boxSize + cornerOffset, y - cornerOffset);
    ctx.lineTo(x + boxSize + cornerOffset, y + cornerLength);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(x - cornerOffset, y + boxSize - cornerLength);
    ctx.lineTo(x - cornerOffset, y + boxSize + cornerOffset);
    ctx.lineTo(x + cornerLength, y + boxSize + cornerOffset);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(x + boxSize - cornerLength, y + boxSize + cornerOffset);
    ctx.lineTo(x + boxSize + cornerOffset, y + boxSize + cornerOffset);
    ctx.lineTo(x + boxSize + cornerOffset, y + boxSize - cornerLength);
    ctx.stroke();
  }

  private async handleDetectedPayload(rawPayload: string): Promise<void> {
    const payload = (rawPayload ?? '').trim();

    if (!payload) {
      return;
    }

    // ===== STEP 1: DEBUG - Log and parse QR code =====
    console.log('🎯 ===== QR CODE DETECTED =====');
    console.log('📦 Raw Payload:', payload);
    console.log('📏 Payload Length:', payload.length);
    console.log('🔤 Payload Type:', typeof payload);

    // Try to parse as JSON and extract customer ID
    let customerId: string | null = null;
    let parsedData: any = null;
    let parseError: string | null = null;

    try {
      parsedData = JSON.parse(payload);
      customerId = parsedData.customerId || parsedData.customer_id || null;
      console.log('✅ Successfully parsed JSON');
      console.log('🆔 Customer ID:', customerId);
      console.log('📋 Parsed Data:', parsedData);
    } catch (e) {
      parseError = 'Not JSON format';
      console.warn('⚠️ Failed to parse as JSON:', e);
      console.log('📝 Treating as plain text');
    }

    console.log('===============================');

    if (!customerId) {
      this.scanError = 'No customer ID found in QR code';
      this.showToastMessage(this.scanError);
      this.isProcessingScan = false;
      this.cdr.markForCheck();
      return;
    }

    // Send to API for lookup
    this.scanStatusMessage = 'Looking up customer...';
    this.cdr.markForCheck();

    this.http
      .post<ScanApiResponse>(`${this.apiUrl}?action=scan-qr`, JSON.stringify({ payload }), {
        headers: this.headers
      })
      .subscribe({
        next: response => this.handleScanResponse(response, payload),
        error: error => this.handleScanError(error)
      });
  }

  private handleScanResponse(response: ScanApiResponse, payload: string): void {
    console.log('🧾 Scan API response:', response);

    if (response.success && response.data?.customerId) {
      const customerId = Number(response.data.customerId);
      const customerName = response.data.fullName;

      const successMessage =
        response.message ?? (customerName ? `Found ${customerName}!` : 'Customer found!');

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

      // Navigate to register component in edit mode
      console.log('🚀 Navigating to register component for customer ID:', customerId);
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

    // Customer not found
    const message = response.message || 'Customer not found for this QR code.';
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

  private startContinuousScanning(): void {
    if (this.scanningActive) {
      return;
    }

    this.scanningActive = true;
    this.lastDetectedPayload = null;
    this.detectionCooldown = false;
    this.scanFrame();
  }

  private stopContinuousScanning(): void {
    this.scanningActive = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Clear the canvas overlay
    const canvas = this.canvasElement?.nativeElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  private async scanFrame(): Promise<void> {
    if (!this.scanningActive || !this.cameraActive) {
      return;
    }

    const video = this.videoElement?.nativeElement;
    const canvas = this.canvasElement?.nativeElement;

    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      // Not ready yet, try again next frame
      this.animationFrameId = requestAnimationFrame(() => this.scanFrame());
      return;
    }

    // Set canvas size to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.animationFrameId = requestAnimationFrame(() => this.scanFrame());
      return;
    }

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let detected = false;
    let payload: string | null = null;

    try {
      // Try BarcodeDetector first (if available)
      if (this.barcodeDetector) {
        const results = await this.barcodeDetector.detect(video);
        if (results.length > 0) {
          const barcode = results[0];
          payload = barcode.rawValue?.trim() || null;
          if (payload) {
            detected = true;
            this.drawDetectionBox(ctx, barcode);
          }
        }
      }

      // Fallback to ZXing if BarcodeDetector didn't find anything
      if (!detected) {
        payload = await this.detectWithZXingInFrame(video, canvas, ctx);
        if (payload) {
          detected = true;
          // Draw a simple box around center of frame for ZXing detection
          this.drawSimpleDetectionBox(ctx, canvas.width, canvas.height);
        }
      }

      // Process if we detected something
      if (detected && payload && !this.detectionCooldown && payload !== this.lastDetectedPayload) {
        console.log('🎯 QR Code detected in continuous scan:', payload);
        this.lastDetectedPayload = payload;
        this.detectionCooldown = true;
        await this.handleDetectedPayload(payload);

        // Reset cooldown after 3 seconds
        setTimeout(() => {
          this.detectionCooldown = false;
          this.lastDetectedPayload = null;
        }, 3000);
      }
    } catch (error) {
      console.warn('⚠️ Frame scan error:', error);
    }

    // Continue scanning
    this.animationFrameId = requestAnimationFrame(() => this.scanFrame());
  }

  private drawDetectionBox(ctx: CanvasRenderingContext2D, barcode: DetectedBarcode): void {
    const box = barcode.boundingBox;
    const corners = barcode.cornerPoints;

    if (corners && corners.length === 4) {
      // Draw polygon around QR code using corner points
      ctx.strokeStyle = '#FFD700'; // Yellow/gold color like phones
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x, corners[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Add semi-transparent yellow fill
      ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
      ctx.fill();
    } else if (box) {
      // Fallback to bounding box rectangle
      ctx.strokeStyle = '#FFD700'; // Yellow/gold color like phones
      ctx.lineWidth = 4;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
      ctx.fillRect(box.x, box.y, box.width, box.height);
    }
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
