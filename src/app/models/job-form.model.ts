/** job-form models. */

export interface JobFormSubmission {
  inputMethod: 'database' | 'manual';
  jobTitle: string;
  jobDescription: string;
  jobLevel: string;
  competencySource: string;
}

export interface JobFormInitialData {
  jobTitle?: string;
  jobDescription?: string;
  jobLevel?: string;
}
