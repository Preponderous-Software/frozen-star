# Playtest summary: 20261115-1314

4 sessions, build frozen-star 0.1.0 (b396722), generated 2026-11-15 13:44.

**Findings:** 24 reports in 24 groups -- 0 blocker, 4 major, 10 minor, 10 polish.

## Outcomes

| Session | Goal | Outcome | Fun | Minutes | Objectives | Deaths | Findings | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| s01 | Play from the very beginning as a brand-new player: the title menu, the dream, waking up, finding the bridge and dropping the beacon probe. Pay special attention to Ines: can you tell where she is, where the capsule bay is, and what she is doing? Note every moment of confusion and screenshot anything broken. | partial | 3 | 25.6 | 1 | 0 | 5 | The opening spaces are well signposted and Ines is placed beautifully: you see her through the capsule bay window the moment you leave quarters, the bay status screen names her and says PRE-FLIGHT, and her subtitles say where she is and what she is doing. The run was crippled by host load (3-10 tps, a 3-minute black dream, a final freeze at the probe console), so the probe drop went untested; the one design bug seen is WREN's stale 'bridge is forward' hint firing after arrival. |
| s02 | The rescue and the descent: watch Ines leave in the capsule (where does she leave from, can you see it?), save her with the recall beam using the deadline clock, check that she comes back to the capsule bay, then take the ship down at the helm, hold, and return. Judge whether her departure and return are clear and whether anything looks broken. | partial | 3 | 28.3 | 1 | 0 | 5 | The rescue's core idea lands: the comms panel's mayday-to-deadline bar, 'INES, AS RECEIVED' messages arriving out of order, and WREN's 'that is old light: she is already climbing' make the delay of light feel real and tense. Her departure is the weak point: on the probe-done checkpoint the capsule leaves ~6 s in with no lead-up and nothing to see, and the capsule itself is barely drawn. I ran out of time under heavy host load before her return and the helm descent, so those are untested. |
| s03 | After the story: free roam the ship, talk to Ines (comms console or the capsule bay intercom), then accept and play the optional Postscript mission about the photon sphere (fire the ranging laser and watch light circle the hole). Also try photo mode (P) and save a picture, and open the Discoveries list. Judge whether the Postscript teaches its idea clearly and whether photo mode is easy to use. | partial | 3 | 26.4 | 1 | 0 | 7 | Photo mode and the Discoveries list are polished and easy: Sky only gives a stunning lensed-disk shot in two clicks, and the Discoveries hints ('Predict when the ninth ping will arrive') are nicely evocative. I could not judge the Postscript: the host was so loaded (5-10 tps, a Chrome 'Page Unresponsive' stall) that its timer-driven offer fired during the stall and I ran out of time before reaching the helm. The offer should be discoverable before it fires and replayable after, and the comms console should not go silently dead after Ines's line. |
| s04 | Settings and accessibility: rebind a few keys (for example walking and use) and check they work in game, try reduce flashing, subtitle background, console text size, hold/toggle run and colour-safe redshift. Check the Chapters menu (including the Postscript), the Discoveries screen and About. Note anything confusing, broken or unreadable. | partial | 3 | 18.9 | 0 | 0 | 7 | The settings and menus are genuinely strong: rebinding is clear (Esc cancels, Backspace clears, conflicts are resolved with a plain message like 'S was on Walk back, which now uses ↓'), rebinds work in game, and the on-screen hint immediately reflects the new keys (I/F). Subtitle background at 100% gives a solid readable box and every toggle has a one-line explanation. Main gaps: toggle-run has no visible state, Discoveries/Chapters hints spoil the plot, and on this overloaded machine (~8 tps) I could not reach a console to check console text size or see the alarm/redshift effects of reduce flashing and colour-safe redshift. |

## Answers

Each agent's own words, verbatim from its report; a missing answer is listed under problems.

### Q1. In your own words, what was the game teaching?

