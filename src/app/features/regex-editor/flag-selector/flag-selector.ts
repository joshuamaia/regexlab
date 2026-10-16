import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RegexFlag } from '../../../core/models/regex.models';
import { REGEX_FLAGS, isFlagSupported } from '../../../shared/utils/regex-flags';

@Component({
  selector: 'app-flag-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flags" role="group" aria-label="Flags da expressão">
      @for (definition of definitions; track definition.flag) {
        <button
          type="button"
          class="flag"
          [class.active]="flags().includes(definition.flag)"
          [attr.aria-pressed]="flags().includes(definition.flag)"
          [disabled]="!definition.supported"
          [title]="definition.supported ? definition.flag + ' — ' + definition.name + ': ' + definition.description : 'Não suportada por este navegador'"
          (click)="flagToggle.emit(definition.flag)"
        >
          <span class="letter">{{ definition.flag }}</span>
          <span class="name">{{ definition.name }}</span>
        </button>
      }
    </div>
  `,
  styleUrl: './flag-selector.scss',
})
export class FlagSelector {
  readonly flags = input.required<string>();
  readonly flagToggle = output<RegexFlag>();

  protected readonly definitions = REGEX_FLAGS.map((definition) => ({
    ...definition,
    supported: isFlagSupported(definition.flag),
  }));
}
