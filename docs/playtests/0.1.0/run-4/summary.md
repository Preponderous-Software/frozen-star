# Playtest summary: 20261115-1002

4 sessions, build frozen-star 0.1.0 (2d0528f), generated 2026-11-15 11:24.

**Findings:** 33 reports in 32 groups -- 0 blocker, 4 major, 20 minor, 9 polish.

## Outcomes

| Session | Goal | Outcome | Fun | Minutes | Objectives | Deaths | Findings | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| s01 | Play from the very beginning as a brand-new player who has never seen the game: the title menu, the dream, waking up, finding the bridge and dropping the beacon probe. Note every moment of confusion, and screenshot anything that looks broken on screen. | achieved | 3 | 16 | 2 | 0 | 9 | The opening sells the premise: a gorgeous ray-traced title and dream, a cosy, well-dressed ship, and a clear 'Go to the bridge' -> 'Drop the beacon probe' chain with a probe panel that explains redshift and clock rates in plain words. The weak spots are the first minute (black screen, then a long quiet dream) and wayfinding in the corridor where the objective marker disappears. Fix the off-screen marker and the misplaced use-bracket and the first ten minutes are smooth. |
| s02 | The whole second half in one go: rescue Ines from the comms console (use its deadline clock), take the ship down at the helm and back up, launch Orpheus, watch its feed to the end, make the final choice and read the logbook. Note whether each step was clear and whether the panels helped you understand, and screenshot any visual problems. | partial | 3 | 32.1 | 3 | 0 | 6 | The comms rescue is the strongest scene: the deadline bar next to a capsule picture that 'looks almost normal' really sells that the picture is old light, and WREN's after-the-fact 'by the deadline her picture was only a third of the way down' lands. The helm panel (clock-rate headline, altitude, tidal stretch, rear camera) makes the descent legible, but the gaps between beats have no objective, and at the ~5 tps this machine gave, the real-time pacing made the full second half impossible in 35 minutes (stopped at 'Return to 10 rs', before Orpheus). |
| s03 | Explore the whole ship as a curious visitor: every room (bridge, corridor, quarters, lab), every sign, poster, prop and optional thing you can use (whiteboard, mug, log, photo, datapad, porthole). Judge whether the ship feels like a real lived-in place, whether signs help you find your way, and screenshot anything broken: floating or clipping objects, things blocking doors or windows, unreadable text, places you get stuck. | partial | 3 | 17.3 | 0 | 0 | 7 | The Tern feels genuinely lived-in: a cosy quarters with books, a desk lamp, a cold mug with a clock-dilation joke, an Earth poster and a hanging flight suit, plus a lab with a probe casing and a server rack, and WREN's ambient lines tie each prop to the physics nicely. But the optional props are where it breaks: the lab whiteboard can only be read through the bridge wall, and the quarters datapad and photo never give a prompt because the porthole seems to grab it. The lab door is signed ARCHIVE while the bridge sign says LAB. |
| s04 | Everything outside the story: the title screen, Settings (each option and its effect), Chapters, About, the Observatory and every Training simulation including the new Bend the Light lesson. Try each lesson's goal and quiz. Judge whether a curious teenager with no physics background would understand them, and note anything confusing, broken or unreadable. | partial | 4 | 17.4 | 0 | 0 | 10 | Bend the Light is the best thing I played: dragging a slider until a beam loops once around the hole, then learning that this explains the 2.6x shadow and the thin ring, lands well even for a newcomer, and the 'Words used here' glossaries are clear. The biggest problem is robustness: once the GPU process dropped, the Observatory and Into the Dark falsely said the device lacks WebGL 2 and never recovered. Smaller issues: the Controls table is wrong about the arrow keys, and Two Clocks doesn't tell you when your prediction was wrong. Under the heavy machine load, lessons 2-5 and 7 could not be finished in the time budget. |

## Answers

Each agent's own words, verbatim from its report; a missing answer is listed under problems.

