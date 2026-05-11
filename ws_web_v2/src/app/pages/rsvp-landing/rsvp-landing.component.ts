import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../services/seo/seo.service';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-rsvp-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './rsvp-landing.component.html',
  styleUrls: ['./rsvp-landing.component.css'],
})
export class RsvpLandingComponent implements OnInit {

  openFaq: number | null = null;

  readonly faqs: FaqItem[] = [
    {
      question: '¿Es gratis el módulo de RSVP?',
      answer: 'Sí. Weddly Studio ofrece el módulo de gestión de invitados y confirmaciones en el plan Free para que puedas empezar a usarlo sin costo y captar reservas desde hoy.',
    },
    {
      question: '¿Pueden los invitados añadir acompañantes?',
      answer: 'Sí. Tus invitados pueden indicar acompañantes directamente desde el enlace RSVP sin necesidad de crear una cuenta, y verás el total reflejado en tu panel.',
    },
    {
      question: '¿Necesitan cuenta los invitados?',
      answer: 'No. El sistema funciona con un enlace o código de invitación único: los invitados confirman su asistencia con un solo clic, sin registros ni contraseñas.',
    },
    {
      question: '¿Cómo exporto la lista para catering?',
      answer: 'Desde el panel de invitados, haz clic en "Exportar". Obtendrás un archivo CSV con todos los confirmados, sus acompañantes y las notas de alergias o dieta que hayan indicado.',
    },
    {
      question: '¿Qué pasa si un invitado cambia de opinión?',
      answer: 'Los invitados pueden volver a usar su enlace personal para actualizar su respuesta. El panel se actualiza en tiempo real y recibirás la notificación del cambio.',
    },
  ];

  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.set({
      title: 'RSVP Online para Bodas | Weddly Studio',
      description: 'Gestiona las confirmaciones de tu boda sin caos de WhatsApp. Enlace único, panel en tiempo real y exportación para catering con Weddly Studio.',
      url: 'https://weddlystudio.uk/rsvp-landing',
      image: 'https://weddlystudio.uk/assets/og-rsvp-landing.png',
    });
  }

  toggleFaq(index: number): void {
    this.openFaq = this.openFaq === index ? null : index;
  }

  scrollTo(id: string): void {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}