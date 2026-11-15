# Changelog

Versions are bare tags (`0.1.0`). Each release's playtest evidence is in `docs/playtests/<version>/`, and the release process is in [docs/RELEASING.md](docs/RELEASING.md).

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