### Q1. In your own words, what was the game teaching?

- **s01:** That a black hole's dark disk is its shadow (about 2.5 times wider than the horizon), that the bright ring is background starlight bent all the way around, and that distance is measured in horizon radii (rₛ) and time in M. With the probe it starts teaching that a falling clock's light reaches you stretched (redshift), so you see its clock run slower than its own and the pings arrive further apart. I only saw the very start of that (stretch x1.04) before stopping.
- **s02:** That what you see of something falling toward a black hole is delayed, redshifted old light: Ines looked fine on my screen long after the real deadline to save her was close, so you must trust the computed clock, not the picture. Then, at the helm, that clocks run slower deep in a gravity well (far-away relay clock ran x2.6 faster near 1.03 rs), that the station-keeping field is unfelt because it pushes everything equally (equivalence principle), and that tidal stretch grows as you go lower and the shadow covers more than half the sky.
- **s03:** Gravitational time dilation near a black hole: the ship hovers at ten horizon radii, so its clocks run at about 0.949 of the distant relay's (the mug is 'six hours old' by my watch but six hours twenty by the relay's). It also teaches what the black hole looks like: the black disk is its shadow, about 2.5 times wider than the horizon, and the bright ring is starlight bent around it. The whiteboard adds Einstein's field equation and the Schwarzschild radius.
- **s04:** That gravity near a black hole bends time and light. A falling probe's clock ticks normally for the probe, but its signals reach the station further and further apart and redder, so from outside it seems to freeze, even though on its own clock it crosses quickly. Light aimed within about 2.6 horizon-radii falls in, and light just outside can loop around (the photon sphere at 1.5 rs). That is why a black hole's shadow is 2.6x the horizon and its ring is thin. Hawking evaporation is far too slow to stop things falling in, except for tiny holes.

### Q2. Which moment was the most confusing, and why?

- **s01:** Stepping out of my quarters into the corridor. I was facing a blank wall, the door marker I had been following was gone, and the sign 'BRIDGE - FORWARD' didn't tell me which way forward was, so I turned left and found Engineering first. A close second was the first ~15 seconds after Wake up: a black screen with no loading hint, then a long quiet stretch of the dream.
- **s02:** The stretch after the rescue: the objective box went empty, the helm said descent was locked 'later in the survey', and story lines only seemed to advance after I left a console. I could not tell whether I was supposed to do something or just wait. Second: on the comms panel, '1 s ... within 49 s' versus WREN saying 49 s total made me unsure how close to the edge I could fire.
- **s03:** Reading the whiteboard on the bridge: the prompt appeared on a bare wall with no whiteboard in sight. Later I found the board in the lab on the other side of that wall, and from the lab I could not get close enough to use it. Close behind: the quarters desk, where pointing straight at the datapad or photo still showed 'Look out of the porthole'.
- **s04:** Two Clocks. The mission uses 'M' as a unit of time ('a ping every 10 M') before you open the glossary, and the prediction choices (90/109/300 M) need you to already understand that unit. After the run I could see my prediction star stayed empty, but nothing told me I was wrong or what the right answer was. Heavy input lag also made the glossary seem broken at first.

### Q3. Did anything look broken on screen? Describe each problem, where you were and which way you were facing.

