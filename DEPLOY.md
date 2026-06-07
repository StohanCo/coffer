# Deploying FinOps Local to `homefinance.findyou.work`

This deploys FinOps Local as a single Docker container on the **same Contabo VPS**
that already runs `calls.findyou.work`. The box's existing nginx terminates TLS and
reverse-proxies the new subdomain to the container, which is bound to `127.0.0.1`
only (never exposed publicly).

```
Internet ──▶ nginx (443, Let's Encrypt) ──▶ 127.0.0.1:8760 ──▶ Docker: finops-local (:3000)
                                                                   ├─ volume finops_data    → /data (SQLite)
                                                                   └─ volume finops_uploads → /uploads (receipts)
```

Port `8760` is used because the calls app already holds `8750` on this server.

---

## 0. Prerequisites on the server

You already have nginx + certbot from the calls setup. You only need Docker:

```bash
# Docker Engine + compose plugin (Ubuntu)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER     # log out/in afterwards so the group applies
docker --version
docker compose version
```

---

## 1. DNS (GoDaddy)

Add one `A` record pointing at the same server IP as `calls`:

| Type | Host          | Value (points to) |
| ---- | ------------- | ----------------- |
| `A`  | `homefinance` | `YOUR.SERVER.IP`  |

Verify before continuing:

```bash
dig +short homefinance.findyou.work    # should print the server IP
```

---

## 2. Copy the project to the server

From your **laptop** (Windows PowerShell or Git Bash):

```bash
rsync -av --exclude node_modules --exclude .next --exclude data --exclude uploads \
  ./finops-local/ stas@YOUR.SERVER.IP:/opt/finops-local/
```

> No rsync on Windows? Use `scp -r` or push the repo to GitHub and `git clone` it
> into `/opt/finops-local` on the server.

---

## 3. Configure environment

On the **server**:

```bash
cd /opt/finops-local
cp .env.example .env
```

Edit `.env` and set at minimum:

```ini
BETTER_AUTH_SECRET=<openssl rand -base64 32>
CRON_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://homefinance.findyou.work
NEXT_PUBLIC_APP_URL=https://homefinance.findyou.work
NEXT_PUBLIC_DEFAULT_CURRENCY=NZD
NEXT_PUBLIC_DEFAULT_LOCALE=en-NZ
```

> Receipt scanning needs no configuration — it runs on-server via the `tesseract`
> binary baked into the image. No API key, no third party.

Generate the two secrets:

```bash
openssl rand -base64 32   # run twice, paste into BETTER_AUTH_SECRET and CRON_SECRET
```

`BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` **must** be the public `https://` URL —
auth cookies and receipt image links are built from them.

---

## 4. Build and start the container

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f app
```

On first boot the app **creates the database schema automatically** by applying the
bundled SQL migrations (`drizzle/`) — no manual `db:push` needed. Watch for
`[migrate] schema up to date` in the logs.

Sanity check it from the server:

```bash
curl -s http://127.0.0.1:8760/api/health    # -> {"ok":true,"db":"connected"}
```

---

## 5. nginx site + HTTPS

```bash
sudo cp deploy/nginx-homefinance.findyou.work.conf \
        /etc/nginx/sites-available/homefinance.findyou.work.conf
sudo ln -s /etc/nginx/sites-available/homefinance.findyou.work.conf \
           /etc/nginx/sites-enabled/homefinance.findyou.work.conf
sudo nginx -t
sudo systemctl reload nginx

# Certbot adds the 443 block and the HTTP->HTTPS redirect automatically
sudo certbot --nginx -d homefinance.findyou.work
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. Verify the whole flow

1. Open `https://homefinance.findyou.work/register`.
2. Create your account (email/password — first user is just you).
3. Add an account, a transaction, upload a receipt — confirm the image renders.

---

## 7. Backups

Everything lives in two Docker named volumes. Back them up periodically:

```bash
# SQLite database
docker run --rm -v finops-local_finops_data:/data -v $PWD:/backup alpine \
  tar czf /backup/finops-data-$(date +%F).tar.gz -C /data .

# Receipt uploads
docker run --rm -v finops-local_finops_uploads:/uploads -v $PWD:/backup alpine \
  tar czf /backup/finops-uploads-$(date +%F).tar.gz -C /uploads .
```

> Volume names are prefixed with the compose project name (the folder, `finops-local`).
> Confirm with `docker volume ls`.

---

## 8. Updating later

From your **laptop**, re-sync and rebuild:

```bash
rsync -av --exclude node_modules --exclude .next --exclude data --exclude uploads \
  ./finops-local/ stas@YOUR.SERVER.IP:/opt/finops-local/

ssh stas@YOUR.SERVER.IP \
  "cd /opt/finops-local && docker compose -f docker-compose.prod.yml up -d --build"
```

New migrations are applied automatically on the next boot. The data volumes are
untouched by rebuilds.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `502 Bad Gateway` | Container not up or unhealthy — `docker compose -f docker-compose.prod.yml ps` and check logs. |
| Login redirects loop / cookie errors | `BETTER_AUTH_URL` doesn't match the public URL. Fix `.env`, then `up -d`. |
| Receipt images 404 | `NEXT_PUBLIC_APP_URL` wrong, or nginx `client_max_body_size` too small for the upload. |
| Empty/blank data after deploy | Check logs for `[migrate]` — a failed migration aborts boot. |
| Port already in use | Another service on `8760`; change the host port in `docker-compose.prod.yml` and the nginx `proxy_pass`. |