- **s01:** That a black hole looks like a black disk (its shadow) about two and a half times wider than the horizon, with a bright ring of starlight from behind it bent all the way around; the setup suggests you will next watch a probe fall and see time dilation (ship clock vs relay clock on the bridge). I did not get far enough to see the probe lesson itself.
- **s02:** That near a black hole, light from a falling object arrives late and stretched (redshift 1+z), so what you see of her is old: her picture keeps falling and her messages arrive out of order even after she is saved. You must act on the computed clock, not on her image. The panel also defined r_s, M as a unit of time, and 1+z.
- **s03:** That what a distant observer sees of something falling into a black hole is not what happens to it: the beacon's pings and the camera feed slow, redden and freeze at the edge of the shadow, yet by its own clock the probe crosses the horizon in under a minute; hovering clocks run slow relative to the far relay; and for a big hole like Erebus the tide at the horizon is gentle (0.15 g) while a ten-sun hole would shred you. 'From far away, nothing is ever seen to fall in. That is a fact about light, not about the things that fall.' The Postscript was set up to be about the photon sphere at 1.5 rs, where light orbits, but I did not get to play it.
- **s04:** General relativity around a non-spinning black hole: the About screen and WREN's lines explain that the black disk is the hole's shadow (about 2.5x wider than the horizon), the bright ring is starlight bent all the way around, and that fall times, redshift, tides and slowed clocks all come from Schwarzschild's solution. I only got as far as the first room, so beyond those ideas I could not tell.

### Q2. Which moment was the most confusing, and why?

- **s01:** The dream: after Wake up the screen was pure black for minutes with only a Skip button, no image, no text, and my first clicks on Skip did nothing, so it looked frozen. Second: on reaching the bridge WREN told me how to get to the bridge.
- **s02:** The very start: WREN said 'Capsule away' about 6 seconds after I spawned, with no warning and nothing visible, so I never saw where or how Ines left. Second: pressing E at the comms console left the camera fixed on the window instead of opening the panel.
- **s03:** After talking to Ines at comms: the console kept showing 'E Use the comms console' but further presses did nothing, and nothing told me where the Postscript was. Then the Postscript offer arrived on its own while the page had frozen, so the first I knew of it was the objective panel quietly changing to 'Optional: take the Tern down to the photon sphere, 1.5 rs (helm)'.
- **s04:** Starting a new game: the dream was a fully black screen for about 15 seconds with no loading sign, so it looked hung. Second: after switching run to press-to-toggle, tapping Shift gave no feedback, so I could not tell whether I was running.

### Q3. Did anything look broken on screen? Describe each problem, where you were and which way you were facing.

- **s01:** 1) Dream screen fully black (start of game, no facing). 2) On the bridge just inside the door, facing forward toward the main windows, WREN's stale directions subtitle showed without its dark backing panel, floating over the console above Ines's line. 3) In the corridor facing the capsule bay window, the 'E Talk to Ines' prompt covered the bay status screen. 4) At the probe console facing the forward-left window, the picture froze for 3+ minutes (no E prompt appeared). The ray-traced black hole through windows was blurry but looked correct (shadow plus lensed ring, no holes or flicker).
- **s02:** On the bridge beside the comms console, facing the starboard window and comms monitor: the 'Capsule · Ines' marker and the monitor's orange target brackets framed nothing visible. In one shot (t2, bridge centre facing forward), a black rectangle covered the top-centre of the view just under the browser bar (x 370-910). It did not reappear, so it may have been a capture artefact. Otherwise the black hole view through the windows looked right apart from expected blur.
- **s03:** (1) Epilogue logbook screen, start of play, facing forward on the bridge: the 'Discovery - Frozen star' toast is partly hidden behind the log panel. (2) Aft of the bridge near the Survey Stores / O2 Masks cabinet, facing the corner: the camera sat inside the potted plant and against the wall. (3) A Chrome 'Page Unresponsive' dialog covered the game while walking aft from comms. The ray-traced black hole through the bridge windows and in photo mode looked right (blurry from software rendering, but no flicker, holes or wrong colours).
- **s04:** Nothing clearly broken. In the dream (start of a new game) the screen was black for ~15 s. In the quarters, facing the porthole (yaw about -6) and later the corridor door (yaw about 66), the controls hint stayed on screen permanently, including behind the pause menu; the pause menu itself appeared a couple of seconds after the game state already said PAUSE (likely the slow machine). The sky through the porthole was blurry but otherwise correct.

## Findings