- **s01:** 1) Dream (no facing, cutscene): the screen was solid black for ~15 s before the black hole rendered. 2) Dream, title and windows: the thin photon ring around the shadow is drawn as a chain of separate dots with gaps, not a continuous ring. 3) Bridge, standing at the probe console facing it (yaw about 5) after stepping back with Esc: the orange use-bracket was drawn well right of and below the centre crosshair dot, like a second crosshair. 4) Quarters, facing the porthole right after waking: the 'E Look out of the porthole' prompt overlapped the bottom of the bracket. 5) Probe console panel after launch: its scrollbar ran under the ☰ menu button. Otherwise rendering was blurry (expected) but correct.
- **s02:** Nothing in the ray-traced view looked broken beyond software blur; the fully black bridge windows near 1-2.7 rs looked alarming but WREN explains it (shadow covers more than half the sky). Panel issues: on the comms console (bridge, facing the comms screen) the sticky Fire recall beam card lets the text it scrolls over show through at its top edge; on the helm panel (facing the helm/forward windows) values show '-' then pop in and shift the altitude slider down ~70 px. The comms 3D monitor in the room stays frozen on its last frame (its clock 48.51 M) after you leave the console, which may be intended.
- **s03:** (1) Bridge, rear-left corner by the LIFE SUPPORT BUS A panel, facing aft-left: a whiteboard prompt and focus brackets on an empty wall. (2) Lab, facing the whiteboard over the bench: the orange Probe waypoint covers the equations, and the handwriting is too blurry to read. (3) Quarters, facing the desk under the porthole: the focus bracket stays on the porthole while the crosshair is on the datapad; no prompt on the photo. (4) Quarters, looking down at the desk after mouse look: the view looked strongly slanted, possibly just perspective. I saw no floating or clipping props and no blocked doors. The black-hole view through the windows looked right apart from expected blur.
- **s04:** Yes. (1) Observatory (top-nav, scrolled to the 3D view) and Into the Dark's 3D panel showed a black box saying 'The 3D view needs WebGL 2. This device does not support WebGL 2', although the title screen had ray-traced the black hole earlier. After that the title showed only a flat 2D disc. (2) In the Two Clocks spacetime diagram, the 'now' and 'station' labels overlapped at the top-left before the drop. (3) In Bend the Light's top-down diagram, the 'edge: aim 2.598 rs' label overlapped the laser marker. No camera facing applies: these were all 2D lesson pages or the title.

## Findings

### 1. [major] Game ran at ~5 ticks/s of 60; real-time story beats took ~10x longer, second half not finishable in 35 min

- **Category:** perf; **reported by** 1 agent(s): s02
- **Detail:** Ticks advanced ~250 per 45 s of wall time throughout (tick 7711 after ~32 min). Every wait the story imposes (49 s rescue window, 20 s helm hold, the ~20 game-s gap before chapter III) stretched into minutes. Inputs lagged badly: arrow-key turns and 'pt face' overshot or barely moved (pt face -95 turned ~20 deg), and screenshots lagged the probe state by ~5-10 s (panel values showed '-' placeholders, the fired-beam state appeared seconds after the click). I reached objective 4 (Return to 10 rs) and had to stop before Orpheus, the final choice and the logbook. May be machine load from parallel sessions, but the pt start build warning also said the launch script predates HEAD.
- **Repro:** pt start --profile tools/playtest/frozen-star.json --game-dir . --checkpoint probe-done; pt wait 45; pt state (compare tick delta)
- **Screenshots:** [helm8.png](s02/shots/helm8.png)

### 2. [major] Lab whiteboard can only be read through the bridge wall, never from the lab where it hangs

- **Category:** bug; **reported by** 1 agent(s): s03
- **Detail:** On the bridge, in the rear-left corner beside the LIFE SUPPORT BUS A panel, 'E Read the whiteboard' and the focus brackets appear on a blank grey wall with no whiteboard drawn, and E reads Einstein's field equation plus the 0.949 clock-rate line. The actual whiteboard hangs in the lab on the other side of that wall. In the lab, the bench in front of it (probe casing, box) stops you 2.9 m from the board and no prompt ever appears. Expected: the prompt only in the lab, with the board reachable from there.
- **Repro:** pt start --profile tools/playtest/frozen-star.json --game-dir . --checkpoint bridge; pt face 180 (roughly); pt walkto item -> prompt on bare bridge wall, pt key e reads the board. Then go through the corridor into the lab door, walk to the whiteboard: blocked by the bench at 2.9 m, no prompt.
- **Screenshots:** [whiteboard_through_wall.png](s03/shots/whiteboard_through_wall.png)

