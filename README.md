# Clockwise - Face Attendance Management System

A privacy-first attendance application based on the supplied 17-page specification. It now supports live employee and administrator workspaces, real login sessions, server-verified PIN attendance, consent and deletion controls, audit logging, reporting, and production biometric-provider configuration.

## Important scope and safety boundary

This application verifies a known, consenting employee who has initiated an attendance event. It must never identify unknown people or be used for hiring, firing, ranking, discipline, performance scoring, or automated employment decisions. Facial attendance is optional. PIN and administrator-assisted attendance remain available.

PIN attendance is ready for production use. Face attendance now runs behind a server-side provider contract, but still requires you to connect a reviewed liveness/verification provider before real biometric use. Do not send stored embeddings to the browser or let the browser declare a match result.

## Local setup

1. Install Node.js 22+, PostgreSQL 17+, and npm.
2. Copy `.env.example` to `.env` and replace every secret. Generate the biometric key with `openssl rand -base64 32`.
3. Run `npm install`, `npx prisma migrate dev --name init`, and `npm run db:seed`.
4. Start with `npm run dev` and visit `http://localhost:3000`.

Development seed accounts are listed in `prisma/seed.ts`; their development-only password is `ChangeMe!2026` and the development PIN is `246810`. Change both immediately outside local development.

## Verification before deployment

Run `npm test` and `npm run build`. Deploy behind HTTPS, rotate all secrets, use a managed PostgreSQL database with encrypted backups, configure a reviewed liveness provider, add MFA for administrators, connect transactional email for password reset, perform a privacy impact assessment, and arrange independent security testing.

## Coolify deployment

This project is ready for Docker-based deployment on Coolify behind any HTTPS domain you attach to the service.

1. Create a new application in Coolify from this folder or Git repository and select the included `Dockerfile`.
2. Add a PostgreSQL service in Coolify, then set `DATABASE_URL` on the app to the internal connection string Coolify provides.
3. Set `SESSION_SECRET` to a long random string and `BIOMETRIC_ENCRYPTION_KEY` to a base64-encoded 32-byte key.
4. Set `APP_URL` to your real public domain, for example `https://attendance.yourdomain.com`.
5. Keep the container port at `3000` and use `/api/health` as the health check path.
6. Deploy once; the container will create or update the Prisma schema automatically on startup.

Detailed steps are in [docs/COOLIFY_DEPLOY.md](./docs/COOLIFY_DEPLOY.md).

## Data lifecycle

- Temporary captures: memory-only and deleted immediately after processing by default.
- Templates: AES-256-GCM encrypted in a separate table; default expiry 365 days.
- Attendance/audit data: default seven years, configurable to local legal requirements.
- Deletion: clears ciphertext, IV, and authentication tag, records a reason, withdraws consent, switches the employee to PIN, and creates an audit entry.

See `docs/` for API, privacy, consent, deployment, and user guides.