### 1. [major] Dream screen is solid black for ~3 minutes with tick stuck at 0; Skip button unresponsive at first

- **Category:** perf; **reported by** 1 agent(s): s01
- **Detail:** After Wake up, DREAM showed only a black screen, the menu icon and 'Skip the dream' for about 3 minutes of wall time. state tick stayed at 0, no subtitles. Two clicks on Skip did nothing; after Space + Return the button took focus and some seconds later the dream's lines ('Falling. No wind, no sound.') fired at ticks 143-150 and it moved on to the wake cutscene. I never saw any dream visuals. Host load average was 90-140 (many parallel sessions), so this is likely starvation, but a black screen with no loading indicator reads as a hang to a player. Expected: dream visuals or at least a loading/progress cue.
- **Repro:** pt start --profile /root/frozen-star/tools/playtest/frozen-star.json --game-dir /root/frozen-star; pt key Return; pt await DREAM 20; pt wait 45; pt shot x; pt click 1186 684
- **Screenshots:** [dream-stuck.png](s01/shots/dream-stuck.png)

### 2. [major] Game ran at ~3-10 ticks/s and finally froze (tick 3359) at the probe console; beacon probe never dropped

- **Category:** perf; **reported by** 1 agent(s): s01
- **Detail:** Throughout WORLD the game ran far below 60 tps: holding Left 6 s turned ~10 degrees, Shift+W for 30 s moved ~4 m. Mouse look worked better than arrow keys. At the probe console (2.2 m, bearing -5, crosshair on the PROBE screen) no 'E' use prompt appeared, then the tick stopped at 3359 and state.json went unwritten for 3+ minutes; inputs had no effect. Probably host starvation (load avg 100-140), but it blocked the second objective within my time budget.
- **Repro:** pt start ...; play to the bridge; walk to the probe console; pt state (tick does not advance, stateAgeSec grows)
- **Screenshots:** [frozen.png](s01/shots/frozen.png)

### 3. [major] Game ran at ~5-10 ticks/s and Chrome showed 'Page Unresponsive' while walking on the bridge

- **Category:** perf; **reported by** 1 agent(s): s03
- **Detail:** With the host at load ~100+, the game ran far below 60 tps (about 3000 ticks in 26 wall minutes); holding Shift+W for 20 s moved ~3 m. At tick ~2600, walking aft from the comms console, Chrome raised a 'Page Unresponsive - Frozen Star' dialog and all input stopped until I clicked Wait. Likely mostly host contention, but it cost the whole Postscript. Screenshots also lagged the probe by several seconds throughout.
- **Repro:** pt start --checkpoint epilogue; Keep exploring; walk to comms, E; then face aft and pt hold Shift_L+w 15
- **Screenshots:** [page-unresponsive.png](s03/shots/page-unresponsive.png)

### 4. [major] probe-done checkpoint: Ines's capsule departs ~6 s in with no lead-up and no visible launch

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** Right after spawning on the bridge facing the helm, WREN says 'Capsule away. She is holding position beside us.' at tick 382 (6.4 game s). No earlier line, prompt or objective prepares for it, and the bay door is locked, so the player cannot go and watch her leave from the bay. I was still turning around and saw no launch. I expected a warning line, or a moment where the capsule is visibly pushed out of the bay before 'Capsule away'.
- **Repro:** pt start --profile /root/frozen-star/tools/playtest/frozen-star.json --game-dir /root/frozen-star --checkpoint probe-done; pt face 180; watch subtitles
- **Screenshots:** [capsule_away_noseen.png](s02/shots/capsule_away_noseen.png)

### 5. [minor] Capsule is almost invisible: a few-pixel box through the port window, empty target brackets on the comms monitor

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** The only sign of the capsule I found was a tiny dark box with a red light just above the port bridge window sill (tick ~1000), and it could easily be a fixture. Later the in-world 'Capsule · Ines' marker and the comms monitor's orange target brackets frame nothing visible (tick ~3100, monitor reads 'engine burn seen, climbing home'). I expected a recognisable capsule shape or light inside the brackets so the player can watch the rescue happen.
- **Repro:** probe-done checkpoint; after the mayday, face the comms console from beside it and look at the monitor and the starboard window
- **Screenshots:** [capsule_empty_brackets.png](s02/shots/capsule_empty_brackets.png)