### 3. [major] Observatory and Into the Dark say 'This device does not support WebGL 2' after the GPU process is lost mid-session

- **Category:** bug; **reported by** 1 agent(s): s04
- **Detail:** After Title > Training > Two Clocks > Bend the Light, the top-nav Observatory showed a black panel: 'The 3D view needs WebGL 2. This device does not support WebGL 2, which the black hole renderer needs.' Lesson 7 Into the Dark showed the same. Earlier in the same session the title screen ray-traced the black hole fine; afterwards the title fell back to a flat 2D disc. chrome.log shows 'GPU process exited unexpectedly' three times (machine load avg ~62), so the root cause is likely environmental, but the game treats a lost context as 'unsupported device', never retries, and gives no reload hint. Expected: recover from context loss, or say the view stopped and offer a reload. Readouts (shadow size 152 deg, your clock) kept updating.
- **Repro:** pt start ...; open Training, play Two Clocks and Bend the Light; click Observatory in the top nav; scroll to the view. Then Training > 7 Into the Dark.
- **Screenshots:** [obs_webgl2.png](s04/shots/obs_webgl2.png)

### 4. [major] Quarters desk: datapad and photo never give a use prompt; the porthole prompt wins

- **Category:** bug; **reported by** 1 agent(s): s03
- **Also reported as:** "Photo on the quarters desk: crosshair on it at 1.3 m, no prompt"
- **Detail:** With the crosshair dead centre on the blue datapad sheet (1.6 m) or on the framed photo (1.3 m), the prompt stays 'E Look out of the porthole' (focus bracket drawn on the porthole above) or there is no prompt at all. I tried stepping closer and nudging the view in every direction. The mug on the nightstand right beside them works ('Pick up your mug'). So two of the six optional props in the quarters could not be used.
- **Repro:** checkpoint bridge; walk corridor -> quarters; pt walkto item (mug); click game; aim at the photo on the desk, then at the blue sheet; observe prompt.
- **Screenshots:** [datapad_hijacked_by_porthole.png](s03/shots/datapad_hijacked_by_porthole.png) [photo_no_prompt.png](s03/shots/photo_no_prompt.png)

### 5. [minor] Chapters on a fresh save locks even the Prologue; 'See the story ahead' shows nothing ahead

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** Every entry, including the Prologue, shows a lock and 'Reach it in the story to unlock'. The menu subtitle promises 'See the story ahead' but the panel title is 'The story so far'. Expected: the Prologue unlocked, or wording that matches.
- **Repro:** Fresh profile; Title > Chapters
- **Screenshots:** [chapters_locked.png](s04/shots/chapters_locked.png)

### 6. [minor] Controls hint never says how to turn

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** The on-screen hint after waking reads 'WASD to walk, E to use things, Esc to pause' but never mentions arrow keys or mouse-look for turning. A keyboard player who doesn't click the game has no hint that Left/Right turn. Also the 'E Look out of the porthole' prompt box overlaps the bottom corners of the use-bracket.
- **Repro:** Start a new game, skip or watch dream, pt await WORLD; pt shot x
- **Screenshots:** [hud_overlap.png](s01/shots/hud_overlap.png)

### 7. [minor] Corridor: no objective marker on screen and 'BRIDGE - FORWARD' is ambiguous

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** Walking out of the quarters door you face the opposite corridor wall. The bridge is ~74 deg to the right, and there is no on-screen marker or edge arrow for it (in the quarters an edge arrow pointed to the door). The doorway sign says 'BRIDGE - FORWARD', but which way is forward is not clear; I turned left first and found Engineering. Once facing down the corridor a 'BRIDGE ↑' sign and marker are clear. Expected an edge arrow toward the bridge whenever the marker is off-screen.
- **Repro:** From waking: pt walkto door; pt hold w 6 (through the door into the corridor); pt shot x
- **Screenshots:** [corridor_no_marker.png](s01/shots/corridor_no_marker.png)

