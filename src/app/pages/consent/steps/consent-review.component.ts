import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ConsentSection {
  heading: string;
  body: string;
}

export interface ReviewSubmission {
  signatureText: string;
  confirmUpdates: boolean;
  acknowledged: boolean;
}

@Component({
  selector: 'app-consent-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consent-review.component.html',
  styleUrls: ['./consent-review.component.css']
})
export class ConsentReviewComponent {
  @Input() sections: ConsentSection[] = [];
  @Input() isExpanded = true;
  @Input() leadText: string | null = null;
  @Input() enableContactUpdatePrompt = true;
  @Input() signatureHint: string | null = null;
  @Input() expectedSignature: string | null = null;
  @Input() expectedFirstName = '';
  @Input() expectedLastName = '';
  @Input() initialReviewData: ReviewSubmission | null = null;
  @Output() back = new EventEmitter<void>();
  @Output() continue = new EventEmitter<ReviewSubmission>();

  expandedSections = new Set<number>();
  acknowledgedTerms = false;
  signatureText = '';
  confirmUpdates = false;
  showAckError = false;
  showSignatureError = false;

  ngOnChanges(changes: SimpleChanges) {
    if (this.sections.length && this.expandedSections.size === 0) {
      this.sections.forEach((_, idx) => this.expandedSections.add(idx));
    }

    // Restore previous data when navigating back
    if (changes['initialReviewData'] && this.initialReviewData) {
      this.signatureText = this.initialReviewData.signatureText;
      this.acknowledgedTerms = this.initialReviewData.acknowledged;
      this.confirmUpdates = this.initialReviewData.confirmUpdates;
    }
  }

  toggleSection(index: number) {
    if (this.expandedSections.has(index)) {
      this.expandedSections.delete(index);
    } else {
      this.expandedSections.add(index);
    }
  }

  isSectionExpanded(index: number): boolean {
    return this.expandedSections.has(index);
  }

  handleContinue() {
    // Validation is now handled by the isContinueEnabled getter
    // This method will only be called when button is enabled (form is valid)
    this.continue.emit({
      signatureText: this.signatureText.trim(),
      confirmUpdates: this.enableContactUpdatePrompt ? this.confirmUpdates : true,
      acknowledged: this.acknowledgedTerms
    });
  }

  onAcknowledgedChange() {
    if (this.showAckError && this.acknowledgedTerms) {
      this.showAckError = false;
    }
  }

  onSignatureInput(value: string) {
    this.signatureText = value;
  }

  get isSignatureValid(): boolean {
    const expectedFullName = `${this.expectedFirstName.trim()} ${this.expectedLastName.trim()}`;
    return this.signatureText.trim() === expectedFullName;
  }

  get isContinueEnabled(): boolean {
    const baseValidation = this.acknowledgedTerms && this.isSignatureValid;

    // If contact update prompt is enabled, that checkbox must also be checked
    if (this.enableContactUpdatePrompt) {
      return baseValidation && this.confirmUpdates;
    }

    return baseValidation;
  }
}
