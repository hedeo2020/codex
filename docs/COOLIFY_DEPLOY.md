# Coolify Deployment Guide

This app can run on Coolify with any domain name you control, such as `attendance.example.com` or `hr.company.net`.

## Recommended setup

- Use the included `Dockerfile`.
- Use a dedicated PostgreSQL service in Coolify.
- Terminate HTTPS at Coolify with your chosen public domain.
- Keep the application container private and expose only the mapped web endpoint.

## Create the app

1. In Coolify, create a new application from your Git repository or uploaded source.
2. Choose Dockerfile-based deployment.
3. Point the build context to the project root.
4. Leave the exposed port as `3000`.

## Add the database

1. Create a PostgreSQL service in the same Coolify project.
2. Copy the internal database connection string into the app's `DATABASE_URL` environment variable.
3. Make sure the URL uses the PostgreSQL Prisma format:

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE?schema=public
```

## Required environment variables

Set these in the Coolify app before deploying:

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE?schema=public
SESSION_SECRET=replace-with-a-long-random-secret
BIOMETRIC_ENCRYPTION_KEY=replace-with-a-base64-encoded-32-byte-key
APP_URL=https://attendance.example.com
NODE_ENV=production
BIOMETRIC_PROVIDER=mock
BIOMETRIC_TEMPLATE_RETENTION_DAYS=365
AUDIT_LOG_RETENTION_DAYS=2555
ATTENDANCE_RETENTION_DAYS=2555
TEMP_IMAGE_RETENTION_MINUTES=0
VERIFICATION_THRESHOLD=0.82
MAX_VERIFICATION_ATTEMPTS=3
```

Generate secure values like this:

- `SESSION_SECRET`: any random string of 32+ characters.
- `BIOMETRIC_ENCRYPTION_KEY`: output of `openssl rand -base64 32`.

## Domain and SSL

1. Attach any domain or subdomain in Coolify.
2. Turn on HTTPS/SSL in Coolify.
3. Set `APP_URL` to the exact public URL, including `https://`.

Examples:

- `https://attendance.example.com`
- `https://hr.company.org`
- `https://staff.company.net`

## Health check

Set the health check path to:

```text
/api/health
```

The route returns `200` when the app and database are available.

## First deployment behavior

On startup, the container runs `prisma db push` and `prisma db seed` before launching the app. This means:

- a fresh database will be initialized automatically
- the initial admin and employee accounts will be created automatically
- schema updates from this project will be applied on redeploy
- you do not need to run manual migration or seed commands in Coolify for the first release

## Important production note

`BIOMETRIC_PROVIDER=mock` is only suitable for demonstration and internal testing. Before real face-based attendance use, replace it with a reviewed server-side verification provider that includes liveness checks and keeps biometric processing out of the browser.
