# Playtest of 0.1.0

Four AI playtesters ([playtester](https://github.com/Preponderous-Software/playtester), x11 driver, Chromium in software rendering) played commit c667e1e on 2026-11-14. Profile: `tools/playtest/frozen-star.json`.

| Session | Goal | Outcome | Fun |
| --- | --- | --- | --- |
| s01 | A brand-new player, from the title menu to the beacon drop | achieved | 3/5 |
| s02 | Graphics hunt through every room and window | achieved | |
| s03 | The rescue | achieved | 4/5 |
| s04 | The descent and Orpheus | achieved | 4/5 |

`summary.md` is the aggregated report (34 findings: 0 blocker, 2 major, 17 minor, 15 polish). Each session directory holds its `report.json`, `findings.jsonl`, the game's probe `events.jsonl`, and the screenshots its findings cite.

The fixes that followed are in the pull request that adds this directory: the missing hull behind the corridor windows, handrails across doorways, the ray tracer's unfinished rays near the photon sphere (the cut inner ring and slivers at the shadow's edge), Orpheus's dead Launch button, the self-completing optional objective, the hold countdown, the rescue's aftermath on the comms screen, unit legends, and smaller items.
