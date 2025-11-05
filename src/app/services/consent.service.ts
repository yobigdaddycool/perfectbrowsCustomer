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

@Injectable({
  providedIn: 'root'
})
export class ConsentService {
  private readonly apiUrl = 'https://website-2eb58030.ich.rqh.mybluehost.me/api.php';

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
}
