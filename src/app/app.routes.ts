import { Routes } from '@angular/router';
import { InicioComponent } from './inicio/inicio.component';
import { MisGruposComponent } from './mis-grupos/mis-grupos.component';
import { CrearGrupoComponent } from './crear-grupo/crear-grupo.component';
import { DetalleGrupoComponent } from './detalle-grupo/detalle-grupo.component';
import { UnirseGrupoComponent } from './unirse-grupo/unirse-grupo.component';
import { MisGustosComponent } from './mis-gustos/mis-gustos.component';
import { RecuperarClaveComponent } from './recuperar-clave/recuperar-clave.component';
import { RestablecerClaveComponent } from './restablecer-clave/restablecer-clave.component';

export const routes: Routes = [
  { path: '', component: InicioComponent },
  { path: 'mis-grupos', component: MisGruposComponent },
  { path: 'crear-grupo', component: CrearGrupoComponent },
  { path: 'grupo/:id/gustos', component: MisGustosComponent },
  { path: 'grupo/:id', component: DetalleGrupoComponent },
  { path: 'unirse/:id', component: UnirseGrupoComponent },
  { path: 'recuperar-clave', component: RecuperarClaveComponent },
  { path: 'restablecer-clave', component: RestablecerClaveComponent },
  { path: '**', redirectTo: '' },
];