### 8. [minor] Dream has a 22-game-second silent stretch on a nearly static image

- **Category:** balance; **reported by** 1 agent(s): s01
- **Detail:** Only three subtitle lines in the whole dream: tick 144 '(Falling. No wind, no sound.)', then nothing until tick 1502, then '(Nothing happened.)' at 1640. For most of that gap the black hole barely changes size. It felt long and I almost pressed Skip; the payoff (the plunge in the last few seconds) is good but arrives late.
- **Repro:** As above; watch the DREAM without skipping, pt events shows dialogue ticks 144, 1502, 1640.
- **Screenshots:** [dream7.png](s01/shots/dream7.png)

### 9. [minor] Dream opens on a plain black screen for ~15-18 s before anything renders

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** After pressing Wake up, the DREAM screen showed only black plus the menu and 'Skip the dream' buttons; the probe's tick stayed at 0 for ~15 s wall time before the black hole appeared and the first line came at tick 144. A new player would think the game had hung. Expected a loading indication or an immediate first frame/subtitle. (Load may be worse in this software-rendered VM, but nothing on screen says it is loading.)
- **Repro:** pt start --profile tools/playtest/frozen-star.json --game-dir .; pt await TITLE 30; pt key Return; pt await DREAM 20; pt wait 4; pt shot x; pt state (tick 0)
- **Screenshots:** [dream1.png](s01/shots/dream1.png)

### 10. [minor] Game ran around 8 ticks a second on this machine, so walking and turning were very slow

- **Category:** perf; **reported by** 1 agent(s): s03
- **Detail:** 7136 ticks over about 940 s of wall time. A 4 s run covered about 1.5 m. This is probably machine contention, but it made a full tour impossible in 25 minutes.
- **Repro:** pt state tick vs wall time over the session.
- **Screenshots:** [s25.png](s03/shots/s25.png)

### 11. [minor] Game ran at ~3-12 ticks/s in the VM; 'Watch the probe fall' would take many real minutes

- **Category:** perf; **reported by** 1 agent(s): s01
- **Detail:** fps reported 10 throughout; game time advanced ~12 ticks/s in the dream and walking, and dropped to ~3 ticks/s with the probe console panel open (130 ticks per 40 s). The probe fall (about a game minute) would have taken well over 5 real minutes. Probably host load (software renderer, parallel sessions), noted for context.
- **Repro:** pt status / pt state tick deltas while the probe console panel is open after launch.
- **Screenshots:** [fall3.png](s01/shots/fall3.png)

### 12. [minor] Helm objective 'Take the Tern down' appears ~500 ticks after the helm unlocks, when the ship is already most of the way down

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** Chapter III card at tick 5192; helm slider worked from at least tick 5345 and WREN explained the 1.33 rs mark at 5455, but objective 2 only appeared at tick 5941 (ship already at 1.4 rs) and completed 80 ticks later. The objective box was empty while I was actually doing the task.
- **Repro:** checkpoint rescue-done (or continue from above); walk to helm; e; click the left end of the 'Hold station at' slider
- **Screenshots:** [helm6.png](s02/shots/helm6.png)

### 13. [minor] Helm panel layout shifts after opening, moving the altitude slider out from under the cursor

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** On opening the helm the 'Far-away clocks run' headline number and stats show '-' and then pop in, pushing the 'Hold station at' slider from y~317 down to y~385. My click on the slider landed on the clock-rate bar and did nothing; a drag did nothing either. Reserve the space for the headline number.
- **Repro:** chapter III; open helm; take shot immediately and again 5 s later
- **Screenshots:** [helm_layout_shift.png](s02/shots/helm_layout_shift.png)

### 14. [minor] Lesson pages respond 10-30 s late on a loaded machine

