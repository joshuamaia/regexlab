import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LucideInfo, LucideTriangleAlert } from '@lucide/angular';
import { RegexLabStore } from '../../core/services/regex-lab.store';
import { CopyButton } from '../../shared/components/copy-button/copy-button';
import { highlightCode } from '../../shared/utils/code-highlighter';
import { CodeGeneratorService, CodeLanguage } from './services/code-generator.service';

@Component({
  selector: 'app-code-generator',
  imports: [CopyButton, LucideTriangleAlert, LucideInfo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './code-generator.html',
  styleUrl: './code-generator.scss',
})
export class CodeGenerator {
  private readonly store = inject(RegexLabStore);
  private readonly generator = inject(CodeGeneratorService);

  protected readonly languages: { id: CodeLanguage; label: string }[] = [
    { id: 'javascript', label: 'JavaScript' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'java', label: 'Java' },
  ];

  protected readonly language = signal<CodeLanguage>('javascript');
  protected readonly invalid = computed(() => !this.store.validation().valid);

  protected readonly generated = computed(() =>
    this.generator.generate(this.language(), {
      pattern: this.store.pattern(),
      flags: this.store.flags(),
      text: this.store.text(),
    }),
  );

  protected readonly tokens = computed(() => highlightCode(this.generated().code));
}
