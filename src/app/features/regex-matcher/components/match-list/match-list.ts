import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, inject } from '@angular/core';
import {
  LucideListOrdered,
  LucideSearchX,
  LucideTimer,
  LucideTriangleAlert,
  LucideCircleAlert,
} from '@lucide/angular';
import { RegexLabStore } from '../../../../core/services/regex-lab.store';
import { CopyButton } from '../../../../shared/components/copy-button/copy-button';

@Component({
  selector: 'app-match-list',
  imports: [CopyButton, LucideListOrdered, LucideSearchX, LucideTimer, LucideTriangleAlert, LucideCircleAlert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './match-list.html',
  styleUrl: './match-list.scss',
})
export class MatchList {
  protected readonly store = inject(RegexLabStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // Mantém visível o card da correspondência selecionada no texto destacado.
    afterRenderEffect(() => {
      const index = this.store.selectedIndex();
      if (index === null) return;
      this.host.nativeElement
        .querySelector(`[data-match-card="${index}"]`)
        ?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    });
  }

  protected readonly state = computed(() => {
    const result = this.store.result();
    if (!this.store.validation().valid) return 'invalid';
    if (this.store.textTooLong()) return 'too-long';
    if (!result) return 'pending';
    if (result.status === 'timeout') return 'timeout';
    if (result.status === 'error') return 'error';
    return result.matches.length === 0 ? 'empty' : 'matches';
  });

  /** Representação legível de valores com espaços ou vazios. */
  protected display(value: string): string {
    return value === '' ? '(vazio)' : value;
  }
}
