import { Injectable } from '@angular/core';

export type ScanResultStatus = 'found' | 'not-found' | 'error';

export interface ScanResultPayload {
  status: ScanResultStatus;
  message: string;
  customerId?: number;
  rawPayload?: string;
  statusLabel?: string;
  isInactive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ScanResultService {
  private pendingResult: ScanResultPayload | null = null;

  setResult(result: ScanResultPayload | null): void {
    this.pendingResult = result;
  }

  consumeResult(): ScanResultPayload | null {
    const result = this.pendingResult;
    this.pendingResult = null;
    return result;
  }

  peekResult(): ScanResultPayload | null {
    return this.pendingResult;
  }

  clear(): void {
    this.pendingResult = null;
  }
}
