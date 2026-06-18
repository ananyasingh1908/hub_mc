# HUBMC — Backup & Recovery Guide

## Overview

This document covers backup and recovery procedures for the HUBMC production
environment. All backups should be taken regularly and stored off-server.

---

## 1. Database Backup (MySQL / MariaDB)

### Prerequisites

- `mysqldump` installed on the backup host
- Database credentials with `SELECT`, `LOCK TABLES`, `SHOW VIEW`, `TRIGGER`
  permissions (the same credentials in `DATABASE_URL` usually work)

### Procedure

```bash
# 1. Export the full database to a compressed file
mysqldump --single-transaction --quick \
  -h <host> -u <user> -p<hubmc_store> \
  | gzip > hubmc-db-$(date +%Y-%m-%d_%H%M%S).sql.gz

# 2. Copy to an off-server location (S3, rsync, etc.)
aws s3 cp hubmc-db-*.sql.gz s3://hubmc-backups/database/

# 3. Keep the last 30 days locally, remove older files
find . -name "hubmc-db-*.sql.gz" -mtime +30 -delete
```

### Production cron (example)

```cron
# Run daily at 03:00 UTC
0 3 * * * cd /opt/hubmc && ./scripts/backup-db.sh
```

### `scripts/backup-db.sh` example

```bash
#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR=/opt/hubmc/backups
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
mysqldump --single-transaction --quick \
  -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" \
  | gzip > "${BACKUP_DIR}/hubmc-db-${TIMESTAMP}.sql.gz"
find "${BACKUP_DIR}" -name "hubmc-db-*.sql.gz" -mtime +30 -delete
```

---

## 2. Database Restore

### Prerequisites

- Access to a MySQL client
- A recent `.sql.gz` backup file
- Target database must exist (or use `CREATE DATABASE` first)

### Procedure

```bash
# 1. Decompress the backup
gunzip -c hubmc-db-2025-06-18_030000.sql.gz > hubmc-restore.sql

# 2. Restore into the database
mysql -h <host> -u <user> -p<hubmc_store> < hubmc-restore.sql

# 3. Verify
mysql -h <host> -u <user> -p -e "SELECT COUNT(*) FROM User;" hubmc_store
```

### Point-in-time recovery (binlog)

If binary logs are enabled, replay events after the last full backup:

```bash
mysqlbinlog mysql-bin.000123 \
  --stop-datetime="2025-06-18 03:15:00" \
  | mysql -h <host> -u <user> -p<hubmc_store>
```

---

## 3. Uploaded Image Backup (Local Storage)

Images are stored in `public/uploads/` on the server filesystem.

### Procedure

```bash
# 1. Archive the uploads directory
tar -czf hubmc-uploads-$(date +%Y-%m-%d_%H%M%S).tar.gz -C /opt/hubmc public/uploads

# 2. Copy off-server
aws s3 cp hubmc-uploads-*.tar.gz s3://hubmc-backups/uploads/

# 3. Rotate
find . -name "hubmc-uploads-*.tar.gz" -mtime +30 -delete
```

### Recovery

```bash
# 1. Decompress into the correct location
tar -xzf hubmc-uploads-2025-06-18_030000.tar.gz -C /opt/hubmc

# 2. Verify file permissions
chmod -R 755 /opt/hubmc/public/uploads
```

---

## 4. Environment Variable Backup

### Procedure

```bash
# 1. Copy the live .env file
cp /opt/hubmc/.env hubmc-env-$(date +%Y-%m-%d_%H%M%S).bak

# 2. Encrypt with GPG (recommended)
gpg --recipient admin@hubmc.in --encrypt hubmc-env-*.bak

# 3. Store the encrypted copy off-server
aws s3 cp hubmc-env-*.bak.gpg s3://hubmc-backups/env/

# 4. Delete the unencrypted copy immediately
rm hubmc-env-*.bak
```

### Recovery

```bash
# 1. Download and decrypt
aws s3 cp s3://hubmc-backups/env/hubmc-env-2025-06-18.bak.gpg .
gpg --output .env --decrypt hubmc-env-2025-06-18.bak.gpg

# 2. Place in project root
cp .env /opt/hubmc/.env

# 3. Restrict permissions
chmod 600 /opt/hubmc/.env
```

---

## 5. Deployment Rollback

### Rollback a Vite/TanStack deployment

```bash
# 1. Revert to the previous build commit
git log --oneline -10
git revert HEAD --no-edit
# or
git reset --hard HEAD~

# 2. Rebuild
npm ci
npm run build

# 3. Redeploy (Cloudflare Workers / Pages)
npx wrangler deploy
# or
npx wrangler pages deploy dist/

# 4. Verify health
curl -I https://hubmc.in
```

### Rollback a database migration

```bash
# 1. Check migration history
npx prisma migrate status

# 2. Roll back to a specific migration
npx prisma migrate resolve --rolled-back <migration_name>

# 3. Restore the previous database backup (see section 2 above)
# 4. Regenerate the Prisma client
npx prisma generate
```

---

## 6. Backup Retention Policy

| Asset                 | Frequency | Retention | Storage Location  |
|-----------------------|-----------|-----------|-------------------|
| Full database dump    | Daily     | 30 days   | S3 + local        |
| Uploaded images       | Daily     | 30 days   | S3 + local        |
| Environment variables | On change | 90 days   | S3 (encrypted)    |
| Deployment artifacts  | Per build | 7 days    | CI/CD cache       |

---

## 7. Disaster Recovery Runbook

### Scenario: Database corruption

1. Stop the application
2. Restore the latest database backup (section 2)
3. Start the application
4. Verify user sessions and recent orders

### Scenario: Server failure (complete data loss)

1. Provision a new server
2. Restore `.env` from encrypted backup (section 4)
3. Clone the repository
4. Restore the database (section 2)
5. Restore uploaded images (section 3)
6. Run `npm ci && npm run build`
7. Deploy via `npx wrangler deploy`
8. Update DNS if the IP changed

### Scenario: Accidental file deletion

1. Restore the latest uploads archive (section 3)
2. Restart the app to clear any in-memory caches
