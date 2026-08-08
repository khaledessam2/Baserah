import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PieController,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
  type ChartConfiguration,
  type ChartType,
} from 'chart.js';
import { ThemeService } from '@/services/theme.service';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  PieController,
  DoughnutController,
  ArcElement,
  RadarController,
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  Filler,
  Legend,
  Tooltip
);

/**
 * Chart.js wrapper standing in for recharts' `<ResponsiveContainer>` + chart
 * elements. Covers the chart kinds the app draws: bar, pie/doughnut, radar and
 * filled area (a line with `fill`).
 *
 *   <app-chart type="bar" [data]="data" [options]="opts" class="h-[300px]" />
 *
 * The host is `block` with no intrinsic height — give it one the way the
 * recharts containers were sized.
 */
@Component({
  selector: 'app-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block relative w-full h-full' },
  templateUrl: './chart.html',
})
export class ChartComponent implements OnDestroy {
  readonly type = input.required<ChartType>();
  readonly data = input.required<ChartConfiguration['data']>();
  readonly options = input<ChartConfiguration['options']>({});

  private readonly canvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly theme = inject(ThemeService);
  private chart?: Chart;

  constructor() {
    effect(() => {
      // Tracked: everything that should force a redraw.
      const type = this.type();
      const data = this.data();
      const options = this.options();
      this.theme.theme();

      this.chart?.destroy();
      this.chart = new Chart(this.canvas().nativeElement, {
        type,
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          ...options,
        },
      });
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
