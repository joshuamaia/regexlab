import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LucideCircleAlert, LucideEraser, LucideLoaderCircle, LucideRegex, LucideStarPlus, LucideTimer } from '@lucide/angular';
import { RegexLabStore } from '../../core/services/regex-lab.store';
import { CopyButton } from '../../shared/components/copy-button/copy-button';
import { FlagSelector } from './flag-selector/flag-selector';

@Component({
  selector: 'app-regex-editor',
  imports: [
    DecimalPipe,
    FlagSelector,
    CopyButton,
    LucideRegex,
    LucideEraser,
    LucideStarPlus,
    LucideCircleAlert,
    LucideLoaderCircle,
    LucideTimer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './regex-editor.html',
  styleUrl: './regex-editor.scss',
})
export class RegexEditor {
  protected readonly store = inject(RegexLabStore);

  readonly saveFavorite = output<void>();

  protected readonly fullExpression = computed(() => `/${this.store.pattern()}/${this.store.flags()}`);
  protected readonly status = computed(() => {
    if (this.store.errorMessage()) return 'error';
    if (this.store.processing()) return 'processing';
    return this.store.result() ? 'done' : 'idle';
  });

  protected onPatternInput(event: Event): void {
    this.store.setPattern((event.target as HTMLInputElement).value);
  }
}
