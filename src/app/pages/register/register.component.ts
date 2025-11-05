import { Component, ViewChild, ElementRef, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { DatabaseConnectionService } from '../../services/database-connection.service';
import { ScanResultService } from '../../services/scan-result.service';
import * as QRCode from 'qrcode';

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

  // Form dirty tracking
  isFormDirty = false;
  originalFormData: string = '';

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
  shouldDeletePhoto = false; // Flag to track if photo should be deleted on update
  preferredFacingMode: 'environment' | 'user' = 'environment';
  activeFacingMode: 'environment' | 'user' = 'environment';
  isSwitchingCamera = false;

  // QR Code properties
  qrCodeDataUrl: string | null = null;
  qrCodeValue: string | null = null;
  qrCodeError: string | null = null;
  qrGeneratedAtDisplay: string | null = null;

  // UI state helpers
  isPhotoProcessing = false;
  lastErrorDetails: string | null = null;
  showErrorDetails = false;

  // Dropdown data
  stylists: Array<{ id: number; name: string }> = [];
  services: Array<{ id: number; name: string }> = [];
  isLoadingOptions = false;

  private pendingStylistName: string | null = null;
  private pendingServiceName: string | null = null;

  // Read-only mode for inactive customers
  isReadOnlyMode = false;
  readOnlyStatusLabel: string | null = null;
  readOnlyBannerMessage: string | null = null;

  private readonly inactiveCustomerMessage =
    'This customer profile is inactive. To continue, create a new registration or contact a manager to reactivate the record.';
  private pendingInactiveFromNavigation = false;

  // API URL - must use Bluehost URL (database only accessible from Bluehost server)
  private apiUrl = 'https://website-2eb58030.ich.rqh.mybluehost.me/api.php';

  // Minimum allowed date (yesterday)
  minDate: string = '';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    public dbConnection: DatabaseConnectionService,
    private scanResults: ScanResultService
  ) {}

  // Method to check if user can leave (for navigation guard)
  canDeactivate(): boolean {
    if (this.isFormDirty) {
      return confirm('You have unsaved changes. Are you sure you want to leave?');
    }
    return true;
  }

  ngOnInit() {
    console.log('🚀 RegisterComponent initialized');

    this.loadDropdownData();
    this.consumeScanResultMessage();
    this.initializeReadOnlyFromNavigation();

    // Set minimum date to yesterday (one day in the past)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.minDate = yesterday.toISOString().split('T')[0];
    console.log('📅 Minimum allowed date set to:', this.minDate);

    // Check if we're in edit mode by looking for an ID in the route
    this.route.params.subscribe(params => {
      const id = params['id'];
      console.log('📋 Route params:', params);
      console.log('🆔 Customer ID from route:', id);

      if (id) {
        this.isEditMode = true;
        this.customerId = +id; // Convert to number
        console.log('✏️ Edit mode activated for customer ID:', this.customerId);
        this.lastErrorDetails = null;
        this.showErrorDetails = false;
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

    // Ensure video element is fully cleared
    if (this.videoElement) {
      const video = this.videoElement.nativeElement;
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }
    }

    // Remove beforeunload listener (browser only)
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  // Warn user before leaving page with unsaved changes
  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (this.isFormDirty) {
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return event.returnValue;
    }
    return;
  };

  loadCustomerData(customerId: number) {
    this.isLoadingCustomer = true;
    this.isPhotoProcessing = false;
    this.lastErrorDetails = null;
    this.showErrorDetails = false;
    const url = `${this.apiUrl}?action=get-customer&customerId=${customerId}`;

    console.log('🔍 Loading customer data for ID:', customerId);
    console.log('📡 API URL:', url);

    this.http.get<any>(url).subscribe({
      next: (response) => {
        console.log('✅ Customer data received:', response);
        this.isLoadingCustomer = false;
        this.isPhotoProcessing = false;
        this.lastErrorDetails = null;
        this.showErrorDetails = false;
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
        this.isPhotoProcessing = false;
        this.lastErrorDetails = JSON.stringify(
          {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          },
          null,
          2
        );
        this.showErrorDetails = false;
        this.cdr.detectChanges(); // Force change detection even on error
        this.showToastMessage('Error loading customer data');
      }
    });
  }

  populateCustomerData(data: any) {
    const rawIsActive = data.is_active;
    const isActive =
      rawIsActive === undefined
        ? true
        : rawIsActive === 1 || rawIsActive === '1' || rawIsActive === true;
    const statusLabel = data.status ?? (isActive ? 'active' : 'inactive');
    this.setReadOnlyState(!isActive, statusLabel);

    // Populate basic customer info
    this.customer.firstName = data.first_name || '';
    this.customer.lastName = data.last_name || '';
    this.customer.phone = data.phone || '';
    this.customer.email = data.email || '';
    this.customer.smsConsent = data.sms_consent === 1 || data.sms_consent === true;
    this.customer.emailConsent = data.email_consent === 1 || data.email_consent === true;

    // Populate most recent appointment data if available
    if (data.last_appointment) {
      const appointment = data.last_appointment;
      const stylistName = `${appointment.stylist_first_name || ''} ${appointment.stylist_last_name || ''}`.trim();
      const stylistIdFromResponse = this.normalizeId(appointment.stylist_id);
      const serviceName = appointment.service_name || '';
      const serviceIdFromResponse = this.normalizeId(appointment.service_id);

      const resolvedStylistId =
        stylistIdFromResponse ?? (stylistName ? this.findStylistIdByName(stylistName) : null);
      if (resolvedStylistId !== null) {
        this.customer.stylist = String(resolvedStylistId);
        this.pendingStylistName = null;
      } else {
        this.customer.stylist = '';
        this.pendingStylistName = stylistName || null;
      }

      const resolvedServiceId =
        serviceIdFromResponse ?? (serviceName ? this.findServiceIdByName(serviceName) : null);
      if (resolvedServiceId !== null) {
        this.customer.service = String(resolvedServiceId);
        this.pendingServiceName = null;
      } else {
        this.customer.service = '';
        this.pendingServiceName = serviceName || null;
      }

      this.customer.visitType = appointment.visit_type || 'Return';
      this.customer.notes = appointment.notes || '';
      this.customer.price = appointment.quoted_price || '';

      console.log(
        '📅 Populated appointment - Stylist ID:',
        resolvedStylistId,
        'Service ID:',
        resolvedServiceId,
        'Stylist Name:',
        stylistName,
        'Service Name:',
        serviceName
      );

      // Parse date/time if available
      if (appointment.appointment_datetime || appointment.appointment_date) {
        const datetimeString = appointment.appointment_datetime || `${appointment.appointment_date}T00:00:00`;
        const datetime = new Date(datetimeString);
        if (!Number.isNaN(datetime.getTime())) {
          this.customer.date = datetime.toISOString().split('T')[0];
          this.customer.time = datetime.toTimeString().slice(0, 5);
          console.log('📅 Populated date/time - Date:', this.customer.date, 'Time:', this.customer.time);
        } else {
          this.customer.date = appointment.appointment_date || '';
          this.customer.time = appointment.appointment_time || '';
          console.warn('⚠️ Invalid appointment datetime; using raw values instead');
        }
      } else {
        this.customer.date = '';
        this.customer.time = '';
      }
    } else {
      this.customer.stylist = '';
      this.customer.service = '';
      this.pendingStylistName = null;
      this.pendingServiceName = null;
    }

    // Load profile photo if available
    if (data.profile_photo) {
      this.capturedPhoto = `https://website-2eb58030.ich.rqh.mybluehost.me/${data.profile_photo}`;
      console.log('📸 Profile photo loaded:', data.profile_photo);
    } else {
      // Clear photo if none exists (e.g., after deletion)
      this.capturedPhoto = null;
      console.log('📸 No profile photo found - displaying placeholder');
    }

    console.log('Customer data populated:', this.customer);

    // Store original form data after loading
    this.storeOriginalFormData();

    // Render QR code for this customer if one exists
    if (data.qr_code_value) {
      this.qrCodeValue = data.qr_code_value;
      void this.generateQRCode(data.qr_code_value);
    } else {
      this.qrCodeValue = null;
      this.qrCodeDataUrl = null;
      this.qrCodeError = null;
      this.qrGeneratedAtDisplay = null;
    }

    this.isPhotoProcessing = false;
    this.applyPendingOptionMatches();
  }

  // Store original form data to compare later
  storeOriginalFormData() {
    this.originalFormData = JSON.stringify({
      ...this.customer,
      photo: this.capturedPhoto
    });
    this.isFormDirty = false;
    console.log('📋 Original form data stored');
  }

  // Check if form has been modified
  checkFormDirty() {
    if (this.isReadOnlyMode) {
      this.isFormDirty = false;
      return;
    }

    const currentFormData = JSON.stringify({
      ...this.customer,
      photo: this.capturedPhoto
    });
    this.isFormDirty = currentFormData !== this.originalFormData;
    console.log('🔍 Form dirty check:', this.isFormDirty);
  }

  private applyPendingOptionMatches() {
    let didUpdate = false;

    if (!this.customer.stylist && this.pendingStylistName) {
      const matchId = this.findStylistIdByName(this.pendingStylistName);
      if (matchId !== null) {
        this.customer.stylist = String(matchId);
        this.pendingStylistName = null;
        didUpdate = true;
      }
    }

    if (!this.customer.service && this.pendingServiceName) {
      const matchId = this.findServiceIdByName(this.pendingServiceName);
      if (matchId !== null) {
        this.customer.service = String(matchId);
        this.pendingServiceName = null;
        didUpdate = true;
      }
    }

    if (didUpdate) {
      if (this.originalFormData) {
        this.checkFormDirty();
      }
      this.cdr.detectChanges();
    }
  }

  async onSubmit() {
    if (!this.ensureEditable('form submission')) {
      return;
    }

    this.fieldErrors = {};
    const errors = this.validateForm();

    if (Object.keys(errors).length > 0) {
      this.fieldErrors = errors;
      this.showToastMessage('Please fix the errors in the form.');
      this.triggerFlashAnimation(Object.keys(errors));
      return;
    }

    // Check for duplicate phone numbers (unless in edit mode)
    if (!this.isEditMode) {
      const isDuplicate = await this.checkDuplicatePhone(this.customer.phone);
      if (isDuplicate) {
        this.fieldErrors['phone'] = 'This phone number is already registered';
        this.showToastMessage('Phone number already exists. Please use a different number.');
        this.triggerFlashAnimation(['phone']);
        return;
      }
    }

    if (this.isEditMode && this.customerId) {
      this.updateCustomer();
    } else {
      this.createCustomer();
    }
  }

  createCustomer() {
    if (!this.ensureEditable('create customer')) {
      return;
    }

    console.log('💾 Creating new customer:', this.customer);
    console.log('📸 Captured photo exists?', !!this.capturedPhoto);

    const stylistId = this.normalizeId(this.customer.stylist);
    const serviceId = this.normalizeId(this.customer.service);
    console.log('🎯 Resolved stylist ID:', stylistId, 'service ID:', serviceId);

    // Prepare data for API
    const createData: any = {
      firstName: this.customer.firstName,
      lastName: this.customer.lastName,
      phone: this.customer.phone,
      email: this.customer.email,
      smsConsent: this.customer.smsConsent ? 1 : 0,
      emailConsent: this.customer.emailConsent ? 1 : 0,
      // Appointment data
      date: this.customer.date,
      time: this.customer.time,
      stylist: stylistId,
      service: serviceId,
      visitType: this.customer.visitType,
      notes: this.customer.notes,
      price: this.customer.price
    };

    // Include photo if captured
    if (this.capturedPhoto && this.capturedPhoto.startsWith('data:image')) {
      createData.photo = this.capturedPhoto;
      console.log('📸 Including photo in create request');
    }

    const url = `${this.apiUrl}?action=create-customer`;
    console.log('📡 Sending create request to:', url);

    // Show loading state
    this.isLoadingCustomer = true;
    this.isPhotoProcessing = !!createData.photo;
    this.lastErrorDetails = null;
    this.showErrorDetails = false;

    this.http.post<any>(url, createData).subscribe({
      next: (response) => {
        console.log('✅ Create response:', response);
        this.isLoadingCustomer = false;
        this.isPhotoProcessing = false;

        if (response.success) {
          const customerId = response.data?.customerId;
          console.log('✅ Customer created with ID:', customerId);

          // Generate QR code for the new customer
          if (customerId) {
            this.customerId = customerId;
            const backendQrValue = response.data?.qrCodeValue || null;
            if (backendQrValue) {
              this.qrCodeValue = backendQrValue;
              this.generateQRCode(backendQrValue);
            } else {
              this.qrCodeValue = null;
              this.qrCodeDataUrl = null;
              this.qrCodeError = null;
            }
          }

          this.showToastMessage('Customer Saved Successfully!');
          this.scrollToTop();
          this.lastErrorDetails = null;
          this.showErrorDetails = false;

          // Switch into edit mode and reload the customer so form reflects saved data
          if (customerId) {
            this.isEditMode = true;
            this.customerId = customerId;
            setTimeout(() => {
              this.loadCustomerData(customerId);
            }, 500);
          }
        } else {
          this.showToastMessage('Failed to create customer: ' + response.message);
          console.error('❌ Create failed:', response.message);
          this.lastErrorDetails = JSON.stringify(
            { message: response.message, debug: response.debug ?? null },
            null,
            2
          );
          this.showErrorDetails = false;
        }
      },
      error: (error) => {
        console.error('❌ HTTP Error creating customer:', error);
        this.isLoadingCustomer = false;
        this.isPhotoProcessing = false;
        this.lastErrorDetails = JSON.stringify(
          {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          },
          null,
          2
        );
        this.showErrorDetails = false;
        this.showToastMessage('Error creating customer. Please try again.');
      }
    });
  }

  updateCustomer(qrAction?: 'regenerate' | 'delete') {
    if (!this.ensureEditable('update customer')) {
      return;
    }

    console.log('💾 Updating customer ID:', this.customerId);
    console.log('📋 Current customer data:', this.customer);
    console.log('📸 Captured photo exists?', !!this.capturedPhoto);
    console.log('🗑️ Should delete photo?', this.shouldDeletePhoto);

    const stylistId = this.normalizeId(this.customer.stylist);
    const serviceId = this.normalizeId(this.customer.service);
    console.log('🎯 Resolved stylist ID for update:', stylistId, 'service ID:', serviceId);

    // Prepare data for API
    const updateData: any = {
      customerId: this.customerId,
      firstName: this.customer.firstName,
      lastName: this.customer.lastName,
      phone: this.customer.phone,
      email: this.customer.email,
      smsConsent: this.customer.smsConsent ? 1 : 0,
      emailConsent: this.customer.emailConsent ? 1 : 0,
      // Appointment data
      date: this.customer.date,
      time: this.customer.time,
      stylist: stylistId,
      service: serviceId,
      visitType: this.customer.visitType,
      notes: this.customer.notes,
      price: this.customer.price
    };

    if (qrAction) {
      updateData.qrAction = qrAction;
      console.log('🔄 QR action requested:', qrAction);
    }

    console.log('📅 Appointment data being sent:', {
      date: this.customer.date,
      time: this.customer.time,
      stylistId,
      serviceId
    });

    // Handle photo deletion or upload
    if (this.shouldDeletePhoto) {
      updateData.deletePhoto = true;
      console.log('🗑️ ✅ REQUESTING PHOTO DELETION - deletePhoto flag set to TRUE');
    }
    // Include photo ONLY if it's a new base64 capture (not an existing URL)
    else if (this.capturedPhoto && this.capturedPhoto.startsWith('data:image')) {
      // Only send the base64 string, truncate for logging
      updateData.photo = this.capturedPhoto;
      const photoPreview = this.capturedPhoto.substring(0, 100) + '...';
      console.log('📸 Including NEW photo in update (preview):', photoPreview);
      console.log('📸 Photo length:', this.capturedPhoto.length, 'characters');
    } else if (this.capturedPhoto) {
      console.log('📸 Existing photo (URL), not sending to API:', this.capturedPhoto.substring(0, 100));
    } else {
      console.log('⚠️ No photo to include');
    }

    const url = `${this.apiUrl}?action=update-customer`;
    console.log('📡 Sending update to:', url);
    console.log('📦 Update data:', { ...updateData, photo: updateData.photo ? '[BASE64_DATA]' : undefined });

    // Show loading state
    this.isLoadingCustomer = true;
    this.isPhotoProcessing = !!updateData.photo || this.shouldDeletePhoto || qrAction === 'regenerate';
    this.lastErrorDetails = null;
    this.showErrorDetails = false;

    this.http.post<any>(url, updateData).subscribe({
      next: (response) => {
        console.log('✅ Update response:', response);
        console.log('🔄 Setting isLoadingCustomer to FALSE');
        this.isLoadingCustomer = false;

        if (response.success) {
          // Handle photo deletion result
          if (this.shouldDeletePhoto) {
            this.capturedPhoto = null;
            this.shouldDeletePhoto = false;
            console.log('🗑️ Photo deleted successfully - clearing from UI');
          }

          // Update the captured photo path if a new one was uploaded
          if (response.data?.photoPath) {
            this.capturedPhoto = `https://website-2eb58030.ich.rqh.mybluehost.me/${response.data.photoPath}`;
            this.shouldDeletePhoto = false; // Reset flag if new photo was uploaded
            console.log('📸 Photo updated:', response.data.photoPath);
          }

          console.log('🔄 Triggering change detection');

          // Mark form as clean after successful save
          this.storeOriginalFormData();

          const qrValueFromResponse = response.data?.qrCodeValue ?? null;
          if (qrValueFromResponse) {
            this.qrCodeValue = qrValueFromResponse;
            void this.generateQRCode(qrValueFromResponse);
          } else if (qrAction === 'delete') {
            this.qrCodeValue = null;
            this.qrCodeDataUrl = null;
            this.qrCodeError = null;
            this.qrGeneratedAtDisplay = null;
          }

          let successMessage = this.isEditMode ? 'Customer Updated Successfully!' : 'Customer Saved Successfully!';
          if (qrAction === 'regenerate') {
            successMessage = 'QR Code Regenerated Successfully!';
          } else if (qrAction === 'delete') {
            successMessage = 'QR Code Removed Successfully!';
          }

          console.log('✅ Customer operation completed successfully');
          console.log('🍞 About to show toast:', successMessage);

          this.cdr.detectChanges();
          this.showToastMessage(successMessage);
          this.scrollToTop();
          this.isPhotoProcessing = false;
          this.lastErrorDetails = null;
          this.showErrorDetails = false;

          // Reload customer data to ensure UI is in sync with database
          if (this.isEditMode && this.customerId) {
            console.log('🔄 Reloading customer data after update...');
            setTimeout(() => {
              this.loadCustomerData(this.customerId!);
            }, 500);
          }
        } else {
          this.isPhotoProcessing = false;
          this.lastErrorDetails = JSON.stringify(
            { message: response.message, debug: response.debug ?? null },
            null,
            2
          );
          this.showErrorDetails = false;
          this.cdr.detectChanges();
          this.showToastMessage('Failed to update customer: ' + response.message);
          console.error('❌ Update failed:', response.message);
        }
      },
      error: (error) => {
        console.error('❌ HTTP Error updating customer:', error);
        console.log('🔄 Setting isLoadingCustomer to FALSE (error)');
        this.isLoadingCustomer = false;
        this.isPhotoProcessing = false;
        this.lastErrorDetails = JSON.stringify(
          {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          },
          null,
          2
        );
        this.showErrorDetails = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.showToastMessage('Error updating customer. Please try again.');
        }, 0);
      }
    });
  }

  onClear(skipConfirm: boolean = false) {
    if (!this.ensureEditable('clear form')) {
      return;
    }

    // Warn if there are unsaved changes
    if (!skipConfirm && this.isFormDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to clear the form?')) {
        return;
      }
    }

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
    this.capturedPhoto = null;
    this.photoPreview = null;
    this.qrCodeDataUrl = null;
    this.qrCodeValue = null;
    this.qrCodeError = null;
    this.qrGeneratedAtDisplay = null;
    this.isPhotoProcessing = false;
    this.lastErrorDetails = null;
    this.showErrorDetails = false;
    this.pendingStylistName = null;
    this.pendingServiceName = null;

    // Reset dirty flag
    this.storeOriginalFormData();
  }

  onRevert() {
    if (!this.customerId) {
      this.onClear();
      return;
    }

    if (this.isFormDirty) {
      const confirmed = confirm('Revert all changes and reload the customer from the server?');
      if (!confirmed) {
        return;
      }
    }

    this.isPhotoProcessing = false;
    this.lastErrorDetails = null;
    this.showErrorDetails = false;
    this.loadCustomerData(this.customerId);
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
      errors['date'] = 'Date cannot be more than 1 day in the past';
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
          this.fieldErrors['date'] = 'Date cannot be more than 1 day in the past';
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

      case 'stylist':
        if (!value) {
          this.fieldErrors['stylist'] = 'Please select a stylist';
        } else {
          delete this.fieldErrors['stylist'];
        }
        break;

      case 'service':
        if (!value) {
          this.fieldErrors['service'] = 'Please select a service';
        } else {
          delete this.fieldErrors['service'];
        }
        break;
    }
  }

  private setQrMeta(qrString: string | null): string | null {
    this.qrGeneratedAtDisplay = null;

    if (!qrString) {
      return null;
    }

    try {
      const parsed = typeof qrString === 'string' ? JSON.parse(qrString) : qrString;
      const generatedAt = parsed.generatedAt ?? new Date().toISOString();
      parsed.generatedAt = generatedAt;

      const formatted = new Date(generatedAt);
      this.qrGeneratedAtDisplay = !Number.isNaN(formatted.getTime())
        ? formatted.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })
        : null;

      return JSON.stringify(parsed);
    } catch {
      this.qrGeneratedAtDisplay = null;
      return qrString;
    }
  }

  toggleErrorDetails() {
    this.showErrorDetails = !this.showErrorDetails;
  }

  private scrollToTop() {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  private isAllOnesPhone(phone: string): boolean {
    // Check if phone is all ones (e.g., (111) 111-1111)
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly === '1111111111';
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
    this.customer.phone = formattedValue || value;

    // Force update the input field to prevent extra characters
    event.target.value = this.customer.phone;

    // Trigger change detection
    this.checkFormDirty();
  }

  private isValidDate(date: string): boolean {
    const selectedDate = new Date(date + 'T00:00:00'); // Force midnight local time
    selectedDate.setHours(0, 0, 0, 0);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); // One day in the past
    yesterday.setHours(0, 0, 0, 0);

    console.log('📅 Validating date:', date);
    console.log('📅 Selected date (normalized):', selectedDate.toISOString());
    console.log('📅 Yesterday (normalized):', yesterday.toISOString());
    console.log('📅 Is valid?', selectedDate >= yesterday);

    if (selectedDate < yesterday) {
      console.log('❌ Date validation failed: Date is more than 1 day in the past');
      return false;
    }
    return true;
  }

  private isValidPrice(price: any): boolean {
    const numPrice = parseFloat(price);
    return !isNaN(numPrice) && numPrice > 0;
  }

  private initializeReadOnlyFromNavigation() {
    if (typeof window === 'undefined') {
      return;
    }

    const navState = window.history?.state as { isInactive?: boolean; statusLabel?: string } | undefined;
    if (navState?.isInactive === true) {
      this.pendingInactiveFromNavigation = true;
      this.setReadOnlyState(true, navState.statusLabel ?? 'inactive');
    }
  }

  private setReadOnlyState(isReadOnly: boolean, statusLabel?: string | null) {
    const normalizedLabel = isReadOnly ? statusLabel ?? 'inactive' : null;

    if (
      this.isReadOnlyMode === isReadOnly &&
      (this.readOnlyStatusLabel ?? null) === (normalizedLabel ?? null)
    ) {
      return;
    }

    this.isReadOnlyMode = isReadOnly;
    this.readOnlyStatusLabel = normalizedLabel;
    this.readOnlyBannerMessage = isReadOnly ? this.inactiveCustomerMessage : null;

    if (isReadOnly) {
      this.pendingInactiveFromNavigation = false;
      this.stopCamera();
      this.cameraActive = false;
      this.photoPreview = null;
      this.isFormDirty = false;
      this.fieldErrors = {};
      this.flashingFields.clear();
      this.shouldDeletePhoto = false;
    } else {
      this.pendingInactiveFromNavigation = false;
    }
  }

  private ensureEditable(context: string): boolean {
    if (!this.isReadOnlyMode) {
      return true;
    }

    console.warn(`✋ Action blocked (${context}) - customer record is inactive.`);
    this.showToastMessage(this.inactiveCustomerMessage);
    return false;
  }

  private findStylistIdByName(name: string): number | null {
    const normalized = name.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    const match = this.stylists.find(stylist => stylist.name.toLowerCase() === normalized);
    return match?.id ?? null;
  }

  private findServiceIdByName(name: string): number | null {
    const normalized = name.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    const match = this.services.find(service => service.name.toLowerCase() === normalized);
    return match?.id ?? null;
  }

  private normalizeId(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  private showToastMessage(message: string) {
    console.log('🍞 Showing toast message:', message);
    this.toastMessage = message;
    this.showToast = true;
    this.cdr.detectChanges(); // Force UI update for toast
    console.log('🍞 Toast state - showToast:', this.showToast, 'message:', this.toastMessage);

    setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
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
    if (!this.ensureEditable('camera access')) {
      return;
    }

    this.cameraError = null;

    // Set cameraActive FIRST to render the video element
    this.cameraActive = true;

    // Force Angular to detect changes and render the video element
    this.cdr.detectChanges();

    try {
      // Now request camera access after video element is rendered
      this.stopCamera();
      this.stream = await this.getPreferredCameraStream(this.preferredFacingMode);
      this.preferredFacingMode = this.activeFacingMode;
      // Wait for Angular to render the video element, then start playback
      this.startVideoPlayback();
    } catch (error: any) {
      console.error('Camera access error:', error);
      this.cameraActive = false; // Reset if camera fails
      this.cameraError = 'Unable to access camera. Please check permissions.';
      if (error.name === 'NotAllowedError') {
        this.cameraError = 'Camera access denied. Please allow camera permissions.';
      } else if (error.name === 'NotFoundError') {
        this.cameraError = 'No camera found on this device.';
      }
      this.showToastMessage(this.cameraError);
      this.cdr.detectChanges();
    }
  }

  private consumeScanResultMessage() {
    const scanResult = this.scanResults.consumeResult();

    if (!scanResult) {
      return;
    }

    if (scanResult.status === 'found') {
      const message = scanResult.message || 'Customer loaded from QR scan.';
      this.showToastMessage(message);

      if (scanResult.isInactive) {
        this.setReadOnlyState(true, scanResult.statusLabel ?? 'inactive');
      }

      return;
    }

    if (scanResult.status === 'not-found' && scanResult.message) {
      this.showToastMessage(scanResult.message);
    }
  }

  private async getPreferredCameraStream(preference: 'environment' | 'user'): Promise<MediaStream> {
    const baseVideoSettings: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 }
    };

    const fallbackReasons = new Set(['OverconstrainedError', 'NotFoundError', 'NotReadableError', 'ConstraintNotSatisfiedError']);

    const attemptQueue =
      preference === 'environment'
        ? [
            { constraint: { exact: 'environment' } as MediaTrackConstraints['facingMode'], mode: 'environment' as const },
            { constraint: { ideal: 'environment' } as MediaTrackConstraints['facingMode'], mode: 'environment' as const },
            { constraint: 'user' as MediaTrackConstraints['facingMode'], mode: 'user' as const }
          ]
        : [
            { constraint: { exact: 'user' } as MediaTrackConstraints['facingMode'], mode: 'user' as const },
            { constraint: 'user' as MediaTrackConstraints['facingMode'], mode: 'user' as const },
            { constraint: { ideal: 'environment' } as MediaTrackConstraints['facingMode'], mode: 'environment' as const }
          ];

    let lastError: any = null;

    for (const attempt of attemptQueue) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...baseVideoSettings,
            facingMode: attempt.constraint
          }
        });
        this.activeFacingMode = attempt.mode;
        return stream;
      } catch (error: any) {
        lastError = error;
        if (!error || !fallbackReasons.has(error.name)) {
          throw error;
        }
        console.warn(`Camera constraint for ${attempt.mode} failed, trying next option`, error);
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error('Unable to acquire camera stream');
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

  async toggleCameraFacing() {
    if (!this.ensureEditable('camera switch')) {
      return;
    }

    if (this.isSwitchingCamera) {
      return;
    }

    const previousFacing = this.activeFacingMode;
    const desiredFacing = this.activeFacingMode === 'environment' ? 'user' : 'environment';

    this.isSwitchingCamera = true;
    this.cameraError = null;

    try {
      this.stopCamera();
      this.stream = await this.getPreferredCameraStream(desiredFacing);
      this.preferredFacingMode = this.activeFacingMode;
      this.startVideoPlayback();
      console.log('Camera switched to:', this.activeFacingMode);
    } catch (error) {
      console.error('Error switching camera:', error);
      this.cameraError = 'Unable to switch camera.';
      this.showToastMessage(this.cameraError);
      try {
        this.stream = await this.getPreferredCameraStream(previousFacing);
        this.preferredFacingMode = this.activeFacingMode;
        this.startVideoPlayback();
      } catch (retryError) {
        console.error('Failed to recover previous camera after switch error:', retryError);
        this.closeCamera();
      }
    } finally {
      this.isSwitchingCamera = false;
      this.cdr.detectChanges();
    }
  }

  capturePhoto() {
    if (!this.ensureEditable('photo capture')) {
      return;
    }

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
    if (!this.ensureEditable('photo confirmation')) {
      return;
    }

    console.log('📸 Using captured photo');
    console.log('📸 Photo preview length:', this.photoPreview?.length);
    this.capturedPhoto = this.photoPreview;
    this.shouldDeletePhoto = false; // Reset deletion flag when new photo is captured
    console.log('📸 Captured photo set, length:', this.capturedPhoto?.length);
    this.closeCamera();
    this.showToastMessage('Photo captured successfully!');
    this.checkFormDirty(); // Mark form as dirty when photo changes
    this.cdr.detectChanges(); // Ensure UI updates
  }

  retakePhoto() {
    if (!this.ensureEditable('photo retake')) {
      return;
    }

    this.photoPreview = null;
    // Restart video playback using the same method
    this.startVideoPlayback();
  }

  changePhoto() {
    if (!this.ensureEditable('photo change')) {
      return;
    }

    this.openCamera();
  }

  removePhoto() {
    if (!this.ensureEditable('photo removal')) {
      return;
    }

    console.log('🗑️ Remove photo clicked');
    this.capturedPhoto = null;
    this.photoPreview = null;
    this.photoFileName = null;
    this.shouldDeletePhoto = true; // Flag for deletion on next update
    this.checkFormDirty(); // Mark form as dirty
    console.log('🗑️ Photo marked for deletion');
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
    if (!this.ensureEditable('photo upload')) {
      return;
    }

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
        this.shouldDeletePhoto = false; // Reset deletion flag when new photo is uploaded
        this.showToastMessage('Photo uploaded successfully!');
        this.checkFormDirty(); // Mark form as dirty when photo changes
      };
      reader.readAsDataURL(file);
    }
  }

  // Phone Duplicate Check

  async checkDuplicatePhone(phone: string): Promise<boolean> {
    try {
      const digitsOnly = phone.replace(/\D/g, '');
      const url = `${this.apiUrl}?action=check-duplicate-phone&phone=${encodeURIComponent(digitsOnly)}`;

      console.log('🔍 Checking for duplicate phone:', digitsOnly);
      console.log('🔍 API URL:', url);

      const response = await this.http.get<any>(url).toPromise();
      console.log('🔍 Duplicate check response:', response);

      if (response && response.data && response.data.exists) {
        console.log('❌ Phone number already exists - Customer ID:', response.data.customerId);
        return true;
      }

      console.log('✅ Phone number is unique - proceeding with creation');
      return false;
    } catch (error) {
      console.error('❌ Error checking duplicate phone:', error);
      console.error('❌ Error details:', error);
      // On error, allow the submission to proceed (fail open)
      return false;
    }
  }

  // QR Code Methods

  regenerateQrCode() {
    if (!this.ensureEditable('QR code regenerate')) {
      return;
    }

    if (!this.customerId) {
      this.showToastMessage('Please save the customer before generating a QR code.');
      return;
    }

    if (this.isLoadingCustomer) {
      console.warn('⚠️ Cannot regenerate QR while customer data is loading');
      return;
    }

    console.log('🔄 Regenerating QR code for customer ID:', this.customerId);
    this.updateCustomer('regenerate');
  }

  removeQrCode() {
    if (!this.ensureEditable('QR code removal')) {
      return;
    }

    if (!this.customerId) {
      return;
    }

    const confirmed = confirm('Are you sure you want to remove this customer\'s QR code?');
    if (!confirmed) {
      return;
    }

    console.log('🗑️ Removing QR code for customer ID:', this.customerId);
    this.updateCustomer('delete');
  }

  async generateQRCode(prefilledValue?: string | null) {
    try {
      console.log('🔲 Generating QR code for customer...');

      let qrString = prefilledValue || null;
      if (qrString) {
        console.log('🔲 Using backend-provided QR payload:', qrString);
      } else {
        // Create QR code data with customer information
        const qrData = {
          customerId: this.customerId || 'NEW',
          firstName: this.customer.firstName,
          lastName: this.customer.lastName,
          phone: this.customer.phone,
          email: this.customer.email
        };

        qrString = JSON.stringify(qrData);
        console.log('🔲 QR code data:', qrString);
      }

      const normalized = this.setQrMeta(qrString);
      this.qrCodeValue = normalized ?? qrString;

      // Generate QR code as data URL
      this.qrCodeDataUrl = await QRCode.toDataURL(this.qrCodeValue ?? '', {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      console.log('✅ QR code generated successfully');
      this.qrCodeError = null;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Error generating QR code:', error);
      this.qrCodeError = 'Failed to generate QR code';
      this.qrCodeDataUrl = null;
      this.qrGeneratedAtDisplay = null;
    }
  }

  private loadDropdownData() {
    this.isLoadingOptions = true;
    let pendingRequests = 2;

    const finalize = () => {
      pendingRequests -= 1;
      if (pendingRequests <= 0) {
        this.isLoadingOptions = false;
        this.applyPendingOptionMatches();
        this.cdr.detectChanges();
      }
    };

    this.http.get<any>(`${this.apiUrl}?action=get-stylists`).subscribe({
      next: response => {
        if (response?.success && Array.isArray(response.data)) {
          this.stylists = response.data
            .map((item: any) => ({
              id: Number(item.stylist_id),
              name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown Stylist'
            }))
            .filter((item: any) => !Number.isNaN(item.id));
          this.cdr.detectChanges();
        } else {
          console.warn('⚠️ Failed to load stylists list from API', response);
        }
        finalize();
      },
      error: error => {
        console.error('❌ Error loading stylists:', error);
        finalize();
      }
    });

    this.http.get<any>(`${this.apiUrl}?action=get-services`).subscribe({
      next: response => {
        if (response?.success && Array.isArray(response.data)) {
          this.services = response.data
            .map((item: any) => ({
              id: Number(item.service_id),
              name: item.service_name || 'Unnamed Service'
            }))
            .filter((item: any) => !Number.isNaN(item.id));
          this.cdr.detectChanges();
        } else {
          console.warn('⚠️ Failed to load services list from API', response);
        }
        finalize();
      },
      error: error => {
        console.error('❌ Error loading services:', error);
        finalize();
      }
    });
  }
}