### 6. [minor] Comms camera locked on the window after the first E press; mouse look ignored until a second click

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** Pressing E next to the comms console (tick ~1427) did not open the panel. The view instead stayed fixed on the starboard window and the capsule marker, and two `pt look` moves did nothing until I clicked the game again. A second E opened the panel only after I re-aimed. This may be pointer-lock loss combined with very low tps, but to a player it feels like the controls froze.
- **Repro:** probe-done; walk to the comms console; press e; pt look 0 250; pt shot
- **Screenshots:** [comms3.png](s02/shots/comms3.png)

### 7. [minor] Comms console goes silent after Ines's tide line, with the E prompt still shown

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** First E at comms plays Ines (0.15 g tide at the horizon) and WREN's follow-up (2.1x10^7 g for a ten-sun hole). Pressing E again (three times, ticks ~1600-1900) did nothing at all: no panel, no line, no 'nothing more to say'; the 'E Use the comms console' prompt stays up so it looks broken. Expected either a panel, a repeat, or a closing line.
- **Repro:** pt start --checkpoint epilogue; Keep exploring; walk to comms; pt key e; wait for both lines; pt key e (x3)
- **Screenshots:** [comms-dead.png](s03/shots/comms-dead.png)

### 8. [minor] Discoveries hints spoil the story before the player starts

- **Category:** text; **reported by** 1 agent(s): s04
- **Detail:** From the title screen, Discoveries (0 of 20) lists hint text for every locked entry, including 'Save Ines with almost no time to spare', 'Tell Ines the truth about Orpheus' and 'Take the Tern lower than you were asked to'. These reveal plot beats (a rescue, a secret about Orpheus) to a fresh player. Chapter titles (The rescue, Orpheus, The photon sphere) do the same, more mildly. Consider hiding hints for story discoveries until the relevant chapter is reached.
- **Repro:** pt start ...; click Discoveries; scroll the panel
- **Screenshots:** [disc2.png](s04/shots/disc2.png)

### 9. [minor] Dream opens on a fully black screen for ~15 s with no loading indicator

- **Category:** perf; **reported by** 1 agent(s): s04
- **Detail:** After Wake up the DREAM screen was solid black (only the menu button and 'Skip the dream') for about 15 s real time; tick went 0 -> 24. On a loaded machine, but a player would think the game hung. Expected a loading hint or an immediate first frame/subtitle.
- **Repro:** pt start ...; click Wake up; pt await DREAM 20; pt wait 8; pt shot
- **Screenshots:** [dream-black.png](s04/shots/dream-black.png)

### 10. [minor] Expedition log does not scroll with the mouse wheel; 'Keep exploring' is below the fold

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** The epilogue logbook is taller than 720 px. Mouse wheel over the panel did nothing; I had to drag the thin scrollbar to reach 'Keep exploring' / 'Main menu'. Same in the Discoveries list (I used the scrollbar). Expected wheel scrolling, or the buttons pinned visible.
- **Repro:** pt start --checkpoint epilogue; pt move 640 400; pt scroll 10; pt shot
- **Screenshots:** [logbook-bottom.png](s03/shots/logbook-bottom.png)

### 11. [minor] Host overload (load avg 95-150) cut the game to ~1.5-7 tps, so I could not reach the return or the descent

- **Category:** perf; **reported by** 1 agent(s): s02
- **Detail:** Game time ran 10-40x slower than real time. Key holds and arrow turns were mostly dropped (pt face overshot or went the wrong way; hold Right 0.5 gave no turn). I fired the beam at 26 s rather than waiting near 49 s. After 28 real minutes I had only reached tick 3394 (~57 game s): Ines says 'Engine's lit... I'm coming home!' but has not docked yet. This is environmental, not necessarily a game bug.
- **Repro:** run alongside many parallel sessions; pt status / uptime
- **Screenshots:** [perf_slow.png](s02/shots/perf_slow.png)

