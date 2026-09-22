---
name: "Digients L4 Explorer"
description: "A restrained dark gallery for real embodied video and synchronized annotations."
colors:
  accent: "oklch(80% 0.09 280)"
  subtask-base: "#514967"
  subtask-tone-2: "#665880"
  subtask-tone-3: "#72648e"
  subtask-tone-4: "#5d507b"
  subtask-ink: "#c8b8ed"
  action-base: "#30575a"
  action-tone-2: "#39686a"
  action-tone-3: "#3e7270"
  action-tone-4: "#365f63"
  action-ink: "#98d6cf"
  memory-idle: "#587366"
  memory-current: "#69d7a2"
  pose-left: "#ffcd59"
  pose-right: "#67e2ab"
  pose-head: "#c4c3ed"
  pose-canvas: "#11171b"
  canvas: "oklch(17% 0.006 270)"
  surface: "oklch(20% 0.007 270)"
  subtle: "oklch(25% 0.009 270)"
  ink: "oklch(93% 0.006 270)"
  muted: "oklch(73% 0.012 270)"
  faint: "oklch(66% 0.012 270)"
  line: "oklch(33% 0.01 270)"
  light: "oklch(97% 0.003 270)"
  dark: "oklch(13% 0.005 270)"
typography:
  display:
    fontFamily: "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "2rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1.6rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  title:
    fontFamily: "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1.3rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  body:
    fontFamily: "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  annotation:
    fontFamily: "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.8rem"
    fontWeight: 500
    lineHeight: 1.5
  clock:
    fontFamily: "\"SFMono-Regular\", Consolas, monospace"
    fontSize: "0.73rem"
    fontWeight: 400
    lineHeight: 1.5
  spatial-headline:
    fontFamily: "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "clamp(1.2rem, 1.7vw, 1.7rem)"
    fontWeight: 550
    lineHeight: 1.24
    letterSpacing: "-0.025em"
  evidence-label:
    fontFamily: "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.8rem"
    fontWeight: 550
    lineHeight: 1.5
  temporal-caption:
    fontFamily: "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.82rem"
    fontWeight: 400
    lineHeight: 1.5
  context-prose:
    fontFamily: "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.79rem"
    fontWeight: 400
    lineHeight: 1.65
  memory-title:
    fontFamily: "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    fontWeight: 550
    lineHeight: 1.5
    letterSpacing: "-0.015em"
  memory-entry-title:
    fontFamily: "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.79rem"
    fontWeight: 550
    lineHeight: 1.4
  memory-prose:
    fontFamily: "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.76rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  segment: "3px"
  tag: "4px"
  icon: "5px"
  control: "6px"
  evidence: "7px"
  media: "8px"
  dialog: "12px"
spacing:
  compact: "4px"
  small: "8px"
  related: "12px"
  inset: "16px"
  gutter: "22px"
  generous: "24px"
  page: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.dark}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  button-secondary-hover:
    backgroundColor: "{colors.subtle}"
  button-text:
    textColor: "{colors.muted}"
    padding: "0"
  button-icon:
    textColor: "{colors.ink}"
    rounded: "{rounded.icon}"
    width: "34px"
    height: "34px"
    padding: "0"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 13px"
  navigation-tabs:
    textColor: "{colors.faint}"
    typography: "{typography.label}"
    padding: "0 20px"
  chip-industry:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
    padding: "1px 7px"
  card-video:
    backgroundColor: "{colors.dark}"
    rounded: "{rounded.media}"
  timeline-subtask:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.muted}"
  memory-heading:
    textColor: "{colors.ink}"
    typography: "{typography.title}"
  evidence-frame:
    backgroundColor: "{colors.dark}"
    rounded: "{rounded.evidence}"
  temporal-subtask:
    backgroundColor: "{colors.subtask-base}"
    rounded: "{rounded.segment}"
    height: "28px"
    padding: "0"
  temporal-action:
    backgroundColor: "{colors.action-base}"
    rounded: "{rounded.segment}"
    height: "28px"
    padding: "0"
  memory-panel-heading:
    textColor: "{colors.ink}"
    typography: "{typography.memory-title}"
  memory-event:
    textColor: "{colors.muted}"
    typography: "{typography.memory-prose}"
    padding: "17px 0"
