# Production Deployment Guide — Arabic Step for Life Website

## Overview

The application is a single Node.js/Express server that serves both the API and the static frontend from `public/`. It needs:

- Node.js ≥ 18
- PostgreSQL 16 (managed database recommended)
- HTTPS (required — secure cookies are enabled in production)
- A process manager and (optionally) a reverse proxy

Any host works: a VPS (Ubuntu), Render, Railway, Fly.io, Heroku, or similar. The steps below use a generic Linux VPS; adapt paths/commands for platform-as-a-service hosts.

## 1. Provision

1. Create a PostgreSQL database (e.g. `arabic_step_for_life`) and a dedicated database user with a strong password. Record the connection string.
2. Point your domain (e.g. `www.arabicstepforlife.org`) at the server and obtain an HTTPS certificate (e.g. Let's Encrypt via Certbot, or your platform's managed TLS).

## 2. Install the application

```bash
# On the server
unzip Arabic-Step-for-Life-Website.zip
cd arabic-step-for-life
npm install --omit=dev
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=production
PORT=3000
APP_URL=https://www.arabicstepforlife.org
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/arabic_step_for_life
SESSION_SECRET=<generate with: openssl rand -hex 32>
```

## 3. Database setup (first deploy only)

```bash
npx prisma generate
npx prisma migrate deploy
SEED_ADMIN_EMAIL=admin@your-org.org SEED_ADMIN_PASSWORD='<strong password>' npm run db:seed
```

> The seed is idempotent for stats/programs (it skips existing rows) but will fail if the admin email already exists — that is expected on re-runs. For later admin accounts use `npm run create-admin`.

## 4. Run the server

Use a process manager so the app restarts on crash/reboot:

```bash
# Option A — pm2
npm install -g pm2
pm2 start src/server.js --name arabic-step-for-life
pm2 save
pm2 startup   # follow the printed instructions

# Option B — systemd (create /etc/systemd/system/arabic-step-for-life.service)
# [Unit] Description=Arabic Step for Life website / After=network.target postgresql.service
# [Service] Type=simple / User=www-data / WorkingDirectory=/opt/arabic-step-for-life
# ExecStart=/usr/bin/node src/server.js / Restart=always
# Environment=NODE_ENV=production
# [Install] WantedBy=multi-user.target
```

## 5. Reverse proxy (Nginx example)

```nginx
server {
    listen 443 ssl;
    server_name www.arabicstepforlife.org;

    ssl_certificate     /etc/letsencrypt/live/www.arabicstepforlife.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.arabicstepforlife.org/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
server {
    listen 80;
    server_name www.arabicstepforlife.org;
    return 301 https://$host$request_uri;
}
```

## 6. Post-deploy checklist

- [ ] Open the site over HTTPS; confirm the homepage loads and `/api/health` returns `{status: "ok"}`.
- [ ] Log in as the seed SUPER_ADMIN; change the password if it was shared.
- [ ] Replace every `[Placeholder — …]` with real organizational information (search the codebase for `Placeholder`).
- [ ] Review/edit the 6 seeded programs in the admin dashboard; update impact stats.
- [ ] Configure Stripe (test mode first) — see `docs/STRIPE.md`.
- [ ] Configure SMTP — see `docs/EMAIL.md`.
- [ ] Set up nightly database backups (see README §8) and test a restore.
- [ ] Set up uptime monitoring and log rotation for the app logs.

## 7. Updating the application later

```bash
cd arabic-step-for-life
# Back up the database first!
pg_dump "$DATABASE_URL" -F c -f backup-$(date +%F).dump
# Deploy the new version, then:
npm install --omit=dev
npx prisma generate
npx prisma migrate deploy
pm2 restart arabic-step-for-life   # or: systemctl restart arabic-step-for-life
```

Never run `prisma migrate dev` in production — always `prisma migrate deploy`.
