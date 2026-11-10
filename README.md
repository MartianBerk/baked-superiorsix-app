# baked-superiorsix-app

Expo + React Native (web-first) front end for **Superior Six**. One app wrapping Super Six, Euros, World Cup, and Admin as separate route-group experiences.

Bootstrap **SS-8** shipped the shell. **SS-50** adds login on the user widget (profile tab): baked-auth token with `audience=superiorsix`, persisted session, and a superiorsix BFF smoke call. Profile edit UI is **SS-51**.

## Requirements

- Node **≥ 20.19.4** (repo `.nvmrc` pins **22** — `nvm use`)
- npm (comes with Node)

## Run (web) against the local API stack

1. Start the backend with [`baked-superiorsix/local-dev`](../baked-superiorsix/local-dev) (auth `:8010`, user `:8020`, superiorsix `:8030`). Bootstrap + invite notes live in that README.
2. Point this app at those host ports:

```bash
cp .env.example .env
# EXPO_PUBLIC_AUTH_URL=http://127.0.0.1:8010
# EXPO_PUBLIC_USER_URL=http://127.0.0.1:8020
# EXPO_PUBLIC_SUPERSIX_URL=http://127.0.0.1:8030

nvm use
npm install
npx expo start --web
```

Or: `npm run web`. `src/api/client.ts` reads the `EXPO_PUBLIC_*` bases.

### Login (SS-50)

1. Backend up (`baked-superiorsix/local-dev`) and bootstrapped.
2. Register a user + grant Superior Six membership (see that README’s invite flow). Minimal membership for login smoke:

```bash
# after baked-auth-bootstrap — auth-admin token, then:
curl -s -X POST http://127.0.0.1:8010/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"ss50dev","password":"ss50-dev-pass"}'
# PUT /v1/applications/superiorsix/memberships/ss50dev
#   {"roles":["player","user-profile"]}  (Bearer auth-admin token)
```

3. Open the app → bottom menu **user** (rightmost) → sign in with that user.
4. After sign-in you should see username, `audience · superiorsix`, roles, and a **BFF smoke** line (`health ok · token accepted`). A `403` probe with “not on the roster” is expected until an invite/profile exists (SS-51 / invite flow) — it still means the JWT was accepted.

Static web build (what Docker uses):

```bash
npm run build:web
```

Native later: `npm run ios` / `npm run android` (Expo Go or EAS). Store builds and push credentials are out of scope for SS-8 — add via **EAS** + `app.json` plugins when ready.

## Production subpath (`/super`)

Transitional production on Martin's server is wired in
[`baked-superiorsix/local-prod`](../baked-superiorsix/local-prod): one compose
stack, Expo `EXPO_BASE_URL=/super`, same-origin `EXPO_PUBLIC_*` paths (`/auth`,
`/user`, `/superiorsix`), and host nginx stripping `/super/` to the inner nginx
on `:8040`.

## Docker (optional web UI)

This repo owns front-end compose only. Multi-stage Node build → nginx static host with API proxies to **host-published** backend ports. Prefer host Expo for day-to-day UI.

```bash
cp .env.example .env   # optional AUTH_/USER_/SUPERSIX_UPSTREAM overrides
docker compose up --build
```

