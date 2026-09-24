import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('crea la aplicación', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('incluye el espacio donde se muestran las rutas', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const elemento: HTMLElement = fixture.nativeElement;

    expect(elemento.querySelector('router-outlet')).not.toBeNull();
  });
});