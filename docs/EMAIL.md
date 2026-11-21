# Email (SMTP) — Configuration Guide

## What emails the app sends

| Email | Trigger |
|---|---|
| Email verification | New registration (link valid 24 hours) |
| Password reset | Forgot-password request (link valid 1 hour) |
| Application confirmation | User submits a program application |
| Application status update | Admin changes an application status |
| New message notification | Admin messages a user (or vice versa) |
| Contact-form notification | Visitor submits the contact form (to `CONTACT_NOTIFICATION_EMAIL`, if set) |

## Behavior without SMTP

If no SMTP settings are configured, the app **logs the email and continues** — it never claims an email was delivered. Registration, login, applications, and dashboards all work without email. Verification links can be re-sent once SMTP is configured, and an admin can mark a user verified directly in the database if needed:

```sql
UPDATE users SET "emailVerified" = true WHERE email = 'user@example.org';
```

## Configuration

Add to `.env` and restart:

```env
SMTP_HOST=smtp.your-mail-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=Arabic Step for Life <noreply@your-domain.org>
CONTACT_NOTIFICATION_EMAIL=info@your-domain.org
```

Notes:

- `SMTP_SECURE=false` with port `587` (STARTTLS) is the common setting. Use `SMTP_SECURE=true` with port `465` if your provider requires implicit TLS.
- `SMTP_FROM` should be an address your provider allows you to send from; use the organization's real domain once it is set up.
- Any standard SMTP provider works: the organization's mail host, Gmail (with an app password), SendGrid, Amazon SES, Mailgun, etc. For Gmail, enable 2-Step Verification and create an App Password — a regular Gmail password will not work.
- `APP_URL` must be the site's real public URL — verification and password-reset links are built from it.

## Verifying delivery

1. Configure SMTP and restart the server.
2. Register a test account with an email you control.
3. Confirm the verification email arrives (check spam). Click the link — it should open `/verify.html` and confirm verification.
4. Use **Forgot password** for the same account and confirm the reset email arrives.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| No emails arrive, no errors in the log | SMTP variables unset or the server was not restarted after setting them |
| `EAUTH` / authentication errors | Wrong SMTP username/password, or provider requires an app-specific password |
| `ECONNREFUSED` / timeout | Wrong host/port, or the host blocks outbound SMTP (some VPS providers block port 25 — use 587/465) |
| Links in emails point to localhost | `APP_URL` is still `http://localhost:3000` — set it to the public URL |
| Emails land in spam | Set up SPF/DKIM/DMARC for the sending domain with your DNS provider |
