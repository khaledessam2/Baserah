# Baserah — Angular Frontend

An Angular 22 frontend for the Baserah competency-analysis platform. It talks to the
same FastAPI backend as the existing React client (`baserah/src/Frontend-React`) —
same endpoints, same payloads, same auth — and reproduces its design and behaviour.

The backend is untouched by this project.

## Running it

```bash
npm install
npm start            # dev server on http://localhost:5173
```

The API base URL lives in `src/environments/environment.ts`, and points at the
live backend (`https://baserah.ai/api/v1`) — there is no dev proxy and no local
backend to run. Production builds swap in `environment.production.ts` via the
`fileReplacements` entry in `angular.json`.

```bash
npm run build        # production build → dist/baserah-angular/browser
```

## Layout

Every component lives in its own folder holding its `.ts` and its `.html`
template — no inline templates, one component per file. All interfaces live in
`models/`.

```
components/dashboard/job-form/
  job-form.ts
  job-form.html
```

```
src/
  environments/              apiBaseUrl per build configuration
  locales/{ar,en}.json       Translation bundles (copied from the React app)
  styles.css                 Design tokens, dark theme, RTL rules, animation utilities
  app/
    core/                    HTTP plumbing only: api-error + interceptors/
    guards/                  Route guards (authGuard)
    models/                  Every interface: DTOs, service contracts and
                             component payloads (api, employee, competency,
                             kpi, job-form, analysis, skills-gap, tour, …)
    services/                Every @Injectable: api, auth, i18n, theme, toast,
                             tour + one service per API area
    shared/                  Reused across features
      components/            Primitives, one folder each: icon, chart, dialog,
                             select, tabs, slider, progress, toaster,
                             confirmation-modal, guided-tour
      directives/            button, card, form-controls, reveal
      pipes/                 translate pipe (`| t`)
      utils/                 cn, host-class, pdf-export
      icons/                 Icon set
      config/                Guided-tour step definitions
    components/              Feature components
      layout/                Navbar, layout shell, wizard, theme + language toggles
      landing/               Marketing sections
      dashboard/             Job form, results view, competency selector, modals
      competencies/          Competency + KPI modals and category sections
      skills-gap/            The analysis tabs and their shared cards
    pages/                   17 routed pages
```

Imports resolve through the `@/*` alias (`@/services/…`, `@/models/…`,
`@/shared/…`), configured in `tsconfig.json`.

## How the React concepts map

| React | Angular |
| --- | --- |
| `axios` + `apiClient` | `ApiService` (promise-based over `HttpClient`) + `apiInterceptor` |
| `AuthContext` / `ThemeContext` / `TourContext` | Root-provided services holding signals |
| `useToast` | `ToastService` + `<app-toaster>` |
| `react-router` + `ProtectedRoute` | `provideRouter` + `authGuard(roles)` |
| Radix primitives | Hand-written standalone components on the same Tailwind classes |
| `lucide-react` | `<app-icon name="…">` over the framework-agnostic `lucide` package |
| `recharts` | `<app-chart>` over Chart.js |
| `framer-motion` | CSS transitions + the `appReveal` IntersectionObserver directive |
| `i18next` | `I18nService` + the `| t` pipe (same `i18nextLng` storage key) |

## Things worth knowing

**Errors keep the axios shape.** `ApiError` exposes `error.response.data.detail`,
so the error handling ported from React works unchanged.

**Arabic property names need bracket access in templates.** Angular's template
parser only accepts ASCII identifiers after a dot, so employee fields are read as
`emp['اسم_الموظف']` in templates. TypeScript code uses dot access normally.

**Icon fill.** `app-icon` defaults to `fill: none` via a low-specificity element
rule in `styles.css`, so a `fill-*` utility class on an icon still wins — that is
what makes the filled priority stars render.

**Two fixes carried over from the React source:**

- The competency distribution donut used bare `var(--primary)`, but those custom
  properties hold HSL *components*, so the slices got an invalid colour. Now
  wrapped in `hsl()`.
- The landing hero loaded its art from `/src/assets/…`, a path that only resolves
  under the Vite dev server. The images live in `public/assets/` and are loaded
  from `/assets/…`.
