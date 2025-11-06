import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

export interface ConsentFormDto {
  consent_form_id: number;
  title: string;
  version: string;
  body: string;
  effective_date?: string | null;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface ConsentFormResponse {
  success: boolean;
  message: string;
  data?: {
    form?: ConsentFormDto;
  } | null;
  error?: string | null;
}

export interface CustomerMatch {
  customer_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  match_type: 'exact' | 'suggested';
}

export interface CustomerMatchResponse {
  success: boolean;
  message: string;
  data?: {
    matches: CustomerMatch[];
    has_exact_match: boolean;
    has_suggested_matches: boolean;
  } | null;
  error?: string | null;
  debug?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ConsentService {
  // Use api.php for consent form (still on old endpoint)
  private readonly apiUrl = 'https://website-2eb58030.ich.rqh.mybluehost.me/api.php';
  // Use consent-api.php for consent workflow endpoints
  private readonly consentApiUrl = 'https://website-2eb58030.ich.rqh.mybluehost.me/consent-api.php';

  constructor(private readonly http: HttpClient) {}

  loadActiveConsentForm(): Observable<ConsentFormDto> {
    const url = `${this.apiUrl}?action=get-consent-form`;

    return this.http.get<ConsentFormResponse>(url).pipe(
      map(response => {
        if (!response.success || !response.data?.form) {
          const message = response.message || response.error || 'Failed to load consent form';
          throw new Error(message);
        }
        return response.data.form;
      })
    );
  }

  findCustomerMatches(firstName: string, lastName: string, phone: string): Observable<CustomerMatch[]> {
    const url = `${this.consentApiUrl}?action=find-customer-matches`;

    return this.http.post<CustomerMatchResponse>(url, {
      first_name: firstName,
      last_name: lastName,
      phone: phone
    }).pipe(
      map(response => {
        if (!response.success) {
          console.warn('Customer match search failed:', response.message);
          return [];
        }
        return response.data?.matches || [];
      })
    );
  }
}
