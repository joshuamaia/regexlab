import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LucideEraser, LucideTextCursorInput } from '@lucide/angular';
import { RegexLabStore } from '../../../../core/services/regex-lab.store';
import { CopyButton } from '../../../../shared/components/copy-button/copy-button';

@Component({
  selector: 'app-test-text-editor',
  imports: [DecimalPipe, CopyButton, LucideTextCursorInput, LucideEraser],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card" aria-labelledby="test-text-title">
      <div class="card-header">
        <h2 class="card-title" id="test-text-title">
          <svg lucideTextCursorInput [size]="16"></svg>
          Texto de teste
        </h2>
        <div class="tools">
          <span class="counter mono" [class.over]="store.textTooLong()">
            {{ length() | number }} / {{ store.limits.maxTextLength | number }}
          </span>
          <app-copy-button [value]="store.text()" ariaLabel="Copiar texto" [disabled]="!store.text()" />
          <button type="button" class="btn-icon" title="Limpar texto" aria-label="Limpar texto" [disabled]="!store.text()" (click)="store.setText('')">
            <svg lucideEraser [size]="15"></svg>
          </button>
        </div>
      </div>
      <textarea
        class="text mono"
        spellcheck="false"
        autocomplete="off"
        aria-label="Texto de teste"
        placeholder="Cole ou digite aqui o texto que será testado…"
        [value]="store.text()"
        (input)="onInput($event)"
      ></textarea>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .card {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .tools {
      display: flex;
      align-items: center;
      gap: 0.125rem;
    }
    .counter {
      margin-right: 0.375rem;
      color: var(--text-subtle);
      font-size: 0.6875rem;
      &.over {
        color: var(--danger);
        font-weight: 600;
      }
    }
    .text {
      flex: 1;
      width: 100%;
      min-height: 220px;
      padding: 1rem;
      border: 0;
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
      background: transparent;
      color: var(--text);
      font-size: 0.875rem;
      line-height: 1.7;
      resize: vertical;
      &:focus {
        outline: none;
        box-shadow: inset 0 0 0 1px var(--accent);
      }
      &::placeholder {
        color: var(--text-subtle);
      }
    }
  `,
})
export class TestTextEditor {
  protected readonly store = inject(RegexLabStore);
  protected readonly length = computed(() => this.store.text().length);

  protected onInput(event: Event): void {
    this.store.setText((event.target as HTMLTextAreaElement).value);
  }
}
