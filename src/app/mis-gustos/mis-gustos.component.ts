import {
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';

@Component({
  selector: 'app-mis-gustos',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <main
      style="
        max-width: 600px;
        margin: 32px auto;
        padding: 20px;
        font-family: sans-serif;
      "
    >
      <button
        type="button"
        [disabled]="guardando()"
        (click)="volver()"
      >
        Volver al grupo
      </button>

      <h2>Mis gustos</h2>
      <p>Estas preferencias corresponden a este intercambio.</p>

      @if (cargando()) {
        <p role="status">Cargando tus preferencias…</p>
      }

      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }

      @if (!cargando() && !listo()) {
        <button type="button" (click)="cargarPreferencias()">
          Reintentar
        </button>
      }

      @if (listo()) {
        <form [formGroup]="formulario" (ngSubmit)="guardar()">
          <fieldset
            [disabled]="guardando()"
            style="border: 0; padding: 0; margin: 0;"
          >
            <div style="margin-bottom: 20px;">
              <label for="gustos">¿Qué te gusta?</label>

              <textarea
                id="gustos"
                formControlName="gustos"
                maxlength="2000"
                rows="5"
                placeholder="Por ejemplo: libros, videojuegos, café…"
                style="box-sizing: border-box; width: 100%; padding: 10px;"
              ></textarea>

              <small>Hasta 2000 caracteres. Opcional.</small>
            </div>

            <div style="margin-bottom: 20px;">
              <label for="evitar">¿Qué prefieres evitar?</label>

              <textarea
                id="evitar"
                formControlName="evitar"
                maxlength="1000"
                rows="3"
                placeholder="Por ejemplo: cosas que ya tienes."
                style="box-sizing: border-box; width: 100%; padding: 10px;"
              ></textarea>

              <small>Hasta 1000 caracteres. Opcional.</small>
            </div>

            <div style="margin-bottom: 20px;">
              <label for="tipo-regalo">¿Qué regalos puedes recibir?</label>

              <select
                id="tipo-regalo"
                formControlName="tipo_regalo"
                style="box-sizing: border-box; width: 100%; padding: 10px;"
              >
                <option value="AMBOS">Físicos y digitales</option>
                <option value="FISICO">Solo físicos</option>
                <option value="DIGITAL">Solo digitales</option>
              </select>
            </div>

            <button
              type="submit"
              [disabled]="guardando() || formulario.invalid"
            >
              {{ guardando() ? 'Guardando…' : 'Guardar mis gustos' }}
            </button>
          </fieldset>
        </form>

        <p role="status">{{ mensaje() }}</p>
      }
    </main>
  `,
})
export class MisGustosComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly fb = inject(FormBuilder);
  private readonly esNavegador =
    isPlatformBrowser(inject(PLATFORM_ID));

  private grupoId = '';
  private participanteId = '';

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly listo = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');

  readonly formulario = this.fb.nonNullable.group({
    gustos: ['', Validators.maxLength(2000)],
    evitar: ['', Validators.maxLength(1000)],
    tipo_regalo: [
      'AMBOS',
      [
        Validators.required,
        Validators.pattern(/^(AMBOS|FISICO|DIGITAL)$/),
      ],
    ],
  });

  async ngOnInit() {
    if (!this.esNavegador) return;

    this.grupoId = this.route.snapshot.paramMap.get('id') ?? '';
    await this.cargarPreferencias();
  }

  async cargarPreferencias() {
    if (!this.esNavegador || this.guardando()) return;

    this.cargando.set(true);
    this.listo.set(false);
    this.error.set('');
    this.mensaje.set('');
    this.participanteId = '';

    try {
      const formatoUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!formatoUuid.test(this.grupoId)) {
        this.error.set('La dirección del grupo no es válida.');
        return;
      }

      const { data: sesion, error: errorSesion } =
        await this.supabase.client.auth.getUser();

      if (errorSesion || !sesion.user) {
        this.error.set(
          'No pudimos validar tu sesión. Vuelve a iniciar sesión.',
        );
        return;
      }

      const { data: participante, error: errorParticipante } =
        await this.supabase.client
          .from('participantes')
          .select('id')
          .eq('grupo_id', this.grupoId)
          .eq('perfil_id', sesion.user.id)
          .eq('estado', 'APROBADO')
          .maybeSingle();

      if (errorParticipante) {
        this.error.set(errorParticipante.message);
        return;
      }

      if (!participante) {
        this.error.set(
          'Debes ser participante aprobado para guardar gustos en este grupo.',
        );
        return;
      }

      const { data: preferencias, error: errorPreferencias } =
        await this.supabase.client
          .from('preferencias')
          .select('gustos, evitar, tipo_regalo')
          .eq('participante_id', participante.id)
          .maybeSingle();

      if (errorPreferencias) {
        this.error.set(errorPreferencias.message);
        return;
      }

      this.formulario.reset({
        gustos: preferencias?.gustos ?? '',
        evitar: preferencias?.evitar ?? '',
        tipo_regalo: preferencias?.tipo_regalo ?? 'AMBOS',
      });

      this.participanteId = participante.id;
      this.listo.set(true);
    } catch {
      this.error.set(
        'No pudimos cargar tus gustos. Revisa tu conexión y reintenta.',
      );
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar() {
    if (
      this.guardando() ||
      !this.listo() ||
      !this.participanteId
    ) {
      return;
    }

    this.error.set('');
    this.mensaje.set('');

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.error.set('Revisa la longitud de los textos y el tipo de regalo.');
      return;
    }

    this.guardando.set(true);

    try {
      const valores = this.formulario.getRawValue();

      const { data, error } = await this.supabase.client
        .from('preferencias')
        .upsert(
          {
            participante_id: this.participanteId,
            gustos: valores.gustos.trim(),
            evitar: valores.evitar.trim(),
            tipo_regalo: valores.tipo_regalo,
          },
          { onConflict: 'participante_id' },
        )
        .select('participante_id')
        .single();

      if (error) {
        this.error.set(error.message);
        return;
      }

      if (!data) {
        this.error.set('No se recibió la confirmación del guardado.');
        return;
      }

      this.formulario.markAsPristine();
      this.mensaje.set('Tus gustos se guardaron correctamente.');
    } catch {
      this.error.set(
        'No pudimos confirmar el guardado. Puedes volver a intentarlo.',
      );
    } finally {
      this.guardando.set(false);
    }
  }

  volver() {
    if (!this.guardando()) {
      void this.router.navigate(['/grupo', this.grupoId]);
    }
  }
}