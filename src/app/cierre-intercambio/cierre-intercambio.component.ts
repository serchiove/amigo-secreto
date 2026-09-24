import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../core/services/supabase.service';

type EstadoGrupo = 'ABIERTO' | 'EN_CURSO' | 'LISTO' | 'FINALIZADO';

interface Pareja {
  regalador_id: string;
  regalador_apodo: string;
  destinatario_id: string;
  destinatario_apodo: string;
}

@Component({
  selector: 'app-cierre-intercambio',
  standalone: true,
  template: `
    <section class="section-card">
      <div class="section-heading">
        <span class="section-icon" aria-hidden="true">✅</span>
        <div>
          <p class="eyebrow">Última etapa</p>
          <h2>Entrega y cierre</h2>
        </div>
      </div>

      <button type="button" [disabled]="ocupado()" (click)="actualizar()">
        {{ ocupado() ? 'Procesando…' : 'Actualizar estado' }}
      </button>

      @if (error()) {
        <p class="alert" role="alert">{{ error() }}</p>
      }

      <p role="status">{{ mensaje() }}</p>

      @if (cargando()) {
        <p role="status">Consultando el intercambio…</p>
      } @else if (listo()) {
        @if (estadoActual() === 'ABIERTO') {
          <p>Primero debe realizarse el sorteo.</p>
        } @else if (estadoActual() !== 'FINALIZADO') {
          @if (recibido()) {
            <p>Ya confirmaste que recibiste tu regalo.</p>
          } @else {
            <p>
              Confirma únicamente cuando hayas recibido tu regalo. Esta confirmación no se puede
              deshacer desde la aplicación.
            </p>

            <button
              type="button"
              [disabled]="ocupado() || estadoActual() !== 'EN_CURSO'"
              (click)="confirmarRecepcion()"
            >
              Ya recibí mi regalo
            </button>
          }

          @if (estadoActual() === 'EN_CURSO') {
            <p>El intercambio continúa. Falta que todos confirmen la recepción de sus regalos.</p>
          }

          @if (estadoActual() === 'LISTO') {
            <p>Todos confirmaron la recepción. El intercambio está listo para finalizar.</p>

            @if (esOrganizador) {
              <button type="button" [disabled]="ocupado()" (click)="finalizar()">
                Finalizar y revelar
              </button>
            } @else {
              <p>El organizador debe finalizar el intercambio.</p>
            }
          }
        } @else {
          <h3>¡Intercambio finalizado!</h3>
          <p>Estas fueron las asignaciones del grupo:</p>

          @if (errorRevelacion()) {
            <p class="alert" role="alert">{{ errorRevelacion() }}</p>
          } @else {
            <ul>
              @for (pareja of parejas(); track pareja.regalador_id) {
                <li class="pre-wrap">
                  <strong>{{ pareja.regalador_apodo }}</strong>
                  regaló a
                  <strong>{{ pareja.destinatario_apodo }}</strong
                  >.
                </li>
              } @empty {
                <li>No se encontraron asignaciones.</li>
              }
            </ul>
          }
        }
      }
    </section>
  `,
})
export class CierreIntercambioComponent implements OnChanges {
  @Input({ required: true }) grupoId = '';
  @Input() esOrganizador = false;

  @Output()
  readonly estadoCambiado = new EventEmitter<EstadoGrupo>();

  private readonly supabase = inject(SupabaseService);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly estadoActual = signal<EstadoGrupo>('ABIERTO');
  readonly recibido = signal(false);
  readonly listo = signal(false);
  readonly cargando = signal(false);
  readonly ocupado = signal(false);

