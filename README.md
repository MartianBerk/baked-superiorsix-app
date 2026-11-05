# baked-superiorsix-app

Expo + React Native (web-first) front end for **Superior Six**. One app wrapping Super Six, Euro Wizard, Qatar Hero, and Admin as separate route-group experiences.

Bootstrap slice **SS-8**: shell + empty screens only. No predictions / gameday / tournament feature UI yet.

## Requirements

- Node **≥ 20.19.4** (repo `.nvmrc` pins **22** — `nvm use`)
- npm (comes with Node)

## Run (web) against the local API stack

1. Start APIs with [`baked-devops/local-dev`](../baked-devops/local-dev) (auth `:8010`, user `:8020`, superiorsix `:8030`). Bootstrap + invite notes live in that README.
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

Static web build (what Docker uses):

```bash
npm run build:web
```

Native later: `npm run ios` / `npm run android` (Expo Go or EAS). Store builds and push credentials are out of scope for SS-8 — add via **EAS** + `app.json` plugins when ready.

## Docker (optional web UI)

Same pattern as [baked-demoapp](../baked-demoapp): multi-stage Node build → nginx static host with API proxies. Prefer host Expo for day-to-day UI; use Docker when you want a single published web port.

```bash
cp .env.example .env   # optional AUTH_/USER_/SUPERSIX_UPSTREAM overrides
docker compose up --build
```

Or from the full stack: `docker compose --profile app up --build` in `baked-devops/local-dev` (upstreams use Docker DNS to the sibling services).

App: [http://127.0.0.1:8040](http://127.0.0.1:8040). Nginx proxies:

| Path | Upstream env | Default (this compose) |
|------|--------------|------------------------|
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
  (super-six)/       # core shell: header + bottom tabs + empty screens
  (euro-wizard)/     # empty stub
  (qatar-hero)/      # empty stub
  (admin)/           # empty stub (role gate placeholder)
src/
  components/shell/  # AppHeader, BottomMenu, EmptyScreen
  components/icons/  # Menu icons from legacy supersixapp SVGs
  theme/
  platform/notifications/  # .ts + .web.ts stubs
  api/               # client stub (EXPO_PUBLIC_* bases)
  auth/              # AuthProvider stub
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
