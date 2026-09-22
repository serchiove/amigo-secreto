import {
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';

@Component({
  selector: 'app-unirse-grupo',
  standalone: true,
  template: `
    <main
      style="
        max-width: 500px;
        margin: 40px auto;
        padding: 20px;
        font-family: sans-serif;
      "
    >
      <h2>Unirse a un grupo</h2>

      <p aria-live="polite">{{ mensaje() }}</p>

      @if (requiereSesion()) {
        <button type="button" (click)="irAlInicio()">
          Iniciar sesión o registrarme
        </button>
      }

      @if (puedeSolicitar()) {
        <button
          type="button"
          [disabled]="enviando()"
          (click)="solicitarIngreso()"
        >
          {{ enviando() ? 'Enviando…' : 'Solicitar unirme' }}
        </button>
      }

      <p>
        <button type="button" (click)="irAMisGrupos()">
          Volver a mis grupos
        </button>
      </p>
    </main>
  `,
})
export class UnirseGrupoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);

  private token = '';

  readonly mensaje = signal('Comprobando acceso…');
  readonly requiereSesion = signal(false);
  readonly puedeSolicitar = signal(false);
  readonly enviando = signal(false);

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // La ruta sigue siendo /unirse/:id.
    // Ahora ese parámetro contiene el token de invitación.
    this.token = this.route.snapshot.paramMap.get('id') ?? '';

    const formatoUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!formatoUuid.test(this.token)) {
      this.mensaje.set('El enlace de invitación no tiene un formato válido.');
      return;
    }

    try {
      const { data, error } =
        await this.supabase.client.auth.getUser();

      if (error || !data.user) {
        // Guardamos solo el token, nunca una dirección de redirección.
        try {
          sessionStorage.setItem('invitacionPendiente', this.token);
        } catch {
          // Si el navegador bloquea el almacenamiento,
          // el usuario puede volver a abrir el enlace.
        }

        this.requiereSesion.set(true);
        this.mensaje.set(
          'Inicia sesión para continuar. Si no vuelves aquí automáticamente, abre otra vez la invitación.',
        );
        return;
      }

      this.puedeSolicitar.set(true);
      this.mensaje.set(
        'Puedes solicitar ingreso. El organizador deberá aprobarte antes del sorteo.',
      );
    } catch {
      this.mensaje.set(
        'No pudimos comprobar tu sesión. Revisa tu conexión y vuelve a abrir la invitación.',
      );
    }
  }

  async solicitarIngreso() {
    if (this.enviando() || !this.puedeSolicitar()) return;

    this.enviando.set(true);

    try {
      const { data: estado, error } =
        await this.supabase.client.rpc('solicitar_ingreso', {
          p_token: this.token,
        });

      if (error) {
        this.mensaje.set(error.message);
        return;
      }

      if (estado !== 'PENDIENTE' && estado !== 'APROBADO') {
        this.mensaje.set(
          'No recibimos una confirmación válida. Puedes volver a intentarlo.',
        );
        return;
      }

      this.puedeSolicitar.set(false);

      try {
        sessionStorage.removeItem('invitacionPendiente');
      } catch {
        // No afecta a la solicitud guardada en el servidor.
      }

      this.mensaje.set(
        estado === 'APROBADO'
          ? 'Ya eres participante aprobado de este grupo.'
          : 'Tu solicitud está pendiente de aprobación del organizador.',
      );
    } catch {
      this.mensaje.set(
        'No pudimos confirmar la solicitud. Puedes reintentar: no se duplicará.',
      );
    } finally {
      this.enviando.set(false);
    }
  }

  irAlInicio() {
    void this.router.navigate(['/']);
  }

  irAMisGrupos() {
    void this.router.navigate(['/mis-grupos']);
  }
}