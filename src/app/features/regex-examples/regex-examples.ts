import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { LucideCircleCheck, LucideCircleX, LucideInfo, LucideTriangleAlert, LucideUpload } from '@lucide/angular';
import { RegexLabStore } from '../../core/services/regex-lab.store';
import { REGEX_EXAMPLES, RegexExample, exampleTestText } from './data/regex-examples';

@Component({
  selector: 'app-regex-examples',
  imports: [LucideCircleCheck, LucideCircleX, LucideInfo, LucideTriangleAlert, LucideUpload],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './regex-examples.html',
  styleUrl: './regex-examples.scss',
})
export class RegexExamples {
  private readonly store = inject(RegexLabStore);

  protected readonly examples = REGEX_EXAMPLES;

  /** Emitido após carregar um exemplo no editor. */
  readonly loaded = output<RegexExample>();

  protected use(example: RegexExample): void {
    this.store.load({ pattern: example.pattern, flags: example.flags, text: exampleTestText(example) });
    this.loaded.emit(example);
  }
}
