import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface VerificationData {
  code: string;
  resendRequested?: boolean;
}

@Component({
  selector: 'app-consent-verify',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consent-verify.component.html',
  styleUrls: ['./consent-verify.component.css']
})
export class ConsentVerifyComponent {
  @Input() deliveryChannel: string | null = null;
  @Input() countdownText = 'Ready to resend';
  @Output() back = new EventEmitter<void>();
  @Output() continue = new EventEmitter<VerificationData>();
  @Output() resend = new EventEmitter<void>();

  code = '';

  handleSubmit() {
    this.continue.emit({ code: this.code });
  }

  handleResend() {
    this.resend.emit();
  }
}
