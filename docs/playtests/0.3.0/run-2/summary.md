# Playtest summary: 20261119-0800

2 sessions, build frozen-star 0.2.0 (1e8cfe9), generated 2026-11-19 08:15.

**Findings:** 14 reports in 14 groups -- 0 blocker, 0 major, 8 minor, 6 polish.

## Outcomes

| Session | Goal | Outcome | Fun | Minutes | Objectives | Deaths | Findings | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| s01 | Drop the beacon probe K-1 at the probe console, step back with Esc (does the game keep running?), then answer Ines and do the rescue with the recall beam. Check objectives tick off the moment things happen, that the probe console is easy to reach past the helm chair, and watch for the ship interior flashing out of sight. Note anything confusing. | achieved | 4 | 18.3 | 5 | 0 | 8 | The beacon-and-rescue arc works and lands: objectives ticked at the same tick as the event (probe launch, capsule away, Ines's 'Engine's lit'), Esc from a console keeps time running (K-1's clock went 1.6 -> 5.2 M while I stood back), the probe console was easy to reach both from the start position and from the helm side, and across about 60 screenshots, red-alert lighting included, the ship interior never flashed out. The deadline countdown and WREN's 'your screen showed her 6.8 rs out, looking almost normal' make the old-light lesson hit hard. The rough edges are all in the overlays: a fire button that moves under the cursor, toasts and hints that overlap console panels, and dialogue threads that interleave. |
| s02 | Finish the story: the Orpheus feed, Ines's question (does it come up without pressing Esc? try pressing Esc during the choice: the game must NOT pause), the epilogue logbook (it must not appear over the pause menu), then start the Postscript and use the helm's 1.5 rs button. Check the feed's final explanation reads correctly. Watch for the ship flashing out of sight. | achieved | 4 | 17.7 | 7 | 0 | 6 | All the checked fixes hold: Ines's question pops up by itself, Esc during the choice does not pause, the pause menu freezes time so the logbook never appeared over it, and the Postscript's 1.5 rs descent and laser test run cleanly with no ship flashing out of sight in ~80 captured frames of the descent and pulse. The Orpheus feed is the strongest moment (frames spreading out, static, then 'never'), and the final explanation reads correctly. The main thing to fix is that the hull camera prints the 11.1 s answer before the player is asked to predict it. |

## Answers

Each agent's own words, verbatim from its report; a missing answer is listed under problems.

### Q1. In your own words, what was the game teaching?

- **s01:** That what you see of something falling into a black hole is old, stretched light, not what is happening to it now. K-1's own clock ticks steadily and it crosses the horizon in under a minute of its own time, but from the ship its pings arrive further and further apart, redder and dimmer, and its picture freezes and fades at the edge. In the rescue, you can't judge the deadline from Ines's picture, because she looked almost normal at 6.8 rs when the beam was only 5 s from too late. You have to trust the computed clock and remember that a light-speed beam takes time to reach her.
- **s02:** That what you see of something falling into a black hole is not what happens to it. Orpheus's frames are sent evenly by its own clock but arrive further and further apart and fainter, and the last one comes from just outside the horizon; it really did cross in under a minute of its own time, but from far away it is never seen to fall in ('a fact about light, not about the things that fall'). The Postscript adds that at 1.5 rs light can orbit the hole: a pulse fired along the hull comes back round in circumference/c, 11.1 s, and hovering low makes your clock run slow against the far-away relay.

### Q2. Which moment was the most confusing, and why?

- **s01:** The rescue at the comms console. The brief told me to 'answer Ines', but I found no reply control, only the fire button, so I scrolled the panel looking for one. That scroll then moved the sticky fire button just as I clicked, with about 7 s left, and my first click missed. After the beam fired, the objective stayed open for about 6 more game seconds until 'Beam delivered', which makes sense physically but felt at first as if the click hadn't registered. A smaller confusion: right after the horizon crossing, Ines's question and WREN's answer were split by an unrelated helm exchange.
- **s02:** After the laser test finished, the objective box disappeared and the helm card went back to 'The laser arms in a moment: listen to WREN first' with a greyed button, so I could not tell if the Postscript was over or if something else was coming. Also the prediction question felt odd because the answer (11.1 s) was already printed on the hull camera next to it. Before that, the long silent stretch of the Orpheus fall (minutes at this frame rate) left me unsure whether to keep watching the panel or step back.

### Q3. Did anything look broken on screen? Describe each problem, where you were and which way you were facing.

- **s01:** No rendering glitches: there was no interior flashing, no holes and no black sky. The black hole was blurry, as expected. The UI overlap problems: (1) At the helm console, on the bridge's starboard-forward side facing the helm, two Discovery toasts covered the helm panel's text. (2) At the spacetime map on the port wall, facing the map, the centred hint 'Optional: the spacetime map is on th...' was clipped under the right-hand panel. (3) At the comms console, facing it, the sticky fire-beam block jumped about 40 px up after the panel scrolled. (4) Looking aft from the probe console toward the corridor door, the 'DECK 1 · BRIDGE' floor lettering reads mirrored. Also, between the probe console and the helm, facing the comms monitor, the prompt said 'Use the helm console'.
- **s02:** Nothing seriously broken. At the starboard feed console (facing the feed screen) the 'sent every 0.9 s' chart label was overlapped by the bars. Facing the feed screen when Ines's question and later the logbook opened, a faint 'Watch the probe camera' prompt showed through the dialog panels. At the helm (facing forward) the panel first opened scrolled halfway down. During the descent to 1.5 rs the forward windows went fully black from about 5 rs, which fits WREN's explanation of the shadow growing; I did not see the ship or the Tern marker flash out of sight in the 3D view, the hull camera, or the top-down diagram.

## Findings

### 1. [minor] 'E Use the helm console' prompt shows while the crosshair is on the comms monitor

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** Standing between the probe console and the helm chair, facing the comms side (helm 1.0 m at -4 deg, comms 3.0 m at +10 deg), the crosshair sits on the COMMS monitor's screen but the prompt says 'Use the helm console'. The low helm desk is the target, but the bright screen the player is looking at belongs to comms, so E opens something different from what the player expects.
- **Repro:** pt start --checkpoint bridge; stand at about x=-0.94 z=-10.87 facing the comms monitor; read the prompt
- **Screenshots:** [after_choice.png](s01/shots/after_choice.png)

### 2. [minor] Comms console: the 'Fire recall beam' button jumps when the panel scrolls, so a click under the deadline lands on the progress bar

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** With the comms panel open during the rescue I scrolled once to look for a way to answer Ines. Shortly after, the panel scrolled and the sticky fire block moved up from y~198 to y~157. My click at the button's old position (992,198) hit the mayday/deadline bar and did nothing, with about 7 s left. The second click at y~157 did fire ('Beam fired 44 s after her mayday, 5 s before the deadline'), but the button kept reading 'Fire recall beam' for about a game second, so I clicked and held it again before the label changed. On a timed, high-stakes button, the layout should not move, and the label should change the instant you press it.
- **Repro:** pt start --checkpoint bridge; launch K-1; wait for the capsule mayday; pt walkto console (comms) + e; pt move 990 500; pt scroll 5; pt shot; pt click 992 198 (old button y)
- **Screenshots:** [fired.png](s01/shots/fired.png)

### 3. [minor] Discovery toasts cover the Helm panel's description text

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** I opened the helm console just as the probe-fall discoveries fired. The two toasts 'Discovery · Metronome' and 'Discovery · Called it' sit on top of the Helm panel's body text ('Holding station at 10 rs. Descent ... the survey you will take the ship down toward the horizon from here'), and the overlapping text cannot be read in either one. Toasts should sit outside the console panel, or stack below its text.
- **Repro:** pt start --checkpoint bridge; launch K-1; answer the ping-9 prediction; open the helm console around tick 4800
- **Screenshots:** [toast_overlap.png](s01/shots/toast_overlap.png)

### 4. [minor] Game ran at roughly 9-15 ticks a second (load average ~30), making walking and waiting very slow

- **Category:** perf; **reported by** 1 agent(s): s02
- **Detail:** Machine was shared with other sessions. Walking a few metres took 8+ real seconds and a single E press at the probe console was missed once. Logged for context; the Orpheus fall took ~6 real minutes.
- **Repro:** pt status / uptime during the session
- **Screenshots:** [probe2.png](s02/shots/probe2.png)

### 5. [minor] Helm laser card reverts to stale 'The laser arms in a moment: listen to WREN first' after the test is finished

- **Category:** text; **reported by** 1 agent(s): s02
- **Detail:** After the pulse is caught at the stern and the last Postscript objective completes, the ranging-laser card shows the greyed Fire button again with the pre-briefing line 'The laser arms in a moment: listen to WREN first.' It reads as if the test is still pending. Expected: a 'test complete: 11.1 s, 3.34 million km' style line.
- **Repro:** same as above; fire the laser, wait until WREN says 'Caught at the stern...', look at the top of the helm panel
- **Screenshots:** [helm-stale-text.png](s02/shots/helm-stale-text.png)

### 6. [minor] Photon-sphere prediction is spoiled: hull camera caption already shows '11.1 s' beside the question

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** The prediction box asks when the pulse will come back round by the ship's clock (11 s / 19 s / never). The helm panel's hull camera, visible right next to it, already reads 'Dead ahead: our own light, 11.1 s old' (it shows that from the moment the ship reaches 1.5 rs). A player can read the answer off the screen before predicting. Expected: hide or blur that caption until after the prediction is logged.
- **Repro:** pt start --checkpoint helm-done; launch Orpheus, watch feed to the end, answer Ines, Postscript from the logbook, helm -> '1.5 rs . photon sphere'; wait for the CHOICE; look at the hull camera card
- **Screenshots:** [spoiler-hullcam.png](s02/shots/spoiler-hullcam.png)

### 7. [minor] Spacetime map: centred 'Optional: the spacetime map is on th...' hint is clipped under the console panel

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** At the spacetime map console, the screen-centre hint 'Optional: the spacetime map is on the port wall.' is cut off by the right-hand panel. The hint is also redundant by then, because the player is already using the map. It should hide while a console is open, or at least once the map has been opened.
- **Repro:** pt start --checkpoint bridge; after WREN says the fall is drawn on the spacetime map, walk to the map (port wall) and press e
- **Screenshots:** [map_hint_cut.png](s01/shots/map_hint_cut.png)

### 8. [minor] Two dialogue threads interleave after opening the helm during the probe fall, so the replies come out of order

- **Category:** text; **reported by** 1 agent(s): s01
- **Detail:** After the horizon-crossing line I opened the helm. The subtitles then ran: WREN 'Descent is locked until the survey plan calls for it' -> INES 'Then what am I looking at? It's still there on the screen' -> INES 'And not while I'm prepping the capsule, please' -> WREN 'Old light...'. Ines's question and WREN's answer have the helm exchange spliced between them, and two Ines lines from different topics stack up at once. A helm aside should either wait for the current exchange to end or be queued as a whole.
- **Repro:** pt start --checkpoint bridge; launch K-1; right after 'K-1 crossed the horizon 58 seconds after release', open the helm console (E or Return)
- **Screenshots:** [w4_2.png](s01/shots/w4_2.png)

### 9. [polish] Feed panel says frames are sent 'every few seconds' but also 'all 0.9 s apart'; chart label overlapped by bars

- **Category:** text; **reported by** 1 agent(s): s02
- **Detail:** Under FRAMES RECEIVED the caption reads 'one sent every few seconds of its time', while the line below says 'On Orpheus's own clock they are all 0.9 s apart' (and the probe console said 'every few seconds' too). In the frame-gap chart the 'sent every 0.9 s' label sits on the dashed line and the bars are drawn across it, so it is partly hidden. The final explanation itself ('This is the last frame that will ever arrive. The next one was due from inside the horizon, and nothing sent from there gets out.' plus 'Last gap: 4.7 s') reads correctly and matches WREN's line and the logbook.
- **Repro:** pt start --checkpoint helm-done; launch Orpheus; use the feed console; wait until NEXT FRAME DUE reads 'never'; scroll the panel down
- **Screenshots:** [feed-chart-label.png](s02/shots/feed-chart-label.png)

### 10. [polish] Floor lettering 'DECK 1 · BRIDGE' reads mirrored from inside the bridge

- **Category:** text; **reported by** 1 agent(s): s01
- **Detail:** Looking back from the probe console toward the corridor door, the floor text near the door is mirrored (it reads correctly only from the door side). Cosmetic.
- **Repro:** pt start --checkpoint bridge; walk to the probe console; pt face 150
- **Screenshots:** [look_back.png](s01/shots/look_back.png)

### 11. [polish] Helm panel opens scrolled part-way down, hiding its header and Fire button

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** The first time I opened the helm in the Postscript, the panel was already scrolled so it started at 'Altitude 10.000 rs...'; the HELM header and the ranging-laser card were above the fold. I had scrolled the feed panel earlier, so the scroll position may be carried over between consoles. Expected: each console opens at the top.
- **Repro:** scroll down in the feed console panel; Esc; walk to helm; press E
- **Screenshots:** [helm1.png](s02/shots/helm1.png)

### 12. [polish] Objective box goes blank in the gaps between story beats

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** Between 'Watch the probe fall' completing (tick 7164) and 'Watch Ines launch' starting (8148), and again between 'Wait for Ines's reply' (13427) and the descent objective (14417), the HUD shows no objective at all. That is about 16 game seconds each time, and on a slow machine it felt longer. A 'Wait / listen to Ines' line would tell the player that nothing is expected of them yet.
- **Repro:** pt start --checkpoint bridge; play through the probe fall; watch the top-left after the objective ticks
- **Screenshots:** [after_map.png](s01/shots/after_map.png)

### 13. [polish] Return in walk mode opens the console under the crosshair (undocumented, easy to hit by accident)

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** I pressed Return by accident after a choice, and it opened the helm console, as E would. That is harmless, but the controls don't mention it, and it is the same key that starts the game from the title screen and might be used to confirm choices.
- **Repro:** pt start --checkpoint bridge; stand within reach of a console; pt key Return
- **Screenshots:** [toast_overlap.png](s01/shots/toast_overlap.png)

### 14. [polish] World-space use prompt ('Watch the probe camera') bleeds through behind the choice box and logbook

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** While Ines's question is open, and later in the logbook, a faint 'Watch the probe camera' prompt is visible through the dialog panels (e.g. under the second answer, and in the logbook's Ines entry). Expected: hide the use prompt while a modal is open.
- **Repro:** stand at the feed console when the Orpheus feed ends; wait for the CHOICE; look under answer 2
- **Screenshots:** [choice-esc-ok.png](s02/shots/choice-esc-ok.png)

