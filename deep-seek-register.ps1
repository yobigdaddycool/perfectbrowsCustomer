# complete-register-update.ps1
# This script updates ALL register component files with full validation

Write-Host "Starting complete register component update..." -ForegroundColor Cyan

# 1. Update TypeScript file
$tsFilePath = "src\app\pages\register\register.component.ts"
$tsContent = @'
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

  onSubmit() {
    this.fieldErrors = {};
    const errors = this.validateForm();
    
    if (Object.keys(errors).length > 0) {
      this.fieldErrors = errors;
      this.showToastMessage('Please fix the errors in the form.');
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
}
'@

if (Test-Path $tsFilePath) {
    $backupPath = "$tsFilePath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $tsFilePath $backupPath
    Write-Host "TypeScript backup created: $backupPath" -ForegroundColor Yellow
    $tsContent | Out-File -FilePath $tsFilePath -Encoding utf8
    Write-Host "register.component.ts UPDATED with full validation!" -ForegroundColor Green
} else {
    Write-Host "TypeScript file not found: $tsFilePath" -ForegroundColor Red
}

# 2. Update HTML file
$htmlFilePath = "src\app\pages\register\register.component.html"
$htmlContent = @'
<div class="wrap">
  <div class="card" role="region" aria-label="Customer Intake">
    <div class="header">
      <div class="brand">
        <div class="logo" aria-hidden="true"></div>
        <h1>Salon Customer Manager</h1>
      </div>
      <div class="badges">
        <span class="chip">Landing — Register</span>
        <span class="chip">Angular App</span>
        <span class="chip">Magenta Theme</span>
      </div>
    </div>

    <form class="content" #customerForm="ngForm" (ngSubmit)="onSubmit()">
      <div class="grid">
        <div class="col">
          <div class="row">
            <div class="field">
              <label for="firstName" class="req">First Name</label>
              <input id="firstName" type="text" [(ngModel)]="customer.firstName" name="firstName" 
                     placeholder="e.g., Amy" required 
                     (blur)="validateField('firstName', customer.firstName)"
                     [class.error]="fieldErrors['firstName']" />
              <div class="error-message" *ngIf="fieldErrors['firstName']">
                {{ fieldErrors['firstName'] }}
              </div>
            </div>
            <div class="field">
              <label for="lastName" class="req">Last Name</label>
              <input id="lastName" type="text" [(ngModel)]="customer.lastName" name="lastName" 
                     placeholder="e.g., David" required 
                     (blur)="validateField('lastName', customer.lastName)"
                     [class.error]="fieldErrors['lastName']" />
              <div class="error-message" *ngIf="fieldErrors['lastName']">
                {{ fieldErrors['lastName'] }}
              </div>
            </div>
          </div>

          <div class="row">
            <div class="field">
              <label for="phone">Phone</label>
              <input id="phone" type="tel" [(ngModel)]="customer.phone" name="phone" 
                     placeholder="(555) 123‑4567" 
                     (blur)="validateField('phone', customer.phone)"
                     [class.error]="fieldErrors['phone']" />
              <div class="error-message" *ngIf="fieldErrors['phone']">
                {{ fieldErrors['phone'] }}
              </div>
            </div>
            <div class="field">
              <label for="email">Email</label>
              <input id="email" type="email" [(ngModel)]="customer.email" name="email" 
                     placeholder="name@example.com" 
                     (blur)="validateField('email', customer.email)"
                     [class.error]="fieldErrors['email']" />
              <div class="error-message" *ngIf="fieldErrors['email']">
                {{ fieldErrors['email'] }}
              </div>
            </div>
          </div>

          <div class="row">
            <div class="field">
              <label for="stylist" class="req">Stylist</label>
              <select id="stylist" [(ngModel)]="customer.stylist" name="stylist" required
                      [class.error]="fieldErrors['stylist']">
                <option value="" selected disabled>Select stylist…</option>
                <option>Any Available</option>
                <option>Anna</option>
                <option>Layla</option>
                <option>Maria</option>
                <option>Nora</option>
              </select>
              <div class="error-message" *ngIf="fieldErrors['stylist']">
                {{ fieldErrors['stylist'] }}
              </div>
            </div>
            <div class="field">
              <label for="visitType">Visit Type</label>
              <select id="visitType" [(ngModel)]="customer.visitType" name="visitType">
                <option>New</option>
                <option>Returning</option>
                <option>Walk‑in</option>
              </select>
            </div>
          </div>

          <div class="field">
            <label for="service" class="req">Service</label>
            <select id="service" [(ngModel)]="customer.service" name="service" required
                    [class.error]="fieldErrors['service']">
              <option value="" selected disabled>Select a service…</option>
              <option>Threading</option>
              <option>Waxing</option>
              <option>Tinting</option>
              <option>Lashes</option>
              <option>Facial</option>
            </select>
            <div class="error-message" *ngIf="fieldErrors['service']">
              {{ fieldErrors['service'] }}
            </div>
          </div>

          <div class="field">
            <label for="notes">Notes</label>
            <textarea id="notes" [(ngModel)]="customer.notes" name="notes" 
                      placeholder="Allergies, preferences, reference look, etc."
                      [class.error]="fieldErrors['notes']"></textarea>
            <div class="help">
              {{ customer.notes?.length || 0 }}/500 characters
              <span *ngIf="fieldErrors['notes']" class="error-message"> - {{ fieldErrors['notes'] }}</span>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="field">
            <label>Customer Photo</label>
            <div class="photo-box">
              <div>
                <div><strong>Camera placeholder</strong></div>
                <div class="help">In Angular we'll add live camera + capture here.</div>
              </div>
            </div>
            <div class="row" style="margin-top:10px">
              <button type="button" class="btn btn-outline" disabled>Open Camera</button>
              <button type="button" class="btn btn-outline" disabled>Upload Photo</button>
            </div>
          </div>

          <div class="row">
            <div class="field">
              <label for="date">Date</label>
              <input id="date" type="date" [(ngModel)]="customer.date" name="date" 
                     [class.error]="fieldErrors['date']" />
              <div class="error-message" *ngIf="fieldErrors['date']">
                {{ fieldErrors['date'] }}
              </div>
            </div>
            <div class="field">
              <label for="time">Time</label>
              <input id="time" type="time" [(ngModel)]="customer.time" name="time" />
            </div>
          </div>

          <div class="field">
            <label for="price">Quoted Price</label>
            <input id="price" type="number" [(ngModel)]="customer.price" name="price" 
                   inputmode="decimal" placeholder="e.g., 29.99" step="0.01"
                   (blur)="validateField('price', customer.price)"
                   [class.error]="fieldErrors['price']" />
            <div class="error-message" *ngIf="fieldErrors['price']">
              {{ fieldErrors['price'] }}
            </div>
          </div>

          <div class="field">
            <label>Consent</label>
            <div class="row" style="gap:8px">
              <label style="display:flex;align-items:center;gap:8px">
                <input type="checkbox" [(ngModel)]="customer.smsConsent" name="smsConsent" /> SMS reminders
              </label>
              <label style="display:flex;align-items:center;gap:8px">
                <input type="checkbox" [(ngModel)]="customer.emailConsent" name="emailConsent" /> Email updates
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="actions">
        <button type="button" class="btn btn-outline" (click)="onClear()">Clear</button>
        <button type="submit" class="btn btn-primary">Save Customer</button>
      </div>
      <p class="subtle">Angular Application • Full form validation enabled</p>
    </form>
  </div>
</div>

<div class="toast" [class.show]="showToast" role="status" aria-live="polite">{{ toastMessage }}</div>
'@

if (Test-Path $htmlFilePath) {
    $backupPath = "$htmlFilePath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $htmlFilePath $backupPath
    Write-Host "HTML backup created: $backupPath" -ForegroundColor Yellow
    $htmlContent | Out-File -FilePath $htmlFilePath -Encoding utf8
    Write-Host "register.component.html UPDATED with validation display!" -ForegroundColor Green
} else {
    Write-Host "HTML file not found: $htmlFilePath" -ForegroundColor Red
}

# 3. Update CSS file
$cssFilePath = "src\app\pages\register\register.component.css"
$cssContent = @'
:root {
  --brand: #d946ef;
  --brand-bg: #F9E0E6;
  --ink: #1f2937;
  --ink-2: #374151;
  --muted: #6b7280;
  --line: #e5e7eb;
  --card: #ffffff;
  --ok: #16a34a;
  --warn: #f59e0b;
  --err: #ef4444;
  --radius: 16px;
}

* {
  box-sizing: border-box;
}

.wrap {
  min-height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 16px;
  background: var(--brand-bg);
}

.card {
  width: 100%;
  max-width: 980px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: 0 10px 25px rgba(17, 24, 39, .08);
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  background: linear-gradient(180deg, rgba(217, 70, 239, .12), rgba(217, 70, 239, 0));
  border-bottom: 1px solid var(--line);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--brand);
  box-shadow: 0 6px 16px rgba(217, 70, 239, .4) inset, 0 2px 8px rgba(0, 0, 0, .08);
}

