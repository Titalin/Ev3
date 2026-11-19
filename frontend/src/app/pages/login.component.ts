import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
<main class="login-wrap">
  <section class="login-card">
    <h1>Sistema Académico</h1>
    <p class="muted">Inicia sesión para administrar divisiones y programas educativos.</p>
    <p class="error" *ngIf="error">{{error}}</p>
    <button (click)="login()">Iniciar sesión</button>
  </section>
</main>`,
  styles: []
})
export class LoginComponent {
  error = '';
  constructor(private auth: AuthService) {}
  login() {
    this.error = '';
    this.auth.login().catch(e => {
      this.error = e?.message || 'Error al iniciar sesión.';
      console.error(e);
    });
  }
}
