import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal } from '@angular/core';
import { LucideCheck, LucideCopy } from '@lucide/angular';
import { ClipboardService } from '../../../core/services/clipboard.service';

@Component({
  selector: 'app-copy-button',
  imports: [LucideCopy, LucideCheck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [class]="label() ? 'btn' : 'btn-icon'"
      [class.copied]="copied()"
      [disabled]="disabled()"
      [attr.aria-label]="label() ? null : ariaLabel()"
      [title]="ariaLabel()"
      (click)="copy()"
    >
      @if (copied()) {
        <svg lucideCheck [size]="15"></svg>
      } @else {
        <svg lucideCopy [size]="15"></svg>
      }
      @if (label()) {
        <span>{{ copied() ? 'Copiado!' : label() }}</span>
      }
    </button>
    <span class="visually-hidden" aria-live="polite">{{ copied() ? 'Copiado para a área de transferência' : '' }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .copied {
      color: var(--success) !important;
    }
  `,
})
export class CopyButton {
  private readonly clipboard = inject(ClipboardService);

  readonly value = input.required<string>();
  readonly label = input<string>('');
  readonly ariaLabel = input<string>('Copiar');
  readonly disabled = input(false);

  protected readonly copied = signal(false);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected async copy(): Promise<void> {
    if (!(await this.clipboard.copy(this.value()))) return;
    this.copied.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.copied.set(false), 1500);
  }
}
