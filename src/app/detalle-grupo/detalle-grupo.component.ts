import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-detalle-grupo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-grupo.component.html',
  styleUrl: './detalle-grupo.component.scss'
})
export class DetalleGrupoComponent implements OnInit {
  grupoId: string = '';
  grupo: any = null;
  participantes: any[] = [];
  miAmigoSecreto: string | null = null; // Nueva variable para guardar al asignado
  esNavegador: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.esNavegador = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    if (!this.esNavegador) return;

    this.grupoId = this.route.snapshot.paramMap.get('id') || '';
    
    if (this.grupoId) {
      await this.cargarDetallesGrupo();
    } else {
      this.volver();
    }
  }

  async cargarDetallesGrupo() {
    const { data, error } = await this.supabase.client
      .from('grupos')
      .select('*')
      .eq('id', this.grupoId)
      .maybeSingle();

    if (error || !data) {
      this.volver();
      return;
    }

    this.grupo = data;
    this.cdr.detectChanges(); 

    await this.cargarParticipantes();

    // Si el grupo ya fue sorteado, cargamos a quién nos tocó regalar
    if (this.grupo.estado === 'SORTEADO') {
      await this.cargarMiAmigoSecreto();
    }
  }

  async cargarParticipantes() {
    const { data, error } = await this.supabase.client
      .from('participantes')
      .select(`
        id, 
        perfil_id, 
        perfiles!participantes_perfil_id_fkey (apodo)
      `)
      .eq('grupo_id', this.grupoId);

    if (!error && data) {
      this.participantes = data;
      this.cdr.detectChanges();
    }
  }

async cargarMiAmigoSecreto() {
    const { data: { user } } = await this.supabase.client.auth.getUser();
    if (!user) return;

    // Paso 1: Buscar a quién te asignaron en la tabla participantes
    const { data: miParticipacion, error: error1 } = await this.supabase.client
      .from('participantes')
      .select('amigo_asignado_id')
      .eq('grupo_id', this.grupoId)
      .eq('perfil_id', user.id)
      .maybeSingle();

    console.log('ID asignado:', miParticipacion?.amigo_asignado_id, 'Error 1:', error1);

    if (miParticipacion && miParticipacion.amigo_asignado_id) {
      // Paso 2: Buscar el apodo de esa persona en la tabla perfiles
      const { data: perfilAmigo, error: error2 } = await this.supabase.client
        .from('perfiles')
        .select('apodo')
        .eq('id', miParticipacion.amigo_asignado_id)
        .maybeSingle();

      console.log('Nombre del amigo:', perfilAmigo, 'Error 2:', error2);

      if (perfilAmigo) {
        this.miAmigoSecreto = perfilAmigo.apodo;
        this.cdr.detectChanges(); // Forzamos a que aparezca la tarjeta amarilla
      }
    }
  }

  async realizarSorteo() {
    if (this.participantes.length < 3) {
      alert('Se necesitan al menos 3 participantes para hacer el sorteo.');
      return;
    }

    if (!confirm('¿Estás seguro de realizar el sorteo? Ya no se podrán unir más personas.')) return;

    let mezclados = [...this.participantes];
    for (let i = mezclados.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mezclados[i], mezclados[j]] = [mezclados[j], mezclados[i]];
    }

    for (let i = 0; i < mezclados.length; i++) {
      const actual = mezclados[i];
      const asignado = mezclados[(i + 1) % mezclados.length];

      await this.supabase.client
        .from('participantes')
        .update({ amigo_asignado_id: asignado.perfil_id })
        .eq('grupo_id', this.grupoId)
        .eq('perfil_id', actual.perfil_id);
    }

    const { error: errorGrupo } = await this.supabase.client
      .from('grupos')
      .update({ estado: 'SORTEADO' })
      .eq('id', this.grupoId);

    if (!errorGrupo) {
      this.grupo.estado = 'SORTEADO';
      await this.cargarMiAmigoSecreto(); // Lo cargamos inmediatamente después de sortear
      alert('¡El sorteo se ha realizado con éxito! 🎲🎁');
    }
  }

  getInicial(participante: any): string {
    return participante?.perfiles?.apodo ? participante.perfiles.apodo.charAt(0).toUpperCase() : 'U';
  }

  getNombre(participante: any): string {
    return participante?.perfiles?.apodo || 'Usuario';
  }

  volver() {
    this.router.navigate(['/mis-grupos']);
  }

  copiarEnlace() {
    if (this.esNavegador) {
      const enlace = `http://localhost:4200/unirse/${this.grupoId}`;
      navigator.clipboard.writeText(enlace).then(() => alert('¡Enlace copiado!\n' + enlace));
    }
  }
}