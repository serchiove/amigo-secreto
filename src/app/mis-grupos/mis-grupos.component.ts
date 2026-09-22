// 1. Importamos ChangeDetectorRef
import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';

@Component({
  selector: 'app-mis-grupos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-grupos.component.html',
  styleUrl: './mis-grupos.component.scss'
})
export class MisGruposComponent implements OnInit {
  grupos: any[] = [];
  usuarioActual: any;

  constructor(
    private supabase: SupabaseService, 
    private router: Router,
    private cdr: ChangeDetectorRef // 2. Lo inyectamos en el constructor
  ) {}

  async ngOnInit() {
    const { data } = await this.supabase.client.auth.getUser();
    this.usuarioActual = data.user;

    if (!this.usuarioActual) {
      this.router.navigate(['/']);
      return;
    }

    await this.cargarGrupos();
  }

async cargarGrupos() {
  const { data, error } = await this.supabase.client
    .from('grupos')
    .select('*')
    .order('creado_en', { ascending: false });

  if (error) {
    alert('No se pudieron cargar los grupos: ' + error.message);
    return;
  }

  this.grupos = data ?? [];
  this.cdr.detectChanges();
}

  async cerrarSesion() {
    await this.supabase.client.auth.signOut();
    this.router.navigate(['/']);
  }

  irACrearGrupo() {
    this.router.navigate(['/crear-grupo']);
  }

  gestionarGrupo(id: string) {
    this.router.navigate(['/grupo', id]);
  }
}