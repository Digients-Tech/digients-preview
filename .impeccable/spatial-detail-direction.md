# Spatial detail — 2026-09-22

Experience: explore real L4 embodied video evidence. Extend the existing dark DM Sans evidence gallery. The user explicitly chose a flat gallery, expanded clip detail, synchronized original video with hand overlay and a third-person head/hand reconstruction that can be rotated, two colored timestamp-segmented lanes, and scene memory on the right.

## First viewport
The expanded detail opens directly onto two equal media frames: original + hands at left, a real WebGL head/camera and hand skeleton reconstruction in the center. Scene memory occupies the right third from top to bottom. A compact clip title sits above the evidence. Shared transport and two wide timestamp-proportional lanes directly below both frames make temporal alignment visible. Lavender subtasks, muted teal actions, and semantic green memory updates earn the three color roles; neutral surfaces do the rest.

## Signature interaction
One video clock drives both views, both playheads, active subtask/action descriptions, and memory observations. Clicking a segment seeks and plays both views. Memory dots pulse briefly at source timestamps; reduced motion removes the pulse. Third-person orbit does not change playback time; reset view is always available. No fabricated hands during missing tracks, no invented body bones or room geometry.

## System and behavior
Preserve dark tokens, DM Sans and measurement-only SFMono-Regular, 6–12 px radii, hairline dividers and compact controls. Media-first composition, no decorative gradients, glows, or nested cards. On narrow screens stack media, timelines, and memory; all information remains available. Loading, retry, missing-track, WebGL fallback and keyboard states are explicit. Source JSON and MANO downloads retain provenance. New data and screenshots are private runtime artifacts, excluded from Git.

## Data boundary
Use only clips with completed low-resolution hand and camera stages, finite aligned arrays and valid timing. Producer commit 66da58edde58c1813ffa3c5ec4ad247e202c1703 documents camera-to-world xyz+xyzw and translation * scale. Hands already include camera-space translation and left mirroring. Clip-local reconstruction only, no shared world or head anatomy claim.

## Direction contract

**THESIS:** Inspect one real action across visual evidence, spatial pose and memory through one shared clock.

**OWN-WORLD:** Inherit the established dark DM Sans gallery and hairline dividers. The user requests two distinct temporal colors: lavender subtask and teal action. Green exclusively signals timed memory observations; hand and head colors identify source tracks.

**STORY:** Open a gallery clip, play or choose a timestamp segment, examine the corresponding head/hand pose, then read the memory and full annotation. Closing returns to the same gallery context.

**FIRST VIEWPORT:** Compact clip identity above two equal media frames across the left 74%; original + hands on the left and orbitable third-person 3D in the middle. Memory fills the right 26%. Shared playback and the two timestamp rails sit directly below both frames. At narrow widths these regions stack in that order.

**FORM:** Precisely user-specified local extension of the established surface. No ordered candidate list or seed: new-work.md section 3 explicitly says, "Never run the script for a local extension or a precisely specified narrow request; shape those directly." The user pinned topology and confirmed third-person rotation. No comp round or QUALITY BAR card applies. The inherited gallery reference and actual private data establish the finish bar.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Raster provenance: all shown frames and posters come from the existing first-1x delivery; corrected hand overlay videos come from the delivered/for-1x-first-3h run at the producer commit above. No generated or stock rasters ship. Hand geometry is computed from delivered joint positions; the generic head glyph is authored code, positioned and rotated by the delivered camera pose.

## Head form refinement — 2026-09-22

The user requested the recognizable head + skeleton form associated with production or the earliest dev preview. Read-only inspection of the production `vis_head` footage confirms hand joint lines, camera orientation and trajectory; it is a prerecorded view, not reusable avatar geometry. Replace the current sphere/frustum with an authored generic head silhouette: cranium, facial profile, nose, jaw and ears with sparse mesh contours. Keep all established colors, layout and source-driven hands. This is a narrow user-requested form change, not a new visual world or a new data reconstruction.

The default view looks toward the face from a third-person three-quarter angle; drag, keyboard rotation, zoom, reset and whole-path framing remain available. A quiet reference grid stays subordinate to the head and hands. The head is a generic orientation glyph driven by camera SLAM, not a reconstruction of facial anatomy; the visible legend labels it "Generic head / camera" and the canvas accessible name explains that distinction. Never add guessed shoulder, arm or body joints to this delivery.
