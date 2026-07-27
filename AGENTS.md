# AGENTS.md

## Cursor Cloud specific instructions

Portwallet is a single client-only React + TypeScript + Vite SPA. All code lives in `app/`; there is no backend or database. Run every command from `app/` (see `app/package.json` scripts and root `README.md`).

- Dev server: `npm run dev` (Vite, serves on `http://localhost:5173/`). The update script already runs `npm ci`, so dependencies are installed on startup.
- Lint: `npm run lint` (oxlint). The `react(only-export-components)` warnings are pre-existing/expected and do not fail the command.
- Tests: `npm test` (vitest, jsdom). `npm run test:watch` for watch mode.
- Build: `npm run build` (`tsc -b` then `vite build`). GitHub Pages CI builds with `VITE_BASE=/portwallet/`; locally `base` defaults to `/`.

Non-obvious notes:
- No secrets/env vars are required to run or build. Connecting a real Bybit account needs live Bybit V5 API key/secret entered in the UI; the "Non-custodial wallet" and "Binance" providers are mock prototypes that need no credentials, so use "Non-custodial wallet" for a no-setup smoke test.
- Connected accounts (including Bybit API keys) are persisted in browser local storage, so state survives reloads within the same browser profile.
