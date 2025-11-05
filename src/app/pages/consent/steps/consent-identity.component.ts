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
}
