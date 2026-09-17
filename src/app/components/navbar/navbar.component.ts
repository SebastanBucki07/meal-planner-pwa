import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="bottom-nav">
      <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
        <span class="icon">📊</span>
        <span class="label">Pulpit</span>
      </a>
      <a routerLink="/plan" routerLinkActive="active" class="nav-item">
        <span class="icon">📅</span>
        <span class="label">Planer</span>
      </a>
    </nav>
  `,
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {}
