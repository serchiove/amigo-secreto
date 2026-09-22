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
import { CierreIntercambioComponent } from '../cierre-intercambio/cierre-intercambio.component';

interface Grupo {
  id: string;
  organizador_id: string;
  nombre: string;
  descripcion: string | null;
  monto_minimo: number;
  fecha_entrega: string | null;
  estado: 'ABIERTO' | 'EN_CURSO' | 'LISTO' | 'FINALIZADO';
}

interface Solicitud {
  participante_id: string;
  apodo: string;
  solicitado_en: string;
}

interface Participante {
  participante_id: string;
  apodo: string;
  es_organizador: boolean;
}

interface Destinatario {
  apodo: string;
  gustos: string;
  evitar: string;
  tipo_regalo: 'FISICO' | 'DIGITAL' | 'AMBOS';
}

@Component({
  selector: 'app-detalle-grupo',
  standalone: true,
  imports: [CierreIntercambioComponent],
  templateUrl: './detalle-grupo.component.html',
  styleUrl: './detalle-grupo.component.scss',
})

export class DetalleGrupoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly esNavegador =
    isPlatformBrowser(inject(PLATFORM_ID));

  private grupoId = '';

  readonly grupo = signal<Grupo | null>(null);
  readonly cargando = signal(true);
  readonly errorGeneral = signal('');
  readonly esOrganizador = signal(false);

  readonly participantes = signal<Participante[]>([]);
  readonly cargandoParticipantes = signal(false);
  readonly errorParticipantes = signal('');

  readonly solicitudes = signal<Solicitud[]>([]);
  readonly cargandoSolicitudes = signal(false);
  readonly resolviendoSolicitud = signal<string | null>(null);
  readonly errorSolicitudes = signal('');
  readonly avisoSolicitudes = signal('');

  readonly generandoInvitacion = signal(false);
  readonly enlaceInvitacion = signal('');
  readonly avisoInvitacion = signal('');
  readonly errorInvitacion = signal('');

  readonly sorteando = signal(false);
  readonly errorSorteo = signal('');

  readonly destinatario = signal<Destinatario | null>(null);
  readonly cargandoDestinatario = signal(false);
  readonly errorDestinatario = signal('');

  async ngOnInit() {
    if (!this.esNavegador) return;

    this.grupoId = this.route.snapshot.paramMap.get('id') ?? '';
    await this.cargarDetallesGrupo();
  }

  async cargarDetallesGrupo() {
    if (!this.esNavegador) return;

    this.cargando.set(true);
    this.errorGeneral.set('');
    this.grupo.set(null);
    this.esOrganizador.set(false);
    this.participantes.set([]);
    this.solicitudes.set([]);
    this.destinatario.set(null);
    this.enlaceInvitacion.set('');
    this.errorParticipantes.set('');
    this.errorSolicitudes.set('');
    this.errorDestinatario.set('');
    this.errorSorteo.set('');
    this.avisoSolicitudes.set('');
    this.avisoInvitacion.set('');
    this.errorInvitacion.set('');

    try {
      const formatoUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!formatoUuid.test(this.grupoId)) {
        this.errorGeneral.set('La dirección del grupo no es válida.');
        return;
      }

      const { data: sesion, error: errorSesion } =
        await this.supabase.client.auth.getUser();

      if (errorSesion || !sesion.user) {
        this.errorGeneral.set(
          'No pudimos validar tu sesión. Vuelve al inicio e inicia sesión.',
        );
        return;
      }

      const { data, error } = await this.supabase.client
        .from('grupos')
        .select(
          'id, organizador_id, nombre, descripcion, monto_minimo, fecha_entrega, estado',
        )
        .eq('id', this.grupoId)
        .maybeSingle();

      if (error) {
        this.errorGeneral.set(error.message);
        return;
      }

      if (!data) {
        this.errorGeneral.set(
          'El grupo no existe o todavía no tienes acceso.',
        );
        return;
      }

      this.grupo.set(data as Grupo);
      this.esOrganizador.set(
        data.organizador_id === sesion.user.id,
      );

      await this.cargarParticipantes();

      if (this.esOrganizador()) {
        await this.cargarSolicitudes();
      }
    } catch {
      this.errorGeneral.set(
        'No pudimos cargar el grupo. Revisa tu conexión y reintenta.',
      );
    } finally {
      this.cargando.set(false);
    }
  }

  async cargarParticipantes() {
    if (
      !this.esNavegador ||
      !this.grupo() ||
      this.cargandoParticipantes()
    ) {
      return;
    }

    this.cargandoParticipantes.set(true);
    this.errorParticipantes.set('');

    try {
      const { data, error } = await this.supabase.client.rpc(
        'listar_participantes',
        { p_grupo_id: this.grupoId },
      );

      if (error) {
        this.errorParticipantes.set(error.message);
        return;
      }

      this.participantes.set((data ?? []) as Participante[]);
    } catch {
      this.errorParticipantes.set(
        'No pudimos actualizar los participantes.',
      );
    } finally {
      this.cargandoParticipantes.set(false);
    }
  }

  async cargarSolicitudes() {
    if (
      !this.esOrganizador() ||
      this.cargandoSolicitudes()
    ) {
      return;
    }

    this.cargandoSolicitudes.set(true);
    this.errorSolicitudes.set('');

    try {
      const { data, error } = await this.supabase.client.rpc(
        'listar_solicitudes',
        { p_grupo_id: this.grupoId },
      );

      if (error) {
        this.errorSolicitudes.set(error.message);
        return;
      }

      this.solicitudes.set((data ?? []) as Solicitud[]);
    } catch {
      this.errorSolicitudes.set(
        'No pudimos cargar las solicitudes.',
      );
    } finally {
      this.cargandoSolicitudes.set(false);
    }
  }

  async resolverSolicitud(
    participanteId: string,
    aprobar: boolean,
  ) {
    if (
      !this.esOrganizador() ||
      this.grupo()?.estado !== 'ABIERTO' ||
      this.resolviendoSolicitud() !== null ||
      this.cargandoSolicitudes() ||
      this.cargandoParticipantes() ||
      this.sorteando()
    ) {
      return;
    }

    this.resolviendoSolicitud.set(participanteId);
    this.errorSolicitudes.set('');
    this.avisoSolicitudes.set('');

    try {
      const { data, error } = await this.supabase.client.rpc(
        'resolver_solicitud',
        {
          p_participante_id: participanteId,
          p_aprobar: aprobar,
        },
      );

      if (error) {
        this.errorSolicitudes.set(error.message);
        return;
      }

      const esperado = aprobar ? 'APROBADO' : 'RECHAZADO';

      if (data !== esperado) {
        this.errorSolicitudes.set(
          'No se recibió la confirmación esperada. Actualiza la lista.',
        );
        return;
      }

      this.solicitudes.update(lista =>
        lista.filter(
          solicitud =>
            solicitud.participante_id !== participanteId,
        ),
      );

      this.avisoSolicitudes.set(
        aprobar ? 'Solicitud aprobada.' : 'Solicitud rechazada.',
      );

      await this.cargarParticipantes();
      await this.cargarSolicitudes();
    } catch {
      this.errorSolicitudes.set(
        'No pudimos confirmar la decisión. Actualiza antes de reintentar.',
      );
    } finally {
      this.resolviendoSolicitud.set(null);
    }
  }

  async copiarEnlace() {
    if (
      !this.esNavegador ||
      !this.esOrganizador() ||
      this.grupo()?.estado !== 'ABIERTO' ||
      this.generandoInvitacion() ||
      this.sorteando()
    ) {
      return;
    }

    const confirmar = window.confirm(
      'La nueva invitación durará 7 días y reemplazará la anterior. ¿Continuar?',
    );

    if (!confirmar) return;

    this.generandoInvitacion.set(true);
    this.enlaceInvitacion.set('');
    this.avisoInvitacion.set('');
    this.errorInvitacion.set('');

    try {
      const { data: token, error } =
        await this.supabase.client.rpc('generar_invitacion', {
          p_grupo_id: this.grupoId,
        });

      if (error) {
        this.errorInvitacion.set(error.message);
        return;
      }

      if (typeof token !== 'string' || !token) {
        this.errorInvitacion.set(
          'No se recibió una invitación válida.',
        );
        return;
      }

      const enlace =
        `${window.location.origin}/unirse/` +
        encodeURIComponent(token);

      this.enlaceInvitacion.set(enlace);

      try {
        await navigator.clipboard.writeText(enlace);
        this.avisoInvitacion.set(
          'Enlace copiado. Válido durante 7 días.',
        );
      } catch {
        this.avisoInvitacion.set(
          'Invitación generada. Copia manualmente el enlace.',
        );
      }
    } catch {
      this.errorInvitacion.set(
        'No pudimos confirmar la generación. Revisa tu conexión.',
      );
    } finally {
      this.generandoInvitacion.set(false);
    }
  }

  async realizarSorteo() {
    if (
      !this.esNavegador ||
      !this.esOrganizador() ||
      this.grupo()?.estado !== 'ABIERTO' ||
      this.sorteando() ||
      this.generandoInvitacion() ||
      this.resolviendoSolicitud() !== null ||
      this.cargandoParticipantes() ||
      this.cargandoSolicitudes()
    ) {
      return;
    }

    this.errorSorteo.set('');

    if (this.errorParticipantes() || this.errorSolicitudes()) {
      this.errorSorteo.set(
        'Actualiza participantes y solicitudes antes de sortear.',
      );
      return;
    }

    if (this.participantes().length < 3) {
      this.errorSorteo.set(
        'Se necesitan al menos 3 participantes aprobados.',
      );
      return;
    }

    if (this.solicitudes().length > 0) {
      this.errorSorteo.set(
        'Aprueba o rechaza las solicitudes pendientes.',
      );
      return;
    }

    const confirmar = window.confirm(
      'Se cerrará el grupo y se asignará un destinatario a cada ' +
      'participante aprobado. El sorteo no se podrá repetir. ¿Continuar?',
    );

    if (!confirmar) return;

    this.sorteando.set(true);

    try {
      const { data, error } = await this.supabase.client.rpc(
        'realizar_sorteo',
        { p_grupo_id: this.grupoId },
      );

      if (error) {
        this.errorSorteo.set(error.message);
        return;
      }

      if (data !== 'EN_CURSO') {
        this.errorSorteo.set(
          'No recibimos la confirmación esperada. Recarga el grupo para comprobar su estado.',
        );
        return;
      }

      this.grupo.update(actual =>
        actual ? { ...actual, estado: 'EN_CURSO' } : actual,
      );

      this.enlaceInvitacion.set('');
      this.destinatario.set(null);
      this.errorDestinatario.set('');
    } catch {
      this.errorSorteo.set(
        'No pudimos confirmar el sorteo. Recarga el grupo antes de reintentar: podría haberse completado.',
      );
    } finally {
      this.sorteando.set(false);
    }
  }

  async verMiDestinatario() {
    const estado = this.grupo()?.estado;

    if (
      !this.esNavegador ||
      !estado ||
      estado === 'ABIERTO' ||
      this.cargandoDestinatario()
    ) {
      return;
    }

    this.cargandoDestinatario.set(true);
    this.errorDestinatario.set('');
    this.destinatario.set(null);

    try {
      const { data, error } = await this.supabase.client
        .rpc('obtener_mi_destinatario', {
          p_grupo_id: this.grupoId,
        })
        .single();

      if (error) {
        this.errorDestinatario.set(error.message);
        return;
      }

      if (!data) {
        this.errorDestinatario.set(
          'No se recibió tu destinatario.',
        );
        return;
      }

      this.destinatario.set(data as Destinatario);
    } catch {
      this.errorDestinatario.set(
        'No pudimos consultar tu destinatario. Inténtalo nuevamente.',
      );
    } finally {
      this.cargandoDestinatario.set(false);
    }
  }

  ocultarDestinatario() {
    this.destinatario.set(null);
    this.errorDestinatario.set('');
  }

  tipoRegaloTexto(tipo: Destinatario['tipo_regalo']): string {
    switch (tipo) {
      case 'FISICO':
        return 'Regalos físicos';
      case 'DIGITAL':
        return 'Regalos digitales';
      default:
        return 'Regalos físicos y digitales';
    }
  }

  irAMisGustos() {
    void this.router.navigate([
      '/grupo',
      this.grupoId,
      'gustos',
    ]);
  }
actualizarEstadoGrupo(
  estado: 'ABIERTO' | 'EN_CURSO' | 'LISTO' | 'FINALIZADO',
) {
  this.grupo.update(actual =>
    actual ? { ...actual, estado } : actual,
  );
}
  volver() {
    void this.router.navigate(['/mis-grupos']);
  }

  irAlInicio() {
    void this.router.navigate(['/']);
  }
}