---

# Design System: Digients L4 Explorer

## Overview

**Creative North Star: "The Evidence Gallery"**

The Evidence Gallery gives real human activity the largest, clearest surface. Cool dark neutrals recede behind authentic egocentric footage and hand-skeleton renderings. Restrained periwinkle identifies playback and selection. The personality is professional, precise and forward-looking; the source material supplies the visual variety.

The flat collection opens into a focused evidence view with synchronized video and spatial pose, timestamp lanes and calm annotation prose. Lavender and teal distinguish the two temporal levels; green marks memory observations. DM Sans, real video, low decoration and readable hierarchy remain the durable identity. The approved dark gallery replaces the previous pale canvas and permanent collection rail.

This record follows `web/src/explorer.css` and the current L4 gallery, card, timeline, detail, player, pose and memory components. Frontmatter preserves canonical source OKLCH and the spatial extension's source hex colors. The sidecar records preview-only tonal ramps and component specimens without private media or source annotation text. Surface composition remains in `.impeccable/gallery-direction.md` and `.impeccable/spatial-detail-direction.md`.

**Key Characteristics:**

- Real video and synchronized meaning lead the hierarchy.
- Cool dark tonal layers, a playback accent and distinct temporal color roles.
- A flat collection and a focused enlarged episode.
- One sans family, plain labels and tabular clocks.
- Keyboard access, responsive stacking and reduced motion.

## Colors

A cool near-neutral palette keeps footage vivid and controls quiet. Frontmatter values are normative.

### Primary

- **Playback Periwinkle** (`accent`): the gallery's current subtask, scrubber, active tab, selected toggle, timestamps, focus and the primary access action.

### Secondary

- **Subtask Lavender** (`subtask-base`, `subtask-tone-2` through `subtask-tone-4`): four muted fills separate adjacent subtask segments. **Lavender Ink** (`subtask-ink`) identifies the lane, current number and active outline.
- **Action Teal** (`action-base`, `action-tone-2` through `action-tone-4`): the corresponding four-fill action lane. **Teal Ink** (`action-ink`) carries its heading, number and active outline. Alternating fills express segment boundaries, not categories or confidence.

### Tertiary

- **Memory Sage / Memory Green** (`memory-idle`, `memory-current`): quiet observation dots and the latest observed timestamp; brief update emphasis is driven by actual source times.
- **Left Amber / Right Mint / Camera Lavender** (`pose-left`, `pose-right`, `pose-head`): matching 3D geometry and labelled track legend. These colors identify pose channels independently of temporal or memory states.

### Neutral

- **Gallery Charcoal** (`canvas`): the collection background.
- **Raised Charcoal** (`surface`): fields, controls and the detail dialog.
- **Quiet Graphite** (`subtle`): selected controls, tags, player controls and hover states.
- **Reading White** (`ink`): headings and active labels.
- **Supporting Silver** (`muted`): annotation prose and secondary controls.
- **Quiet Silver** (`faint`): secondary labels and counts.
- **Hairline Graphite** (`line`): boundaries and dividers.
- **Media White** (`light`): overlay labels and the playhead.
- **Media Black** (`dark`): media wells and text on the accent.
- **Spatial Charcoal** (`pose-canvas`): the WebGL scene background behind source pose geometry.

**The Playback Accent Rule.** Use periwinkle for playback, selection, focus or a primary action; do not turn it into a decorative category palette.

**The Evidence Color Rule.** Lavender means subtask, teal means action, and green dots mean memory observations. Keep pose colors tied to their labelled tracks; pair every temporal color with numbers, timestamps, text and a visible playhead.

## Typography

**Display Font:** DM Sans, with native sans fallbacks.

**Body Font:** DM Sans, with the same stack.

**Label/Mono Font:** DM Sans for words; SFMono-Regular, Consolas, monospace for clocks and sequence numbers, with tabular figures.

