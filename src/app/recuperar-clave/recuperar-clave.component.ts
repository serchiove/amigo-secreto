import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';

@Component({
  selector: 'app-recuperar-clave',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="page-shell page-shell--narrow">
      <section class="card">
        <div class="brand-mark" aria-hidden="true">✉️</div>
        <p class="eyebrow">Recuperación de acceso</p>
        <h1>Recupera tu contraseña</h1>
        <p class="lead">Te enviaremos un enlace seguro para que elijas una contraseña nueva.</p>

        <form class="form-stack" (ngSubmit)="enviar()">
          <div class="field">
            <label for="correo-recuperacion">Correo electrónico</label>
            <input
              id="correo-recuperacion"
              name="email"
              type="email"
              [(ngModel)]="email"
              required
              autocomplete="email"
              [disabled]="enviando() || enviado()"
              placeholder="tu@correo.com"
            />
          </div>
          <button type="submit" [disabled]="enviando() || enviado()">
            {{ enviando() ? 'Enviando…' : enviado() ? 'Solicitud enviada' : 'Enviar enlace' }}
          </button>
          <button class="btn-secondary" type="button" [disabled]="enviando()" (click)="volver()">
            Volver al inicio
          </button>
        </form>

        @if (error()) {
          <p class="alert" role="alert">{{ error() }}</p>
        }
        @if (mensaje()) {
          <p class="notice" role="status">{{ mensaje() }}</p>
        }
      </section>
    </main>
  `,
})
export class RecuperarClaveComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  email = '';

  readonly enviando = signal(false);
  readonly enviado = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');

  async enviar() {
    if (this.enviando() || this.enviado()) return;

    this.error.set('');
    this.mensaje.set('');

    const correo = this.email.trim();

    if (!correo) {
      this.error.set('Introduce tu correo electrónico.');
      return;
    }

    this.enviando.set(true);

    try {
      const { error } = await this.supabase.client.auth.resetPasswordForEmail(correo, {
        redirectTo: `${window.location.origin}/restablecer-clave`,
      });

      if (error) {
        this.error.set('No se pudo enviar la solicitud. Inténtalo más tarde.');
        return;
      }

      this.enviado.set(true);
      this.mensaje.set(
        'Si existe una cuenta asociada a ese correo, recibirás ' +
          'un enlace para cambiar la contraseña. Revisa también spam.',
      );
    } catch {
      this.error.set(
        'No pudimos confirmar el envío. Revisa tu conexión y tu correo antes de reintentar.',
      );
    } finally {
      this.enviando.set(false);
    }
  }

  volver() {
    void this.router.navigate(['/']);
  }
}
