# Repository Guidelines

## Project Structure & Module Organization
The Next.js app lives in `src/app` with route groups for `dashboard`, `editor`, `settings`, and `auth`. Shared UI sits in `src/components`, state in `src/store`, and reusable hooks in `src/hooks`. Client-side analyzers and validators stay under `src/utils` and `src/services`, surfaced through `src/hooks/useAnalysis.js`; please do not move them back to `server/analyzers`. The Express bridge supporting legacy uploads is in `server/index.js` with feature logic in `server/{routes,processors}`. Static assets ship from `public/`, and deployment adapters live in `api/serverless.js`.

## Build, Test, and Development Commands
Run `npm install` once per environment. Use `npm run dev` for concurrent Next.js + Express development, or `npm run server` when you need the API alone. Ship builds with `npm run build` and start the compiled app via `npm run start`. Lint JavaScript and JSX with `npm run lint` before submitting changes.

## Coding Style & Naming Conventions
Write modern functional React with hooks. Keep files in PascalCase for components (`DocumentSidebar.jsx`) and camelCase for utilities. Use 2-space indentation, trailing commas where ESLint requests, and prefer const/arrow functions. Import paths should rely on the `@/` alias for modules inside `src`. Run the lint task to catch spacing issues and unused imports.

## Testing Guidelines
No automated test harness exists yet, and new tests must not be added without alignment. Validate changes by running `npm run dev` and exercising key flows in the browser: upload a sample .docx, verify analyzer highlights, confirm Supabase-authenticated routes load, and inspect console/network noise. Share manual QA notes with your pull request.

## Commit & Pull Request Guidelines
Follow the existing short-subject style (`copywrite`, `sitemap fix?`). Keep subjects under ~50 characters, start with a lowercase imperative or noun, and avoid punctuation unless it conveys uncertainty. Each PR should link any tracking issue, describe the user-facing impact, list the manual QA steps performed, and include screenshots or recordings when UI changes are involved. Tag reviewers who own the affected area (app, server, or Supabase schema).
