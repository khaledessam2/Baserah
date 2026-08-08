/**
 * Development environment — used by `ng serve` and `ng build --configuration development`.
 *
 * Swapped for `environment.production.ts` in production builds via the
 * `fileReplacements` entry in angular.json.
 *
 * There is no dev proxy: the app calls the live API cross-origin. That works
 * because auth is a bearer token from localStorage (not cookies) and the API
 * allows the dev origin.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'https://baserah.ai/api/v1',
};
