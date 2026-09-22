import { Routes } from '@angular/router';
import { InicioComponent } from './inicio/inicio.component';
import { MisGruposComponent } from './mis-grupos/mis-grupos.component';
import { CrearGrupoComponent } from './crear-grupo/crear-grupo.component';
import { DetalleGrupoComponent } from './detalle-grupo/detalle-grupo.component';
import { UnirseGrupoComponent } from './unirse-grupo/unirse-grupo.component';

export const routes: Routes = [
  { path: '', component: InicioComponent },
  { path: 'mis-grupos', component: MisGruposComponent },
  { path: 'crear-grupo', component: CrearGrupoComponent },
  { path: 'grupo/:id', component: DetalleGrupoComponent },
  { path: 'unirse/:id', component: UnirseGrupoComponent }, // Nueva ruta para invitados
  { path: '**', redirectTo: '' }
];