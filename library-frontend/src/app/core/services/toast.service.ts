import { Injectable, signal } from '@angular/core';

// Toast message ka interface
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  // Angular 17+ Signals ka use kar rahe hain state manage karne ke liye
  // Yeh ek reactive array hai jo toasts ko hold karega
  toasts = signal<ToastMessage[]>([]);

  constructor() {}

  /**
   * Success toast dikhane ke liye
   * @param message Success message text
   */
  showSuccess(message: string): void {
    this.addToast('success', message);
  }

  /**
   * Error toast dikhane ke liye
   * @param message Error message text
   */
  showError(message: string): void {
    this.addToast('error', message);
  }

  /**
   * Toast ko array mein add karta hai aur 3 seconds baad hata deta hai
   */
  private addToast(type: 'success' | 'error' | 'info' | 'warning', message: string): void {
    const id = Math.random().toString(36).substring(2, 9);
    
    // Naya toast array mein add karte hain (immutability rule follow karke)
    this.toasts.update(currentToasts => [...currentToasts, { id, type, message }]);

    // 3 seconds baad toast ko automatically remove karte hain
    setTimeout(() => {
      this.removeToast(id);
    }, 3000);
  }

  /**
   * Specific toast ko id ke basis par remove karne ke liye
   */
  removeToast(id: string): void {
    this.toasts.update(currentToasts => currentToasts.filter(t => t.id !== id));
  }
}
