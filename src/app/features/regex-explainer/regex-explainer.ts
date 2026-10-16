import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideLightbulb } from '@lucide/angular';
import { RegexLabStore } from '../../core/services/regex-lab.store';
import { REGEX_FLAGS } from '../../shared/utils/regex-flags';
import { RegexExplainerService } from './services/regex-explainer.service';
import { RegexTokenKind } from './services/regex-parser';

const KIND_LABELS: Record<RegexTokenKind, string> = {
  literal: 'Literal',
  escape: 'Escape',
  charClass: 'Classe',
  anchor: 'Âncora',
  quantifier: 'Quantificador',
  group: 'Grupo',
  alternation: 'Alternância',
  backreference: 'Referência',
  dot: 'Curinga',
  unknown: 'Desconhecido',
};

@Component({
  selector: 'app-regex-explainer',
  imports: [LucideLightbulb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './regex-explainer.html',
  styleUrl: './regex-explainer.scss',
})
export class RegexExplainer {
  private readonly store = inject(RegexLabStore);
  private readonly explainer = inject(RegexExplainerService);

  protected readonly kindLabels = KIND_LABELS;
  protected readonly invalid = computed(() => !this.store.validation().valid);

  protected readonly rows = computed(() =>
    this.explainer.flatten(this.explainer.explain(this.store.pattern(), this.store.flags())),
  );

  protected readonly activeFlags = computed(() =>
    REGEX_FLAGS.filter((definition) => this.store.flags().includes(definition.flag)),
  );
}
