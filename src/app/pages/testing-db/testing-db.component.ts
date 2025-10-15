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
      <h1>testingDB Page</h1>
      <p style="font-size: 24px; color: #333;">hi how ya doing</p>
      <p style="color: #666; margin-top: 20px;">This is the temporary landing page for testing.</p>
      
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
      </div>
    </div>
  `
})
export class TestingDbComponent {
  testResult: string = '';
  apiError: string = '';
  errorDetails: string = '';
  debugInfo: string = '';
  isTesting: boolean = false;
  buttonHover: boolean = false;

  constructor(private http: HttpClient) {}

  async onTestButtonClick() {
    this.isTesting = true;
    this.testResult = '';
    this.apiError = '';
    this.errorDetails = '';
    this.debugInfo = '';
    
    try {
      // Call the PHP backend for database testing
      const response: any = await lastValueFrom(
        this.http.get('https://website-2eb58030.ich.rqh.mybluehost.me/test-db-connection.php', {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
      
      console.log('Full API Response:', response);
      
      if (response.success) {
        this.testResult = `✅ ${response.message} - MySQL Version: ${response.queryResult?.mysql_version} - Current Time: ${response.queryResult?.current_time_value}`;
        if (response.testData && response.testData.length > 0) {
          this.testResult += ` - Found ${response.testData.length} test records`;
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
      console.error('Full error object:', error);
      
      if (error instanceof HttpErrorResponse) {
        this.testResult = '❌ HTTP Error occurred';
        this.apiError = `Status: ${error.status} - ${error.statusText}`;
        this.errorDetails = error.message;
        
        if (error.error) {
          try {
            // Try to parse error response if it's JSON
            const errorObj = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
            this.debugInfo = JSON.stringify(errorObj, null, 2);
          } catch (e) {
            this.debugInfo = error.error;
          }
        }
      } else {
        this.testResult = '❌ Failed to connect to PHP backend';
        this.apiError = error.message || 'Network error occurred';
      }
    } finally {
      this.isTesting = false;
    }
  }
}