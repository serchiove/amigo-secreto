import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-unirse-grupo',
  standalone: true,
  // Usamos una plantilla directa porque esta pantalla es solo de transición
  template: '<div style="text-align: center; margin-top: 100px; font-family: sans-serif; color: #666;"><h2>Procesando invitación... 🎁</h2></div>'
})
export class UnirseGrupoComponent implements OnInit {
  esNavegador: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.esNavegador = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    if (!this.esNavegador) return;

    const grupoId = this.route.snapshot.paramMap.get('id');
    
    if (!grupoId) {
      this.router.navigate(['/']);
      return;
    }

    // 1. Verificamos si la persona que hizo clic en el enlace tiene sesión iniciada
    const { data: { user } } = await this.supabase.client.auth.getUser();

    if (!user) {
      alert('Para unirte a este grupo, primero debes iniciar sesión o registrar tu cuenta.');
      this.router.navigate(['/']);
      return;
    }

    // 2. Insertamos al usuario en la tabla de participantes
    const { error } = await this.supabase.client
      .from('participantes')
      .insert({
        grupo_id: grupoId,
        perfil_id: user.id
      });

    if (error) {
      // El código 23505 de PostgreSQL significa que violó la regla "unique" (ya estaba en el grupo)
      if (error.code === '23505') {
        alert('Ya estás participando en este grupo.');
      } else {
        alert('Error al unirse: ' + error.message);
      }
    } else {
      alert('¡Te has unido al grupo exitosamente!');
    }

    // 3. Lo llevamos directamente a ver los detalles del grupo
    this.router.navigate(['/grupo', grupoId]);
  }
}