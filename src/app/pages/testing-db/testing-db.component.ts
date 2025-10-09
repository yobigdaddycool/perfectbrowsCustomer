import { Component } from '@angular/core';

@Component({
  selector: 'app-testing-db',
  standalone: true,
  template: `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h1>testingDB Page</h1>
      <p style="font-size: 24px; color: #333;">hi how ya doing</p>
      <p style="color: #666; margin-top: 20px;">This is the temporary landing page for testing.</p>
    </div>
  `
})
export class TestingDbComponent {
  // Simple component with just the message
}