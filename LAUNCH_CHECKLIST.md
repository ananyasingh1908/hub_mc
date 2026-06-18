# HUBMC — Launch Checklist

## Pre-Launch (T-7 days)

### Environment & Config
- [ ] All env vars set in production (`.env` / Cloudflare secrets): `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPER_ADMIN_ID`, `SUPER_ADMIN_PASSWORD`, `YOUTUBE_API_KEY`, `DISCORD_BOT_TOKEN`, `MC_RCON_HOST`, `MC_RCON_PASSWORD`, `VITE_GA_ID`, `VITE_CLARITY_ID`, `VITE_SENTRY_DSN`
- [ ] `wrangler.jsonc` vars updated for production (`BASE_URL`, `SUPER_ADMIN_ID`, `YOUTUBE_CHANNEL_ID`, `DISCORD_SERVER_ID`, `DISCORD_INVITE`, `MC_RCON_PORT`)
- [ ] No secrets committed to git (check `.env` is in `.gitignore`)
- [ ] Database migrations applied (`npx prisma migrate deploy`)
- [ ] Database seed data loaded (`npx tsx prisma/seed.ts`)

### Build & Deploy
- [ ] App builds without errors (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] Preview build works locally (`npm run preview`)
- [ ] Deploy to staging/production (`npx wrangler deploy`)

### Monitoring & Analytics
- [ ] Sentry project created and DSN configured; test error capture
- [ ] GA4 property created and Measurement ID configured; verify real-time events
- [ ] Microsoft Clarity project created and Project ID configured
- [ ] Cookie consent banner implemented and tested (accept/reject)
- [ ] Custom analytics events firing (add to cart, tournament registration, etc.)

### Auth & Security
- [ ] Google OAuth consent screen published and test users removed
- [ ] Google Client ID/Secret restricted to production redirect URIs
- [ ] JWT_SECRET is a strong, random value
- [ ] CORS / CSP headers configured on Cloudflare
- [ ] SSL enforced (Cloudflare edge certificates)

### Features
- [ ] Google login flow works end-to-end
- [ ] Admin panel accessible (via `SUPER_ADMIN_ID`)
- [ ] Minecraft RCON connection verified (can execute commands)
- [ ] Discord bot token valid and bot is in the server
- [ ] YouTube API key works and channel videos load
- [ ] Package listing and add-to-cart flow tested
- [ ] Tournament listing and registration tested
- [ ] Checkout / order flow works (test with real/payment flow)

### Content & Data
- [ ] Minecraft packages published and priced
- [ ] Tournaments created and visible
- [ ] Static pages (About, Terms, Privacy, Contact) reviewed
- [ ] SEO meta tags set on all routes

### Infrastructure
- [ ] Database backups configured (cron job / scheduled Workers)
- [ ] S3 bucket (or equivalent) created for off-server backups
- [ ] Retention policy applied to backup rotation
- [ ] DNS records configured (`hubmc.in` pointing to Cloudflare)
- [ ] Email sending configured (if any transactional emails)

---

## Launch Day (T-0)

### Final Checks
- [ ] All env vars double-checked in production
- [ ] `BASE_URL` points to `https://hubmc.in`
- [ ] Database connection pool healthy
- [ ] Sentry test event sent and visible in dashboard
- [ ] Last build deployed (`npx wrangler deploy`)
- [ ] SSL certificate valid (not expired)
- [ ] DNS fully propagated (`dig hubmc.in`)

### Soft Launch
- [ ] Smoke-test every major route: Home, Packages, Tournaments, Cart, Checkout, Dashboard, Admin
- [ ] Login with Google (create a fresh account)
- [ ] Add package to cart and start checkout
- [ ] Register for a tournament
- [ ] Admin panel CRUD operations (create/edit/delete package, tournament)
- [ ] Check Sentry for any new errors
- [ ] Verify GA4 real-time reports show activity
- [ ] Check Cloudflare dashboard for 5xx errors
- [ ] Monitor database CPU/connections

### Go Live
- [ ] Flip DNS if using a blue/green deploy
- [ ] Announce on Discord
- [ ] Monitor Sentry + GA4 + Clarity for first hour
- [ ] Keep rollback plan ready (`git revert` + `wrangler deploy`)

---

## Post-Launch (T+1 day – T+7 days)

### Monitoring
- [ ] Check Sentry error trends — fix all new issues
- [ ] Review GA4 engagement metrics (bounce rate, pageviews, conversions)
- [ ] Review Clarity session recordings for UX issues
- [ ] Verify backup cron ran successfully
- [ ] Check database connection pool usage
- [ ] Monitor Cloudflare analytics (cache hit ratio, bandwidth)

### Iteration
- [ ] Prioritise and fix any launch-day bugs
- [ ] Review Google Search Console for indexing issues
- [ ] Set up uptime monitoring (e.g. Better Uptime, Pingdom)
- [ ] Set up weekly backup verification
- [ ] Schedule performance review (Lighthouse / Web Vitals)
