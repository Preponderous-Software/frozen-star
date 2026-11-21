# Changelog

Versions are bare tags (`0.1.0`). Each release's playtest evidence is in `docs/playtests/<version>/`, and the release process is in [docs/RELEASING.md](docs/RELEASING.md).

## Unreleased

Leftovers from the final 0.3.0 playtest (run-2):

- The recall beam's Fire button sits first on the comms panel and stays exactly where it is when the panel scrolls, and it changes the moment it is clicked.
- With a console open, discovery toasts and hints move into the view on the left instead of sitting over the panel.
- The "click to look" pill gives way to the use bracket; prompts and markers no longer show through a question box or the logbook.
- The bridge's floor stencil reads the right way up from inside the bridge.

Release groundwork (nothing a player sees):

- Pushing a version tag now builds the downloads and creates the release, so releases can be made by the fleet's release automation. The arcade still deploys every push to `main`.
- Saves have a format version (`SAVE_VERSION` in `src/game/save.js`) and real save fixtures in `test/fixtures/saves/`, which every build must keep loading.

## 0.3.0 (2026-11-19)

A polish pass across the whole game, ending with two AI playtest rounds. The headline fix: the ship no longer flashes out of sight. Playtest evidence: [docs/playtests/0.3.0](docs/playtests/0.3.0).

