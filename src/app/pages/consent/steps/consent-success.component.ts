import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface ConsentReceipt {
  customerName: string;
  stepsCompletedAt: string;
  consentVersion: string;
  verificationChannel: string | null;
  signatureName?: string;
}

@Component({
  selector: 'app-consent-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './consent-success.component.html',
  styleUrls: ['./consent-success.component.css']
})
export class ConsentSuccessComponent {
  @Input() receipt: ConsentReceipt | null = null;
  @Output() startOver = new EventEmitter<void>();
}
