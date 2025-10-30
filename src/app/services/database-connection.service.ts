import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval } from 'rxjs';

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

@Injectable({
  providedIn: 'root'
})
export class DatabaseConnectionService {
  // Signal to track connection status
  connectionStatus = signal<ConnectionStatus>('checking');

  // API endpoint URL - must use Bluehost URL (database only accessible from Bluehost server)
  private apiUrl = 'https://website-2eb58030.ich.rqh.mybluehost.me/api.php';

  // Check interval in milliseconds (5 seconds)
  private checkInterval = 5000;

  constructor(private http: HttpClient) {
    this.startMonitoring();
  }

  private startMonitoring() {
    // Initial check
    this.checkConnection();

    // Set up periodic checks every 5 seconds
    interval(this.checkInterval).subscribe(() => {
      this.checkConnection();
    });
  }

  private checkConnection() {
    // Call the PHP API with action=test-connection and cache-busting timestamp
    const url = `${this.apiUrl}?action=test-connection&t=${Date.now()}`;

    this.http.get<any>(url, { responseType: 'json' }).subscribe({
      next: (response) => {
        if (response.success) {
          this.connectionStatus.set('connected');
        } else {
          this.connectionStatus.set('disconnected');
        }
      },
      error: (error) => {
        console.error('Database connection check failed:', error);
        this.connectionStatus.set('disconnected');
      }
    });
  }

  // Method to manually trigger a check
  checkNow() {
    this.checkConnection();
  }
}
