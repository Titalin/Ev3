import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService, Division, Program } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Observable } from 'rxjs';

@Component({
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
<div class="layout">
  <aside class="sidebar">
    <div class="brand">Sistema Académico</div>
    <nav class="nav">
      <button [class.active]="section==='divisions'" (click)="section='divisions'">Divisiones</button>
      <button [class.active]="section==='programs'" (click)="section='programs'">Programas educativos</button>
    </nav>
    <div class="sidebar-bottom">
      <div class="user"><span class="avatar">{{initial}}</span><span>{{user}}</span></div>
      <button class="logout" (click)="logout()">Cerrar sesión</button>
    </div>
  </aside>

  <main class="main">
    <header><h1>{{section==='divisions'?'Divisiones':'Programas educativos'}}</h1></header>

    <section class="stats">
      <article class="stat"><span>Registros</span><strong>{{section==='divisions'?divisions.length:programs.length}}</strong></article>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>{{section==='divisions'?'Divisiones':'Programas educativos'}}</h2>
        <button class="primary" (click)="newItem()">Nuevo registro</button>
      </div>

      <div *ngIf="error" class="error-box">{{error}}</div>
      <div *ngIf="loading" class="loading">Cargando…</div>

      <ng-container *ngIf="!loading">
        <div *ngIf="section==='divisions'" class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Nombre</th><th>Acciones</th></tr></thead>
            <tbody>
              <tr *ngFor="let d of divisions">
                <td>#{{d.id}}</td><td>{{d.nombreA}}</td>
                <td>
                  <button class="small" (click)="editDivision(d)">Editar</button>
                  <button class="small danger" (click)="deleteDivision(d)">Eliminar</button>
                </td>
              </tr>
              <tr *ngIf="!divisions.length"><td colspan="3" class="empty">No hay divisiones registradas.</td></tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="section==='programs'" class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Programa</th><th>Divisiones</th><th>Acciones</th></tr></thead>
            <tbody>
              <tr *ngFor="let p of programs">
                <td>#{{p.id}}</td><td>{{p.nombreB}}</td><td>{{names(p.divisiones || [])}}</td>
                <td>
                  <button class="small" (click)="editProgram(p)">Editar</button>
                  <button class="small danger" (click)="deleteProgram(p)">Eliminar</button>
                </td>
              </tr>
              <tr *ngIf="!programs.length"><td colspan="4" class="empty">No hay programas registrados.</td></tr>
            </tbody>
          </table>
        </div>
      </ng-container>
    </section>
  </main>
</div>

<div class="modal-backdrop" *ngIf="modal">
  <section class="modal">
    <h2>{{editing?'Editar':'Nuevo'}} {{section==='divisions'?'división':'programa educativo'}}</h2>
    <form (ngSubmit)="save()">
      <label>Nombre<input [(ngModel)]="name" name="name" required maxlength="160"></label>
      <div *ngIf="section==='programs'">
        <label>Divisiones asociadas</label>
        <div class="checks">
          <label class="check" *ngFor="let d of divisions">
            <input type="checkbox" [checked]="selected.includes(d.id)" (change)="toggle(d.id,$event)">
            <span>{{d.nombreA}}</span>
          </label>
        </div>
        <small>Selecciona al menos una división.</small>
      </div>
      <div class="modal-actions">
        <button type="button" class="secondary" (click)="modal=false">Cancelar</button>
        <button class="primary" [disabled]="saving">{{saving?'Guardando…':'Guardar'}}</button>
      </div>
    </form>
  </section>
</div>
`,
  styles: []
})
export class DashboardComponent implements OnInit {
  section: 'divisions' | 'programs' = 'divisions';
  divisions: Division[] = [];
  programs: Program[] = [];
  loading = false;
  error = '';
  modal = false;
  editing = false;
  editId?: number;
  name = '';
  selected: number[] = [];
  saving = false;
  user = '';
  initial = '';

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    this.user = this.auth.username();
    this.initial = (this.user || 'A').charAt(0).toUpperCase();
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.api.divisions().subscribe({
      next: d => this.divisions = d,
      error: e => { this.error = this.err(e); this.loading = false; },
      complete: () => {
        this.api.programs().subscribe({
          next: p => this.programs = p,
          error: e => { this.error = this.err(e); this.loading = false; },
          complete: () => this.loading = false
        });
      }
    });
  }

  names(ds: Division[]) { return ds.map(x => x.nombreA).join(', '); }

  err(e: any) {
    return e.status === 0 ? 'No se pudo conectar con el servidor. Verifica que los servicios estén ejecutándose.'
      : e.status === 401 ? 'Tu sesión expiró. Inicia sesión nuevamente.'
      : e.status === 403 ? 'No tienes permisos para esta operación.'
      : e.error?.error || e.error?.message || 'Ocurrió un error. Intenta de nuevo.';
  }

  newItem() {
    this.editing = false;
    this.editId = undefined;
    this.name = '';
    this.selected = [];
    this.modal = true;
  }

  editDivision(d: Division) {
    this.section = 'divisions';
    this.editing = true;
    this.editId = d.id;
    this.name = d.nombreA;
    this.modal = true;
  }

  editProgram(p: Program) {
    this.section = 'programs';
    this.editing = true;
    this.editId = p.id;
    this.name = p.nombreB;
    this.selected = [...p.entityAIds];
    this.modal = true;
  }

  toggle(id: number, e: any) {
    if (e.target.checked) this.selected = [...this.selected, id];
    else this.selected = this.selected.filter(x => x !== id);
  }

  save() {
    if (!this.name.trim()) return;
    if (this.section === 'programs' && !this.selected.length) {
      this.error = 'Selecciona al menos una división.';
      return;
    }
    this.saving = true;
    const req: Observable<unknown> = this.section === 'divisions'
      ? this.api.saveDivision({ nombreA: this.name }, this.editId)
      : this.api.saveProgram({ nombreB: this.name, entityAIds: this.selected }, this.editId);
    req.subscribe({
      next: () => { this.modal = false; this.load(); },
      error: (e: any) => { this.error = this.err(e); this.saving = false; },
      complete: () => this.saving = false
    });
  }

  deleteDivision(d: Division) {
    if (confirm(`¿Eliminar la división ${d.nombreA}?`))
      this.api.deleteDivision(d.id).subscribe({ next: () => this.load(), error: e => this.error = this.err(e) });
  }

  deleteProgram(p: Program) {
    if (confirm(`¿Eliminar el programa ${p.nombreB}?`))
      this.api.deleteProgram(p.id).subscribe({ next: () => this.load(), error: e => this.error = this.err(e) });
  }

  logout() { this.auth.logout(); }
}
