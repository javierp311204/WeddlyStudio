import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface ToastData {
  title: string;
  message: string;
  type: 'success' | 'error';
  show: boolean;
}

export interface ConfirmData {
  title: string;
  message: string;
  key: string;
  show: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // --- LÓGICA PARA TOASTS (Éxito/Error) ---
  private toastSubject = new BehaviorSubject<ToastData>({ 
    title: '', message: '', type: 'success', show: false 
  });
  toastState$ = this.toastSubject.asObservable();

  // --- LÓGICA PARA CONFIRMACIONES (Sí/No) ---
  private confirmSubject = new BehaviorSubject<ConfirmData>({
    title: '', message: '', key: '', show: false
  });
  confirmState$ = this.confirmSubject.asObservable();
  
  // Resolve para la promesa de confirmación
  private confirmResolver?: (value: boolean) => void;

  // MÉTODOS DE TOAST
  showSuccess(title: string, message: string) {
    this.toastSubject.next({ title, message, type: 'success', show: true });
    this.autoHide();
  }

  showError(title: string, message: string) {
    this.toastSubject.next({ title, message, type: 'error', show: true });
    this.autoHide();
  }

  private autoHide() {
    setTimeout(() => {
      const current = this.toastSubject.value;
      this.toastSubject.next({ ...current, show: false });
    }, 3000);
  }

  // MÉTODOS DE CONFIRMACIÓN
  askConfirmation(title: string, message: string, key: string): Promise<boolean> {
    // Si el usuario marcó "No volver a preguntar" anteriormente, devolvemos 'true' automáticamente
    const isSkipped = localStorage.getItem(`skip_confirm_${key}`);
    if (isSkipped === 'true') {
      return Promise.resolve(true);
    }

    this.confirmSubject.next({ title, message, key, show: true });
    
    // Creamos la promesa que se resolverá cuando el usuario haga clic en un botón
    return new Promise((resolve) => {
      this.confirmResolver = resolve;
    });
  }

  // Se llama desde el botón del HTML (Sí o No)
  respondConfirmation(res: boolean, key: string, dontAskAgain: boolean) {
    // Si acepta y marcó la casilla, guardamos la preferencia
    if (res && dontAskAgain) {
      localStorage.setItem(`skip_confirm_${key}`, 'true');
    }

    // Cerramos el modal
    this.confirmSubject.next({ title: '', message: '', key: '', show: false });
    
    // Devolvemos el resultado al componente que llamó
    if (this.confirmResolver) {
      this.confirmResolver(res);
    }
  }
}