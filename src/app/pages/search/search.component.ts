import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DatabaseConnectionService } from '../../services/database-connection.service';

interface SearchFilters {
  firstName: string;
  lastName: string;
  phone: string;
  dateFrom: string;
  dateTo: string;
  serviceId: string;
  visitTypeId: string;
}

interface CustomerResult {
  customer_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  profile_photo: string | null;
  last_visit: string | null;
  next_appointment: string | null;
  next_appointment_stylist: string | null;
  total_visits: number;
}

interface Stylist {
  stylist_id: number;
  first_name: string;
  last_name: string;
}

interface Service {
  service_id: number;
  service_name: string;
}

interface VisitType {
  visit_type_id: number;
  type_name: string;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {
  // Search filters
  filters: SearchFilters = {
    firstName: '',
    lastName: '',
    phone: '',
    dateFrom: '',
    dateTo: '',
    serviceId: '',
    visitTypeId: ''
  };

  // Results - using signals for reactive updates
  searchResults = signal<CustomerResult[]>([]);
  filteredResults = signal<CustomerResult[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);
  searchError = signal<string | null>(null);

  // Pagination - using signals
  currentPage = signal(1);
  itemsPerPage = 10;
  totalPages = signal(1);
  paginatedResults = signal<CustomerResult[]>([]);

  // Sorting
  sortBy: 'name' | 'last_visit' | 'next_appointment' = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';

  // Dropdown data
  services: Service[] = [];
  visitTypes: VisitType[] = [];

  // API URL
  private apiUrl = 'https://website-2eb58030.ich.rqh.mybluehost.me/api.php';

  constructor(
    private http: HttpClient,
    private router: Router,
    public dbConnection: DatabaseConnectionService
  ) {}

  ngOnInit() {
    this.loadDropdownData();
  }

  loadDropdownData() {
    // Load services
    this.http.get<any>(`${this.apiUrl}?action=get-services`).subscribe({
      next: (response) => {
        if (response.success) {
          this.services = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading services:', error);
      }
    });

    // Load visit types
    this.http.get<any>(`${this.apiUrl}?action=get-visit-types`).subscribe({
      next: (response) => {
        if (response.success) {
          this.visitTypes = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading visit types:', error);
      }
    });
  }

  onSearch() {
    console.log('🔍 === SEARCH BUTTON CLICKED ===');
    console.log('📋 Current filters:', this.filters);

    // Validate at least one field is filled
    if (!this.filters.firstName && !this.filters.lastName && !this.filters.phone &&
        !this.filters.dateFrom && !this.filters.dateTo && !this.filters.serviceId && !this.filters.visitTypeId) {
      console.log('❌ Validation failed: No search criteria provided');
      this.searchError.set('Please enter at least one search criteria');
      return;
    }

    console.log('✅ Validation passed');
    this.isSearching.set(true);
    this.searchError.set(null);
    this.hasSearched.set(true);
    console.log('🔄 isSearching set to TRUE');

    // Build query parameters
    const params = new URLSearchParams();
    params.append('action', 'search-customers');

    if (this.filters.firstName) params.append('firstName', this.filters.firstName);
    if (this.filters.lastName) params.append('lastName', this.filters.lastName);
    if (this.filters.phone) params.append('phone', this.filters.phone);
    if (this.filters.dateFrom) params.append('dateFrom', this.filters.dateFrom);
    if (this.filters.dateTo) params.append('dateTo', this.filters.dateTo);
    if (this.filters.serviceId) params.append('serviceId', this.filters.serviceId);
    if (this.filters.visitTypeId) params.append('visitTypeId', this.filters.visitTypeId);

    const fullUrl = `${this.apiUrl}?${params.toString()}`;
    console.log('🌐 Full API URL:', fullUrl);
    console.log('📤 Calling API...');

    // Call API
    this.http.get<any>(fullUrl).subscribe({
      next: (response) => {
        console.log('📥 API Response received:', response);
        this.isSearching.set(false);
        console.log('🔄 isSearching set to FALSE');

        if (response.success) {
          console.log('✅ Success! Found', response.data?.length || 0, 'results');
          this.searchResults.set(response.data || []);
          this.filteredResults.set([...response.data || []]);
          console.log('📊 Results stored:', this.searchResults());
          this.applySorting();
          this.updatePagination();
          console.log('✅ Search completed successfully');
        } else {
          console.log('❌ API returned failure:', response.message);
          this.searchError.set(response.message || 'Search failed');
          this.searchResults.set([]);
          this.filteredResults.set([]);
          this.updatePagination();
        }
      },
      error: (error) => {
        console.log('❌ HTTP ERROR occurred:', error);
        console.log('Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error
        });
        this.isSearching.set(false);
        console.log('🔄 isSearching set to FALSE (error)');
        this.searchError.set('Error connecting to server. Please try again.');
        this.searchResults.set([]);
        this.filteredResults.set([]);
        this.updatePagination();
      }
    });

    console.log('⏳ Waiting for API response...');
  }

  onClear() {
    this.filters = {
      firstName: '',
      lastName: '',
      phone: '',
      dateFrom: '',
      dateTo: '',
      serviceId: '',
      visitTypeId: ''
    };
    this.searchResults.set([]);
    this.filteredResults.set([]);
    this.hasSearched.set(false);
    this.searchError.set(null);
    this.currentPage.set(1);
    this.updatePagination();
  }

  onSortChange() {
    this.applySorting();
    this.currentPage.set(1);
    this.updatePagination();
  }

  applySorting() {
    const sorted = [...this.filteredResults()].sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy) {
        case 'name':
          const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
          const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        case 'last_visit':
          const dateA = a.last_visit ? new Date(a.last_visit).getTime() : 0;
          const dateB = b.last_visit ? new Date(b.last_visit).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'next_appointment':
          const nextA = a.next_appointment ? new Date(a.next_appointment).getTime() : 0;
          const nextB = b.next_appointment ? new Date(b.next_appointment).getTime() : 0;
          comparison = nextA - nextB;
          break;
      }

      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
    this.filteredResults.set(sorted);
  }

  updatePagination() {
    const total = Math.ceil(this.filteredResults().length / this.itemsPerPage);
    this.totalPages.set(total === 0 ? 1 : total);

    if (this.currentPage() > this.totalPages()) {
      this.currentPage.set(this.totalPages());
    }

    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedResults.set(this.filteredResults().slice(startIndex, endIndex));
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.updatePagination();
    }
  }

  nextPage() {
    this.goToPage(this.currentPage() + 1);
  }

  prevPage() {
    this.goToPage(this.currentPage() - 1);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    let startPage = Math.max(1, this.currentPage() - 2);
    let endPage = Math.min(this.totalPages(), startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatPhone(phone: string): string {
    // Format phone for display
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  }

  getPhotoUrl(photoPath: string | null): string {
    if (!photoPath) {
      return 'assets/default-avatar.svg';
    }
    return `https://website-2eb58030.ich.rqh.mybluehost.me/${photoPath}`;
  }

  openCustomer(customerId: number) {
    console.log('📂 Opening customer in edit mode:', customerId);
    this.router.navigate(['/register', customerId]);
  }
}