### 12. [minor] Postscript offer (card + WREN line) fires on a timer and can be missed entirely

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** The Postscript card 'Postscript - The photon sphere' and WREN's offer ('one item is left on the survey plan... A ranging-laser test at the photon sphere') fired at tick 2722 with no player action, exactly while the page was stalled, so I never saw the card or the line; I only noticed later that the objective panel had changed to 'Optional: take the Tern down to the photon sphere, 1.5 rs (helm)' with a 'Helm 6 m' marker. Before it fired, nothing on screen hinted that a Postscript existed: the free-roam hint only says 'talk to Ines at the comms console, take the helm, or drop another beacon'. A way to re-hear the offer (e.g. at comms or the helm) would help.
- **Repro:** pt start --checkpoint epilogue; Keep exploring; free roam ~40 game seconds; check events for card at tick 2722
- **Screenshots:** [no-postscript.png](s03/shots/no-postscript.png)

### 13. [minor] Run set to 'Press to toggle' gives no on-screen sign whether run is on

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** Settings > Options > Run key = Press to toggle. In game, tapping Shift shows nothing: no run icon, no toast, and the controls hint ('I A ↓ D to walk, mouse or ← → to look, F to use things, Esc to pause') never mentions Shift or running. state.player.speed stayed 2.2. With toggle mode a player can easily forget which state they are in. Expected a small 'Running' indicator or hint text. (At ~10 tps I could not measure whether speed actually changed.)
- **Repro:** pt start ...; Settings > Options > Press to toggle; Wake up; skip dream; pt key Shift_L; pt hold i 3; pt shot
- **Screenshots:** [run-toggle-no-indicator.png](s04/shots/run-toggle-no-indicator.png)

### 14. [minor] Stale WREN directions to the bridge shown after arriving on the bridge

- **Category:** bug; **reported by** 1 agent(s): s01
- **Detail:** On entering the bridge, WREN's 'The bridge is forward, Doctor. Out of your door, turn right, and follow the corridor.' appeared together with Ines's arrival line. Directions to a place I am already standing in are confusing; the hint should be cancelled when the objective completes. WREN's line also rendered without its dark backing panel, floating over the console.
- **Repro:** pt start ...; skip dream; walk from quarters to the bridge slowly (took ~40 game s); pt shot on arrival
- **Screenshots:** [stale-directions.png](s01/shots/stale-directions.png)

### 15. [polish] 'Discovery - Frozen star' toast is partly covered by the expedition log panel

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** On the epilogue logbook screen the discovery toast at top right sits behind the log panel; its first letters ('Di', 'Be', 'ca') are hidden.
- **Repro:** pt start --checkpoint epilogue; pt shot
- **Screenshots:** [logbook-toast-overlap.png](s03/shots/logbook-toast-overlap.png)

### 16. [polish] 'E Talk to Ines (bay intercom)' prompt covers the capsule bay status screen

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** At the bay intercom in the corridor the use prompt sits over the CAPSULE BAY / PRE-FLIGHT / INES OKAFOR status screen, hiding part of its text. Otherwise this spot is excellent: Ines is visible through the bay window and the subtitle tags her as 'INES - CAPSULE BAY'.
- **Repro:** pt start ...; skip dream; walk out of quarters, face the bay window (bay item bearing ~0, 1.7 m)
- **Screenshots:** [ines-intercom.png](s01/shots/ines-intercom.png)

### 17. [polish] About screen shows no version number

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** About lists credits, further reading and the licence but not the game version (state says 0.1.0). Useful for bug reports.
- **Repro:** pt start ...; click About; scroll to bottom
- **Screenshots:** [about2.png](s04/shots/about2.png)

### 18. [polish] Camera clips into the potted plant by the survey stores cabinet

- **Category:** bug; **reported by** 1 agent(s): s03
- **Detail:** After running aft from comms into the corner by the Survey Stores / O2 Masks cabinet, the view sat inside the plant's leaves and against the wall; the player also seemed to stop dead there, which made Shift+W look like it did nothing.
- **Repro:** from comms, face aft-starboard toward the stores cabinet and pt hold Shift_L+w 15
- **Screenshots:** [no-postscript.png](s03/shots/no-postscript.png)

### 19. [polish] Chapters list labels the first entry 'PROLOGUE' over 'Prologue'