.brand h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.1;
  letter-spacing: .2px;
  color: var(--ink);
}

.badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  color: var(--muted);
  background: #fff;
}

.content {
  padding: 22px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

@media (min-width: 860px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-size: 13px;
  color: var(--ink-2);
  font-weight: 600;
  letter-spacing: .2px;
}

input, select, textarea {
  appearance: none;
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink);
  font-size: 14px;
  outline: none;
  transition: border .15s, box-shadow .15s;
}

textarea {
  min-height: 110px;
  resize: vertical;
}

input:focus, select:focus, textarea:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 4px rgba(217, 70, 239, .15);
}

/* Error states */
input.error, select.error, textarea.error {
  border-color: var(--err);
  box-shadow: 0 0 0 4px rgba(239, 68, 68, .15);
}

input.error:focus, select.error:focus, textarea.error:focus {
  border-color: var(--err);
  box-shadow: 0 0 0 4px rgba(239, 68, 68, .25);
}

.error-message {
  color: var(--err);
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
}

.row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.row > * {
  flex: 1 1 auto;
}

.photo-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 180px;
  border: 2px dashed var(--line);
  border-radius: 16px;
  color: var(--muted);
  background: #fafafa;
  text-align: center;
  padding: 10px;
}

.help {
  font-size: 12px;
  color: var(--muted);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 18px;
  border-top: 1px dashed var(--line);
  padding-top: 18px;
}