The hierarchy uses medium headings, regular annotation prose and plain controls. English and Chinese share the same hierarchy with native glyph fallback. The root is 15px; frontmatter rem values resolve against it.

### Hierarchy

- **Display** (`typography.display`): collection heading, reduced at compact widths.
- **Headline / Title** (`typography.headline`, `typography.title`): retained earlier detail and annotation heading steps. The current spatial detail uses the scoped steps below.
- **Body** (`typography.body`): inherited reading baseline.
- **Annotation** (`typography.annotation`): expanded descriptions and insight fields; mobile increases this size.
- **Label** (`typography.label`): standard buttons, card titles and annotation tabs. Smaller existing metadata sizes are not a reusable prose scale.
- **Clock** (`typography.clock`): native monospace for timestamps and sequence numbers, with tabular figures. Compact media, timeline and memory contexts retain their existing local size overrides.
- **Spatial headline** (`typography.spatial-headline`): balanced, naturally wrapping clip title; phones use a fixed local size (1.25rem).
- **Evidence label** (`typography.evidence-label`): medium media and temporal-lane headings.
- **Temporal caption / Context prose** (`typography.temporal-caption`, `typography.context-prose`): the active segment description and the expanded semantic fields. Context prose is limited to 75ch; the phone caption uses the standard label size.
- **Memory title / Entry title / Prose** (`typography.memory-title`, `typography.memory-entry-title`, `typography.memory-prose`): compact side-column hierarchy. Phone memory prose grows to 0.81rem. These are scoped evidence-detail roles, not a replacement for the general body baseline or a license to use tiny metadata as prose.

**The One Family Rule.** Use DM Sans for identity, headings, labels and prose; reserve native monospace for clocks and sequence numbers.

## Layout

A compact identity bar (68px) precedes a short heading, one filter band and the video grid. Collection width is capped at 1880px with desktop side insets of 40px. Cards sit directly on the page; desktop gaps are 34px vertically and 22px horizontally. Media keeps a contained 16:9 frame. Static loading placeholders preserve its geometry.

| Viewport | Collection |
| --- | --- |
| At least 1680px | Four columns |
| 1101–1679px | Three columns |
| 761–1100px | Two columns; 28px page insets |
| 561–760px | Two columns; 20px insets; search above three filters |
| Up to 560px | One column; persistent open hint |

Spatial detail is a native dialog capped at 1840px and the viewport minus 40px. Its evidence area pairs two equal media frames with a 14px gap; both use a contained 16:10 well. Shared transport, timestamp ruler, subtask lane, action lane and expandable semantic fields follow the pair. The right memory column takes 26% with a 290px minimum, separated by one hairline; it stays visible while its observations scroll independently. Evidence padding is 22px 26px 28px and memory padding is 25px 22px 15px.

At 1190px and below the memory column becomes 280px and evidence padding becomes 20px. At 950px and below memory moves after the evidence in normal flow, with its stream capped at 520px. At 600px and below the media frames stack and use 16:9 wells; evidence side padding is 16px, the temporal buttons grow from 28px to 32px high, and semantic fields stack. The dialog inherits the existing compact shell treatment at 760px and explicitly fills the dynamic viewport with square corners at 600px.

The detail header stays visible. Collection labels may truncate; full detail text wraps. Opening detail carries the card's playback moment; closing restores the collection's filters, scroll and focus.

## Elevation & Depth

Depth comes from tonal layers and hairline borders, with no box shadows. A translucent dark backdrop separates the opened episode; small dark media overlays protect labels over footage without blur.

**The Flat Surface Rule.** Separate resting surfaces with tone, spacing and hairline borders; do not add floating card shadows to the gallery.

## Shapes

The radius scale grows from segments through compact tags, icons and controls to media and the desktop dialog, as recorded in frontmatter. The spatial pair uses its own gently clipped evidence radius; the gallery retains its existing media radius. Mobile detail has square outer corners and fills the viewport. Circular forms belong to the central play control and small availability, track and memory dots. Temporal detail uses shallow rectangular segments with a fine vertical cursor and a small cursor cap.

## Components

### Buttons

