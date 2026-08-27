# LMS Frontend Decisions

This file records the frontend standard for `unisole-lms`.

## Role

- Student-facing learning platform.
- Covers public discovery, authentication, enrolled content, lesson playback, and payments.

## Stack

- Vite
- React
- TypeScript
- React Router
- Redux Toolkit
- RTK Query
- shadcn/ui
- Tailwind CSS

## Backend Usage

- Primary API groups:
  - `/api/auth/*`
  - `/api/public/*`
  - `/api/lms/*`

## Architecture Notes

- Keep routing as the main application structure.
- Use protected routes for enrolled content and learner-only views.
- Keep auth/session in Redux Toolkit.
- Use RTK Query for catalog, pathway, lesson, enrollment, and payment data.

## Recommended Folder Shape

- `src/app`
- `src/features`
- `src/pages`
- `src/components/ui`
- `src/components/shared`
- `src/api`
- `src/lib`

## LMS-Specific Rules

- Keep the public catalog easy to index and navigate.
- Keep learner flows simple and mobile friendly.
- Use shadcn/ui components for forms, cards, tabs, progress, dialogs, and navigation.
