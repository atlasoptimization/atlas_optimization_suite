# Custom Domains Audit

## Current Architecture

Custom domains are folder-based optional content packs. The source of truth is the repository `custom_domains/` tree:

- `custom_domains/scribus_generator/` and root generator helpers are treated as external production tooling.
- `custom_domains/<domain>/templates/domain_metadata.txt` identifies a discoverable domain folder.
- `custom_domains/<domain>/templates/card_data_*.csv` provides card metadata.
- `custom_domains/<domain>/output/` provides generated PDFs when the external generator has run.

The app does not write to this folder during normal runtime.

## Sync Path

Folder discovery and card mapping live in `packages/deck-assets/src/customDomains.ts`.

`pnpm sync:assets`:

- scans `CUSTOM_DOMAINS_ROOT`, defaulting to `./custom_domains`
- ignores generator folders such as `scribus_generator`
- reads each domain metadata file
- reads the configured card CSV
- copies matched PDFs/images into `apps/web/public/deck/custom-domains/<domain>/`
- generates PDF previews when possible
- appends discovered custom-domain card metadata to the generated deck manifest

Diagnostics are printed by `scripts/sync-assets.ts`: domains found, ignored generator folders, cards loaded, PDF matches, preview counts, and warnings.

## Runtime Path

Discovered custom domains are derived from manifest cards with `origin = "custom-domain"` in `apps/web/src/customDomains/discoveredCustomDomains.ts`.

Activation state is separate from discovery:

- storage key: `dsd.customDomainSettings`
- default: no active custom domains
- active state type: `activeCustomDomainIds: string[]`

The manager UI is `apps/web/src/ui/customDomains/CustomDomainManager.tsx`, opened from the left card browser: `Custom > Custom Domains > Manage custom domains`.

## Browser, Search, and Piles

Canonical domains are always active. Custom domains enter normal app controls only when enabled.

- inactive custom domains are hidden from the main browser
- inactive custom domains are omitted from card search
- inactive custom domains do not create visible draw/discard piles
- enabled custom domains appear after the canonical six domains
- placed custom-domain cards still resolve after disabling the domain because `cardsById` includes all manifest cards

Canonical handbook game modes continue to use the canonical six-domain cycle. Enabling a custom domain does not add it to Draw Next.

## Custom Cards vs Custom Domains

There are two distinct extension types:

- In-app custom cards: local user-authored cards, `origin = "custom"`, shown under `Custom Cards`.
- Folder-based custom-domain cards: synced content-pack cards, `origin = "custom-domain"`, controlled by the Custom Domain Manager.

Both use the same `DeckCard` shape and text-card fallback display, but they are not mixed in the UI.

## Legacy Code

Earlier JSON-spec custom-domain helpers still exist as parsing/import utilities, but the app no longer exposes runtime JSON custom-domain import as the primary path. The folder-based sync model is the active architecture.

## Changes in This Branch

- Added explicit discovered vs active custom-domain separation.
- Added local activation settings with no active custom domains by default.
- Added Custom Domain Manager UI.
- Filtered main browser, search, piles, and manual custom-domain draw actions by active state.
- Kept all manifest metadata available for already placed inactive custom-domain cards.
- Updated sync diagnostics and documentation.
