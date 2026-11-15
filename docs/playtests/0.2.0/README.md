# Playtests of 0.2.0 (in development)

Evidence for the build after 0.1.0, named for the next expected version.

## run-1 (2026-11-15, commit b396722)

Four AI playtesters played the build with the second fan-out merged: the capsule bay (#29), the photon-sphere Postscript (#27), Discoveries and photo mode (#26), controls and accessibility (#28) and the continuous photon ring (#25). s01 played the opening with attention to Ines; s02 the rescue and the bay; s03 the post-story free roam, Postscript, photo mode and Discoveries; s04 settings and accessibility. `run-1/summary.md` aggregates them (24 findings). The host was heavily overloaded (load 95–150), so the game ran at 2–10 ticks a second and every session ended partial; frame-rate findings are context, not game bugs. The capsule bay worked: s01 was never unsure where Ines was.

## run-2 (2026-11-15, commit 3975b28)

The final playtest before 0.2.0, on main with Ines and WREN voiced (#33, #35) and the round-5 fixes (#34). Three AI playtesters: s01 played the opening as a new player (the dream's start, WREN introducing itself, Ines in the capsule bay, the beacon); s02 the rescue (Ines's launch, the recall beam, whether the deadline numbers agree) and the start of the descent; s03 the Postscript, photo mode and the logbook and Discoveries lists. `run-2/summary.md` aggregates them: 18 findings, 0 blocker, 0 major, 16 minor, 2 polish. s01 and s02 achieved their goals and s03 got as far as the mast pulse; each rated the game 4 of 5. The host was again loaded (load 55–60, 4–20 ticks a second).

What it confirmed: the dream starts at once with a cue, WREN introduces itself as the ship's AI, Ines's launch has a visible build-up, and the deadline is 49 s everywhere (WREN, the comms bar, the after-firing line, the debrief). What it found, fixed in the round-6 PR: a stale "out of your door" hint in the corridor; a briefing that played after the beacon was already away; Ines greeting twice and not saying where she was; "M" unexplained on the probe console; a 46-second stretch with no objective after the rescue; the capsule's picture freezing at the burn instead of climbing home; at the photon sphere, a stale descent hint and a laser that looked armed but was not; an overshoot-prone altitude slider; and a photo-save confirmation that faded too quickly to notice.
