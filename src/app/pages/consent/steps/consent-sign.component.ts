import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface SignatureData {
  signatureText: string;
  confirmUpdates: boolean;
}

@Component({
  selector: 'app-consent-sign',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consent-sign.component.html',
  styleUrls: ['./consent-sign.component.css']
})
export class ConsentSignComponent {
  @Input() customerName = '';
  @Input() allowContactUpdatePrompt = true;
  @Output() back = new EventEmitter<void>();
  @Output() submitSignature = new EventEmitter<SignatureData>();

  signature = '';
  confirmUpdates = true;

  get canSubmit(): boolean {
    return this.signature.trim().length >= 2;
  }

  handleSubmit() {
    if (!this.canSubmit) {
      return;
    }

    this.submitSignature.emit({
      signatureText: this.signature.trim(),
      confirmUpdates: this.confirmUpdates
    });
  }
}
