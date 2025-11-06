import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConsentService, CustomerMatch } from '../../../services/consent.service';

export interface IdentityData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  selectedCustomerId?: number | null;
}

@Component({
  selector: 'app-consent-identity',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consent-identity.component.html',
  styleUrls: ['./consent-identity.component.css']
})
export class ConsentIdentityComponent {
  private consentService = inject(ConsentService);

  @Input() initialData: IdentityData | null = null;
  @Output() continue = new EventEmitter<IdentityData>();

  form: IdentityData = {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    selectedCustomerId: null
  };

  emailError = '';
  customerMatches: CustomerMatch[] = [];
  showMatchCards = false;
  isLoadingMatches = false;

  ngOnInit() {
    if (this.initialData) {
      this.form = { ...this.initialData };
    }
  }

  handleContinue() {
    // If user already selected a match or confirmed "proceed as new", emit immediately
    if (this.form.selectedCustomerId !== null || this.showMatchCards) {
      this.continue.emit({ ...this.form });
      return;
    }

    // Call API to find customer matches
    this.isLoadingMatches = true;

    this.consentService.findCustomerMatches(
      this.form.firstName,
      this.form.lastName,
      this.form.phone
    ).subscribe({
      next: (matches) => {
        this.isLoadingMatches = false;
        this.customerMatches = matches;

        // Filter to only suggested matches (not exact, since exact will auto-link later)
        const suggestedMatches = matches.filter(m => m.match_type === 'suggested');

        if (suggestedMatches.length > 0) {
          // Show "Is this you?" cards
          this.showMatchCards = true;
        } else {
          // No matches or only exact match - proceed directly
          this.continue.emit({ ...this.form });
        }
      },
      error: (err) => {
        this.isLoadingMatches = false;
        console.error('Failed to find customer matches:', err);
        // Proceed anyway on error
        this.continue.emit({ ...this.form });
      }
    });
  }

  selectMatch(customerId: number) {
    this.form.selectedCustomerId = customerId;
    this.continue.emit({ ...this.form });
  }

  proceedAsNew() {
    this.form.selectedCustomerId = null;
    this.continue.emit({ ...this.form });
  }

  formatPhoneNumber(event: any) {
    // Get the input value and remove all non-numeric characters
    let value = event.target.value.replace(/\D/g, '');

    // Strictly limit to 10 digits
    if (value.length > 10) {
      value = value.slice(0, 10);
    }

    // Format the phone number
    let formattedValue = '';
    if (value.length > 0) {
      formattedValue = '(' + value.substring(0, 3);
      if (value.length >= 4) {
        formattedValue += ') ' + value.substring(3, 6);
      }
      if (value.length >= 7) {
        formattedValue += '-' + value.substring(6, 10);
      }
    }

    // Update the model and input field with formatted value
    this.form.phone = formattedValue || value;

    // Force update the input field to prevent extra characters
    event.target.value = this.form.phone;
  }

  validateEmail() {
    if (this.form.email && !this.isValidEmail(this.form.email)) {
      this.emailError = 'Please enter a valid email address';
    } else {
      this.emailError = '';
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
