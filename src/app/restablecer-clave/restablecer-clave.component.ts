import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';

@Component({
  selector: 'app-restablecer-clave',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="page-shell page-shell--narrow">
      <section class="card">
        <div class="brand-mark" aria-hidden="true">🔐</div>
        <p class="eyebrow">Seguridad de tu cuenta</p>
        <h1>Nueva contraseña</h1>

        @if (comprobando()) {
          <p class="lead" role="status">Comprobando tu enlace de recuperación…</p>
        } @else if (completado()) {
          <p class="notice" role="status">
            Tu contraseña se actualizó. Ya puedes iniciar sesión con la nueva clave.
          </p>
          <button type="button" (click)="irAlInicio()">Ir a iniciar sesión</button>
        } @else if (!enlaceValido()) {
          <p class="alert" role="alert">{{ error() }}</p>
          <p class="lead">Solicita un enlace nuevo para volver a intentarlo.</p>
          <div class="actions">
            <button type="button" (click)="solicitarOtroEnlace()">Solicitar otro enlace</button>
            <button class="btn-secondary" type="button" (click)="irAlInicio()">
              Volver al inicio
            </button>
          </div>
        } @else {
          <p class="lead">Elige una contraseña de al menos 8 caracteres.</p>
          <form class="form-stack" (ngSubmit)="guardar()">
            <fieldset [disabled]="guardando()">
              <div class="field">
                <label for="nueva-clave">Nueva contraseña</label>
                <input
                  id="nueva-clave"
                  name="password"
                  type="password"
                  [(ngModel)]="password"
                  required
                  minlength="8"
                  autocomplete="new-password"
                />
              </div>
              <div class="field">
                <label for="confirmar-clave">Confirmar contraseña</label>
                <input
                  id="confirmar-clave"
                  name="confirmacion"
                  type="password"
                  [(ngModel)]="confirmacion"
                  required
                  minlength="8"
                  autocomplete="new-password"
                />
              </div>
              <button type="submit" [disabled]="guardando()">
                {{ guardando() ? 'Actualizando…' : 'Guardar nueva contraseña' }}
              </button>
            </fieldset>
          </form>
          @if (error()) {
            <p class="alert" role="alert">{{ error() }}</p>
          }
        }
      </section>
    </main>
  `,
})
export class RestablecerClaveComponent implements OnInit, OnDestroy {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private suscripcion?: { unsubscribe(): void };

  password = '';
  confirmacion = '';

  readonly comprobando = signal(true);
  readonly enlaceValido = signal(false);
  readonly guardando = signal(false);
  readonly completado = signal(false);
  readonly error = signal('');

  async ngOnInit() {
    const errorEnlace = this.leerErrorDelEnlace();

    if (errorEnlace) {
      this.error.set(errorEnlace);
      this.comprobando.set(false);
      return;
    }

    const { data } = this.supabase.client.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'PASSWORD_RECOVERY' || sesion) {
        this.enlaceValido.set(true);
        this.error.set('');
        this.comprobando.set(false);
      }
    });
    this.suscripcion = data.subscription;

    try {
      const { data: sesion, error } = await this.supabase.client.auth.getSession();

      if (error || !sesion.session) {
        this.error.set('El enlace no es válido o ya venció.');
      } else {
        this.enlaceValido.set(true);
      }
    } catch {
      this.error.set('No pudimos comprobar el enlace. Revisa tu conexión.');
    } finally {
      this.comprobando.set(false);
    }
  }

  ngOnDestroy() {
    this.suscripcion?.unsubscribe();
  }

  async guardar() {
    if (this.guardando() || !this.enlaceValido()) return;

    this.error.set('');

    if (this.password.length < 8) {
      this.error.set('Usa una contraseña de al menos 8 caracteres.');
      return;
    }

    if (this.password !== this.confirmacion) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    this.guardando.set(true);

    try {
      const { error } = await this.supabase.client.auth.updateUser({
        password: this.password,
      });

      if (error) {
        this.error.set('No pudimos actualizar la contraseña. Solicita un enlace nuevo.');
        return;
      }

      this.password = '';
      this.confirmacion = '';
      this.completado.set(true);
      await this.supabase.client.auth.signOut();
    } catch {
      this.error.set('No pudimos confirmar el cambio. Revisa tu conexión antes de reintentar.');
    } finally {
      this.guardando.set(false);
    }
  }

  solicitarOtroEnlace() {
    void this.router.navigate(['/recuperar-clave']);
  }

  irAlInicio() {
    void this.router.navigate(['/']);
  }

  private leerErrorDelEnlace(): string {
    const parametros = new URLSearchParams(window.location.search || window.location.hash.slice(1));
    const descripcion = parametros.get('error_description');

    return descripcion ? 'El enlace no es válido o ya venció. Solicita uno nuevo.' : '';
  }
}