Compact secondary buttons use a raised surface, reading-white text and a hairline outline. Primary buttons use the accent with dark text. Hover changes tone; text buttons brighten. Standard state transitions affect color, background color and opacity (140ms). Focus uses an accent outline (2px) with an offset (4px); card-open focus moves inside the picture. Disabled controls lower opacity. Icon-only controls retain accessible names.

### Chips

Industry and object labels use subtle flat backgrounds. Taxonomy is expressed through source text, not category colors.

### Cards / Containers

Each flat card contains a media frame, segmented rail, current-subtask label and industry/scene/task rows. Featured status and duration overlay the video. Open hints appear on hover/focus and remain visible on phones. The play control works without opening detail.

### Inputs / Fields

Search and native selects share a compact height, raised surface and hairline outline. Search gains an accent focus border. Compact screens place search above the filters. Empty and error states pair short explanatory text with reset or retry.

### Navigation

The identity bar holds language choice and sign-out. Selected language controls use a subtle background. Retained annotation tabs use a thin accent underline and primary text; current spatial detail presents both temporal levels together and keeps memory visible. Native modal behavior, Escape, a back control and focus restoration preserve navigation context.

### Subtask Timeline

Source start/end times set each segment's position and width. A small visible track sits in a taller button target; the active segment uses the accent and a light cursor shows the playhead. A numbered current-subtask label reinforces the color cue. Seeking and media switches preserve the shared clock. Cursor movement uses a linear transition (160ms).

Reduced-motion mode removes transitions and starts previews paused. Offscreen, hidden-tab and dialog-covered previews pause. Loading geometry stays static.

### Synchronized Evidence Pair

Equal media wells place original video with an optional hand overlay beside the orbitable third-person head/camera and hand view. Quiet labels and utility actions sit above each well; shared playback, clock, scrubber, speed and fullscreen controls sit below both. Drag or arrow keys orbit, wheel or plus/minus zoom, and Reset restores the view without seeking. The whole-path view changes framing without changing the shared playback clock. The track legend matches source geometry; loading, retry and unavailable WebGL states stay inside the reserved frame.

### Temporal Detail

Two timestamp-proportional lanes run beneath the evidence pair: lavender subtasks, then teal actions. Four muted fills alternate within each lane. White segment numbers, a light playhead, the active outline and an adjacent timestamp range reinforce the color. Hover brightens a segment (1.25) over 120ms; focus remains visible. Clicking a segment seeks and plays from its source start. The current numbered description follows each rail; expandable action and subtask fields retain complete meaning, and a full transcript provides text-based timestamp access. Reduced motion removes the hover transition.

### Scene Memory

The persistent column begins with one heading and a small status dot, followed by a brief explanation and the At playhead / All events scope selector. A separate count-and-clock row precedes a scrollable stream. Plain object headings, actionable timestamps, location text, observation prose and optional notes are separated by hairlines. At playhead is the default and shows the latest entry per object through the current time; All events also includes future source observations, whose dots remain neutral.

The latest observed timestamp uses Memory Green. A short pulse occurs only when forward clock movement crosses a real observation timestamp; it is not a generic activity indicator. The pulse scales to 1.65, briefly brightens, and repeats twice over 1.2 seconds. Reduced motion removes it while retaining the textual status and static current marker. On narrow screens the same memory component follows the evidence rather than becoming a hidden tab.

## Do's and Don'ts

### Do:

- **Do** let authentic video and source annotations supply the visual variety.
- **Do** preserve the shared clock across cards, timelines, details and media switches.
- **Do** keep complete memory and latest entries through the playhead visibly distinct.
- **Do** preserve keyboard focus, responsive stacking and reduced-motion behavior.
- **Do** keep temporal colors, pose-track colors and timestamp-driven memory markers attached to their documented meanings.

### Don't:

- **Don't** restore the discarded permanent collection rail to this gallery surface.
- **Don't** add decorative gradients, glowing accents, marketing KPI cards or shadows around videos.
- **Don't** replace missing footage, pose channels or source annotations with invented evidence.
- **Don't** rely on color alone for active time, selection or media availability.
- **Don't** duplicate the memory title with a small heading above it or shrink prose to metadata size.