- **Category:** perf; **reported by** 1 agent(s): s04
- **Detail:** In Two Clocks, clicks, scrolls and the glossary toggle showed up 10-30 s later, so I thought the 'Words used here' glossary was broken until it opened late. The machine load average was ~62 with parallel sessions, so this is mostly environmental. Pages without WebGL (Evaporation, after the GPU loss) responded much faster.
- **Repro:** Training > Two Clocks; click 'Words used here'; shot immediately
- **Screenshots:** [l1_words_wont_open.png](s04/shots/l1_words_wont_open.png)

### 15. [minor] Mouse look felt unreliable after clicking to capture

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** After clicking the game, horizontal 'pt look' moves barely changed my heading. Looking down at the desk produced strong slanted perspective that read as a tilted horizon (it may only be perspective; vertical props stayed vertical). Aiming at small desk props was fiddly.
- **Repro:** In quarters: pt click 640 400; pt look 0 250; pt look -200 -30; pt look -100 0.
- **Screenshots:** [tilted_view_after_mouselook.png](s03/shots/tilted_view_after_mouselook.png)

### 16. [minor] No objective on screen between the rescue and chapter III; helm says descent is locked with no hint what unlocks it

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** Objective 1 completed at tick 2675; the next objective (Take the Tern down) only started at tick 5941. In between, the objective box was empty, Ines docked, and the helm read 'Descent is locked for now: later in the survey...'. I visited the helm twice not knowing whether to wait or do something. Story cutscenes (Ines' engine lit, WREN's 'far too late' line) only seemed to play right after I left a console with Esc, so a player parked at a console may wait for nothing. Expected: a 'Wait for Ines to dock' style objective or a WREN line saying the descent unlocks after she is aboard.
- **Repro:** checkpoint probe-done; fire the beam at comms; Esc; walk to helm; e
- **Screenshots:** [helm_locked_noobj.png](s02/shots/helm_locked_noobj.png)

### 17. [minor] Rescue deadline is 49 s in WREN's line but the comms bar sums to 50 s

- **Category:** text; **reported by** 1 agent(s): s02
- **Detail:** Comms bar read 'Since her mayday: 1 s. The beam must leave within 49 s' and later '9 s ... within 41 s' (=50), while WREN's on-screen subtitle says 'within 49 seconds of her mayday'. After firing: '27 s after her mayday, 22 s before the deadline' (=49). For a scene about cutting it fine, the numbers should agree.
- **Repro:** checkpoint probe-done; walk to comms; e; read the deadline line over time
- **Screenshots:** [deadline_rounding.png](s02/shots/deadline_rounding.png)

### 18. [minor] Settings > Controls says arrow keys walk and has no Turn row

- **Category:** text; **reported by** 1 agent(s): s04
- **Detail:** Keyboard Walk row reads 'W A S D or arrow keys', but Left/Right arrows turn (about 103 deg/s). No row lists turning. The panel heading also still says 'Options' while the Controls tab is selected.
- **Repro:** Title > Settings > Controls tab
- **Screenshots:** [controls_table.png](s04/shots/controls_table.png)

### 19. [minor] Title menu: first click on Settings / Chapters did nothing; second click opened it

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** Clicking Settings (335,543) once only hovered it; an identical second click opened the panel. Chapters behaved the same. About opened on the first click. It may be lag on a loaded machine, but it happened twice.
- **Repro:** pt click 335 543; pt shot; pt click 335 543
- **Screenshots:** [chapters_locked.png](s04/shots/chapters_locked.png)

### 20. [minor] Two Clocks: wrong prediction is never explained on screen

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** I locked in 'About 300 M'. After the run the 'Predict when ping 9 arrives' star stayed empty, but the quiz area only ever said 'Prediction locked in.' Nothing said I was wrong or what the right answer was (the log showed ping 8 at 92.7 M). Bend the Light and Evaporation do give a 'Right.' plus explanation. Note: lessons were very laggy here, so the reveal may sit somewhere I did not scroll to.
- **Repro:** Training > 1 Two Clocks; pick About 300 M; Drop the probe; wait for the probe to vanish
- **Screenshots:** [l1j.png](s04/shots/l1j.png)

