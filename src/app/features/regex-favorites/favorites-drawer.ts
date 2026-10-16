import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucidePencil, LucidePlus, LucideStar, LucideTrash, LucideUpload, LucideX } from '@lucide/angular';
import { RegexLabStore } from '../../core/services/regex-lab.store';
import { FavoriteForm } from './favorite-form/favorite-form';
import { Favorite, FavoriteDraft, FavoritesService } from './services/favorites.service';

@Component({
  selector: 'app-favorites-drawer',
  imports: [DatePipe, FavoriteForm, LucideStar, LucidePlus, LucideX, LucidePencil, LucideTrash, LucideUpload],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './favorites-drawer.html',
  styleUrl: './favorites-drawer.scss',
  host: {
    '(document:keydown.escape)': 'closed.emit()',
  },
})
export class FavoritesDrawer implements OnInit {
  private readonly store = inject(RegexLabStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly favorites = inject(FavoritesService);

  /** Abre a gaveta já com o formulário de novo favorito. */
  readonly startWithNew = input(false);
  readonly closed = output<void>();

  /** `'new'` para criação, o id do favorito em edição, ou `null`. */
  protected readonly editing = signal<string | null>(null);
  protected readonly confirmingDelete = signal<string | null>(null);

  protected readonly currentDraft = computed<FavoriteDraft>(() => ({
    name: '',
    pattern: this.store.pattern(),
    flags: this.store.flags(),
    sampleText: this.store.text(),
  }));

  ngOnInit(): void {
    if (this.startWithNew()) this.editing.set('new');
    queueMicrotask(() => this.host.nativeElement.querySelector<HTMLElement>('.drawer')?.focus());
  }

  protected draftOf(favorite: Favorite): FavoriteDraft {
    return { name: favorite.name, pattern: favorite.pattern, flags: favorite.flags, sampleText: favorite.sampleText };
  }

  protected create(draft: FavoriteDraft): void {
    this.favorites.add(draft);
    this.editing.set(null);
  }

  protected update(id: string, draft: FavoriteDraft): void {
    this.favorites.update(id, draft);
    this.editing.set(null);
  }

  protected remove(id: string): void {
    this.favorites.remove(id);
    this.confirmingDelete.set(null);
  }

  protected load(favorite: Favorite): void {
    this.store.load({ pattern: favorite.pattern, flags: favorite.flags, text: favorite.sampleText });
    this.closed.emit();
  }
}
