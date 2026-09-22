import { Component, OnInit } from '@angular/core';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environment';
import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-recipe-details',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, RouterLink, NavbarComponent],
  templateUrl: './recipe-details.component.html',
  styleUrl: './recipe-details.component.scss'
})
export class RecipeDetailsComponent implements OnInit {
  private supabase: SupabaseClient;
  recipe: any = null;
  loading = true;
  safeVideoUrl: SafeResourceUrl | null = null;

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.fetchRecipe(id);
    }
  }

  async fetchRecipe(id: string) {
    this.loading = true;
    const { data, error } = await this.supabase.from('recipes').select('*').eq('id', id).single();

    if (error) {
      console.error('Błąd pobierania przepisu:', error);
    } else {
      this.recipe = data;
      if (this.recipe?.video_url) {
        this.safeVideoUrl = this.getEmbedVideoUrl(this.recipe.video_url);
      }
    }
    this.loading = false;
  }

  // Konwersja standardowego linku YouTube na format Embed do iframe
  private getEmbedVideoUrl(url: string): SafeResourceUrl | null {
    let videoId = '';

    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('youtube.com/watch')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      videoId = urlParams.get('v') || '';
    }

    if (videoId) {
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    }

    return null;
  }
}
