import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  @Output() back = new EventEmitter<void>();
  @Output() continue = new EventEmitter<ReviewSubmission>();

  expandedSections = new Set<number>();
  acknowledgedTerms = false;
  signatureText = '';
  confirmUpdates = true;

  ngOnChanges() {
    if (this.sections.length && this.expandedSections.size === 0) {
      this.sections.forEach((_, idx) => this.expandedSections.add(idx));
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

  get canContinue(): boolean {
    return this.acknowledgedTerms && this.signatureText.trim().length >= 2;
  }

  handleContinue() {
    if (!this.canContinue) {
      return;
    }

    this.continue.emit({
      signatureText: this.signatureText.trim(),
      confirmUpdates: this.enableContactUpdatePrompt ? this.confirmUpdates : true,
      acknowledged: this.acknowledgedTerms
    });
  }
}