.btn {
  appearance: none;
  border: 1px solid transparent;
  background: #fff;
  color: var(--ink);
  padding: 12px 16px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: transform .1s ease, box-shadow .15s, border-color .15s;
}

.btn:active {
  transform: translateY(1px);
}

.btn-outline {
  border-color: var(--line);
}

.btn-primary {
  background: var(--brand);
  color: #fff;
  box-shadow: 0 8px 18px rgba(217, 70, 239, .35);
}

.btn-primary:hover {
  filter: brightness(1.02);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.req::after {
  content: " *";
  color: var(--err);
}

.toast {
  position: fixed;
  right: 12px;
  bottom: 12px;
  background: #111827;
  color: #fff;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 14px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(8px);
  transition: opacity .25s, transform .25s;
  z-index: 1000;
}

.toast.show {
  opacity: 1;
  transform: translateY(0);
}

.subtle {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
  text-align: center;
  padding: 10px 0 0 0;
}

/* Character counter */
.help .error-message {
  display: inline;
  margin-left: 4px;
}
'@

if (Test-Path $cssFilePath) {
    $backupPath = "$cssFilePath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $cssFilePath $backupPath
    Write-Host "CSS backup created: $backupPath" -ForegroundColor Yellow
    $cssContent | Out-File -FilePath $cssFilePath -Encoding utf8
    Write-Host "register.component.css UPDATED with validation styles!" -ForegroundColor Green
} else {
    Write-Host "CSS file not found: $cssFilePath" -ForegroundColor Red
}

Write-Host ""
Write-Host "COMPLETE! All register component files updated successfully!" -ForegroundColor Cyan
Write-Host "Backups created with timestamps" -ForegroundColor Yellow
Write-Host "Full validation implemented: Required fields, email, phone, date, price validation" -ForegroundColor Green
Write-Host "Run 'ng serve' to see the updated form!" -ForegroundColor Magenta
