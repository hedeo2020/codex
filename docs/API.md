# API overview

All authenticated endpoints use a secure, HTTP-only, SameSite=Strict session cookie. Administrator routes enforce role checks. JSON validation failures return `400`, missing sessions `401`, and insufficient roles `403`.

Implemented routes:

- `POST /api/auth/login`, `POST /api/auth/logout`
- `GET|PATCH /api/employees/me`
- `GET|POST /api/employees/me/attendance`
- `POST /api/employees/me/biometric-consent`
- `DELETE /api/employees/me/biometric-profile`
- `GET|POST /api/admin/employees`

Attendance POST body for PIN: `{ "type": "CHECK_IN", "method": "PIN", "timezone": "Asia/Singapore", "pin": "..." }`.

Attendance POST body for face: `{ "type": "CHECK_IN", "method": "FACE", "timezone": "Asia/Singapore", "captureToken": "..." }`.

The server now verifies the PIN hash directly before attendance is recorded. Face verification adapters must return only a pass/fail result plus a restricted audit score; never a stored template or browser-decided match flag.

The remaining endpoints from the specification should follow the same service, validation, role-check, reason-field, and audit patterns before production rollout.
