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

        <div *ngIf="testData.length > 0" style="margin-top: 20px; padding: 15px; border-radius: 6px; background-color: #e2e3e5; border: 1px solid #d6d8db;">
          <h3 style="margin-top: 0; color: #383d41;">Test Data ({{ testData.length }} records):</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">ID</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Name</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Email</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of testData" style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px;">{{ item.id }}</td>
                <td style="padding: 8px;">{{ item.name }}</td>
                <td style="padding: 8px;">{{ item.email }}</td>
              </tr>
            </tbody>
          </table>
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
      this.testData = [];
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
}