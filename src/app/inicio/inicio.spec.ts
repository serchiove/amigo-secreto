import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InicioComponent } from './inicio.component';
import { SupabaseService } from '../core/services/supabase.service';

describe('InicioComponent', () => {
  const supabaseSimulado = {
    iniciarSesionConCorreo: vi.fn(),
    registrarConCorreo: vi.fn(),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    supabaseSimulado.iniciarSesionConCorreo.mockReset();
    supabaseSimulado.registrarConCorreo.mockReset();

    sessionStorage.clear();
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [
        provideRouter([]),
        {
          provide: SupabaseService,
          useValue: supabaseSimulado,
        },
      ],
    }).compileComponents();
  });

  it('muestra el formulario de acceso', () => {
    const fixture = TestBed.createComponent(InicioComponent);
    fixture.detectChanges();

    const elemento: HTMLElement = fixture.nativeElement;

    expect(elemento.querySelector('input[type="email"]')).not.toBeNull();
    expect(elemento.querySelector('input[type="password"]')).not.toBeNull();
  });

  it('abre mis grupos después de iniciar sesión', async () => {
    supabaseSimulado.iniciarSesionConCorreo.mockResolvedValue({
      error: null,
    });

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(InicioComponent);

    await fixture.componentInstance.login(
      'prueba@example.com',
      'clave-de-prueba',
    );

    expect(navegar).toHaveBeenCalledWith(['/mis-grupos']);
  });

  it('retoma una invitación pendiente después del acceso', async () => {
    const token = '11111111-1111-4111-8111-111111111111';
    sessionStorage.setItem('invitacionPendiente', token);

    supabaseSimulado.iniciarSesionConCorreo.mockResolvedValue({
      error: null,
    });

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(InicioComponent);

    await fixture.componentInstance.login(
      'prueba@example.com',
      'clave-de-prueba',
    );

    expect(navegar).toHaveBeenCalledWith(['/unirse', token]);
  });

  it('no navega cuando las credenciales son rechazadas', async () => {
    supabaseSimulado.iniciarSesionConCorreo.mockResolvedValue({
      error: { message: 'Credenciales incorrectas' },
    });

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(InicioComponent);

    await fixture.componentInstance.login(
      'prueba@example.com',
      'clave-incorrecta',
    );

    expect(navegar).not.toHaveBeenCalled();
expect(fixture.componentInstance.error()).toBe(
  'Credenciales incorrectas',
);
  });
});