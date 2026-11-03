# baked-superiorsix-app

Expo + React Native (web-first) front end for **Superior Six**. One app wrapping Super Six, Euro Wizard, Qatar Hero, and Admin as separate route-group experiences.

Bootstrap slice **SS-8**: shell + empty screens only. No predictions / gameday / tournament feature UI yet.

## Requirements

- Node **≥ 20.19.4** (repo `.nvmrc` pins **22** — `nvm use`)
- npm (comes with Node)

## Run (web)

```bash
nvm use
npm install
npx expo start --web
```

Or: `npm run web`.

Native later: `npm run ios` / `npm run android` (Expo Go or EAS). Store builds and push credentials are out of scope for SS-8 — add via **EAS** + `app.json` plugins when ready.

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
- User icon **removed** from the main menu; smaller **floating** control **top-right**.
- **Main logo** centered in the header (`assets/icons/logo.png` from legacy).
- **No tournament** entry points.
- **Round number + prize pot** stacked **top-left** (placeholders: `Round N` / `£X`).

### Icons

Copied from legacy `supersixapp/public/`: `fixtures.svg`, `scores.svg`, `leaders.svg`, `users.svg`, plus `euros.svg`, `qatar.svg`, admin variants, and logos under `assets/icons/`. Menu rendering uses simplified path markup derived from those SVGs in `src/components/icons/MenuIcon.tsx`.

## Env (later)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_AUTH_URL` | baked-auth |
| `EXPO_PUBLIC_USER_URL` | baked-user |
| `EXPO_PUBLIC_SUPERSIX_URL` | baked-superiorsix |

## Platform modules

Import device features only via `src/platform/*` (e.g. `@/platform/notifications`). Screens must not import `expo-notifications` directly. Native implementation is the default file; web uses `*.web.ts`.
