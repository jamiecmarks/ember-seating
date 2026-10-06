# Ember Melbourne Seat Picker

Live at https://jamiecmarks.github.io/ember-seating/

- **`/`**: staff pick their name and rank up to 3 desks. Nobody can see anyone else's picks.
- **`/admin/`**: password-protected. Heatmap of contested desks, attendance entry, the allocation with a showdown-style reveal, CSV download and "Clear results".

Add `?demo` to either URL to try it with fake data stored only in your browser (admin password `admin`).

## How it's built

| Part | Where | Notes |
| --- | --- | --- |
| Site | GitHub Pages, repo root | Plain HTML/CSS/JS, no build step. Pushing to `main` redeploys. |
| API | Cloudflare Worker, `worker/` | `https://ember-seating.ember-seating-worker.workers.dev` |
| Data | Cloudflare D1 database `ember-seating` | Tables `picks` and `attendance` (`worker/schema.sql`) |

The Worker only accepts requests from the GitHub Pages site (and localhost), and only returns picks with the admin password.

## Common tasks

Run these in **Git Bash** from the `worker/` folder. (This PC blocks the Command Prompt, which npm relies on, so PowerShell won't work for `npx` here. `worker/.npmrc` points npm at Git Bash.)

```bash
npx wrangler secret put ADMIN_PASSWORD   # set or change the admin password
npx wrangler deploy                      # deploy changes to worker/src/index.js
npx wrangler d1 execute ember-seating --remote --command "SELECT * FROM picks"   # peek at the data
```

First-time setup on a new machine: `npm install` in `worker/`, then `npx wrangler login`.

## Customise

`config.js`: staff names, `MAX_PICKS`, `ATTENDANCE_LABEL`, `OFFICE_NAME`.
Desk features (standing, snacks, window, door) are set at the top of `office.js`.

## How the allocation works

1. Staff are sorted by attendance (highest first). Ties go to whoever submitted first.
2. In that order, each person gets their highest-ranked desk that's still free.
3. Anyone whose picks were all taken gets one of the least-wanted desks left.

## Good to know

- No logins for staff: anyone can submit under any name, and resubmitting replaces the earlier picks.
- `/admin/` isn't linked from the main page, but the URL isn't secret. The password is what protects it.
