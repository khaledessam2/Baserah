/** Models for api.service. */

export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;

export interface RequestOptions {
  params?: QueryParams;
  responseType?: 'json' | 'blob' | 'text';
}
