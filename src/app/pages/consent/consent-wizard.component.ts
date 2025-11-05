import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ConsentService, ConsentFormDto } from '../../services/consent.service';
import { ConsentIdentityComponent, IdentityData } from './steps/consent-identity.component';
import { ConsentReviewComponent, ReviewSubmission } from './steps/consent-review.component';
import { ConsentVerifyComponent, VerificationData } from './steps/consent-verify.component';
import { ConsentSuccessComponent, ConsentReceipt } from './steps/consent-success.component';

type ConsentStep = 'identity' | 'review' | 'verify' | 'success';

interface StepMeta {
  id: ConsentStep;
  title: string;
  subtitle: string;
}

interface ConsentSection {
  heading: string;
  body: string;
}

@Component({
  selector: 'app-consent-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ConsentIdentityComponent,
    ConsentReviewComponent,
    ConsentVerifyComponent,
    ConsentSuccessComponent
  ],
  templateUrl: './consent-wizard.component.html',
  styleUrls: ['./consent-wizard.component.css']
})
export class ConsentWizardComponent implements OnInit, OnDestroy {
  private readonly consentService = inject(ConsentService);
  private inactivityTimer: any = null;
  private readonly INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly fallbackForm: ConsentFormDto = {
    consent_form_id: 0,
    title: 'Perfect Brow Services Consent',
    version: '2024-01',
    body: `I acknowledge that I have read, understood, and agree to the following terms and conditions:

No Refund Policy
I understand and agree that all services provided by the salon are non-refundable. While the salon strives to deliver the highest quality of service, no refunds will be issued under any circumstances. If I am dissatisfied with a service, the salon may, at its sole discretion, attempt to rectify the issue.

General Acknowledgment of Risk
I understand that the services offered by the salon, including but not limited to haircuts, makeup, microblading, eyebrow shaping, waxing, threading, facials, and hairstyling, involve certain risks. I voluntarily assume all such risks and agree that the salon and its technicians shall not be liable for any adverse reactions, injuries, or dissatisfaction resulting from any service provided.

Eyelash Extension Services
If availing of eyelash extension services, I specifically agree to the following terms:
a. I acknowledge and understand that there are inherent risks associated with the application and removal of artificial eyelashes. These risks may include, but are not limited to, irritation, discomfort, allergic reactions, swelling, itching, pain, and, in rare cases, infection.
b. I understand that eyelash extensions will be applied to my natural eyelashes as determined by the technician to maintain the health, growth, and natural appearance of my eyelashes. Excessive weight on natural lashes will be avoided to prevent damage.
c. I acknowledge that despite proper application and removal procedures, adhesive materials used in the process may become dislodged during or after the procedure, potentially causing irritation or requiring additional follow-up care.
d. I agree to follow all aftercare instructions provided by the technician. I understand that failure to adhere to these instructions may result in the premature shedding of the extensions, potential irritation, or damage to my natural eyelashes.
e. I understand that the eyelash extension procedure requires me to keep my eyes closed for a period of approximately 60 to 100 minutes while lying in a reclined position. I acknowledge that if I have any medical conditions that could be aggravated by remaining still for an extended period, I may be unable to undergo the procedure.
f. If I experience any adverse reactions, irritation, or complications following the procedure, I agree to immediately contact my technician for removal and, if necessary, consult a physician at my own expense.

Duration of Agreement
This agreement shall remain in effect for all procedures performed by my technician for one (1) year from the date of signing.

Age Requirement
I affirm that I am at least 18 years of age. If I am under the age of 18 but at least 13 years old, I understand that a parent or legal guardian must also sign this form. Services will not be provided to individuals under the age of 13.

Release of Liability
I hereby release and hold harmless the salon, its owners, employees, and contractors from any and all liability, claims, damages, or expenses arising out of or in connection with any services rendered. I assume full responsibility for any risks, known or unknown, associated with the services I receive.

Consent to Treatment
By signing below, I acknowledge that I have read and fully understand this agreement. I voluntarily agree to undergo the requested services and accept all terms and conditions outlined herein.`,
    is_active: 1
  };

  steps: StepMeta[] = [
    { id: 'identity', title: 'Identity', subtitle: 'Tell us who you are' },
    { id: 'review', title: 'Review Terms', subtitle: 'Read required consent language' },
    { id: 'verify', title: 'Email Code', subtitle: 'Confirm your contact details' },
    { id: 'success', title: 'Finished', subtitle: 'You are all set' }
  ];

