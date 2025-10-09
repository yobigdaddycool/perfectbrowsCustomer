import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  customer = {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    stylist: '',
    visitType: 'New',
    service: '',
    notes: '',
    date: '',
    time: '',
    price: '',
    smsConsent: false,
    emailConsent: false
  };

  showToast = false;
  toastMessage = '';
  fieldErrors: { [key: string]: string } = {};
  flashingFields: Set<string> = new Set();

  onSubmit() {
    this.fieldErrors = {};
    const errors = this.validateForm();
    
    if (Object.keys(errors).length > 0) {
      this.fieldErrors = errors;
      this.showToastMessage('Please fix the errors in the form.');
      this.triggerFlashAnimation(Object.keys(errors));
      return;
    }

    console.log('Customer Data:', this.customer);
    this.showToastMessage('Customer saved successfully!');
  }

  onClear() {
    this.customer = {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      stylist: '',
      visitType: 'New',
      service: '',
      notes: '',
      date: '',
      time: '',
      price: '',
      smsConsent: false,
      emailConsent: false
    };
    this.fieldErrors = {};
    this.flashingFields.clear();
  }

  validateForm(): { [key: string]: string } {
    const errors: { [key: string]: string } = {};

    if (!this.customer.firstName?.trim()) {
      errors['firstName'] = 'First name is required';
    } else if (this.customer.firstName.length < 2) {
      errors['firstName'] = 'First name must be at least 2 characters';
    }

    if (!this.customer.lastName?.trim()) {
      errors['lastName'] = 'Last name is required';
    } else if (this.customer.lastName.length < 2) {
      errors['lastName'] = 'Last name must be at least 2 characters';
    }

    if (!this.customer.stylist) {
      errors['stylist'] = 'Please select a stylist';
    }

    if (!this.customer.service) {
      errors['service'] = 'Please select a service';
    }

    if (this.customer.email && !this.isValidEmail(this.customer.email)) {
      errors['email'] = 'Please enter a valid email address';
    }

    if (this.customer.phone && !this.isValidPhone(this.customer.phone)) {
      errors['phone'] = 'Please enter a valid phone number';
    }

    if (this.customer.date && !this.isValidDate(this.customer.date)) {
      errors['date'] = 'Please enter a valid date';
    }

    if (this.customer.price && !this.isValidPrice(this.customer.price)) {
      errors['price'] = 'Please enter a valid price (e.g., 29.99)';
    }

    if (this.customer.notes && this.customer.notes.length > 500) {
      errors['notes'] = 'Notes cannot exceed 500 characters';
    }

    return errors;
  }

  triggerFlashAnimation(fieldNames: string[]) {
    this.flashingFields.clear();
    fieldNames.forEach(field => this.flashingFields.add(field));
    setTimeout(() => {
      this.flashingFields.clear();
    }, 4500);
  }

  isFlashing(fieldName: string): boolean {
    return this.flashingFields.has(fieldName);
  }

  validateField(fieldName: string, value: any) {
    switch (fieldName) {
      case 'firstName':
        if (!value?.trim()) {
          this.fieldErrors['firstName'] = 'First name is required';
        } else if (value.length < 2) {
          this.fieldErrors['firstName'] = 'First name must be at least 2 characters';
        } else {
          delete this.fieldErrors['firstName'];
        }
        break;

      case 'lastName':
        if (!value?.trim()) {
          this.fieldErrors['lastName'] = 'Last name is required';
        } else if (value.length < 2) {
          this.fieldErrors['lastName'] = 'Last name must be at least 2 characters';
        } else {
          delete this.fieldErrors['lastName'];
        }
        break;

      case 'email':
        if (value && !this.isValidEmail(value)) {
          this.fieldErrors['email'] = 'Please enter a valid email address';
        } else {
          delete this.fieldErrors['email'];
        }
        break;

      case 'phone':
        if (value && !this.isValidPhone(value)) {
          this.fieldErrors['phone'] = 'Please enter a valid phone number';
        } else {
          delete this.fieldErrors['phone'];
        }
        break;

      case 'price':
        if (value && !this.isValidPrice(value)) {
          this.fieldErrors['price'] = 'Please enter a valid price';
        } else {
          delete this.fieldErrors['price'];
        }
        break;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  private isValidDate(date: string): boolean {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }

  private isValidPrice(price: any): boolean {
    const numPrice = parseFloat(price);
    return !isNaN(numPrice) && numPrice > 0;
  }

  private showToastMessage(message: string) {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  hasErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0;
  }

hideToast() {
  this.showToast = false;
  }
}