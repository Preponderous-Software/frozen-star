# Frozen Star

![The title screen: Erebus, a black hole of 120,000 suns, ray-traced live behind the menu](docs/media/gifs/title.gif)

A first-person game about general relativity. You wake aboard the research vessel *Tern*, holding station 10 Schwarzschild radii above Erebus, a black hole of 120,000 suns. Today you find out whether things really fall in. From far away, nothing ever seems to: it slows, reddens and fades at the edge. On its own clock it falls straight through.

The old Soviet name for black holes was "frozen stars", after the frozen image a distant observer sees.

Everything outside the windows is a real light-ray trace through curved spacetime, and everything happens at its true speed: at 120,000 suns, one unit of black-hole time (GM/c³) is 0.59 seconds.

## Download

- **Play in your browser:** https://frozen-star.play.danielstephenson.dev
- **Windows:** download `frozen-star-<version>-win-x64.zip` from the [latest release](https://github.com/Preponderous-Software/frozen-star/releases/latest), unzip it and double-click `Frozen Star.exe`. The app is not signed, so if Windows says it protected your PC, choose "More info", then "Run anyway".
- **Any computer, offline:** `frozen-star-<version>-web.zip` from the same release is the site itself. Unzip it, serve the folder (`python3 -m http.server 8000`) and open http://localhost:8000/.

The game needs WebGL 2. Each download has a `.sha256` file next to it; the changes are in [CHANGELOG.md](CHANGELOG.md).

## The story

### Prologue: a dream

[![Falling through the horizon in a dream: the shadow spreads, the light crowds overhead, and at the horizon nothing happens](docs/media/gifs/dream.gif)](docs/media/darkroom/dream.mp4)

*Click the GIF, or open the [MP4](docs/media/darkroom/dream.mp4) or [WebM](docs/media/darkroom/dream.webm), for a video version.*

You dream of falling in. The black spreads until the light is all overhead, you cross the horizon, and nothing happens. The dream is ray-traced from a real fall from 10 rₛ, seen by someone falling, with the true aberration and colour shifts.

### Waking up aboard the Tern

| | |
|---|---|
| ![Your quarters: bunk, desk, the photo from home](docs/media/rooms/quarters.png) | ![The corridor: colour-coded door plates and floor arrows lead to the bridge](docs/media/rooms/corridor.png) |
| ![The lab: the archive terminal, a whiteboard with the numbers for 10 rₛ, and a clear window](docs/media/rooms/lab.png) | ![The bridge: probe console left, comms right, the helm in the middle, and Erebus in the window](docs/media/rooms/bridge.png) |

You wake in your quarters and walk forward to the bridge. The ship is a lived-in place: a cold mug of coffee six hours old by your watch (six hours and twenty minutes by the far relay's), a whiteboard with the field equation, wayfinding colours for every room, and things to pick up and read.

### I · Beacon K-1

![Beacon K-1 falling: its marker in the bridge window slows, reddens and fades at the edge of the shadow](docs/media/gifs/beacon.gif)

Drop a probe and watch its light freeze in the window. Its beacon is on the speakers, so you hear the pitch slide down as it redshifts. The probe console shows how stretched its light is and how far apart its pings arrive, and asks you to predict when ping 9 will land.

![The probe console: the light's stretch (1+z) shown large, climbing on a chart, with the growing gaps between pings](docs/media/physics/redshift.png)

### II · The rescue

![The comms console: the Fire button, a fuse gauge from mayday to deadline, and the deadline clock](docs/media/panels/comms-after.png)

Ines's capsule loses power and drifts in. Her radio messages arrive slower and redder, and her voice deepens with them. The comms console keeps a deadline clock: seconds since her mayday and seconds left before the recall beam must leave. Fire in time, but remember that the picture on your screen is old light.

### III · The descent

[![The descent: the Tern lowers toward the horizon, the shadow fills the window, and the clock strip shows the relay running ahead](docs/media/gifs/descent.gif)](docs/media/darkroom/descent.mp4)

*Click the GIF, or open the [MP4](docs/media/darkroom/descent.mp4) or [WebM](docs/media/darkroom/descent.webm), for a video version.*

Take the ship down at the helm until the far relay's clock runs twice as fast as yours, and hold it there. The shadow swallows the window, and the clock strip over it shows the relay pulling ahead. You can hear it too: the ship's clock tocks on the left, the relay's ticks on the right, two to one at 1.33 rₛ.

![The helm at 1.30 rₛ: far-away clocks run more than twice as fast, with the rear camera on the helm screen](docs/media/panels/helm-deep.png)

### IV · Orpheus

![The Orpheus feed: frames arrive further and further apart, until the last one that will ever arrive](docs/media/gifs/orpheus-feed.gif)

A camera probe streams frames that arrive further and further apart, then freeze just before the horizon. The feed console counts them and charts the growing gaps between frames, until it says "never".

### Epilogue: what you saw, and what happened

![The logbook sets what you saw against what happened, with your own numbers](docs/media/story/logbook.png)

The logbook sets **what you saw** against **what happened** for the beacon, Ines, the descent and Orpheus, using your own numbers. Then the Tern is yours to explore: Ines has more to say on the comms channel, and the helm and a spare beacon are free to use.

## The ship's consoles

| | |
|---|---|
| ![Probe console](docs/media/panels/probe-after.png) **Probe:** the light's stretch, live, and the gaps between pings. | ![Comms console](docs/media/panels/comms-after.png) **Comms:** Ines's messages beside the Fire button and the deadline clock. |
| ![Helm](docs/media/panels/helm-after.png) **Helm:** how much faster far-away clocks run, and the field strength holding the ship. | ![Camera feed](docs/media/panels/feed.png) **Feed:** Orpheus's pictures, and when the next frame is due. |
| ![Spacetime map](docs/media/panels/map-after.png) **Spacetime map:** the whole fall drawn as worldlines, including the part inside the horizon. | ![Logbook](docs/media/story/logbook.png) **Logbook:** what you saw against what happened. |

Each panel puts the one number that matters in large type, with a plain-words line under it. A key on every panel explains rₛ, M and 1+z.

## Sound

The soundscape is synthesized in the browser with WebAudio, with no audio files. Each room sounds different: the bridge hums, the corridor breathes, the quarters are quiet. The beacon's tone keeps its true 1/(1+z) pitch as it slides down into silence. Ines's voice is stretched and lowered by the redshift of the light that carried it. During the descent a deep drone sinks an octave and two clocks tick at their true rates.

## Training simulations

![Bend the Light: aiming a laser closer and closer to the shadow's edge, until the beam loops around the hole, then falls in](docs/media/gifs/bend-light.gif)

Eight short lessons, with stars to earn. Each has a mission card, numbered steps and a "Words used here" list, and every quiz answer explains why it is right or wrong.

| | | |
|---|---|---|
| ![Two Clocks](docs/media/training/two-clocks.png) **1 · Two Clocks** Drop a probe and watch it on two clocks at once. | ![Last Words](docs/media/training/last-words.png) **2 · Last Words** Ride the probe. Get a message home as late as you can. | ![The Rescue](docs/media/training/rescue.png) **3 · The Rescue** A pilot is drifting in. Your screen says there is time. |
| ![Pick Your Hole](docs/media/training/tides.png) **4 · Pick Your Hole** Some black holes tear you apart. Some let you drift through. | ![Hover](docs/media/training/hover.png) **5 · Hover** Hold still near the horizon and let the years pass outside. | ![Bend the Light](docs/media/training/bend-light.png) **6 · Bend the Light** Aim a laser past the hole. Can you make light come back to you? |
| ![Into the Dark](docs/media/training/into-the-dark.png) **7 · Into the Dark** Fall in yourself, ray-traced through curved spacetime. | ![Evaporation](docs/media/training/evaporation.png) **8 · Evaporation** "But the hole evaporates before you ever get in." Does it? | ![Observatory](docs/media/training/observatory.png) **Observatory** A free camera around a black hole. Every pixel is a traced light ray. |

Seven of them (all but Into the Dark) can also be run from the lab's archive terminal aboard the Tern.

## Menus, settings and phones

| | | |
|---|---|---|
| ![Title screen](docs/media/menus/title.png) | ![Title screen on a phone](docs/media/menus/title-phone.png) | ![Settings on a phone](docs/media/menus/settings-phone.png) |

A main menu with Continue, New game, Chapters (replay any act once finished), Training simulations, the Observatory, Settings and About. Esc pauses the world. Settings cover look speed, field of view, volume, invert look, subtitle size, graphics and fullscreen. Keyboard and mouse, touch and gamepads all work, in menus too. On phones, panels open as a bottom sheet.

## The physics is real

![Inside the horizon, 0.7 rₛ from the centre, through a wide lens: the shadow ahead, the disk and the outside sky all around it, still visible](docs/media/inside-horizon.png)

- **Exact Schwarzschild geometry.** Fall times, the station's view, redshift, rescue deadlines, tides and hovering come from closed-form solutions. See [docs/PHYSICS.md](docs/PHYSICS.md).
- **A real light-ray tracer.** The 3D views trace a ray per pixel through Painlevé–Gullstrand coordinates. Their slices are flat, so the camera works inside the horizon too. Colours shift by the true Doppler and gravitational frequency ratio.
- **Tested.** `test/physics.test.js` checks the formulas against each other and the tracer against textbook results: weak-field bending of 4M/b, and the shadow edge at an impact parameter of 3√3 M. `test/light.test.js` checks the light paths in Bend the Light.

## Gallery

![Aboard the Tern: the quarters, the lab and the bridge, side by side](docs/media/darkroom/rooms.jpg)

| | | |
|---|---|---|
| ![The bridge, looking aft](docs/media/ship/bridge-aft-after.png) | ![The corridor, looking aft](docs/media/ship/corridor-aft-after.png) | ![The quarters' bunk](docs/media/ship/quarters-bunk-after.png) |
| ![The lab](docs/media/ship/lab-room-after.png) | ![Lingering at the window: WREN gives the shadow's size](docs/media/story/window.png) | ![Orpheus will see a smaller shadow than the hovering ship did](docs/media/story/orpheus-aberration.png) |
| ![The training menu](docs/media/menus/training.png) | ![Chapters: replay any act](docs/media/menus/after-chapters-1280.png) | ![Settings](docs/media/menus/after-settings-1280.png) |

## Run it

There is no build step. Serve the folder and open it:

```sh
python3 tools/serve.py . 8000      # or any static file server
# then open http://localhost:8000/
```

The game needs WebGL 2. Add `?lowgpu` to the URL on slow machines. Controls: WASD and mouse (click to capture), E to use, Space to skip a line; on touch, left thumb walks and dragging looks; gamepads work too. On Windows, `tools/play-frozen-star.bat` opens it as a desktop app: the first run downloads a checksum-pinned Electron runtime (45.2.0, about 160 MB), then every launch copies the latest files from the WSL clone into it. `play-frozen-star.bat browser` plays in the browser instead. The Electron shell lives in `desktop/` (F11 fullscreen, F5 reload).

three.js r170 is vendored in `vendor/three` (MIT).

## Test

```sh
npm test          # node --test, no dependencies
```

`tools/tour.cjs` (training chapters) and `tools/fp-shots.cjs` (the first-person game; `?debug&cp=<checkpoint>&timescale=N`) drive headless Chromium and save screenshots (need Playwright).

## Regenerating the pictures

Every GIF and still in this README that `tools/media.cjs` knows about can be rendered again after a change (needs Playwright and ImageMagick):

```sh
python3 -m http.server 8638 --bind 127.0.0.1 &
BASE=http://127.0.0.1:8638/ node tools/media.cjs            # everything (slow under software rendering)
BASE=http://127.0.0.1:8638/ node tools/media.cjs gifs/beacon training/   # just some
node tools/media.cjs --list
```

The MP4/WebM clips and the room grid in `docs/media/darkroom/` come from [darkroom](https://github.com/Preponderous-Software/darkroom) and `tools/darkroom/media.json`; [docs/media/README.md](docs/media/README.md) says how to run it, and has a pilot report on darkroom.

## Playtesting

[playtester](https://github.com/Preponderous-Software/playtester) can play Frozen Star with AI agents. The profile is `tools/playtest/frozen-star.json`; `tools/playtest-launch.sh` serves the game and opens it in Chromium's app mode, and with `?probe` the game reports what the player sees (screen, position, heading, objective, nearest consoles) through `tools/serve.py`:

```sh
pt smoke --profile tools/playtest/frozen-star.json --game-dir .
```

## License

MIT, see [LICENSE](LICENSE). three.js (vendored in `vendor/three`) is MIT licensed by the three.js authors.
