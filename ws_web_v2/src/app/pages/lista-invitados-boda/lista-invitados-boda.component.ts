import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-lista-invitados-boda',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-invitados-boda.component.html',
  styleUrl: './lista-invitados-boda.component.css',
})
export class ListaInvitadosBodaComponent {

  constructor(private router: Router) {}

  goToRegister() {
    this.router.navigate(['/register']);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}