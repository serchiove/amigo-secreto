import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';

@Component({
  selector: 'app-recuperar-clave',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main
      style="
        max-width: 420px;
        margin: 60px auto;
        padding: 20px;
        font-family: sans-serif;
      "
    >
      <h2>Recuperar contraseña</h2>

      <p>
        Introduce el correo de tu cuenta para solicitar
        un enlace de recuperación.
      </p>

      <form (ngSubmit)="enviar()">
        <label for="correo-recuperacion">Correo electrónico</label>

        <input
          id="correo-recuperacion"
          name="email"
          type="email"
          [(ngModel)]="email"
          required
          autocomplete="email"
          [disabled]="enviando()"
          style="
            box-sizing: border-box;
            width: 100%;
            padding: 10px;
            margin: 10px 0;
          "
        >

        <button
          type="submit"
          [disabled]="enviando() || enviado()"
        >
          {{
            enviando()
              ? 'Enviando…'
              : enviado()
                ? 'Solicitud enviada'
                : 'Enviar enlace'
          }}
        </button>
      </form>

      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }

      <p role="status">{{ mensaje() }}</p>

      <button
        type="button"
        [disabled]="enviando()"
        (click)="volver()"
      >
        Volver al inicio
      </button>
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
      const { error } =
        await this.supabase.client.auth.resetPasswordForEmail(
          correo,
          {
            redirectTo:
              `${window.location.origin}/restablecer-clave`,
          },
        );

      if (error) {
        this.error.set(
          'No se pudo enviar la solicitud. Inténtalo más tarde.',
        );
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