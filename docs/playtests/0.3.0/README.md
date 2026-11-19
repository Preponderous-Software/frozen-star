# Playtests of 0.3.0

## run-1 (2026-11-19, commit cca83e6)

Three AI playtesters played main after the overnight polish pass (#38–#43): s01 the opening as a new player, watching the ship frame by frame for the flash the owner reported; s02 a failed then successful rescue and the descent; s03 the end of the story, the Postscript, photo mode, and repeated trips through the pause menu, Settings and Discoveries. `run-1/summary.md` aggregates them: 20 findings, 0 blocker, 2 major, 9 minor, 9 polish. No session saw the ship flash, across about 77 screenshots in s01 and repeated photo-mode and menu cycles in s03. The host was loaded (load 30–50, 8–15 ticks a second).

The two majors, both addressed in #44: the end-of-story logbook could open over the pause menu (Esc during a story choice paused the game), and s01's game froze once on stepping back from the probe console, at the moment a Chrome process crashed under load. The freeze did not reproduce in three scripted runs of the same transition and is treated as environmental. The minor and polish findings (late objectives, choices waiting for Esc, map label overlaps, a misleading line about Orpheus's last frames, a missing 1.5 rₛ preset) were fixed in #44 too.
