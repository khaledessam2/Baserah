import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '@/core/interceptors/api.interceptor';
import type { RequestOptions } from '@/models/http.model';

/**
 * Observable-based HTTP facade over HttpClient, scoped to `/api/v1`.
 *
 * Each method returns the cold HttpClient observable untouched, so callers get
 * the usual Angular semantics: nothing is sent until someone subscribes, and
 * unsubscribing (e.g. via `takeUntilDestroyed`) aborts the in-flight request.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(url: string, options?: RequestOptions): Observable<T> {
    return this.http.get<T>(this.resolve(url), this.build(options));
  }

  post<T>(url: string, body?: unknown, options?: RequestOptions): Observable<T> {
    return this.http.post<T>(
      this.resolve(url),
      body ?? null,
      this.build(options)
    );
  }

  put<T>(url: string, body?: unknown, options?: RequestOptions): Observable<T> {
    return this.http.put<T>(
      this.resolve(url),
      body ?? null,
      this.build(options)
    );
  }

  patch<T>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Observable<T> {
    return this.http.patch<T>(
      this.resolve(url),
      body ?? null,
      this.build(options)
    );
  }

  delete<T>(url: string, options?: RequestOptions): Observable<T> {
    return this.http.delete<T>(this.resolve(url), this.build(options));
  }

  /** `url` may already carry a query string, mirroring the React services. */
  private resolve(url: string): string {
    return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  }

  private build(options?: RequestOptions) {
    // Undefined/null params are dropped so optional args stay off the query
    // string entirely — axios behaved the same way.
    let params = new HttpParams();
    for (const [key, value] of Object.entries(options?.params ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return {
      params,
      responseType: (options?.responseType ?? 'json') as 'json',
    };
  }
}
