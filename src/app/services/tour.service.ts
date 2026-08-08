import { Injectable, signal } from '@angular/core';
import type { TourStep } from '@/models/tour.model';

/** Port of `contexts/TourContext.tsx`. */
@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly openState = signal(false);
  private readonly stepList = signal<TourStep[]>([]);
  private currentTourId: string | null = null;

  readonly isOpen = this.openState.asReadonly();
  readonly steps = this.stepList.asReadonly();

  startTour(newSteps: TourStep[], tourId: string): void {
    this.stepList.set(newSteps);
    this.currentTourId = tourId;
    this.openState.set(true);
  }

  closeTour(): void {
    this.openState.set(false);
    if (this.currentTourId) {
      localStorage.setItem(`hasSeenTour_${this.currentTourId}`, 'true');
    }
  }

  hasSeen(tourId: string): boolean {
    return localStorage.getItem(`hasSeenTour_${tourId}`) === 'true';
  }
}
