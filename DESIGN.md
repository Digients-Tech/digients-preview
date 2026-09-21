---
name: "Digients L4 Explorer"
description: "A restrained dark gallery for real embodied video and synchronized annotations."
colors:
  accent: "oklch(80% 0.09 280)"
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
rounded:
  tag: "4px"
  icon: "5px"
  control: "6px"
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
---

# Design System: Digients L4 Explorer

## Overview

**Creative North Star: "The Evidence Gallery"**

The Evidence Gallery gives real human activity the largest, clearest surface. Cool dark neutrals recede behind authentic egocentric footage and hand-skeleton renderings. Restrained periwinkle identifies playback and selection. The personality is professional, precise and forward-looking; the source material supplies the visual variety.

The flat collection opens into a focused evidence view, with calm annotation prose beside an enlarged player. DM Sans, real video, low decoration and readable hierarchy remain the durable identity. The approved dark gallery replaces the previous pale canvas and permanent collection rail.

This record follows `web/src/explorer.css` and the current L4 gallery, card, timeline, detail, player and annotation components. Frontmatter preserves canonical source OKLCH. The sidecar records rendered sRGB equivalents, preview-only tonal ramps and component specimens without private media or source annotation text. The surface contract is `.impeccable/gallery-direction.md`.

**Key Characteristics:**

- Real video and synchronized meaning lead the hierarchy.
- Cool dark tonal layers and one playback accent.
- A flat collection and a focused enlarged episode.
- One sans family, plain labels and tabular clocks.
- Keyboard access, responsive stacking and reduced motion.

## Colors

A cool near-neutral palette keeps footage vivid and controls quiet. Frontmatter values are normative.

### Primary

- **Playback Periwinkle** (`accent`): current subtask, scrubber, active tab, selected toggle, timestamps, focus and the primary access action.

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

**The Playback Accent Rule.** Use periwinkle for playback, selection, focus or a primary action; do not turn it into a decorative category palette.

## Typography

**Display Font:** DM Sans, with native sans fallbacks.

**Body Font:** DM Sans, with the same stack.

**Label/Mono Font:** DM Sans for words; SFMono-Regular, Consolas, monospace for clocks and sequence numbers, with tabular figures.

The hierarchy uses medium headings, regular annotation prose and plain controls. English and Chinese share the same hierarchy with native glyph fallback. The root is 15px; frontmatter rem values resolve against it.

### Hierarchy

- **Display** (`typography.display`): collection heading, reduced at compact widths.
- **Headline** (`typography.headline`): episode title with natural wrapping.
- **Title** (`typography.title`): scene-memory heading, with its clock on the same row.
- **Body** (`typography.body`): inherited reading baseline.
- **Annotation** (`typography.annotation`): expanded descriptions and insight fields; mobile increases this size.
- **Label** (`typography.label`): standard buttons, card titles and annotation tabs. Smaller existing metadata sizes are not a reusable prose scale.
- **Clock** (`typography.clock`): native monospace for timestamps and sequence numbers, with tabular figures. Compact media, timeline and memory contexts retain their existing local size overrides.

**The One Family Rule.** Use DM Sans for identity, headings, labels and prose; reserve native monospace for clocks and sequence numbers.

## Layout

A compact identity bar (68px) precedes a short heading, one filter band and the video grid. Collection width is capped at 1880px with desktop side insets of 40px. Cards sit directly on the page; desktop gaps are 34px vertically and 22px horizontally. Media keeps a contained 16:9 frame. Static loading placeholders preserve its geometry.

| Viewport | Collection | Detail |
| --- | --- | --- |
| At least 1680px | Four columns | Two columns |
| 1101–1679px | Three columns | Evidence-to-annotation ratio 1.58:1; annotation minimum 340px |
| 761–1100px | Two columns; 28px page insets | Ratio 1.3:1; annotation minimum 310px |
| 561–760px | Two columns; 20px insets; search above three filters | Full-screen dialog; player then annotations |
| Up to 560px | One column; persistent open hint | Stacked detail with compact taxonomy and downloads |

Desktop detail is a native dialog capped at 1560px and the viewport minus 64px. Its header stays visible; the annotation column scrolls independently. Mobile uses normal annotation flow and full dynamic viewport height. Collection labels may truncate; full detail text wraps. Opening detail carries the card's playback moment; closing restores the collection's filters, scroll and focus.

## Elevation & Depth

Depth comes from tonal layers and hairline borders, with no box shadows. A translucent dark backdrop separates the opened episode; small dark media overlays protect labels over footage without blur.

**The Flat Surface Rule.** Separate resting surfaces with tone, spacing and hairline borders; do not add floating card shadows to the gallery.

## Shapes

The radius scale grows from compact tags through icons and controls to media and the desktop dialog, as recorded in frontmatter. Mobile detail has square outer corners and fills the viewport. Circular forms are limited to the central play control and small availability indicators. The segmented timeline uses narrow rectangular bars and a fine vertical cursor.

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

The identity bar holds language choice and sign-out. Selected language controls use a subtle background; annotation tabs use a thin accent underline and primary text. Actions, subtasks and memory are peer views. Native modal behavior, Escape, a back control and focus restoration preserve navigation context.

### Subtask Timeline

Source start/end times set each segment's position and width. A small visible track sits in a taller button target; the active segment uses the accent and a light cursor shows the playhead. A numbered current-subtask label reinforces the color cue. Seeking and media switches preserve the shared clock. Cursor movement uses a linear transition (160ms).

Reduced-motion mode removes transitions and starts previews paused. Offscreen, hidden-tab and dialog-covered previews pause. Loading geometry stays static.

### Scene Memory

One heading row places the clock at the right. A brief explanation and scope selector distinguish complete records from the latest entry per object through the playhead. Plain entry headings, actionable timestamps, labelled fields and dividers keep full memory readable.

## Do's and Don'ts

### Do:

- **Do** let authentic video and source annotations supply the visual variety.
- **Do** preserve the shared clock across cards, timelines, details and media switches.
- **Do** keep complete memory and latest entries through the playhead visibly distinct.
- **Do** preserve keyboard focus, responsive stacking and reduced-motion behavior.

### Don't:

- **Don't** restore the discarded permanent collection rail to this gallery surface.
- **Don't** add decorative gradients, glowing accents, marketing KPI cards or shadows around videos.
- **Don't** replace missing footage, pose channels or source annotations with invented evidence.
- **Don't** rely on color alone for active time, selection or media availability.
- **Don't** duplicate the memory title with a small heading above it or shrink prose to metadata size.
