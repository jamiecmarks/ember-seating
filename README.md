# Ember Melbourne Seat Picker

A static seat-picking app for GitHub Pages, backed by a Google Sheet.

- **`/`**: staff pick their name and up to 3 desks, ranked. Nobody can see anyone else's picks.
- **`/admin/`**: password-protected. Shows a heatmap of contested desks and who wants each one, lets you enter attendance, and runs the allocation with a one-by-one reveal.

Until `API_URL` is set in `config.js`, the app runs in **demo mode**. In demo mode data stays in your browser and the admin password is `admin`.

## 1. Set up the backend (Google Sheet + Apps Script, ~5 min)

1. Create a new Google Sheet (e.g. "Ember seating").
2. **Extensions → Apps Script**. Delete the starter code and paste in `apps-script/Code.gs`. Save.
3. **Project Settings** (gear icon) → **Script properties → Add script property**:
   `ADMIN_PASSWORD` = a password of your choice.
4. **Deploy → New deployment** → type **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click **Deploy**, authorise when asked, and copy the **Web app URL** (ends in `/exec`).
5. Paste that URL into `config.js` as `API_URL`.

The `Picks` and `Attendance` tabs are created automatically on first use.
If you change `Code.gs` later, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

## 2. Customise

Edit `config.js`:
- `STAFF`: names in the dropdown.
- `MAX_PICKS`, `ATTENDANCE_LABEL`, `OFFICE_NAME`.

Desk features (standing, snacks, window, door) are set at the top of `office.js`.

## 3. Publish on GitHub Pages

1. Create a GitHub repo and upload everything in this folder (`index.html`, `admin/`, `config.js`, `office.js`, `api.js`, `styles.css`; `apps-script/` is optional).
2. Repo **Settings → Pages → Build and deployment**: Source **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. After a minute your site is at `https://<user>.github.io/<repo>/`. Admin is at `…/<repo>/admin/`.

## How the allocation works

1. Staff are sorted by attendance (highest first). Ties go to whoever submitted first.
2. In that order, each person gets their highest-ranked desk that's still free.
3. Anyone whose picks were all taken gets one of the least-wanted desks left.

## Good to know

- No logins for staff: anyone can submit under any name, and resubmitting replaces the earlier picks. You're trusting the team here.
- Picks are only returned when the admin password is correct, so staff really can't see each other's choices.
- `/admin/` isn't linked from the main page, but the URL isn't secret. The password is what protects it.
- To remove someone's submission, delete their row in the `Picks` sheet.
