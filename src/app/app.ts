import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { LucideBraces, LucideLibrary, LucideLightbulb } from '@lucide/angular';
import { AppHeader } from './core/layout/app-header/app-header';
import { CodeGenerator } from './features/code-generator/code-generator';
import { RegexEditor } from './features/regex-editor/regex-editor';
import { RegexExamples } from './features/regex-examples/regex-examples';
import { RegexExplainer } from './features/regex-explainer/regex-explainer';
import { FavoritesDrawer } from './features/regex-favorites/favorites-drawer';
import { FavoritesService } from './features/regex-favorites/services/favorites.service';
import { HighlightedText } from './features/regex-matcher/components/highlighted-text/highlighted-text';
import { MatchList } from './features/regex-matcher/components/match-list/match-list';
import { TestTextEditor } from './features/regex-matcher/components/test-text-editor/test-text-editor';

export type ToolTab = 'explainer' | 'code' | 'examples';

@Component({
  selector: 'app-root',
  imports: [
    AppHeader,
    RegexEditor,
    TestTextEditor,
    HighlightedText,
    MatchList,
    RegexExplainer,
    CodeGenerator,
    RegexExamples,
    FavoritesDrawer,
    LucideLightbulb,
    LucideBraces,
    LucideLibrary,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly favorites = inject(FavoritesService);

  protected readonly activeTab = signal<ToolTab>('explainer');
  protected readonly favoritesOpen = signal(false);
  protected readonly favoritesStartNew = signal(false);

  private readonly toolsPanel = viewChild.required<ElementRef<HTMLElement>>('toolsPanel');

  protected showExamples(): void {
    this.activeTab.set('examples');
    this.toolsPanel().nativeElement.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  protected openFavorites(startWithNew: boolean): void {
    this.favoritesStartNew.set(startWithNew);
    this.favoritesOpen.set(true);
  }

  protected onExampleLoaded(): void {
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }
}
