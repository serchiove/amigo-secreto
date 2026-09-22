import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';

@Component({
  selector: 'app-crear-grupo',
  standalone: true,
  templateUrl: './crear-grupo.component.html',
  styleUrl: './crear-grupo.component.scss',
})
export class CrearGrupoComponent {
  readonly guardando = signal(false);
  readonly error = signal('');

  constructor(
    private supabase: SupabaseService,
    private router: Router,
  ) {}

  async guardarGrupo(
    nombre: string,
    descripcion: string,
    monto: string,
    fecha: string,
  ) {
    if (this.guardando()) return;

    this.error.set('');

    const nombreLimpio = nombre.trim();
    const montoNumerico = monto.trim() === '' ? 50 : Number(monto);

    if (!nombreLimpio || nombreLimpio.length > 80) {
      this.error.set('El nombre debe tener entre 1 y 80 caracteres.');
      return;
    }

    if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      this.error.set('Ingresa un monto válido mayor que cero.');
      return;
    }

    if (descripcion.length > 2000) {
      this.error.set('La descripción admite hasta 2000 caracteres.');
      return;
    }

    this.guardando.set(true);

    try {
      const { data, error } = await this.supabase.client.rpc(
        'crear_grupo',
        {
          p_nombre: nombreLimpio,
          p_descripcion: descripcion.trim() || null,
          p_monto_minimo: montoNumerico,
          p_fecha_entrega: fecha || null,
        },
      );

      if (error) {
        this.error.set(error.message);
        return;
      }

      if (!data) {
        this.error.set(
          'No se recibió la confirmación. Revisa Mis grupos antes de reintentar.',
        );
        return;
      }

      await this.router.navigate(['/mis-grupos']);
    } catch {
      this.error.set(
        'No pudimos confirmar la operación. Revisa Mis grupos antes de reintentar.',
      );
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar() {
    if (!this.guardando()) {
      this.router.navigate(['/mis-grupos']);
    }
  }
}