  readonly error = signal('');
  readonly mensaje = signal('');
  readonly errorRevelacion = signal('');
  readonly parejas = signal<Pareja[]>([]);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['grupoId'] && this.grupoId && this.esNavegador) {
      void this.actualizar();
    }
  }

  private esEstadoValido(valor: unknown): valor is EstadoGrupo {
    return (
      valor === 'ABIERTO' || valor === 'EN_CURSO' || valor === 'LISTO' || valor === 'FINALIZADO'
    );
  }

  async actualizar() {
    if (!this.esNavegador || this.ocupado()) return;

    this.ocupado.set(true);
    this.mensaje.set('');

    try {
      await this.cargarEstado();
    } finally {
      this.ocupado.set(false);
    }
  }

  private async cargarEstado() {
    this.cargando.set(true);
    this.listo.set(false);
    this.error.set('');
    this.errorRevelacion.set('');
    this.parejas.set([]);

    try {
      const { data: sesion, error: errorSesion } = await this.supabase.client.auth.getUser();

      if (errorSesion || !sesion.user) {
        this.error.set('No pudimos validar tu sesión. Vuelve a iniciar sesión.');
        return;
      }

      const { data: participacion, error: errorParticipacion } = await this.supabase.client
        .from('participantes')
        .select('recibido_en')
        .eq('grupo_id', this.grupoId)
        .eq('perfil_id', sesion.user.id)
        .eq('estado', 'APROBADO')
        .maybeSingle();

      if (errorParticipacion) {
        this.error.set(errorParticipacion.message);
        return;
      }

      if (!participacion) {
        this.error.set('Debes ser participante aprobado para acceder a esta sección.');
        return;
      }

      const { data: grupo, error: errorGrupo } = await this.supabase.client
        .from('grupos')
        .select('estado')
        .eq('id', this.grupoId)
        .maybeSingle();

      if (errorGrupo) {
        this.error.set(errorGrupo.message);
        return;
      }

      if (!grupo || !this.esEstadoValido(grupo.estado)) {
        this.error.set('No pudimos consultar el estado del grupo.');
        return;
      }

      this.recibido.set(participacion.recibido_en !== null);
      this.estadoActual.set(grupo.estado);
      this.estadoCambiado.emit(grupo.estado);

      if (grupo.estado === 'FINALIZADO') {
        const { data, error } = await this.supabase.client.rpc('obtener_revelacion', {
          p_grupo_id: this.grupoId,
        });

        if (error) {
          this.errorRevelacion.set(error.message);
        } else {
          this.parejas.set((data ?? []) as Pareja[]);
        }
      }

      this.listo.set(true);
    } catch {
      this.error.set('No pudimos actualizar el intercambio. Revisa tu conexión.');
    } finally {
      this.cargando.set(false);
    }
  }

  async confirmarRecepcion() {
    if (
      !this.esNavegador ||
      this.ocupado() ||
      !this.listo() ||
      this.recibido() ||
      this.estadoActual() !== 'EN_CURSO'
    ) {
      return;
    }

    const confirmar = window.confirm(
      '¿Confirmas que ya recibiste tu regalo? ' +
        'No podrás deshacer esta confirmación desde la aplicación.',
    );

    if (!confirmar) return;

    this.ocupado.set(true);
    this.error.set('');
    this.mensaje.set('');

    try {
      const { data, error } = await this.supabase.client.rpc('confirmar_recepcion', {
        p_grupo_id: this.grupoId,
      });

      if (error) {
        this.error.set(error.message);
        return;
      }

      if (data !== 'EN_CURSO' && data !== 'LISTO' && data !== 'FINALIZADO') {
        this.error.set('No recibimos la confirmación esperada. Actualiza el estado.');
        return;
      }

      this.recibido.set(true);
      this.estadoActual.set(data);
      this.estadoCambiado.emit(data);
      this.mensaje.set('Tu recepción quedó confirmada.');

      await this.cargarEstado();
    } catch {
      this.error.set('No pudimos confirmar la operación. Actualiza el estado antes de reintentar.');
    } finally {
      this.ocupado.set(false);
    }
  }

  async finalizar() {
    if (
      !this.esNavegador ||
      !this.esOrganizador ||
      this.ocupado() ||
      !this.listo() ||
      this.estadoActual() !== 'LISTO'
    ) {
      return;
    }

    const confirmar = window.confirm(
      'Se revelará quién regaló a quién para todo el grupo. ¿Finalizar?',
    );

    if (!confirmar) return;

    this.ocupado.set(true);
    this.error.set('');
    this.mensaje.set('');

    try {
      const { data, error } = await this.supabase.client.rpc('finalizar_intercambio', {
        p_grupo_id: this.grupoId,
      });

      if (error) {
        this.error.set(error.message);
        return;
      }

      if (data !== 'FINALIZADO') {
        this.error.set('No recibimos la confirmación esperada. Actualiza el estado.');
        return;
      }

      this.estadoActual.set('FINALIZADO');
      this.estadoCambiado.emit('FINALIZADO');
      this.mensaje.set('El intercambio ha finalizado.');

      await this.cargarEstado();
    } catch {
      this.error.set('No pudimos confirmar el cierre. Actualiza el estado antes de reintentar.');
    } finally {
      this.ocupado.set(false);
    }
  }
}
