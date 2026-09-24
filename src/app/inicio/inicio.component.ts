import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent {
  readonly mostrarFormulario = signal(false);

  abrirAcceso(registro: boolean) {
    this.modoRegistro.set(registro);
    this.mostrarFormulario.set(true);
    this.error.set('');
    this.mensaje.set('');
  }

  email = '';
  password = '';
  apodo = '';

  irARecuperarClave() {
    if (!this.procesando()) {
      void this.router.navigate(['/recuperar-clave']);
    }
  }
  readonly modoRegistro = signal(false);
  readonly procesando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');

  constructor(
    private supabase: SupabaseService,
    private router: Router,
  ) {}

  cambiarModo() {
    if (this.procesando()) return;

    this.modoRegistro.update((actual) => !actual);
    this.error.set('');
    this.mensaje.set('');
    this.password = '';
  }

  async enviarFormulario() {
    if (this.modoRegistro()) {
      await this.registrar(this.email, this.password, this.apodo);
    } else {
      await this.login(this.email, this.password);
    }
  }

  async login(email: string, password: string) {
    if (this.procesando()) return;

    this.error.set('');
    this.mensaje.set('');

    if (!email.trim() || !password) {
      this.error.set('Introduce tu correo y contraseña.');
      return;
    }

    this.procesando.set(true);

    try {
      const { error } = await this.supabase.iniciarSesionConCorreo(email, password);

      if (error) {
        this.error.set(error.message);
        return;
      }

      this.password = '';
      await this.continuarDespuesDelAcceso();
    } catch {
      this.error.set('No pudimos completar el acceso. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      this.procesando.set(false);
    }
  }

  async registrar(email: string, password: string, apodo: string) {
    if (this.procesando()) return;

    this.error.set('');
    this.mensaje.set('');

    const nombre = apodo.trim();

    if (!nombre || nombre.length > 40) {
      this.error.set('El apodo debe tener entre 1 y 40 caracteres.');
      return;
    }

    if (!email.trim()) {
      this.error.set('Introduce tu correo.');
      return;
    }

    if (password.length < 8) {
      this.error.set('Usa una contraseña de al menos 8 caracteres.');
      return;
    }

    this.procesando.set(true);

    try {
      const { data, error } = await this.supabase.registrarConCorreo(
        email,
        password,
        nombre,
        `${window.location.origin}/`,
      );

      if (error) {
        this.error.set(error.message);
        return;
      }

      this.password = '';

      if (data.session) {
        await this.continuarDespuesDelAcceso();
      } else {
        this.modoRegistro.set(false);
        this.mensaje.set(
          'Si el registro procede, recibirás un correo para confirmar tu cuenta. ' +
            'Revisa también spam. Si ya tenías una cuenta, inicia sesión.',
        );
      }
    } catch {
      this.error.set('No pudimos confirmar el registro. Revisa tu correo antes de reintentarlo.');
    } finally {
      this.procesando.set(false);
    }
  }

  private async continuarDespuesDelAcceso() {
    let invitacion: string | null = null;

    try {
      invitacion = sessionStorage.getItem('invitacionPendiente');
    } catch {
      // Se puede continuar aunque el navegador bloquee el almacenamiento.
    }

    const formatoUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const navegado =
      invitacion && formatoUuid.test(invitacion)
        ? await this.router.navigate(['/unirse', invitacion])
        : await this.router.navigate(['/mis-grupos']);

    if (!navegado) {
      this.error.set(
        'La sesión se inició, pero no pudimos abrir la siguiente pantalla. Recarga la página.',
      );
    }
  }
}
