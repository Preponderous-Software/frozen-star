# Second playtest of 0.1.0

Four AI playtesters ([playtester](https://github.com/Preponderous-Software/playtester), x11 driver, Chromium in software rendering) played commit d654778, the build with the first round's fixes, on 2026-11-14. Profile: `tools/playtest/frozen-star.json`.

| Session | Goal | Outcome | Fun |
| --- | --- | --- | --- |
| s01 | The descent and Orpheus (it was given the new-player goal but played this one) | achieved | 4/5 |
| s02 | Graphics hunt, second pass: every room and window, the ring around the hole while turning | achieved | 3/5 |
| s03 | The whole second half: rescue, descent, Orpheus, the choice and the logbook | partial (out of time at Orpheus; the run was slow) | 4/5 |
| s04 | Menus and options: settings in game, training, observatory, pause, Continue | partial (no Chapters menu existed) | 4/5 |

`summary.md` is the aggregated report (33 findings: 0 blocker, 1 major, 20 minor, 12 polish). The bridge windows passed the graphics hunt: no broken ring, slivers or flicker.

The fixes that followed are in the pull request that adds this directory: the comms screens disagreeing after the rescue and Ines's reply arriving before her older messages, the hold countdown logging a new objective every second, the black-window explanation coming too late, the end of the Orpheus feed announced one frame early, a Chapters menu that unlocks as you play, a confirm on the pause menu's Main menu, the use prompt following the crosshair, the prediction question's time limit (now game time, with a bar), the hull seen from the porthole, the lab's archive screen, and smaller items.
