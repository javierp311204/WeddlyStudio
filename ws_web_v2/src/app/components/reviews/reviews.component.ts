import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReviewsService, Review } from '../../services/reviews/reviews.service';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.css',
})
export class ReviewsComponent implements OnInit {

  reviews:    Review[] = [];
  total:      number   = 0;
  average:    number   = 0;
  order:      'created_at' | 'rating' = 'created_at';

  cargando:          boolean = true;
  enviando:          boolean = false;
  mostrarFormulario: boolean = false;

  newRating:    number = 0;
  hoverRating:  number = 0;
  newComment:   string = '';
  commentError: string = '';

  myReview:   Review | null = null;
  isLoggedIn: boolean = false;

  constructor(
    private reviewsService: ReviewsService,
    private translate:      TranslateService,
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = !!localStorage.getItem('token');
    this.cargarReseñas();
    if (this.isLoggedIn) this.cargarMiReseña();
  }

  cargarReseñas(): void {
    this.cargando = true;
    this.reviewsService.getAll(this.order).subscribe({
      next: (res: any) => {
        this.reviews  = res.data.reviews;
        this.total    = res.data.total;
        this.average  = res.data.average;
        this.cargando = false;
      },
      error: () => { this.cargando = false; },
    });
  }

  cargarMiReseña(): void {
    this.reviewsService.getMine().subscribe({
      next: (res: any) => {
        this.myReview = res.data;
        if (this.myReview && !this.myReview.deleted_at) {
          this.newRating  = this.myReview.rating;
          this.newComment = this.myReview.comment;
        }
      },
    });
  }

  cambiarOrden(order: 'created_at' | 'rating'): void {
    this.order = order;
    this.cargarReseñas();
  }

  setRating(rating: number): void { this.newRating  = rating; }
  setHover(rating: number): void  { this.hoverRating = rating; }
  clearHover(): void              { this.hoverRating = 0; }

  getStars(rating: number): string {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  }

  validarFormulario(): boolean {
    this.commentError = '';
    if (this.newRating < 1 || this.newRating > 5) {
      this.commentError = this.translate.instant('REVIEWS.ERROR_RATING');
      return false;
    }
    if (this.newComment.trim().length < 10) {
      this.commentError = this.translate.instant('REVIEWS.ERROR_COMMENT_SHORT');
      return false;
    }
    if (this.newComment.trim().length > 1000) {
      this.commentError = this.translate.instant('REVIEWS.ERROR_COMMENT_LONG');
      return false;
    }
    return true;
  }

  enviarResena(): void {
    if (!this.validarFormulario() || this.enviando) return;
    this.enviando = true;

    this.reviewsService.create(this.newRating, this.newComment).subscribe({
      next: () => {
        this.enviando          = false;
        this.mostrarFormulario = false;
        this.cargarReseñas();
        this.cargarMiReseña();
      },
      error: (err: any) => {
        this.enviando     = false;
        this.commentError = err?.error?.message
          ?? this.translate.instant('REVIEWS.ERROR_GENERIC');
      },
    });
  }

  eliminarResena(): void {
    if (!this.myReview?.id) return;
    this.reviewsService.delete(this.myReview.id).subscribe({
      next: () => {
        this.myReview   = null;
        this.newRating  = 0;
        this.newComment = '';
        this.cargarReseñas();
      },
    });
  }

  getNombreUsuario(review: Review): string {
    if (!review.user) return 'Usuario';
    return review.user.nickname
      || `${review.user.first_name} ${review.user.last_name[0]}.`;
  }

  getInitial(review: Review): string {
    return review.user?.first_name?.[0]?.toUpperCase() ?? 'U';
  }

  get charsRestantes(): number {
    return 1000 - this.newComment.length;
  }

  get activeRating(): number {
    return this.hoverRating || this.newRating;
  }
}