  currentStepIndex = 0;

  identityData: IdentityData | null = null;
  verificationData: VerificationData | null = null;
  reviewSubmission: ReviewSubmission | null = null;

  consentForm: ConsentFormDto | null = null;
  reviewLeadText: string | null = null;
  consentSections: ConsentSection[] = [];
  isLoadingForm = false;
  loadFormError: string | null = null;

  receiptPreview: ConsentReceipt = {
    customerName: '',
    stepsCompletedAt: new Date().toISOString(),
    consentVersion: '—',
    verificationChannel: null
  };

  ngOnInit(): void {
    this.fetchConsentForm();
    this.resetInactivityTimer();
  }

  ngOnDestroy(): void {
    this.clearInactivityTimer();
  }

  resetInactivityTimer(): void {
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      if (this.currentStepIndex < this.steps.length - 1) {
        // Only reset if not on success page
        this.restart();
      }
    }, this.INACTIVITY_TIMEOUT);
  }

  clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  get currentStep(): ConsentStep {
    return this.steps[this.currentStepIndex]?.id ?? 'identity';
  }

  handleIdentityContinue(data: IdentityData) {
    this.identityData = data;
    this.receiptPreview.customerName = `${data.firstName} ${data.lastName}`.trim();
    this.receiptPreview.verificationChannel = data.email || data.phone;
    this.resetInactivityTimer();
    this.goToNextStep();
  }

  handleReviewContinue(submission: ReviewSubmission) {
    this.reviewSubmission = submission;
    this.receiptPreview.signatureName = submission.signatureText;
    this.resetInactivityTimer();
    this.goToNextStep();
  }

  handleVerificationContinue(data: VerificationData) {
    this.verificationData = data;
    this.receiptPreview.stepsCompletedAt = new Date().toISOString();
    this.resetInactivityTimer();
    this.goToNextStep();
  }

  handleResendRequested() {
    // Placeholder for resend cooldown handling (API wiring in later pass)
    this.resetInactivityTimer();
  }

  restart() {
    this.currentStepIndex = 0;
    this.identityData = null;
    this.verificationData = null;
    this.reviewSubmission = null;
    this.receiptPreview = {
      customerName: '',
      stepsCompletedAt: new Date().toISOString(),
      consentVersion: this.consentForm?.version ?? '—',
      verificationChannel: null,
      signatureName: undefined
    };
  }

  goToNextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex += 1;
    }
  }

  goToPreviousStep() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex -= 1;
      this.resetInactivityTimer();
    }
  }

  fetchConsentForm() {
    this.isLoadingForm = true;
    this.loadFormError = null;

    this.consentService.loadActiveConsentForm().subscribe({
      next: form => {
        this.applyConsentForm(form);
      },
      error: error => {
        console.error('Failed to load consent form', error);
        this.loadFormError =
          (error instanceof Error ? error.message : null) ||
          'Consent form could not be loaded from the server. Showing latest available copy.';
        this.applyConsentForm(this.fallbackForm);
      }
    });
  }

  private applyConsentForm(form: ConsentFormDto) {
    this.consentForm = form;
    const { lead, sections } = this.parseConsentBody(form.body ?? '');
    this.reviewLeadText = lead || null;
    this.consentSections = sections;
    this.receiptPreview.consentVersion = form.version || '—';
    this.isLoadingForm = false;
  }

  private parseConsentBody(body: string): { lead: string; sections: ConsentSection[] } {
    const normalized = body.replace(/\r\n/g, '\n').trim();
    if (!normalized) {
      return { lead: '', sections: [] };
    }

    const blocks = normalized
      .split(/\n{2,}/)
      .map(block => block.trim())
      .filter(Boolean);

    if (!blocks.length) {
      return { lead: '', sections: [] };
    }

    const [firstBlock, ...sectionBlocks] = blocks;
    if (!sectionBlocks.length) {
      return {
        lead: '',
        sections: [
          {
            heading: 'Consent Terms',
            body: firstBlock
          }
        ]
      };
    }

    const sections = sectionBlocks
      .map(block => {
        const lines = block.split('\n');
        const heading = lines.shift()?.trim() ?? '';
        const text = lines.join('\n').trim();
        return {
          heading,
          body: text
        };
      })
      .filter(section => section.heading || section.body);

    return {
      lead: firstBlock,
      sections
    };
  }
}
