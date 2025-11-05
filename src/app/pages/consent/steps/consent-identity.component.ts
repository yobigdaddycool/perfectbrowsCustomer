import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface IdentityData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

@Component({
  selector: 'app-consent-identity',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consent-identity.component.html',
  styleUrls: ['./consent-identity.component.css']
})
export class ConsentIdentityComponent {
  @Input() initialData: IdentityData | null = null;
  @Output() continue = new EventEmitter<IdentityData>();

  form: IdentityData = {
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  };

  ngOnInit() {
    if (this.initialData) {
      this.form = { ...this.initialData };
    }
  }

  handleContinue() {
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
}
