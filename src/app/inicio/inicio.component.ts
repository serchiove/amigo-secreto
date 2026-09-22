import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss'
})
export class InicioComponent {
  
  // Añadimos el Router al constructor
  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {}

  async login(email: string, pass: string) {
    const { error } = await this.supabase.iniciarSesionConCorreo(email, pass);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      // Si no hay error, viajamos a la pantalla de mis grupos
      this.router.navigate(['/mis-grupos']);
    }
  }

  async registrar(email: string, pass: string) {
    const { error } = await this.supabase.registrarConCorreo(email, pass);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('¡Registro exitoso! Ya puedes presionar Ingresar.');
    }
  }
}