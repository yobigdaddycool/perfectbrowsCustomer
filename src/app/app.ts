import { Component, signal, inject, effect } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('customer-camera-site');
  private router = inject(Router);

  // Signal to track if register route is active
  isRegisterActive = signal(false);

  constructor() {
    // Update the signal whenever navigation completes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const url = this.router.url;
        const active = url === '/' || url.startsWith('/register');
        this.isRegisterActive.set(active);
        console.log('🔗 Navigation changed - URL:', url, 'Register active:', active);
      });

    // Set initial state
    const url = this.router.url;
    this.isRegisterActive.set(url === '/' || url.startsWith('/register'));
  }
}
