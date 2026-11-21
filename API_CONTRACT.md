# API Contract — Arabic Step for Life (single source of truth)

Base: Express serves static frontend from `public/` and JSON API under `/api`.
All API responses: `{ "success": true, "data": ... }` or `{ "success": false, "error": "message" }`.
Auth: session cookie (`express-session`, `connect-pg-simple` store). Frontend uses `fetch(..., { credentials: 'same-origin' })`.

## Auth
- POST /api/auth/register {firstName,lastName,email,phone?,password} → 201 {user}
- POST /api/auth/login {email,password} → 200 {user}
- POST /api/auth/logout → 200
- GET  /api/auth/me → 200 {user} or 401
- GET  /api/auth/verify?token=XXX → 200 (marks verified; page verify handled by frontend link)
- POST /api/auth/forgot-password {email} → 200 (always generic message)
- POST /api/auth/reset-password {token,newPassword} → 200
- GET  /api/auth/profile → 200 {user}; PUT /api/auth/profile {firstName,lastName,phone} → 200 {user}
- User JSON: {id, firstName, lastName, email, phone, role, isActive, emailVerified, createdAt} — NEVER passwordHash.

Roles: USER, ADMIN, SUPER_ADMIN. Inactive users cannot log in; sessions invalidated on deactivation.

## Programs (public)
- GET /api/programs → active programs only [{id,slug,title,category,shortDescription,description,imageUrl,isActive}]
- GET /api/programs/:slug → one active program (public) — admin uses /api/admin/programs/:id for any
- Categories: BURN_SUPPORT, NEWCOMER, ARABIC, COMMUNITY (free-text string also OK, but use these)

## Applications (auth USER+)
- POST /api/applications {programId, applicantFirstName, applicantLastName, applicantEmail, applicantPhone?, details, needs?} → 201 {application} with trackingCode like `ASL-2026-XXXXXX`
- GET /api/applications/mine → own applications
- GET /api/applications/track/:code?email=xxx → public tracking: returns {trackingCode,status,programTitle,submittedAt} ONLY if email matches applicant email
- GET /api/applications/:id → own application only (or admin)

Statuses: Pending, Under Review, Approved, Rejected, Completed (store as PENDING, UNDER_REVIEW, APPROVED, REJECTED, COMPLETED; API returns both `status` enum and `statusLabel`).

## Messages (auth)
- GET /api/messages → own messages (sent + received), newest first
- POST /api/messages {recipientId?, applicationId?, subject, body} → user sending to admin: omit recipientId (goes to admins); reply: include applicationId or recipientId
- PATCH /api/messages/:id/read → mark read (recipient only)
- Message JSON: {id, senderId, senderName, senderRole, recipientId, applicationId, subject, body, isRead, createdAt}

## Notifications (auth)
- GET /api/notifications → own, newest first; GET /api/notifications/unread-count → {count}
- PATCH /api/notifications/:id/read; PATCH /api/notifications/read-all

## Stats (public)
- GET /api/stats → {peopleSupported, volunteers, statesReached, corePrograms} (corePrograms = count of active programs, computed)

## Donations
- POST /api/donations/checkout {amount, donorName?, donorEmail?, message?} → 200 {url} Stripe Checkout URL when configured; 503 {error, setupRequired:true} when Stripe keys absent. Amount in USD dollars (number, min 1, max 100000). One-time only.
- GET /api/donations/verify?session_id=XXX → 200 {donation} after success redirect
- POST /api/webhooks/stripe → raw body, signature verify with STRIPE_WEBHOOK_SECRET; on checkout.session.completed inserts/updates Donation (status COMPLETED)
- Donation JSON: {id, amount, currency, status, donorName, donorEmail, createdAt}

## Contact
- POST /api/contact {name, email, phone?, subject, message} → 201 {id} (stored; email sent only if SMTP configured)

## Admin (role ADMIN or SUPER_ADMIN unless noted)
- GET /api/admin/overview → {totalUsers, totalApplications, pendingApplications, activePrograms, donationsTotal, donationsCount, recentApplications}
- GET /api/admin/applications?search=&status=&programId=&page=&limit= → paginated {items, total, page, pages}
- PATCH /api/admin/applications/:id/status {status} → updates + notifies applicant + audit log
- GET /api/admin/programs → all programs incl. inactive; POST /api/admin/programs; PUT /api/admin/programs/:id; DELETE /api/admin/programs/:id; PATCH /api/admin/programs/:id/toggle
- GET /api/admin/stats; PUT /api/admin/stats {peopleSupported, volunteers, statesReached}
- GET /api/admin/users?search=&page= → {items,total}; PATCH /api/admin/users/:id/role {role} (SUPER_ADMIN only); PATCH /api/admin/users/:id/status {isActive} (SUPER_ADMIN only; cannot self-deactivate; cannot deactivate last active SUPER_ADMIN)
- GET /api/admin/messages?userId=&applicationId= → all; POST /api/admin/messages {recipientId, applicationId?, subject, body} → sends + notifies
- GET /api/admin/donations?page= → {items,total}
- GET /api/admin/search?q= → {users:[], applications:[]} global search
- GET /api/admin/audit-logs?page= → {items,total}
- GET /api/admin/contact-messages → contact form submissions; PATCH /api/admin/contact-messages/:id/read

## Frontend pages (in public/)
index.html, about.html, programs.html, program.html (detail + apply, ?slug=), burn-support.html, newcomer-support.html, arabic-learning.html, get-involved.html, donate.html, contact.html, register.html, login.html, forgot-password.html, reset-password.html, dashboard.html, admin.html, css/style.css, js/main.js, js/auth.js, js/dashboard.js, js/admin.js, js/api.js
- All pages share header/footer via JS include (js/main.js injects) OR duplicated markup — use JS injection from js/layout.js to stay consistent.
- Brand: teal #0F766E, navy #0B2545, orange #F97316, green #16A34A, white/light neutrals. Slogan "Healing, Belonging & Hope".
- NEVER invent EIN, registration numbers, tax-exempt status, real address, phone, email, testimonials, or impact stats. Use placeholders clearly labeled, e.g. "[Placeholder — address to be provided by the organization]".
- Images: use Unsplash source URLs (images.unsplash.com direct photo URLs) with onerror fallback to a CSS gradient; do NOT hotlink expiring links; pick stable Unsplash photo IDs.
