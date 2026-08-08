import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlobalWizard } from '../global-wizard/global-wizard';
import { Navbar } from '../navbar/navbar';

/** Port of `layout/Layout.tsx` — the shell behind every /app route. */
@Component({
  selector: 'app-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Navbar, GlobalWizard],
  templateUrl: './layout.html',
})
export class Layout {}