### 21. [minor] Use-bracket drawn far from the centre crosshair at the probe console

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** After stepping back (Esc) from the probe console, facing it: the centre crosshair dot sits at screen centre but the orange use-bracket is drawn ~110 px right and ~130 px lower on the console's screen, with the 'E Use the probe console' prompt between them. It reads as two different aim points. In the quarters the bracket is centred on the dot.
- **Repro:** Reach the bridge, walk to the probe console, pt key e, launch, pt key Escape, pt wait 10, pt shot x
- **Screenshots:** [reticle_offset.png](s01/shots/reticle_offset.png)

### 22. [minor] WREN's probe-console hint plays while you are in the lab

- **Category:** text; **reported by** 1 agent(s): s03
- **Detail:** On entering the lab, WREN says 'The probe console is the one on the left, by the window. Walk up to it and use it.' I was in the lab, where the console in reach is the archive, so 'on the left, by the window' points at the wrong thing.
- **Repro:** checkpoint bridge; walk straight to the lab without using the probe console; wait.
- **Screenshots:** [s17.png](s03/shots/s17.png)

### 23. [minor] Wayfinding: bridge sign promises LAB but the lab door's sign says ARCHIVE

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** The sign over the bridge exit reads 'CORRIDOR: LAB · QUARTERS · AFT', but the side door in the corridor (the lab) is labelled 'ARCHIVE'. I was not sure I had found the lab until I was inside. Otherwise the signage was good: the bridge exit sign, floor arrows pointing back to BRIDGE, and 'ENGINEERING: SEALED · CREW ONLY' on the aft door all helped.
- **Repro:** checkpoint bridge; exit the bridge into the corridor; look at the first door on the left.
- **Screenshots:** [lab_door_sign_archive.png](s03/shots/lab_door_sign_archive.png)

### 24. [polish] About panel jargon ('Schwarzschild solution', 'one unit of black-hole time is 0.59 seconds')

- **Category:** text; **reported by** 1 agent(s): s04
- **Detail:** About opens with 'Schwarzschild solution of general relativity' and 'one unit of black-hole time', which are not explained there; the further reading list is graduate textbooks. A teen won't follow it. In the same shot the focused Wake up button briefly showed pale text on orange.
- **Repro:** Title > About
- **Screenshots:** [about_wakeup_contrast.png](s04/shots/about_wakeup_contrast.png)

### 25. [polish] Bend the Light diagram shows 'edge: aim 2.598 rs', which gives away the quiz; '535 times closer' is unexplained

- **Category:** text; **reported by** 1 agent(s): s04
- **Detail:** The lesson itself works well (2.51 rs swallowed, 2.61 rs bent 286 deg, fine-tune -0.01 gave 390 deg, around once, 3/3 stars). But the dashed edge label shows the answer to the shadow-size quiz before you answer, and it overlaps the laser marker. In the debrief, 'aim about 535 times closer' per extra loop comes with no explanation.
- **Repro:** Training > 6 Bend the Light; drag Aim to ~2.6; scroll to Seen From Above
- **Screenshots:** [l6_debrief.png](s04/shots/l6_debrief.png)

### 26. [polish] Console panel scrollbar sits under the ☰ menu button

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** After launching K-1 the right-hand panel is taller than the screen and gets a scrollbar whose top runs underneath the round ☰ menu button at the top right.
- **Repro:** Launch Beacon K-1 from the probe console; pt shot x
- **Screenshots:** [panel_scrollbar_menu.png](s01/shots/panel_scrollbar_menu.png)

### 27. [polish] Evaporation mass readout uses '1e-20 suns' computer notation