- **The ship stays on screen (#41).** The ship is drawn on a transparent canvas over the sky, and resizing a canvas clears it. The automatic resolution change ran after the ship was drawn, and window resizes redrew nothing, so for one frame only the black hole showed. Size changes now happen before the draw and every resize redraws at once. The resolution no longer swings back and forth, the ship redraws as soon as a lost GPU context returns, and `tools/ship-flash-check.cjs` counts any cleared frame that reaches the screen (0 now, 7 before).
- **Feel aboard (#38).** Footsteps follow your stride and speed, with a gentle head bob (off with reduced motion, or in Settings). The room sound ducks under dialogue, the hull creaks deeper on the descent, the capsule bay has its own room tone, and doors and usable things answer with small sounds.
- **Interior art (#40).** The sealed hatches read as closed doors from any angle, the quarters have a padded headboard and shelf, and the consoles, archive terminal, server rack, lab bench and cable trays are textured.
- **Robustness (#39).** Short key taps register even at low frame rates. The ship's shaders warm up before the first frame instead of freezing the page. An error shows a small notice instead of stopping the game. Damaged or unknown saves and settings fall back safely, and every earlier save still loads.
- **Touch and accessibility (#42).** Thumb-sized buttons on touch screens, landscape consoles as a full-height side panel, a resting joystick, hold-to-move buttons in photo mode, and better screen-reader labels.
- **Flow (#43).** A failed rescue no longer leaves its console open, the spacetime map keeps finished falls in view, quieter stretches are filled, and the helm has one-press ×2 and ×4 buttons.
- **Playtest fixes (round 7):**
  - A story choice or the logbook can no longer end up under the pause menu. Esc during a choice no longer pauses the game, and the answer keys do nothing while paused.
  - The Orpheus question and the Postscript prediction come up without stepping back from the console first.
  - Objectives tick off when the thing happens: "Wait for Ines's reply" when her reply arrives, "Return to 10 rₛ" on arrival, and a failed rescue is marked "Too late" instead of done.
  - The Orpheus objective comes up first, with the talk alongside it.
  - The helm has a one-press 1.5 rₛ button for the Postscript.
  - Labels on the spacetime map no longer print on top of each other, and chart captions sit on a dark plate above the bars.
  - Brackets and labels vanish during fades to black. The waypoint marker hides once the use prompt is up.
  - On waking there is one "click to look" prompt, not two.
  - The probe and comms consoles answer from a step further out.
  - The photo bar's "Saved" line no longer moves the buttons.
  - The Orpheus feed now explains correctly why no more frames come: the next one was due from inside the horizon.
  - In the Postscript, the hull camera no longer gives away the prediction's answer, and the helm says when the laser test is complete (#45).

## 0.2.0 (2026-11-15)

Voices, a new chapter, and a ship you can read at a glance. Playtest evidence: [docs/playtests/0.2.0](docs/playtests/0.2.0).

- **Voices.** Ines is voiced by Kokoro-82M's Sky voice and WREN, the ship's AI, by its George voice. Over the radio, Ines's voice slows and deepens by exactly her redshift factor 1+z, the same stretch her light gets; in the bay she is on the intercom, and once docked she is in the room. WREN speaks clean over the ship's PA, objective hints included, and the two never talk over each other.
- **Postscript · The photon sphere.** An optional mission after the story: hover at 1.5 rₛ, fire a laser along the hull and catch it coming back 11 s later, then watch a pulse fired 1 m higher spiral away.
- **A real capsule bay.** Ines is visible doing pre-flight beside capsule C-1; the capsule leaves past the bridge window and docks again after the rescue. Her lines say where she is speaking from.
- **Discoveries:** 20 achievements, each with a physics fact. **Photo mode** (P): freeze time, hide the HUD, float the camera and save a full-resolution picture.
- **Controls and accessibility:** rebind every key and gamepad button; reduce flashing, subtitle background, console text size, hold or toggle run, colour-safe redshift.
- **Renderer:** the photon ring is a continuous line at low resolution, and the sky's resolution climbs on GPUs that hold 30 fps.
- **Clearer opening and rescue:** WREN introduces itself as the ship's AI; Ines's launch has a build-up and the capsule is visible leaving with running lights and a tracking bracket; one deadline total everywhere.
- **Fixes from four more AI playtest rounds:** the dream no longer starts on a long black screen (a negative first time step), hints never outlive their objective, the Postscript can be started from the helm or the logbook and its helm snaps to 1.5 rₛ, lists scroll under load, photo saves are confirmed in the photo bar, and more.
- **Her climb home:** after the recall beam, once the light of her engine burn reaches the ship, the capsule's picture climbs back out and its redshift falls, instead of freezing at the burn.
- **Media:** darkroom-rendered MP4/WebM clips of the dream and the descent, and a room grid.

## 0.1.0 (2026-11-15)

The first release: the whole story, eight lessons, a desktop app for Windows and a browser version.

### The story

- **Prologue: a dream.** A ray-traced fall through the horizon of Erebus, a black hole of 120,000 suns, seen by the one falling.
- **Aboard the Tern.** Walk from your quarters through the corridor and lab to the bridge, at 10 rₛ above the hole. The ship has props to pick up and read, colour-coded wayfinding and baked shading.
- **I · Beacon K-1.** Drop a probe and watch its light slow, redden and freeze at the edge of the shadow, while its beacon's pitch slides down on the speakers.
- **II · The rescue.** Ines's capsule drifts in. Her messages arrive slower, redder and deeper, and a deadline clock tells you when the recall beam must leave.
- **III · The descent.** Take the ship down at the helm until far-away clocks run twice as fast as yours, with two audible clocks ticking at their true rates.
- **IV · Orpheus.** A camera probe's frames arrive further and further apart, until the last one that will ever arrive.
- **Epilogue.** A logbook sets what you saw against what happened, with your own numbers, and then the ship is yours to explore.

Outside every window is a real light-ray trace through Schwarzschild spacetime (WebGL 2), and the fall times, redshifts, deadlines, tides and hovering come from exact closed-form solutions, checked by `npm test`.

### Training simulations

Eight short lessons with stars to earn, mission cards, numbered steps, a "Words used here" list and quiz answers that explain themselves: Two Clocks, Last Words, The Rescue, Pick Your Hole, Hover, Bend the Light, Into the Dark and Evaporation. There is also the Observatory, a free camera around a black hole. Seven of the lessons can be run from the lab's archive terminal aboard the Tern.

### Ways to play

- **Windows desktop app.** `frozen-star-0.1.0-win-x64.zip`: unzip and double-click `Frozen Star.exe` (Electron 45.2.0). It has F11 for fullscreen, remembers its window, and accepts `--lowgpu`, `--fullscreen` and `--open=<chapter>`.
- **In the browser.** https://frozen-star.play.danielstephenson.dev, deployed from `main` by CI, or `frozen-star-0.1.0-web.zip` served from any static file server.
- Keyboard and mouse, touch and gamepads all work, in menus too. On phones, panels open as a bottom sheet.

### Polish since the first playable build

- **Front end.** A finished main menu with Continue, New game, Chapters, Settings (look speed, field of view, volume, invert look, subtitle size, graphics, fullscreen) and About, plus mobile layouts (#14).
- **Consoles.** The probe, comms, helm, feed, map and logbook panels show one big number with a plain-words line under it, and a key explains rₛ, M and 1+z (#5, #6, #8, #11).
- **Story.** Reactive crew lines, tighter pacing and the seen-versus-happened logbook (#13).
- **Audio.** Procedural WebAudio: a different sound in each room, an audible descent, and a reddening radio (#10).
- **Training.** Lessons rewritten in plain language, with explained answers and the new Bend the Light lesson (#9). Evaporation now says how many Great Pyramids (#20).
- **Renderer.** A faster black-hole shader that draws the same image (#12), GPU-safe shader math (#7), and recovery from graphics-driver restarts (#19).
- **Ship art.** Props, wayfinding and baked shading on the Tern (#15).
- **Follow-ups.** The ×4 radius, the archive list and the credits line (#16).
- **Playtest fixes.** Four rounds of AI playtesting with [playtester](https://github.com/Preponderous-Software/playtester). The fixes covered the hull behind the corridor windows, the use key no longer working through walls, waypoint handover, dream pacing, the descent objective, a consistent rescue deadline, the pinned mission card, and the menu, Settings and lesson issues (#2, #3, #4, #17, #18, #19). The evidence is in [docs/playtests/0.1.0/](docs/playtests/0.1.0/) (#23).
- **Infrastructure.** CI runs the unit tests and a headless smoke test, then deploys to the arcade (#1). The README now has GIFs of the key moments and a fresh gallery (#21, #22).
