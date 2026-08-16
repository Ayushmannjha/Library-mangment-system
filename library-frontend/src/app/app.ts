import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastService } from './core/services/toast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('library-frontend');
  
  // ToastService ko inject kar rahe hain taaki HTML template mein use kar sakein
  public toastService = inject(ToastService);
}