App: [http://127.0.0.1:8040](http://127.0.0.1:8040). Nginx proxies:

| Path | Upstream env | Default |
|------|--------------|---------|
| `/auth/` | `AUTH_UPSTREAM` | `http://host.docker.internal:8010` |
| `/user/` | `USER_UPSTREAM` | `http://host.docker.internal:8020` |
| `/superiorsix/` | `SUPERSIX_UPSTREAM` | `http://host.docker.internal:8030` |

Rebuild on the self-hosted runner via **Actions → Rebuild dev server** (`workflow_dispatch`). Runner labels: `self-hosted`, `Linux`, `X64`, `baked-superiorsix-app` (repo-scoped runner from `baked-devops`).
## Theme tokens

Very dark blue background, off-white text (not the legacy grey `#454242`):

| Token | Hex | Role |
|-------|-----|------|
| `background` | `#071525` | Page background |
| `surface` | `#0C1F38` | Header / elevated surface |
| `menuBar` | `#0A1C30` | Bottom menu |
| `menuActive` | `#163556` | Active menu chip |
| `text` | `#F2F0E8` | Primary off-white text |
| `textMuted` | `#B8B5A8` | Secondary text / inactive icons |
| `accent` | `#116618` | Legacy green (icon heritage) |
| `accentBright` | `#2E9B4A` | Active accent |
| `border` | `#1A3352` | Hairlines |
| `fab` | `#122A48` | Floating user button |

Defined in `src/theme/colors.ts`.

## Layout (SS-8)

```
app/
  (auth)/            # login stub
  (super-six)/       # core shell: header + bottom tabs (+ in-place admin on user tab)
  (euros)/           # redirects into Super Six Euros tab
  (world-cup)/       # redirects into Super Six World Cup tab
src/
  components/shell/  # AppHeader, BottomMenu, EmptyScreen
  components/icons/  # Menu icons from legacy supersixapp SVGs
  theme/
  platform/notifications/  # .ts + .web.ts stubs
  api/               # client + login + superiorsix admin/roster (EXPO_PUBLIC_*)
  auth/              # AuthProvider + persisted session (+ optional auth-admin token)
  features/auth/     # LoginForm / SessionPanel / UserWidget / ProfileForm / UserTabMode
  features/admin/    # AdminWidget invite + roster (swapped into user tab)
  platform/storage/  # SecureStore native / localStorage web
```



### Shell UX vs legacy

- Main menu at the **bottom** (legacy was near the top).
- User icon is the **rightmost** bottom-menu item.
- **Main logo** centered in the header (`assets/icons/logo.png`).
- **No tournament** entry points.
- Header: **Round** left, **prize pot** right (placeholders: `N` / `£X`).
- Thin **round status** strip under the header logo row (`RoundStatusStrip`):
  - **picking:** `n / 6 Selections` (legacy wording)
  - **live:** `n / 6 correct`, plus “{name} has all 6” if another player is perfect
  - **finished:** same live summary kept on screen
  - Drive via `AppHeader` `roundStatus` prop (`src/components/shell/roundStatus.ts`).
  - SS-8 demo (visibility only): Fixtures/Profile → `0 / 6 Selections`; Scores → `4 / 6 correct`; Leaders → same + “Alex has all 6”.

### Icons

- Menu icons (`MenuIcon.tsx`): football (Tabler, MIT), standings/stats (Lucide, ISC), user (Lucide-style). Source SVGs under `assets/icons/{football,standings,stats}.svg`.
- Header logo: `assets/icons/logo.png` via `SuperiorSixLogo` (same mark everywhere, including admin).

## Env

See `.env.example`.

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_AUTH_URL` | baked-auth base for `apiFetch('auth', …)` (host: `http://127.0.0.1:8010`) |
| `EXPO_PUBLIC_USER_URL` | baked-user base (host: `http://127.0.0.1:8020`) |
| `EXPO_PUBLIC_SUPERSIX_URL` | baked-superiorsix base (host: `http://127.0.0.1:8030`) |
| `AUTH_UPSTREAM` | nginx `/auth/` upstream (Docker only) |
| `USER_UPSTREAM` | nginx `/user/` upstream (Docker only) |
| `SUPERSIX_UPSTREAM` | nginx `/superiorsix/` upstream (Docker only) |

For a static build served behind the `:8040` proxy, you can bake same-origin paths (`/auth`, `/user`, `/superiorsix`) into the `EXPO_PUBLIC_*` vars before `npm run build:web`.
## Platform modules

Import device features only via `src/platform/*` (e.g. `@/platform/notifications`). Screens must not import `expo-notifications` directly. Native implementation is the default file; web uses `*.web.ts`.
