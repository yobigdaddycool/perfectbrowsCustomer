import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

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
        </div>
      </div>
    </div>
  `
})
export class TestingDbComponent {
  testResult: string = '';
  apiError: string = '';
  isTesting: boolean = false;
  buttonHover: boolean = false;

  constructor(private http: HttpClient) {}

  async onTestButtonClick() {
    this.isTesting = true;
    this.testResult = '';
    this.apiError = '';
    
    try {
      // Call the PHP backend for database testing
      const response: any = await this.http.get('https://website-2eb58030.ich.rqh.mybluehost.me/test-db-connection-api.php').toPromise();
console.log(response);

      
      if (response.success) {
        this.testResult = `✅ ${response.message} - MySQL Version: ${response.queryResult?.mysql_version}`;
        if (response.testData && response.testData.length > 0) {
          this.testResult += ` - Found ${response.testData.length} test records`;
        }
      } else {
        this.testResult = `❌ ${response.message}`;
        this.apiError = response.error || 'Unknown error occurred';
      }
    } catch (error: any) {
      this.testResult = '❌ Failed to connect to PHP backend';
      this.apiError = error.message || 'Network error occurred';
    } finally {
      this.isTesting = false;
    }
  }
}