- **Category:** text; **reported by** 1 agent(s): s04
- **Detail:** With the slider at far left the readout says '1e-20 suns', while the text below uses 2x10^10 kg and a Great Pyramid comparison. Use the same scientific notation or words.
- **Repro:** Training > 8 Evaporation; drag Mass slider fully left
- **Screenshots:** [l8_mass_notation.png](s04/shots/l8_mass_notation.png)

### 28. [polish] Photon ring drawn as a broken ring of separate dots (dream, title, portholes)

- **Category:** bug; **reported by** 1 agent(s): s01
- **Detail:** The thin ring just outside the shadow renders as a chain of separated dots/dashes rather than a continuous ring, in every dream frame, the title backdrop and through the porthole/bridge windows. At close range in the dream (dream12) the inner ring is clearly dotted with gaps. This looks like sampling holes beyond ordinary low-res blur.
- **Repro:** Start a new game, watch the DREAM; pt shot at tick ~1500-1650.
- **Screenshots:** [dream12.png](s01/shots/dream12.png)

### 29. [polish] Probe console shows 'every 10 M' before M has been explained

- **Category:** text; **reported by** 1 agent(s): s01
- **Detail:** The pre-launch panel explains rₛ ('ten horizon radii') but shows the ping interval as 'every 10 M' without saying what M is; only the small caption 'about 6 s' helps. The glossary explaining M (0.59 s) appears only after launch, at the bottom of a panel that needs scrolling.
- **Repro:** Reach the bridge, walk to the probe console, pt key e, pt wait 8, pt shot x
- **Screenshots:** [probe_panel_units.png](s01/shots/probe_panel_units.png)

### 30. [polish] Probe waypoint marker sits on top of the lab whiteboard's equations

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** The orange 'Probe 11 m' marker is drawn over the middle of the whiteboard, and the small handwriting is too blurry to read on screen anyway, so the board's content only reaches you through subtitles.
- **Repro:** Enter the lab and face the whiteboard.
- **Screenshots:** [whiteboard_unreachable_lab.png](s03/shots/whiteboard_unreachable_lab.png)

### 31. [polish] Sticky 'Fire recall beam' card lets the scrolled-under text show through

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** After scrolling the comms panel, the sticky beam card overlaps the info cards; their text ('speed.', 'CAPSULE · WHAT YOU SEE') is visible through/around its top edge. Give it an opaque background and a clean top edge.
- **Repro:** checkpoint probe-done; open comms; scroll down over the panel
- **Screenshots:** [sticky_overlap.png](s02/shots/sticky_overlap.png)

### 32. [polish] Two Clocks spacetime diagram: 'now' and 'station' labels overlap at the start

- **Category:** text; **reported by** 1 agent(s): s04
- **Detail:** Before the drop, the 'now' and 'station' labels at 10 rs, time 0 are drawn on top of each other and can't be read.
- **Repro:** Training > Two Clocks; scroll to the Spacetime diagram before dropping
- **Screenshots:** [l1_spacetime_labels.png](s04/shots/l1_spacetime_labels.png)

## Objective timings

Game seconds from the start of the world to each objective (event tick / the game's ticks per second, from events.jsonl). Game time, not wall time: with many sessions on one machine a world can run slower than real time, and wall-clock timings would mostly measure the machine.

| # | Objective | s01 | s02 | s03 | s04 | min | median | max |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Go to the bridge | 62.1 | - | - | - | 62.1 | 62.1 | 62.1 |
| 1 | Save Ines: fire the recall beam from the comms console. Wait as long as you dare. | - | 44.6 | - | - | 44.6 | 44.6 | 44.6 |
| 2 | Drop the beacon probe (probe console, left) | 77.7 | - | - | - | 77.7 | 77.7 | 77.7 |
| 2 | Take the Tern down until the relay clock runs twice as fast (helm) | - | 100.4 | - | - | 100.4 | 100.4 | 100.4 |
| 3 | Hold at twice the relay rate for 20 seconds (helm) | - | 120.6 | - | - | 120.6 | 120.6 | 120.6 |

