import { Component, Input, OnChanges, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { WeddlyIcons } from './weddly-icons';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="wly-icon" [style.width.px]="size" [style.height.px]="size" [innerHTML]="svg"></span>`,
  styles: [`
    .wly-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .wly-icon ::ng-deep svg {
      width: 100%;
      height: 100%;
    }
  `],
})
export class IconComponent implements OnChanges {
  @Input() name  = '';
  @Input() size  = 20;

  svg: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges() {
    const raw = WeddlyIcons[this.name];
    if (raw) {
      this.svg = this.sanitizer.bypassSecurityTrustHtml(raw);
    } else {
      console.warn(`[WeddlyIcon] Icono no encontrado: "${this.name}"`);
      this.svg = '';
    }
  }
}