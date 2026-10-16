import { ChangeDetectionStrategy, Component, OnInit, inject, input, output } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { validateRegex } from '../../../shared/utils/regex-flags';
import { FavoriteDraft } from '../services/favorites.service';

/** Valida a combinação expressão + flags usando o mesmo critério do editor. */
const regexValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const { pattern, flags } = group.value as { pattern: string; flags: string };
  const validation = validateRegex(pattern ?? '', flags ?? '');
  return validation.valid ? null : { regex: validation.error };
};

@Component({
  selector: 'app-favorite-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './favorite-form.html',
  styles: `
    form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.875rem;
      border: 1px solid var(--accent);
      border-radius: var(--radius);
      background: var(--surface-2);
      animation: fade-in 180ms ease both;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr 110px;
      gap: 0.5rem;
    }
    .error {
      color: var(--danger);
      font-size: 0.75rem;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
  `,
})
export class FavoriteForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly initial = input.required<FavoriteDraft>();
  readonly submitLabel = input('Salvar');
  readonly save = output<FavoriteDraft>();
  readonly cancelled = output<void>();

  protected readonly form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.maxLength(60)]],
      pattern: ['', Validators.required],
      flags: ['', Validators.pattern(/^[dgimsuvy]*$/)],
      sampleText: [''],
    },
    { validators: regexValidator },
  );

  ngOnInit(): void {
    const { name, pattern, flags, sampleText } = this.initial();
    this.form.setValue({ name, pattern, flags, sampleText: sampleText ?? '' });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.save.emit({ ...value, sampleText: value.sampleText || undefined });
  }
}
