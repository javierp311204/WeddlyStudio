import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AiService, ChatMessage } from '../../services/ai/ai.service';
import { AuthService } from '../../services/auth/auth.service';
import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, IconComponent],
  templateUrl: './ai-chat.component.html',
  styleUrl:    './ai-chat.component.css',
})
export class AiChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  isOpen      = false;
  isLoading   = false;
  inputText   = '';
  weddingId   = '';

  messages: ChatMessage[] = [];

  usage: {
    used:      number | null;
    limit:     number | null;
    unlimited: boolean;
    remaining: number | null;
  } | null = null;

  limitReached = false;
  private shouldScrollToBottom = false;

  constructor(
    private aiService:   AiService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.weddingId = this.authService.getWeddingId();
    if (this.weddingId) this.loadUsage();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  // ── Abrir / cerrar widget ─────────────────────────────────────
  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.messages.length === 0) {
      this.addWelcomeMessage();
    }
    if (this.isOpen) {
      this.shouldScrollToBottom = true;
    }
  }

  closeChat(): void { this.isOpen = false; }

  // ── Mensaje de bienvenida ─────────────────────────────────────
  private addWelcomeMessage(): void {
    this.messages.push({
      role:    'assistant',
      content: '¡Hola! 👋 Soy tu asistente de bodas con IA. Puedo ayudarte con la organización, sugerirte tareas, o responder cualquier pregunta sobre tu boda. ¿En qué te ayudo hoy?',
    });
  }

  // ── Enviar mensaje ────────────────────────────────────────────
  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || this.isLoading || this.limitReached) return;

    // Añadir mensaje del usuario
    this.messages.push({ role: 'user', content: text });
    this.inputText        = '';
    this.isLoading        = true;
    this.shouldScrollToBottom = true;

    // Historial sin el último mensaje del usuario (ya lo enviamos aparte)
    const history = this.messages.slice(0, -1).slice(-10);

    this.aiService.chat(this.weddingId, text, history).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        const data = res?.data;

        this.messages.push({
          role:    'assistant',
          content: data?.message ?? 'Lo siento, no pude procesar tu solicitud.',
        });

        if (data?.usage) {
          this.usage = data.usage;
          this.checkLimit();
        }

        this.shouldScrollToBottom = true;
      },
      error: (err: any) => {
        this.isLoading = false;
        const code = err?.error?.code;

        if (code === 'AI_LIMIT_REACHED') {
          this.limitReached = true;
          this.messages.push({
            role:    'assistant',
            content: '⚠️ Has alcanzado el límite de mensajes de IA para este mes. Actualiza tu plan para continuar.',
          });
        } else {
          this.messages.push({
            role:    'assistant',
            content: 'Ha ocurrido un error. Por favor, inténtalo de nuevo.',
          });
        }

        this.shouldScrollToBottom = true;
      },
    });
  }

  // ── Cargar uso del mes ────────────────────────────────────────
  private loadUsage(): void {
    this.aiService.getUsage(this.weddingId).subscribe({
      next: (res: any) => {
        const chatUsage = res?.data?.usage?.find((u: any) => u.module === 'chat');
        if (chatUsage) {
          this.usage = chatUsage;
          this.checkLimit();
        }
      },
      error: () => {},
    });
  }

  private checkLimit(): void {
    if (this.usage && !this.usage.unlimited) {
      this.limitReached = (this.usage.remaining ?? 1) <= 0;
    }
  }

  // ── Enter para enviar ─────────────────────────────────────────
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // ── Scroll al final ───────────────────────────────────────────
  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  // ── Quick actions ─────────────────────────────────────────────
  quickAction(text: string): void {
    this.inputText = text;
    this.sendMessage();
  }

  // ── Helpers ───────────────────────────────────────────────────
  get usageText(): string {
    if (!this.usage) return '';
    if (this.usage.unlimited) return 'Ilimitado';
    return `${this.usage.used} / ${this.usage.limit} mensajes este mes`;
  }

  get usagePct(): number {
    if (!this.usage || this.usage.unlimited || !this.usage.limit) return 0;
    return Math.min(100, Math.round(((this.usage.used ?? 0) / this.usage.limit) * 100));
  }

  clearChat(): void {
    this.messages    = [];
    this.limitReached = false;
    this.addWelcomeMessage();
  }
}