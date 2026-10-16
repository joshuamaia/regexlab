import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
} from '@angular/core';
import { LucideHighlighter } from '@lucide/angular';
import { RegexLabStore } from '../../../../core/services/regex-lab.store';
import { buildHighlightSegments } from '../../engine/highlight-segments';

@Component({
  selector: 'app-highlighted-text',
  imports: [LucideHighlighter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './highlighted-text.html',
  styleUrl: './highlighted-text.scss',
})
export class HighlightedText {
  protected readonly store = inject(RegexLabStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Os segmentos usam o texto atual com os resultados da última execução. Se o
   * texto mudou e a nova execução ainda não terminou, exibe o texto puro para
   * não destacar posições desatualizadas.
   */
  protected readonly segments = computed(() => {
    const text = this.store.text();
    const stale = this.store.resultInput()?.text !== text;
    return buildHighlightSegments(text, stale ? [] : this.store.matches());
  });

  constructor() {
    afterRenderEffect(() => {
      const index = this.store.selectedIndex();
      if (index === null) return;
      this.host.nativeElement
        .querySelector(`[data-match="${index}"]`)
        ?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    });
  }
}
