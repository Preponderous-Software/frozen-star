Frozen Star opens on its main menu (screen `TITLE`), with **Wake up** (or **Continue**)
focused: `pt key Return` starts it. A new game opens with a dream of falling into the black
hole (screen `DREAM`, about 30 seconds); a **Skip the dream** button sits at the bottom right.
Then you wake in your quarters aboard the Tern (screen `WORLD`). Profiles started with
`--checkpoint NAME` begin later in the story: `bridge`, `probe-done` (the rescue),
`rescue-done` (the descent) and `helm-done` (Orpheus).

| Input | Action |
|---|---|
| W A S D | walk (Shift runs) |
| Left / Right arrows (`pt hold Right 0.5`) | turn, about 103 degrees a second |
| Mouse (`pt look DX DY`) | look, once the mouse is captured by a click on the game |
| E | use what the crosshair is on (a console, the datapad, the porthole) |
| Space | finish the current subtitle line |
| Esc | at a console: step back; while walking: pause (Esc again resumes) |
| 1, 2, 3 | pick an answer when the game asks a question |

Practical notes:

- Turning: the arrow keys are reliable (`pt face DEG` uses them). Up/Down arrows walk, they
  do not tilt; tilt the view with the mouse after clicking the game once.
- `pt walkto console`, `pt walkto item` or `pt walkto door` walks to the nearest one; the
  state's `nearest` lists every console by name (`probe`, `helm`, `comms`, `map`, `feed`,
  `archive`) with its distance and bearing. Face it and press E when the use prompt shows.
- At a console a panel opens on the right; its text is in the state's `panel` field.
  Buttons there need a click: take a shot to find them. Esc steps back.
- The story waits for real time to pass: a probe takes about a minute to fall, and the rescue
  window closes about 50 seconds after the capsule loses power. Subtitles show who is
  speaking (WREN is the ship, Ines is the pilot).
- The view through the windows is a ray-traced black hole drawn behind the ship. In this
  virtual display it renders in software at reduced resolution, so it is blurry and the
  frame rate is low; report a glitch only when something is wrong beyond blur, such as
  flicker, misalignment, holes, garbled colours or black where sky should be.
