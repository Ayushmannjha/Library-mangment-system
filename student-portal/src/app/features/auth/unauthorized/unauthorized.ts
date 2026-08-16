/**
 * unauthorized.ts
 * 403 / Access Denied page component.
 */
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './unauthorized.html',
  styleUrl: './unauthorized.css'
})
export class Unauthorized {
  private authService = inject(AuthService);

  logout() {
    this.authService.logout();
  }
}
