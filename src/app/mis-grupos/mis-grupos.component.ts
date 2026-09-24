import {
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';

interface Grupo {
  id: string;
  nombre: string;
  estado: string;
  fecha_entrega: string | null;
}

@Component({
  selector: 'app-mis-grupos',
  standalone: true,
  templateUrl: './mis-grupos.component.html',
  styleUrl: './mis-grupos.component.scss',
})
export class MisGruposComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly esNavegador =
    isPlatformBrowser(inject(PLATFORM_ID));

  readonly grupos = signal<Grupo[]>([]);
  readonly cargando = signal(true);
  readonly cerrandoSesion = signal(false);
  readonly error = signal('');

  readonly mostrarIngreso = signal(false);
  readonly errorInvitacion = signal('');
  readonly abriendoInvitacion = signal(false);

  async ngOnInit() {
    if (!this.esNavegador) return;

    await this.cargarGrupos();
  }

  async cargarGrupos() {
    if (!this.esNavegador || this.cerrandoSesion()) return;

    this.cargando.set(true);
    this.error.set('');

    try {
      const { data: sesion, error: errorSesion } =
        await this.supabase.client.auth.getUser();

      if (errorSesion || !sesion.user) {
        this.grupos.set([]);
        await this.router.navigate(['/']);
        return;
      }

      const { data, error } = await this.supabase.client
        .from('grupos')
        .select('id, nombre, estado, fecha_entrega')
        .order('creado_en', { ascending: false });

      if (error) {
        this.error.set(error.message);
        return;
      }

      this.grupos.set((data ?? []) as Grupo[]);
    } catch {
      this.error.set(
        'No pudimos cargar tus grupos. Revisa la conexión y reintenta.',
      );
    } finally {
      this.cargando.set(false);
    }
  }

  abrirFormularioIngreso() {
    this.errorInvitacion.set('');
    this.mostrarIngreso.set(true);
  }

  cancelarIngreso() {
    if (this.abriendoInvitacion()) return;

    this.mostrarIngreso.set(false);
    this.errorInvitacion.set('');
  }

  async abrirInvitacion(valor: string) {
    if (this.abriendoInvitacion()) return;

    this.errorInvitacion.set('');

    const entrada = valor.trim();

    if (!entrada) {
      this.errorInvitacion.set(
        'Pega el enlace de invitación o su código.',
      );
      return;
    }

    const formatoUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let token = '';

    if (formatoUuid.test(entrada)) {
      token = entrada;
    } else {
      try {
        const url = new URL(entrada);

        if (
          url.protocol !== 'http:' &&
          url.protocol !== 'https:'
        ) {
          throw new Error('Protocolo no válido');
        }

        const coincidencia =
          /^\/unirse\/([^/]+)\/?$/.exec(url.pathname);

        if (!coincidencia) {
          throw new Error('Ruta no válida');
        }

        token = coincidencia[1];
      } catch {
        this.errorInvitacion.set(
          'El enlace no es válido. Copia la invitación completa.',
        );
        return;
      }
    }

    if (!formatoUuid.test(token)) {
      this.errorInvitacion.set(
        'El código de invitación no tiene un formato válido.',
      );
      return;
    }

    this.abriendoInvitacion.set(true);

    try {
      // Solo usamos el código. Nunca navegamos al dominio
      // del enlace que se haya pegado.
      const navegado = await this.router.navigate([
        '/unirse',
        token,
      ]);

      if (!navegado) {
        this.errorInvitacion.set(
          'No se pudo abrir la invitación. Inténtalo nuevamente.',
        );
      }
    } catch {
      this.errorInvitacion.set(
        'No se pudo abrir la invitación. Inténtalo nuevamente.',
      );
    } finally {
      this.abriendoInvitacion.set(false);
    }
  }

  async cerrarSesion() {
    if (this.cerrandoSesion()) return;

    this.cerrandoSesion.set(true);
    this.error.set('');

    try {
      const { error } =
        await this.supabase.client.auth.signOut();

      if (error) {
        this.error.set(error.message);
        return;
      }

      this.grupos.set([]);
      await this.router.navigate(['/']);
    } catch {
      this.error.set(
        'No pudimos cerrar la sesión. Inténtalo nuevamente.',
      );
    } finally {
      this.cerrandoSesion.set(false);
    }
  }

  irACrearGrupo() {
    void this.router.navigate(['/crear-grupo']);
  }

  gestionarGrupo(id: string) {
    void this.router.navigate(['/grupo', id]);
  }
}