---
version: alpha
name: Digients Preview
description: Production portal identity shared by the taxonomy portal and standalone CUA sample viewer.
colors:
  background: "#FAFAFA"
  surface: "#FFFFFF"
  ink: "#0A0A0A"
  muted: "#525252"
  accent: "#B8FF00"
typography:
  sans:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
rounded:
  DEFAULT: "4px"
  sm: "2px"
spacing:
  page-max: "1320px"
components:
  button:
    borderRadius: "2px"
metadata:
  created: 2026-10-15
  modified:
    - date: 2026-10-15
      note: Document the production identity and its independent CUA adapter.
---

## Overview

Customers inspect actual data samples and their annotations. The production reference
is `sample.digients.tech`, whose canonical implementation is `web/src/index.css`.
Use its light neutral surfaces, black typography, thin boundaries, small corner radii,
and restrained lime emphasis. Alex's separate L4 development branch has its own visual
direction and is not the CUA reference. The bilingual English/Chinese viewer is a
product surface, with a short brand introduction above the real inspection tools.

CUA's distinguishing behavior is synchronized screen recording, action frames, native
input events and model annotations. Keep those workflows instead of imposing the
taxonomy portal's domain/scenario browsing structure.

## Colors

Runtime CSS remains canonical (ownership model B). `web/src/index.css :root` is copied
by `cua/scripts/sync-theme.mjs` into generated `cua/portal-tokens.css`; its login section
also generates `cua/portal-login.css`. Never edit generated files by hand. `--bg`,
`--card`, `--text`, `--text-dim`, `--accent`, `--radius`, and the two font tokens map to
CUA through `portal-theme.css` semantic aliases. `pnpm check:cua` detects adapter drift.
Lime is used with black text; it is not a text color on white. Input/action overlays
retain their functional categorical colors. Video and code retain dark backgrounds.

## Typography

Space Grotesk is the display/body face; JetBrains Mono labels technical values and
secondary controls. Use system Chinese fallbacks for unsupported glyphs. Existing
portal font loading is retained. CUA supports English and Chinese, persists language
locally and uses the same preference in login and the authenticated viewer.

## Layout

Keep the existing CUA two-column player/inspector and its mobile stacked layout.
Its page width follows the existing 1320px viewer. Small-screen header controls wrap;
authentication is a single centered card derived from the production login layout.

## Elevation & Depth

Use borders and surface changes for hierarchy. Main panels have no decorative shadow.
Dark video/code surfaces remain distinct from light page controls.

## Shapes

Use the portal's 4px panel and 2px control radii. Preserve round pointers, joints and
trajectory markers because their geometry encodes recorded input rather than branding.

## Components

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native HTML select | Existing portal and CUA controls | Native sample/speed/filter choices | Source validation; manual keyboard review |
| Form | Existing auth service and CUA login form | server/src/auth.ts, cua/login.js | Bilingual shared-password gate | CUA auth tests and HTTP probes |
| Scrollbar | Global CUA theme | cua/portal-theme.css | Native high-contrast behavior | CSS audit |
| Toast | Existing CUA notification implementation | cua/app.js | Copy/share and failure notices | Source preservation |

The CUA login reuses existing password/session verification. All sample data, frames
and videos require a valid session, including direct URLs. Login errors distinguish
wrong/empty password from connection failures, announce inline, and focus the field.
Pending submission disables the action without changing button dimensions. Signing
out clears the browser cookie; existing server authentication remains stateless.
Do not claim server-side revocation of previously copied valid session tokens.

CUA has one production environment, with the same password list as sample and an
independent session secret. Its service loads sample's env file then its own settings.
Password values never enter frontend files, deployment snippets, logs or Git.

## Do's and Don'ts

- Keep model-annotation provenance and raw recording semantics accurate.
- Preserve playback, frame inspection, locale and keyboard controls during brand changes.
- Keep runtime media and annotations outside source control.
- Do not substitute L4 dev styling or merge its dataset into this viewer.
- Do not touch the running sample or dev deployments while preparing CUA.
- Honor the workspace rule that final visual review belongs to Jason; run nonvisual
  build, typecheck, source and HTTP checks without claiming browser visual acceptance.
