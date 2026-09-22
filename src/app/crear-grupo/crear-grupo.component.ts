import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';

@Component({
  selector: 'app-crear-grupo',
  standalone: true,
  templateUrl: './crear-grupo.component.html',
  styleUrl: './crear-grupo.component.scss'
})
export class CrearGrupoComponent {
  
  constructor(
    private supabase: SupabaseService, 
    private router: Router
  ) {}

  async guardarGrupo(nombre: string, descripcion: string, monto: string, fecha: string) {
    if (!nombre) {
      alert('El nombre del grupo es obligatorio');
      return;
    }

    // Obtenemos el ID del usuario que está creando el grupo
    const { data: userData } = await this.supabase.client.auth.getUser();
    const usuarioId = userData.user?.id;

    if (!usuarioId) return;

    // Insertamos el registro en la base de datos
    const { error } = await this.supabase.client
      .from('grupos')
      .insert({
        organizador_id: usuarioId,
        nombre: nombre,
        descripcion: descripcion,
        monto_minimo: monto ? parseFloat(monto) : 50,
        fecha_entrega: fecha || null
      });

    if (error) {
      alert('Error al crear el grupo: ' + error.message);
    } else {
      alert('¡Grupo creado exitosamente!');
      this.router.navigate(['/mis-grupos']);
    }
  }

  cancelar() {
    this.router.navigate(['/mis-grupos']);
  }
}