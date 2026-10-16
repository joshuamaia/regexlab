import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { LucideLibrary, LucideMoon, LucideRegex, LucideStar, LucideSun } from '@lucide/angular';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  imports: [LucideRegex, LucideLibrary, LucideStar, LucideSun, LucideMoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss',
})
export class AppHeader {
  protected readonly theme = inject(ThemeService);

  readonly favoritesCount = input(0);
  readonly examplesClick = output<void>();
  readonly favoritesClick = output<void>();
}
