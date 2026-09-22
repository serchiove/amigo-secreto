import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  get client() {
    return this.supabase;
  }

  // Registrar un nuevo usuario
  async registrarConCorreo(email: string, pass: string) {
    return this.supabase.auth.signUp({ email, password: pass });
  }

  // Iniciar sesión con un usuario existente
  async iniciarSesionConCorreo(email: string, pass: string) {
    return this.supabase.auth.signInWithPassword({ email, password: pass });
  }
}