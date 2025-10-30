import { Component, ViewChild, ElementRef, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { DatabaseConnectionService } from '../../services/database-connection.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // Edit mode properties
  isEditMode = false;
  customerId: number | null = null;
  isLoadingCustomer = false;

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

  // Camera properties
  cameraActive = false;
  photoPreview: string | null = null;
  capturedPhoto: string | null = null;
  stream: MediaStream | null = null;
  cameraError: string | null = null;
  photoFileName: string | null = null;

  // API URL
  private apiUrl = 'https://website-2eb58030.ich.rqh.mybluehost.me/api.php';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    public dbConnection: DatabaseConnectionService
  ) {}

  ngOnInit() {
    console.log('🚀 RegisterComponent initialized');

    // Check if we're in edit mode by looking for an ID in the route
    this.route.params.subscribe(params => {
      const id = params['id'];
      console.log('📋 Route params:', params);
      console.log('🆔 Customer ID from route:', id);

      if (id) {
        this.isEditMode = true;
        this.customerId = +id; // Convert to number
        console.log('✏️ Edit mode activated for customer ID:', this.customerId);
        this.loadCustomerData(this.customerId);

        // Safety timeout - if loading takes more than 10 seconds, show form anyway
        setTimeout(() => {
          if (this.isLoadingCustomer) {
            console.warn('⚠️ Loading timeout - forcing form to show');
            this.isLoadingCustomer = false;
            this.showToastMessage('Loading took too long. Please check connection.');
          }
        }, 10000);
      } else {
        console.log('➕ New customer mode');
      }
    });
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  loadCustomerData(customerId: number) {
    this.isLoadingCustomer = true;
    const url = `${this.apiUrl}?action=get-customer&customerId=${customerId}`;

    console.log('🔍 Loading customer data for ID:', customerId);
    console.log('📡 API URL:', url);

    this.http.get<any>(url).subscribe({
      next: (response) => {
        console.log('✅ Customer data received:', response);
        this.isLoadingCustomer = false;
        this.cdr.detectChanges(); // Force change detection for zoneless mode

        if (response.success && response.data) {
          console.log('📝 Populating form with customer data...');
          this.populateCustomerData(response.data);
          this.cdr.detectChanges(); // Force UI update after populating data
        } else {
          console.error('❌ Failed to load customer:', response.message);
          this.showToastMessage('Failed to load customer data: ' + response.message);
        }
      },
      error: (error) => {
        console.error('❌ HTTP Error loading customer:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        this.isLoadingCustomer = false;
        this.cdr.detectChanges(); // Force change detection even on error
        this.showToastMessage('Error loading customer data');
      }
    });
  }

  populateCustomerData(data: any) {
    // Populate basic customer info
    this.customer.firstName = data.first_name || '';
    this.customer.lastName = data.last_name || '';
    this.customer.phone = data.phone || '';
    this.customer.email = data.email || '';
    this.customer.smsConsent = data.sms_consent === 1 || data.sms_consent === true;
    this.customer.emailConsent = data.email_consent === 1 || data.email_consent === true;

    // Populate most recent appointment data if available
    if (data.last_appointment) {
      this.customer.stylist = data.last_appointment.stylist_id || '';
      this.customer.service = data.last_appointment.service_id || '';
      this.customer.visitType = data.last_appointment.visit_type || 'Return';
      this.customer.notes = data.last_appointment.notes || '';
      this.customer.price = data.last_appointment.quoted_price || '';

      // Parse date/time if available
      if (data.last_appointment.appointment_datetime) {
        const datetime = new Date(data.last_appointment.appointment_datetime);
        this.customer.date = datetime.toISOString().split('T')[0];
        this.customer.time = datetime.toTimeString().slice(0, 5);
      }
    }

    // Load profile photo if available
    if (data.profile_photo) {
      this.capturedPhoto = `https://website-2eb58030.ich.rqh.mybluehost.me/${data.profile_photo}`;
    }

    console.log('Customer data populated:', this.customer);
  }

  onSubmit() {
    this.fieldErrors = {};
    const errors = this.validateForm();

    if (Object.keys(errors).length > 0) {
      this.fieldErrors = errors;
      this.showToastMessage('Please fix the errors in the form.');
      this.triggerFlashAnimation(Object.keys(errors));
      return;
    }

    if (this.isEditMode && this.customerId) {
      this.updateCustomer();
    } else {
      this.createCustomer();
    }
  }

  createCustomer() {
    // TODO: Implement API call to create customer
    console.log('Creating new customer:', this.customer);
    this.showToastMessage('Customer saved successfully!');
  }

  updateCustomer() {
    console.log('💾 Updating customer ID:', this.customerId);
    console.log('📋 Current customer data:', this.customer);
    console.log('📸 Captured photo exists?', !!this.capturedPhoto);

    // Prepare data for API
    const updateData: any = {
      customerId: this.customerId,
      firstName: this.customer.firstName,
      lastName: this.customer.lastName,
      phone: this.customer.phone,
      email: this.customer.email,
      smsConsent: this.customer.smsConsent ? 1 : 0,
      emailConsent: this.customer.emailConsent ? 1 : 0
    };

    // Include photo if it was captured/changed
    if (this.capturedPhoto) {
      // Only send the base64 string, truncate for logging
      updateData.photo = this.capturedPhoto;
      const photoPreview = this.capturedPhoto.substring(0, 100) + '...';
      console.log('📸 Including photo in update (preview):', photoPreview);
      console.log('📸 Photo length:', this.capturedPhoto.length, 'characters');
    } else {
      console.log('⚠️ No photo to include');
    }

    const url = `${this.apiUrl}?action=update-customer`;
    console.log('📡 Sending update to:', url);
    console.log('📦 Update data:', { ...updateData, photo: updateData.photo ? '[BASE64_DATA]' : undefined });

    // Show loading state
    const originalButtonText = 'Update Customer';
    this.isLoadingCustomer = true;

    this.http.post<any>(url, updateData).subscribe({
      next: (response) => {
        console.log('✅ Update response:', response);
        this.isLoadingCustomer = false;
        this.cdr.detectChanges();

        if (response.success) {
          this.showToastMessage('Customer updated successfully!');
          console.log('✅ Customer updated successfully');

          // Update the captured photo path if a new one was uploaded
          if (response.data?.photoPath) {
            this.capturedPhoto = `https://website-2eb58030.ich.rqh.mybluehost.me/${response.data.photoPath}`;
            console.log('📸 Photo updated:', response.data.photoPath);
          }
        } else {
          this.showToastMessage('Failed to update customer: ' + response.message);
          console.error('❌ Update failed:', response.message);
        }
      },
      error: (error) => {
        console.error('❌ HTTP Error updating customer:', error);
        this.isLoadingCustomer = false;
        this.cdr.detectChanges();
        this.showToastMessage('Error updating customer. Please try again.');
      }
    });
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

    if (!this.customer.phone?.trim()) {
      errors['phone'] = 'Phone number is required';
    } else if (!this.isValidPhone(this.customer.phone)) {
      errors['phone'] = 'Please enter a valid phone number';
    }

    if (!this.customer.date?.trim()) {
      errors['date'] = 'Date is required';
    } else if (!this.isValidDate(this.customer.date)) {
      errors['date'] = 'Please enter a valid date';
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
        if (!value?.trim()) {
          this.fieldErrors['phone'] = 'Phone number is required';
        } else if (!this.isValidPhone(value)) {
          this.fieldErrors['phone'] = 'Please enter a valid phone number';
        } else {
          delete this.fieldErrors['phone'];
        }
        break;

      case 'date':
        if (!value?.trim()) {
          this.fieldErrors['date'] = 'Date is required';
        } else if (!this.isValidDate(value)) {
          this.fieldErrors['date'] = 'Please enter a valid date';
        } else {
          delete this.fieldErrors['date'];
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

  // Camera Methods

  async openCamera() {
    this.cameraError = null;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      this.cameraActive = true;

      // Force Angular to detect changes and render the video element
      this.cdr.detectChanges();

      // Wait for Angular to render the video element, then start playback
      this.startVideoPlayback();

    } catch (error: any) {
      console.error('Camera access error:', error);
      this.cameraError = 'Unable to access camera. Please check permissions.';
      if (error.name === 'NotAllowedError') {
        this.cameraError = 'Camera access denied. Please allow camera permissions.';
      } else if (error.name === 'NotFoundError') {
        this.cameraError = 'No camera found on this device.';
      }
      this.showToastMessage(this.cameraError);
    }
  }

  private startVideoPlayback(retryCount = 0) {
    // Try to start video playback, retry if element not ready yet
    setTimeout(() => {
      if (this.videoElement && this.stream) {
        const video = this.videoElement.nativeElement;
        video.srcObject = this.stream;
        video.play().catch(err => {
          console.error('Error playing video:', err);
          // Retry once more if play fails
          if (retryCount < 1) {
            this.startVideoPlayback(retryCount + 1);
          }
        });
      } else if (retryCount < 5) {
        // Video element not ready yet, retry up to 5 times
        this.startVideoPlayback(retryCount + 1);
      } else {
        console.error('Video element not available after retries');
        this.cameraError = 'Failed to initialize camera display';
        this.showToastMessage(this.cameraError);
      }
    }, 100);
  }

  capturePhoto() {
    if (!this.videoElement || !this.canvasElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get base64 image
      this.photoPreview = canvas.toDataURL('image/jpeg', 0.8);
    }
  }

  usePhoto() {
    this.capturedPhoto = this.photoPreview;
    this.closeCamera();
    this.showToastMessage('Photo captured successfully!');
  }

  retakePhoto() {
    this.photoPreview = null;
    // Restart video playback using the same method
    this.startVideoPlayback();
  }

  changePhoto() {
    this.openCamera();
  }

  removePhoto() {
    this.capturedPhoto = null;
    this.photoPreview = null;
    this.photoFileName = null;
  }

  closeCamera() {
    this.stopCamera();
    this.cameraActive = false;
    this.photoPreview = null;
  }

  private stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.showToastMessage('Please select a valid image file.');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showToastMessage('Image size must be less than 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.capturedPhoto = e.target.result;
        this.photoFileName = file.name;
        this.showToastMessage('Photo uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  }
}