import { Component } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-testing-db',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h1>testingDB Page - Centralized API</h1>
      <p style="font-size: 24px; color: #333;">hi how ya doing</p>
      <p style="color: #666; margin-top: 20px;">This page uses the centralized API endpoint.</p>
      
      <div style="margin-top: 30px;">
        <button 
          (click)="onTestButtonClick()" 
          [disabled]="isTesting"
          style="
            padding: 12px 24px;
            font-size: 16px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.3s;
          "
          (mouseover)="buttonHover = true"
          (mouseleave)="buttonHover = false"
          [style.background-color]="buttonHover ? '#0056b3' : isTesting ? '#6c757d' : '#007bff'"
          [style.cursor]="isTesting ? 'not-allowed' : 'pointer'"
        >
          {{ isTesting ? 'Testing...' : 'Test Database Connection' }}
        </button>
        
        <button 
          (click)="onGetTestDataClick()" 
          [disabled]="isTesting"
          style="
            padding: 12px 24px;
            font-size: 16px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            margin-left: 10px;
            transition: background-color 0.3s;
          "
          [style.background-color]="isTesting ? '#6c757d' : '#28a745'"
          [style.cursor]="isTesting ? 'not-allowed' : 'pointer'"
        >
          {{ isTesting ? 'Loading...' : 'Get Test Data' }}
        </button>
        
        <div *ngIf="testResult" style="margin-top: 20px; padding: 15px; border-radius: 6px; background-color: #f8f9fa; border: 1px solid #dee2e6;">
          <h3 style="margin-top: 0; color: #495057;">Test Result:</h3>
          <p style="color: #6c757d; margin: 0;">{{ testResult }}</p>
        </div>
        
        <div *ngIf="apiError" style="margin-top: 20px; padding: 15px; border-radius: 6px; background-color: #f8d7da; border: 1px solid #f5c6cb;">
          <h3 style="margin-top: 0; color: #721c24;">API Error:</h3>
          <p style="color: #721c24; margin: 0;">{{ apiError }}</p>
          <p *ngIf="errorDetails" style="color: #721c24; margin: 5px 0 0 0; font-size: 12px;">Details: {{ errorDetails }}</p>
        </div>

        <div *ngIf="debugInfo" style="margin-top: 20px; padding: 15px; border-radius: 6px; background-color: #d1ecf1; border: 1px solid #bee5eb;">
          <h3 style="margin-top: 0; color: #0c5460;">Debug Info:</h3>
          <pre style="color: #0c5460; margin: 0; text-align: left; font-size: 12px; white-space: pre-wrap;">{{ debugInfo }}</pre>
        </div>

        <!-- Test Data Table -->
        <div *ngIf="testData.length > 0" style="margin-top: 30px;">
          <h3 style="color: #495057;">Test Data Table ({{ testData.length }} records)</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <thead>
                <tr style="background-color: #007bff; color: white;">
                  <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #0056b3;">ID</th>
                  <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #0056b3;">Name</th>
                  <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #0056b3;">Email</th>
                  <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #0056b3;">Created At</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of testData; let i = index" 
                    [style.background-color]="i % 2 === 0 ? '#f8f9fa' : 'white'"
                    style="transition: background-color 0.2s;">
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">
                    {{ item.id }}
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dee2e6; color: #495057;">
                    {{ item.name }}
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dee2e6; color: #495057;">
                    {{ item.email }}
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
                    {{ formatDate(item.created_at) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Summary -->
          <div style="margin-top: 15px; text-align: left; padding: 10px 15px; background-color: #e9ecef; border-radius: 4px;">
            <p style="margin: 0; color: #495057; font-size: 14px;">
              <strong>Total Records:</strong> {{ testData.length }} 
              <span style="margin-left: 20px;"><strong>Latest:</strong> {{ getLatestRecordDate() }}</span>
            </p>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="hasTestDataLoaded && testData.length === 0" style="margin-top: 20px; padding: 20px; border-radius: 6px; background-color: #fff3cd; border: 1px solid #ffeaa7;">
          <h3 style="margin-top: 0; color: #856404;">No Test Data Found</h3>
          <p style="color: #856404; margin: 0;">The test_data table exists but contains no records.</p>
        </div>
      </div>
    </div>
  `
})
export class TestingDbComponent {
  testResult: string = '';
  apiError: string = '';
  errorDetails: string = '';
  debugInfo: string = '';
  testData: any[] = [];
  hasTestDataLoaded: boolean = false;
  isTesting: boolean = false;
  buttonHover: boolean = false;

  constructor(private http: HttpClient) {}

  async callApi(action: string) {
    this.isTesting = true;
    this.testResult = '';
    this.apiError = '';
    this.errorDetails = '';
    this.debugInfo = '';
    
    if (action === 'get-test-data') {
      this.hasTestDataLoaded = true;
    }
    
    try {
      // Call the centralized API endpoint
      const url = `https://website-2eb58030.ich.rqh.mybluehost.me/api.php?action=${action}&t=${Date.now()}`;
      const response: any = await lastValueFrom(
        this.http.get(url, { responseType: 'json' })
      );
      
      console.log('API Response:', response);
      
      if (response.success) {
        this.testResult = `✅ ${response.message}`;
        
        if (action === 'test-connection' && response.data?.queryResult) {
          const result = response.data.queryResult;
          this.testResult += ` - MySQL Version: ${result.mysql_version} - Current Time: ${result.current_time_value}`;
        }
        
        if (action === 'get-test-data' && response.data?.testData) {
          this.testData = response.data.testData;
          this.testResult += ` - Found ${this.testData.length} test records`;
        }
        
        if (response.debug) {
          this.debugInfo = JSON.stringify(response.debug, null, 2);
        }
      } else {
        this.testResult = `❌ ${response.message}`;
        this.apiError = response.error || 'Unknown error occurred';
        if (response.debug) {
          this.debugInfo = JSON.stringify(response.debug, null, 2);
        }
      }
    } catch (error: any) {
      console.error('API Error:', error);
      
      if (error instanceof HttpErrorResponse) {
        this.testResult = '❌ HTTP Error occurred';
        this.apiError = `Status: ${error.status} - ${error.statusText}`;
        this.errorDetails = error.message;
        
        if (error.error) {
          try {
            const errorObj = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
            this.debugInfo = JSON.stringify(errorObj, null, 2);
          } catch (e) {
            this.debugInfo = error.error;
          }
        }
      } else {
        this.testResult = '❌ Failed to connect to API';
        this.apiError = error.message || 'Network error occurred';
      }
    } finally {
      this.isTesting = false;
    }
  }

  async onTestButtonClick() {
    await this.callApi('test-connection');
  }

  async onGetTestDataClick() {
    await this.callApi('get-test-data');
  }

  // Format date for better display
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  }

  // Get the latest record date for summary
  getLatestRecordDate(): string {
    if (this.testData.length === 0) return 'N/A';
    
    const latestRecord = this.testData[0]; // Assuming data is sorted by created_at DESC
    return this.formatDate(latestRecord.created_at);
  }
}