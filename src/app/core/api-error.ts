import { HttpErrorResponse } from '@angular/common/http';

/**
 * Axios-shaped error wrapper.
 *
 * The React app read failures as `error.response?.data?.detail`. Keeping that
 * exact shape here means every ported `catch` block behaves identically without
 * having to be rewritten for `HttpErrorResponse`.
 */
export class ApiError extends Error {
  readonly response: { status: number; statusText: string; data: any };
  readonly status: number;

  constructor(httpError: HttpErrorResponse) {
    super(ApiError.messageFrom(httpError));
    this.name = 'ApiError';
    this.status = httpError.status;
    this.response = {
      status: httpError.status,
      statusText: httpError.statusText,
      data: httpError.error,
    };
  }

  private static messageFrom(httpError: HttpErrorResponse): string {
    const body = httpError.error;
    if (typeof body === 'string' && body) return body;
    if (body && typeof body === 'object') {
      const detail = (body as Record<string, unknown>)['detail'];
      if (typeof detail === 'string') return detail;
      if (Array.isArray(detail) && detail.length) {
        // FastAPI validation errors arrive as a list of {loc, msg, type}
        return detail
          .map((d: any) => (typeof d?.msg === 'string' ? d.msg : JSON.stringify(d)))
          .join(', ');
      }
      const message = (body as Record<string, unknown>)['message'];
      if (typeof message === 'string') return message;
    }
    return httpError.message || `Request failed with status ${httpError.status}`;
  }
}
