import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
    );
  }

  get client() {
    return this.supabase;
  }

  async registrarConCorreo(
    email: string,
    password: string,
    apodo: string,
    emailRedirectTo: string,
  ) {
    return this.supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          apodo: apodo.trim(),
        },
        emailRedirectTo,
      },
    });
  }

  async iniciarSesionConCorreo(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
  }
}