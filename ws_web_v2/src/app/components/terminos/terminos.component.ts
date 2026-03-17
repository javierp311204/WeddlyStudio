import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-terminos',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, IconComponent],
  templateUrl: './terminos.component.html',
  styleUrl: './terminos.component.css',
})
export class TerminosComponent {
  lastUpdated = '01 de marzo de 2026';
}