- **Category:** text; **reported by** 1 agent(s): s04
- **Detail:** Every other chapter has a kicker (CHAPTER I) and a title (Beacon K-1); the first shows PROLOGUE then Prologue, which reads as a duplicate. Expected a title such as 'Waking up'.
- **Repro:** pt start ...; click Chapters
- **Screenshots:** [chapters1.png](s04/shots/chapters1.png)

### 20. [polish] Controls hint stays on screen permanently, even under the pause menu

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** The 'I A ↓ D to walk ... Esc to pause' hint stayed in the middle-lower screen the whole time I was in the world (~1000 ticks, after walking, turning and using the porthole) and remained visible behind the PAUSED panel. Expected it to fade once the player has moved/used something.
- **Repro:** Wake up; skip dream; walk and press F; pt key Escape; pt shot
- **Screenshots:** [pause2.png](s04/shots/pause2.png)

### 21. [polish] Controls list jumps up after a rebind because the help box shrinks

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** Settings > Controls: the help box above the list is two lines ('Choose a key to change it...'); after a rebind it becomes one line ('Walk forward: I or ↑.'), so the whole key list shifts up ~18 px, moving the button you just used away from the pointer. Expected a fixed-height help box.
- **Repro:** Settings > Controls; click the W cell for Walk forward; pt key i; compare shots
- **Screenshots:** [rebind2.png](s04/shots/rebind2.png)

### 22. [polish] Deadline arithmetic drifts: WREN says 49 s, the post-fire summary adds up to 50 s

- **Category:** text; **reported by** 1 agent(s): s02
- **Detail:** WREN: 'the beam must leave within 49 seconds of her mayday'. The panel said '19 s ... within 30 s' (= 49). After firing it says 'Beam fired 26 s after her mayday, 24 s before the deadline' (= 50). Probably rounding. Also 'must leave within 30 s' reads as a remaining time, which is right, but it sits next to WREN's 'within 49 seconds' measured from the mayday, so the same phrase means two different things.
- **Repro:** probe-done; open comms; click Fire recall beam at ~26 s
- **Screenshots:** [beam_fired.png](s02/shots/beam_fired.png)

### 23. [polish] Early WREN/Ines subtitles fired but were never on screen in my screenshots

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** Events show WREN's porthole lines (ticks 817, 1237) and Ines's 'Morning, doc! ... Come up to the bridge' (tick 973), but none of my screenshots around those times showed them; the porthole shot taken right after pressing E had the line in state.subtitles but not on screen. At low frame rate a player could miss Ines's first call entirely.
- **Repro:** pt start ...; skip dream; on WORLD, pt key e at the porthole; pt shot
- **Screenshots:** [porthole.png](s01/shots/porthole.png)

### 24. [polish] Photo mode saves silently: 'Developing...' then no confirmation or file name

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** Photo mode itself is easy: the panel lists drag/WASD/R F/C/H/P, FOV and exposure sliders, Sky only (hides the ship; gives a gorgeous clean shot of the lensed disk) and Vignette. Clicking Save picture showed 'Developing...' and then the toast vanished with nothing saying it was saved or where. The PNG did land in ~/Downloads as frozen-star-2026-11-15-20-26-26.png, named in UTC (local time was 13:26), which may confuse players. Also the probe logs photo mode as screen DREAM.
- **Repro:** in WORLD: pt key p; click Sky only (380,677); click Save picture (807,677); pt shot after a few seconds; ls ~/Downloads
- **Screenshots:** [photo-saved.png](s03/shots/photo-saved.png)

## Objective timings

Game seconds from the start of the world to each objective (event tick / the game's ticks per second, from events.jsonl). Game time, not wall time: with many sessions on one machine a world can run slower than real time, and wall-clock timings would mostly measure the machine.

| # | Objective | s01 | s02 | s03 | s04 | min | median | max |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Explore the Tern. The lab archive has more. | - | - | 45.4 | - | 45.4 | 45.4 | 45.4 |
| 1 | Go to the bridge | 52.1 | - | - | - | 52.1 | 52.1 | 52.1 |
| 1 | Save Ines: fire the recall beam from the comms console. Wait as long as you dare. | - | 43.2 | - | - | 43.2 | 43.2 | 43.2 |