## Objective timings

Game seconds from the start of the world to each objective (event tick / the game's ticks per second, from events.jsonl). Game time, not wall time: with many sessions on one machine a world can run slower than real time, and wall-clock timings would mostly measure the machine.

| # | Objective | s01 | s02 | min | median | max |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Drop the beacon probe (probe console, left) | 14.5 | - | 14.5 | 14.5 | 14.5 |
| 1 | Launch Orpheus (probe console), then watch its feed (starboard screen) | - | 17.9 | 17.9 | 17.9 | 17.9 |
| 2 | Watch the Orpheus feed (starboard screen) | - | 113.3 | 113.3 | 113.3 | 113.3 |
| 2 | Watch the probe fall | 119.4 | - | 119.4 | 119.4 | 119.4 |
| 3 | Optional: take the Tern down to the photon sphere, 1.5 rₛ (helm) | - | 175.7 | 175.7 | 175.7 | 175.7 |
| 3 | Watch Ines launch: the port side of the bridge window | 151.8 | - | 151.8 | 151.8 | 151.8 |
| 4 | Photon sphere reached. Listen to WREN's briefing | - | 199.9 | 199.9 | 199.9 | 199.9 |
| 4 | Save Ines: fire the recall beam from the comms console. Wait as long as you dare. | 211.2 | - | 211.2 | 211.2 | 211.2 |
| 5 | Log a prediction (the answer box) | - | 213.5 | 213.5 | 213.5 | 213.5 |
| 5 | Wait for Ines's reply: its light is still on the way (comms console) | 223.8 | - | 223.8 | 223.8 | 223.8 |
| 6 | Fire the ranging laser along the hull (helm) | - | 217.4 | 217.4 | 217.4 | 217.4 |
| 7 | Watch the pulse go round Erebus (helm panel) | - | 228.5 | 228.5 | 228.5 | 228.5 |

