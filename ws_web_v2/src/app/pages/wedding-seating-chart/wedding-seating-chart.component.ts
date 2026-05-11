import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../services/seo/seo.service';

@Component({
  selector: 'app-wedding-seating-chart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './wedding-seating-chart.component.html',
  styleUrls: ['./wedding-seating-chart.component.css'],
})
export class WeddingSeatingChartComponent implements OnInit {

  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.set({
      title: 'Plano Interactivo de Mesas para Bodas | Weddly Studio',
      description:
        'Diseña el plano de mesas de tu boda con drag & drop, deja que la IA sugiera la distribución perfecta y exporta el plano en PDF profesional para el día del evento.',
      url: 'https://weddlystudio.uk/wedding-seating-chart',
      image: 'https://weddlystudio.uk/assets/og-seating-chart.png',
    });
  }

  scrollTo(id: string): void {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}