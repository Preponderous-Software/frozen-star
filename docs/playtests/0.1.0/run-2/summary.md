# Playtest summary: 20261114-2340

4 sessions, build frozen-star 0.1.0 (d654778), generated 2026-11-15 00:16.

**Findings:** 33 reports in 31 groups -- 0 blocker, 1 major, 20 minor, 12 polish.

## Outcomes

| Session | Goal | Outcome | Fun | Minutes | Objectives | Deaths | Findings | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| s01 | The descent and Orpheus: take the ship down at the helm, come back up, then launch Orpheus and watch its feed to the end. Note whether you understood what you saw, and screenshot any visual problems, especially in the window and on the screens. | achieved | 4 | 20.4 | 24 | 0 | 8 | The descent and Orpheus land. Watching the helm's rear camera squeeze the sky into a ring, then Orpheus's frames arrive further apart, noisier and finally 'never' at 1.211 rs, made the time-dilation and horizon ideas click without a lecture. The main problems are bookkeeping and pacing: 20 per-second hold objectives, an objective gap while every window is black, WREN announcing the end one frame early, and a feed objective that never closed. A smaller one: the helm chair blocks a straight approach to the helm. |
| s02 | Graphics hunt, second pass after fixes. Walk every room (bridge, corridor, quarters, lab) and look in every direction: ceiling, floor and out of every window, turning slowly while looking at the black hole so you can see whether the ring around it ever breaks, shows hard cut edges, slivers or flicker. Also check the wall screens and console panels for clipped or overlapping text. Screenshot and describe anything that looks wrong. | achieved | 3 | 16.3 | 2 | 0 | 6 | On the bridge the black hole held up: panning in 8-10 degree steps across all three front panes and both side windows, I saw no breaks, slivers, misaligned mullion seams or flicker, and four still frames in a row were identical. The photon ring does draw as a dotted or dashed arc rather than a solid line, but that matches the software-render resolution. The one real rendering defect left is a hard-edged dark rectangle in the quarters porthole. The rest is layout polish: the archive screen sits on the lab window, the porthole prompt stays up after the crosshair leaves, and the chapter-card text has no backing plate. |
| s03 | The whole second half in one go: rescue Ines from the comms console, then take the ship down at the helm and back up, launch Orpheus, watch its feed to the end, make the final choice and read the logbook. Note whether each step was clear, whether the aftermath of the rescue made sense, and screenshot any visual problems. | partial | 4 | 26.1 | 24 | 0 | 8 | The rescue is a strong scene: Ines's 'On your screen I looked fine the whole time' and WREN's 'fired 5 seconds before the last possible moment' land the light-delay lesson well, and the helm's rear-camera view at 1.1 rs is striking. But the aftermath confuses: the bridge monitor keeps showing her falling past the reported burn point while the panel freezes and still says 'Falling', and some messages arrive in an odd order. The second half also has long stretches with no objective (after docking, after the hold). I reached Chapter IV (Orpheus) but ran out of time before launching it, mostly because of the low tick rate in this run. |
| s04 | Menus and options. From the title menu, try everything that is not the story: Settings (change sensitivity, field of view, volume, subtitle size, quality, invert Y and check each one actually takes effect in game), Chapters, Training, Observatory and About. Then start the game, open the pause menu with Escape, browse its tabs, resume, and quit back to the title and use Continue. Note anything confusing, broken, unlabeled or that does not respond. | partial | 4 | 8.9 | 3 | 0 | 9 | The menus are clean and responsive. Every setting I could check works: look speed scales exactly (29.7 vs 4.4 degrees per 100 px at 2.35x vs 0.35x), invert look flips the pitch, field of view changes live behind the pause menu, subtitle size changes the subtitles, settings are kept between title and game, and Continue resumes at the Beacon K-1 checkpoint. Volume could not be checked because the headless run has no audio. The main gaps: there is no Chapters menu anywhere, Main menu throws away progress before the first checkpoint without asking, the Controls page has small mistakes, and the use prompt does not follow the crosshair. |

## Answers

Each agent's own words, verbatim from its report; a missing answer is listed under problems.

### Q1. In your own words, what was the game teaching?

- **s01:** Gravitational time dilation and the event horizon as seen from outside. Lower in the hole's gravity your clock runs slow compared with the far-away relay (x2 below 1.33 rs, 'the universe aged 45 seconds more than we did'). Hovering close, the black hole's shadow covers most of the sky and all the stars get squeezed into a patch behind you. And something falling in never visibly crosses the horizon for an outside watcher: its camera frames arrive ever further apart, redder/fainter and noisier, and the last ones never arrive, while the probe's own clock says it crosses in finite time (tau ~98 M). Also the equivalence principle: the field pushes every atom equally, so you feel nothing.
- **s02:** That time and light behave differently near a black hole: a probe dropped from the ship keeps its own clock steadily, but from the ship its pings arrive further and further apart, redder and dimmer, while by its own clock it crosses the horizon in under a minute. The black disk you see is the hole's shadow, about two and a half times wider than the horizon, and the bright ring is starlight bent all the way around it.
- **s03:** That what you see of something falling toward a black hole is old, delayed and increasingly redshifted light. Ines looked almost normal on screen even though the real deadline was seconds away, so you cannot wait until she looks in trouble. Then, at the helm, that hovering low near the horizon slows your clock compared with the rest of the universe (relay clock x2 below 1.33 rs; the universe aged 104 s more), that the field holding you feels like nothing (equivalence principle), and that from very low the black shadow fills the forward sky while every star is squeezed into a bright patch behind.
- **s04:** Time dilation near a black hole. The training lesson compares a falling probe's own clock with the station's clock: pings sent every 10 units of the probe's time reach the station further and further apart. The Observatory shows how the black hole bends light, with the warped sky grid and the disk image wrapped over and under the shadow. The story opening sets you ten Schwarzschild radii above the hole. I only saw the start of the story, so I could not tell more than that.

### Q2. Which moment was the most confusing, and why?

- **s01:** Just after the 20-second hold. Every window on the bridge had gone solid black, the objective box was empty, and the only hint was Ines asking whether the camera was broken. For several seconds I could not tell if the renderer had failed or this was the physics. WREN's explanation and the 'take us back up' objective came later. Also confusing: the objective count racing up one per second during the hold, and WREN saying 'no more frames' while the panel still said 'next frame due 1.3 s'.
- **s02:** The ping-9 prediction question appeared while I was exploring the lab and then disappeared a few seconds later without my answering, with nothing to say whether it had timed out or recorded an answer. Second: the quarters porthole showed 'E Look out of the porthole', but pressing E only played a WREN line, and the prompt stayed up after I looked away.
- **s03:** The rescue aftermath. The panel said her engine burn was seen at 4.56 rs and she was climbing, but its status still said 'Falling. It looks almost normal', its numbers froze, and the bridge monitor kept showing her going deeper (3.51 rs, then 2.49 rs). Her radio lines also arrived as 'I'm climbing' and then 'the black fills the window'. WREN's explanation about old light helped, but it came later. Choosing when to fire was also a pure guess, with no cue for how long was left.
- **s04:** Looking for Chapters: no menu item with that name exists, before or after reaching chapter I, so I could not tell whether it is locked, removed or somewhere else. Close behind: quitting to the main menu from the quarters silently threw away my progress (Wake up again, no Continue). A smaller one: the 'M' time unit in the Two Clocks lesson is never explained.

### Q3. Did anything look broken on screen? Describe each problem, where you were and which way you were facing.

- **s01:** (1) Bridge at 1.22 rs, standing by the helm facing forward and then turning right through the comms console to the starboard wall (yaw about -30 to -165): all windows pure black. Probably correct physics, but it looks broken until explained. (2) Helm panel, after the rear camera appeared: the scrolled 'Hold station at' slider row shows garbled through the translucent Step back header at the top of the panel. (3) Probe console in-world screen (facing it from the left of the helm): it reads 'K-1 ready' when only Orpheus is left. (4) The black hole in the forward windows at 10 rs and on the Orpheus feed was blurry but otherwise looked right: no flicker, holes or colour garbage. Pointer-lock briefly drew a black bar across the top of the view right after clicking to capture the mouse.
- **s02:** 1) Quarters, facing the porthole and slightly to its right: a dark rectangle with hard straight edges covers the left third of the porthole view and cuts across the lensed disk band. 2) Lab, facing the archive console: its screen floats over the middle of the lab window, covering the mullion. 3) Quarters, facing the bookshelf: the chapter-card sub-line was unreadable over the coloured books. 4) Probe console: the in-world screen text is cut off behind the side panel. The bridge front and side windows looked fine while turning slowly: the ring never broke and nothing flickered; the photon ring is a dotted arc at this resolution. Ceilings and floors in all four rooms looked clean.
- **s03:** (1) At the comms console on the bridge (starboard-forward, facing the console and forward windows), the in-world monitor showed the capsule falling below the reported burn point while the panel was frozen at 4.56 rs. (2) The same monitor later read 'Recall beam: armed' after she docked. (3) Standing in front of the helm facing forward, with the crosshair on the helm screen and the 'Helm 2 m' marker shown, there was no use prompt until about 0.9 m. Beyond software-render blur, I saw no rendering glitches in the black hole or windows. At 1.1 rs the forward windows went almost fully black, which WREN explains as intended. While the mouse was captured, a black bar briefly covered the top-centre of the screen (likely the browser's pointer-lock notice).
- **s04:** 1) Title > Settings: opening the Subtitles or Graphics dropdown showed an empty black box instead of the option list. 2) Quarters, just after waking, facing the porthole (yaw about -6): the orange target brackets overlapped the 'E Look out of the porthole' prompt text. 3) Quarters, facing the bookshelf (yaw about -35): the prompt still offered the porthole, with the brackets on the porthole to the left of the crosshair. 4) After capturing the mouse, a black bar appeared at the top centre of the view for a moment, probably the browser's pointer-lock notice. 5) The WASD/E/Esc hint stayed on screen the whole time in the quarters and corridor. Apart from software-render blur, the ray-traced black hole looked correct in the dream, the portholes, the bridge windows and the Observatory.

## Findings

### 1. [major] After the engine burn is reported, the in-world comms monitor shows Ines still falling deeper while the panel is frozen at 4.56 rs

- **Category:** bug; **reported by** 1 agent(s): s03
- **Detail:** Once the comms panel said 'Engine burn seen at 4.56 rs. She is climbing out and coming home.', the panel readout froze (ship clock 98.5 M / 58.2 s, 1+z 1.572, appears at 4.56 rs) for 200+ ticks, and its status line still read 'Falling. It looks almost normal from here.' Meanwhile the 3D comms monitor on the bridge kept counting down: 'seen at 3.51 rs, 1+z 1.83', then 'seen at 2.49 rs, 1+z 2.46'. The two displays of the same capsule disagree, and the monitor shows her falling below the point where her burn was supposedly seen. Expected: both displays agree, freeze or reverse at the burn point, and the status line changes from 'Falling'.
- **Repro:** pt start --checkpoint probe-done; wait for objective 'Save Ines'; walk to comms, e; fire recall beam at ship clock ~44 s; wait until panel says 'Engine burn seen'; Esc and look at the comms monitor
- **Screenshots:** [comms_screen_keeps_falling.png](s03/shots/comms_screen_keeps_falling.png)

### 2. [minor] 'Watch the Orpheus feed' objective never completes after the feed ends

- **Category:** bug; **reported by** 1 agent(s): s01
- **Detail:** The feed reached 'Next frame due: never' (frame 65, tick ~11900) and WREN delivered the closing line, but objective #25 'Watch the Orpheus feed (starboard screen)' was still open at tick 12103 when I stopped. It may complete later, but nothing on screen said what to do next or how long to wait.
- **Repro:** As above; pt state at tick ~12000
- **Screenshots:** [feed-final.png](s01/shots/feed-final.png)

### 3. [minor] 20 s hold creates a new objective every second (objectives #2 to #23)

- **Category:** bug, ux; **reported by** 1 agent(s): s01
- **Also reported as:** "Objective box disappears for ~11 game seconds after the hold ends"
- **Detail:** Reaching 1.29 rs completes objective 1, then 'Hold for 20 seconds' (#2) starts and completes 6 ticks later, followed by 'Hold at twice the relay rate: 20 s to go' (#3), '19 s to go' (#4) ... '1 s to go' (#22), 'Held for 20 seconds' (#23). Each countdown second is logged as a separate objective_started/objective_completed pair, so the objective counter jumps from 1 to 24 in one chapter. On screen it reads like a countdown, which is fine; the bookkeeping is not (any objective counter, achievement or analytics will be inflated). Expected one objective with a countdown in its text.
- **Repro:** pt start --checkpoint rescue-done; walk around the helm chair to the helm; E; drag the 'Hold station at' slider to ~1.2 rs; pt events 30
- **Screenshots:** [hold-objective.png](s01/shots/hold-objective.png) [no-objective-after-hold.png](s01/shots/no-objective-after-hold.png)

### 4. [minor] Comms panel gives no sense of how long the rescue window has left; 'Wait as long as you dare' is a blind guess

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** While I waited, the panel showed slowly changing redshift, brightness and 'appears at' values, and always said 'Falling. It looks almost normal from here.' Nothing hinted at how close the deadline was. I fired at a guess, and WREN then said I had fired 5 seconds before the last possible moment. That is good drama, but with no gauge a first-time player has nothing to judge 'dare' by. That may be the lesson (she looked fine the whole time), but a felt cue such as rising tension music or WREN warnings would help.
- **Repro:** pt start --checkpoint probe-done; open comms after the objective appears; watch the panel
- **Screenshots:** [before_fire.png](s03/shots/before_fire.png)

### 5. [minor] Game ran at ~3-17 ticks/s in this session, so story beats took 3-20x longer in real time

- **Category:** perf; **reported by** 1 agent(s): s03
- **Detail:** The second half's real-time waits (capsule fall, helm hold, dialogue gaps) at this tick rate meant I ran out of the 30 min budget at the start of Chapter IV (Orpheus), before launching it. Turning with the arrow keys gave ~10 degrees per second held. This is most likely the shared software renderer, but the long scripted gaps (e.g. ~1100 ticks between dock and the Chapter III card) add up even at full speed.
- **Repro:** pt status / pt state tick deltas during play
- **Screenshots:** [final.png](s03/shots/final.png)

### 6. [minor] Helm chair blocks a straight approach to the helm; no use prompt from behind it

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** Walking straight forward from the spawn, the player stops at 2.6 m from the helm against the helm chair, looking at the helm with no 'E Use' prompt. E does nothing, and pt walkto console reports 'stuck'. You have to strafe left and come round the chair (prompt appears at ~0.7 m). The objective tells you to go to the helm, so the first approach most players make is the one that fails.
- **Repro:** pt start --checkpoint rescue-done; pt hold w 6; pt key e (nothing); pt walkto console -> stuck at 2.58 m
- **Screenshots:** [e2.png](s01/shots/e2.png)

### 7. [minor] Helm panel overflows once the rear camera appears; scrolled text shows through the Step back header, and a click missed

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** Below ~2.6 rs a REAR CAMERA image is added to the helm panel, which then scrolls. In the scrolled state the 'Hold station at' slider row and value show garbled behind the translucent 'Step back' header. My first click on 'Return to 10 rs' at (810,262) did nothing because the panel had moved under the pointer; a second click at (810,188) worked. Expected an opaque sticky header, or a layout that keeps the Return button and slider where they were.
- **Repro:** At the helm, descend below 2.6 rs, scroll or wait; pt shot
- **Screenshots:** [panel-scroll-overlap.png](s01/shots/panel-scroll-overlap.png)

### 8. [minor] Helm shows a 'Helm 2 m' marker with the crosshair on it, but the use prompt only appears at ~0.9 m

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** Standing 1.8 m from the helm and looking straight at its screen, with the 'Helm 2 m' marker under the crosshair, showed no prompt. Other consoles prompt at ~1.9 m. I had to walk up to 0.9 m before 'E Use the helm console' showed.
- **Repro:** pt start --checkpoint rescue-done; stand ~1.8 m in front of the helm, crosshair on its screen; observe no prompt
- **Screenshots:** [s12.png](s03/shots/s12.png)

### 9. [minor] In-world comms monitor reads 'Capsule docked. Recall beam: armed' after the rescue

- **Category:** bug; **reported by** 1 agent(s): s03
- **Detail:** After Ines docked, the bridge comms monitor showed 'Recall beam: armed'. The beam was already fired and spent. Expected: 'fired' or 'spent'.
- **Repro:** complete the rescue; look at the comms monitor after 'Docked. Hands still shaking.'
- **Screenshots:** [comms_armed_after_dock.png](s03/shots/comms_armed_after_dock.png)

### 10. [minor] No Chapters entry on the title menu, fresh or after reaching chapter I

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** The goal lists Chapters as a menu item, but the title menu only offers Wake up/Continue, New game, Settings, Training simulations, Observatory and About, both on a fresh save and after the bridge checkpoint (Continue: Beacon K-1). No chapter select was found anywhere, including the pause menu. If it unlocks later, nothing on screen says so.
- **Repro:** pt start ...; pt shot title; reach the bridge; Esc; click Main menu; pt shot title_continue
- **Screenshots:** [title_continue.png](s04/shots/title_continue.png)

### 11. [minor] No cue to climb back after the 20 s hold; 'Take us back up' and the Return objective arrive after the player already did it

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** 'Held for 20 seconds' completed at tick 9518, then the HUD was empty for ~700 ticks apart from WREN's explanation of the black window. I clicked 'Return to 10 rs' at ~10200 on my own. Ines's 'Okay. That's enough. Take us back up.' arrived at ~10370, and the objective 'Return to 10 rs (helm)' only appeared at 10592, when the ship was already at ~9.9 rs. It then stayed incomplete until tick 11054, ~380 ticks after arrival ('Back at station' was said at 10670).
- **Repro:** pt start --checkpoint rescue-done; helm: drag slider to ~1.05 rs; hold 20 s; wait
- **Screenshots:** [return_objective_stuck.png](s03/shots/return_objective_stuck.png)

### 12. [minor] Pause > Controls says arrows walk; key turning and 1/2/3 answers are missing

- **Category:** text; **reported by** 1 agent(s): s04
- **Detail:** Controls lists 'Walk: W A S D or arrows', but Left/Right arrows turn the view. Turning on the keyboard is not listed, and neither is 1/2/3 for answering questions.
- **Repro:** in WORLD: pt key Escape; pt click 1077 319; pt shot pause_controls
- **Screenshots:** [pause_controls.png](s04/shots/pause_controls.png)

### 13. [minor] Pause > Main menu throws away progress before the first checkpoint without asking

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** After the dream and about 15 s in the quarters, Pause > Main menu went straight back to the title with no confirmation. The title showed 'Wake up' again with no Continue, so the dream had to be replayed. The pause panel's footnote says progress saves at each chapter, but the button itself gives no warning that unsaved progress will be lost.
- **Repro:** pt start ...; pt key Return; skip dream; pt await WORLD; pt key Escape; pt click 1077 364; pt shot no_continue
- **Screenshots:** [no_continue.png](s04/shots/no_continue.png)

### 14. [minor] Ping-9 prediction question vanished without an answer while I was turning in the lab

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** The 'Ping 7 arrived late. Log a prediction: when will ping 9 arrive?' choice (options 1-3) opened at tick 9662 while I was turning with the arrow keys in the lab. It closed at tick 10061 (about 6.6 game s) with no answer from me and no event saying what happened. Mouse capture was also released ('Click to look around'). Either it timed out or the arrow keys answered it. Either way the player is not told.
- **Repro:** launch K-1, walk to the lab, keep turning with pt face (arrow keys) until the CHOICE appears; keep turning and do not press 1-3
- **Screenshots:** [lab2.png](s02/shots/lab2.png)

### 15. [minor] Quarters porthole: hard-edged dark rectangle cuts across the lensed disk band

- **Category:** bug; **reported by** 1 agent(s): s02
- **Detail:** Looking out of the quarters porthole, the left third of the view has a dark rectangle with a straight vertical right edge and a straight horizontal bottom edge about two thirds of the way down. The accretion-disk band runs into it and carries on below it. It is a hard cut, not blur. Seen head-on (a thin vertical seam) and more clearly from a slight angle. I expected continuous sky and disk across the whole porthole, the way the bridge windows show it.
- **Repro:** pt start --checkpoint bridge; walk bridge -> corridor -> quarters door (bearing ~-127 from the lab door); in quarters, pt walkto item, face the porthole (bearing ~-6), then turn a little so the porthole is on the left of the screen; pt shot
- **Screenshots:** [port_black_block.png](s02/shots/port_black_block.png)

### 16. [minor] Quarters: 'E Look out of the porthole' prompt and use-brackets stay up while aiming at the bookshelf

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** With the crosshair clearly on the bookshelf and wall to the right of the porthole, the 'E Look out of the porthole' prompt stays on and the orange use-brackets are drawn inside the porthole, away from the crosshair. Pressing E at the porthole only plays a WREN line (the view does not zoom), so it is unclear what the brackets mean. I expected the prompt to go away when the crosshair leaves the porthole.
- **Repro:** in quarters, stand ~1.8 m from the porthole, pt face -54 then pt look 400 0 so the crosshair moves to the bookshelf; pt shot
- **Screenshots:** [port_prompt_stale.png](s02/shots/port_prompt_stale.png)

### 17. [minor] Quitting to title logs a false objective_completed for 'Go to the bridge'

- **Category:** bug; **reported by** 1 agent(s): s04
- **Detail:** Quitting from the quarters via Pause > Main menu emitted objective_completed number 1 'Go to the bridge' at tick 2007, although the bridge was never reached. The next new game then numbered the same objective 2, and after Continue the probe objective was 4. Probe/telemetry only, but it would skew any objective metrics.
- **Repro:** pt start ...; Wake up; skip dream; Esc; Main menu; pt events 10
- **Screenshots:** [no_continue.png](s04/shots/no_continue.png)

### 18. [minor] Rescue aftermath: 'Engine's lit, I'm climbing' arrives before 'The black fills most of the window', and is missing from the received log

- **Category:** text; **reported by** 1 agent(s): s03
- **Detail:** Ines's 'Engine's lit! I felt that. I'm climbing. I'm coming home!' (tick 3951) was followed by 'The black fills most of the window now.' (tick 4071), so it sounds as if she went on falling after she started climbing. Radio light arrives in the order it was sent, so this order is confusing. The 'INES, AS RECEIVED' log on the comms panel then listed 'black fills', 'overhead bright' and '[You fired...]', but not the 'Engine's lit' line. WREN's later line ('a few of her older messages are still on their way') half explains it, but it comes 800 ticks later.
- **Repro:** as above; read subtitles and the comms panel log after firing
- **Screenshots:** [rescue_dialogue_order.png](s03/shots/rescue_dialogue_order.png)

### 19. [minor] Use prompt and target brackets follow the porthole, not the crosshair

- **Category:** ux; **reported by** 1 agent(s): s04
- **Also reported as:** "Crosshair brackets cover the use-prompt text"
- **Detail:** With the centre dot on the bookshelf, the prompt still read 'E Look out of the porthole' and the orange brackets sat on the porthole well to the left of centre. It is unclear what E will act on.
- **Repro:** quarters: click the game; pt look 100 0; pt shot prompt_mismatch
- **Screenshots:** [prompt_mismatch.png](s04/shots/prompt_mismatch.png) [crosshair_prompt.png](s04/shots/crosshair_prompt.png)

### 20. [minor] WREN says 'No more frames are coming' one frame before the last frame arrives

- **Category:** text; **reported by** 1 agent(s): s01
- **Detail:** At tick 10771 WREN says no more frames are coming, but the feed panel still reads 'Next frame due: 1.2 s / 1.3 s' with 64 frames received. Frame 65 (sent at tau 97.50 M from 1.211 rs) then arrives, and only after that does the panel read 'Next frame due: never'. The line should come after the final frame, or the panel should agree with it.
- **Repro:** Launch Orpheus at the probe console, open the feed console (starboard screen), wait ~4000 ticks; compare subtitles with the panel text
- **Screenshots:** [feed-next-frame-contradiction.png](s01/shots/feed-next-frame-contradiction.png)

### 21. [polish] 'WASD to walk, E to use, Esc to pause' hint never goes away

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** The control hint stays mid-screen through the whole quarters and corridor section, even after walking, pausing and using a door, and it covers the view of the corridor.
- **Repro:** Wake up; skip dream; walk to the corridor; pt shot corridor
- **Screenshots:** [corridor.png](s04/shots/corridor.png)

### 22. [polish] About is subtitled 'Credits' but names no people

- **Category:** text; **reported by** 1 agent(s): s04
- **Detail:** The About panel has physics notes, references and libraries, but no credits for the people who made the game.
- **Repro:** title: click About; pt shot about
- **Screenshots:** [about.png](s04/shots/about.png)

### 23. [polish] Chapter card 'II · The rescue' line is unreadable over the quarters bookshelf

- **Category:** text; **reported by** 1 agent(s): s02
- **Detail:** The chapter title card is drawn straight over the 3D view with no backing plate. Its small sub-line ('Ines takes the capsule out') landed on the coloured book spines and was hard to read. A dark backing, or the same plate the subtitles use, would fix it.
- **Repro:** after the probe objective completes, stand in quarters facing the desk and bookshelf when chapter II starts
- **Screenshots:** [q3.png](s02/shots/q3.png)

### 24. [polish] Console panels render ~3 s after E; the game ran at 8-15 tps

- **Category:** perf; **reported by** 1 agent(s): s01
- **Detail:** After E at the helm and probe consoles, state.json already shows screen CONSOLE and the panel text, but the panel does not show in screenshots for 2-3 s. The game ran at about 8-15 ticks a second on this shared machine (fps reported 10), so the story's real-time waits (the 20 s hold, the asymptotic last 0.5 rs of the climb back, Orpheus's ~60 s fall) took several wall-clock minutes. Possibly just the harness load.
- **Repro:** pt key e at a console; pt shot immediately
- **Screenshots:** [helmopen.png](s01/shots/helmopen.png)

### 25. [polish] Every bridge window is solid black at 1.2 rs; the explanation comes late

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** Facing forward and to the side (about yaw -30 to -165) at 1.22 rs, every window is pure black with at most one or two stars. This looks physically right (the shadow fills more than half the sky), and the helm's rear-camera caption plus WREN's later line explain it. But you only see the caption if you stay at the helm, and WREN's explanation comes ~20 game seconds after the windows go black, so on the walkabout it looked like a rendering failure. Ines asking 'is the camera broken?' shows the designer expected this; it could come sooner.
- **Repro:** Descend to 1.217 rs, Esc, turn around the bridge; pt shot
- **Screenshots:** [window-side.png](s01/shots/window-side.png)

### 26. [polish] Lab: ARCHIVE console screen floats in the middle of the lab window

- **Category:** bug; **reported by** 1 agent(s): s02
- **Detail:** The archive's wall screen sits in front of the lab window and covers the centre mullion and parts of both panes, so it looks pasted onto the glass. Every other wall screen (map, camera feed) is on solid wall. I expected it to be mounted on the wall, or the window to be framed around it.
- **Repro:** pt start --checkpoint bridge; walk to lab (door off the corridor); face the archive console from ~3.5 m back; pt shot
- **Screenshots:** [lab_archive_over_window.png](s02/shots/lab_archive_over_window.png)

### 27. [polish] Opening a console hides the in-world screen behind the side panel; mouse wheel does not scroll the panel

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** At the probe console, the camera move puts the in-world PROBE screen half behind the right-hand panel ('BEACON K-1 · as seen from the ship' and 'its cl...' are cut off by the panel edge). The live readout panel runs below the fold, and pt scroll 5 over it did not scroll it; only the scrollbar suggests there is more.
- **Repro:** pt start --checkpoint bridge; use the probe console; click Launch Beacon K-1; pt move 1000 400; pt scroll 5; pt shot
- **Screenshots:** [panel_scroll.png](s02/shots/panel_scroll.png)

### 28. [polish] Probe console screen says 'K-1 ready' when Orpheus is the only probe left

- **Category:** text; **reported by** 1 agent(s): s01
- **Detail:** Ines: 'One probe left. Orpheus.' The in-world probe console screen still lists 'K-1 ready' and 'ORPHEUS ready'. The panel describes Orpheus as carrying 'a clock and a beacon' and does not mention the camera that this chapter is about.
- **Repro:** After helm-done, walk to the probe console; pt shot
- **Screenshots:** [probe-k1-ready.png](s01/shots/probe-k1-ready.png)

### 29. [polish] Subtitles/Graphics dropdown opens as an empty black box

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** Clicking the Subtitles or Graphics select in Settings opens a black popup with no option labels. Options could only be picked blind with Up/Down + Return. This may be the headless native-popup renderer, but a custom list or segmented buttons would avoid it. Also, 'Wake up' stays filled orange while the Settings panel is open, so two items look selected.
- **Repro:** title: click Settings; click 1000 434; pt shot subsel
- **Screenshots:** [dropdown_black.png](s04/shots/dropdown_black.png)

### 30. [polish] The 20 s hold countdown is emitted as 21 separate objectives

- **Category:** bug; **reported by** 1 agent(s): s03
- **Detail:** Each second of 'Hold at twice the relay rate: N s to go' is logged as its own objective_started/objective_completed with a new number (3..23). The HUD looks fine, but objective counts and telemetry are inflated, which could matter for analytics or achievements.
- **Repro:** pt events after the hold
- **Screenshots:** [hold_objective_spam.png](s03/shots/hold_objective_spam.png)

### 31. [polish] Training 'Two Clocks' uses the unit 'M' without explaining it

- **Category:** text; **reported by** 1 agent(s): s04
- **Detail:** The lesson says a ping is sent every '10 M', playback runs at '8 M/s', and the answers are 'about 109 M' and so on. Nothing on screen says what M is. The About page explains the unit only indirectly ('one unit of black-hole time is 0.59 seconds').
- **Repro:** title: Training simulations; click lesson 1; pt shot lesson1_units
- **Screenshots:** [lesson1_units.png](s04/shots/lesson1_units.png)

## Objective timings

Game seconds from the start of the world to each objective (event tick / the game's ticks per second, from events.jsonl). Game time, not wall time: with many sessions on one machine a world can run slower than real time, and wall-clock timings would mostly measure the machine.

| # | Objective | s01 | s02 | s03 | s04 | min | median | max |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Drop the beacon probe (probe console, left) | - | 114.7 | - | 41 | 41 | 77.8 | 114.7 |
| 1 | Go to the bridge | - | - | - | 33.5 | 33.5 | 33.5 | 33.5 |
| 1 | Save Ines: fire the recall beam from the comms console. Wait as long as you dare. | - | - | 65.8 | - | 65.8 | 65.8 | 65.8 |
| 1 | Take the Tern down until the relay clock runs twice as fast (helm) | 52.3 | - | 138.6 | - | 52.3 | 95.4 | 138.6 |
| 2 | Go to the bridge | - | - | - | 33.5 | 33.5 | 33.5 | 33.5 |
| 2 | Hold for 20 seconds | 52.4 | - | - | - | 52.4 | 52.4 | 52.4 |
| 2 | Take the Tern down until the relay clock runs twice as fast (helm) | 52.3 | - | 138.6 | - | 52.3 | 95.4 | 138.6 |
| 2 | Watch the probe fall | - | 219.5 | - | - | 219.5 | 219.5 | 219.5 |
| 3 | Drop the beacon probe (probe console, left) | - | 114.7 | - | 41 | 41 | 77.8 | 114.7 |
| 3 | Hold at twice the relay rate: 20 s to go | 53.3 | - | 139.5 | - | 53.3 | 96.4 | 139.5 |
| 4 | Hold at twice the relay rate: 19 s to go | 54.3 | - | 140.5 | - | 54.3 | 97.4 | 140.5 |
| 5 | Hold at twice the relay rate: 18 s to go | 55.3 | - | 141.5 | - | 55.3 | 98.4 | 141.5 |
| 6 | Hold at twice the relay rate: 17 s to go | 56.3 | - | 142.5 | - | 56.3 | 99.4 | 142.5 |
| 7 | Hold at twice the relay rate: 16 s to go | 57.5 | - | 143.6 | - | 57.5 | 100.5 | 143.6 |
| 8 | Hold at twice the relay rate: 15 s to go | 58.4 | - | 144.6 | - | 58.4 | 101.5 | 144.6 |
| 9 | Hold at twice the relay rate: 14 s to go | 59.4 | - | 145.6 | - | 59.4 | 102.5 | 145.6 |
| 10 | Hold at twice the relay rate: 13 s to go | 60.4 | - | 146.6 | - | 60.4 | 103.5 | 146.6 |
| 11 | Hold at twice the relay rate: 12 s to go | 61.3 | - | 147.6 | - | 61.3 | 104.4 | 147.6 |
| 12 | Hold at twice the relay rate: 11 s to go | 62.3 | - | 148.6 | - | 62.3 | 105.4 | 148.6 |
| 13 | Hold at twice the relay rate: 10 s to go | 63.3 | - | 149.6 | - | 63.3 | 106.4 | 149.6 |
| 14 | Hold at twice the relay rate: 9 s to go | 64.3 | - | 150.6 | - | 64.3 | 107.4 | 150.6 |
| 15 | Hold at twice the relay rate: 8 s to go | 65.3 | - | 151.6 | - | 65.3 | 108.4 | 151.6 |
| 16 | Hold at twice the relay rate: 7 s to go | 66.4 | - | 152.6 | - | 66.4 | 109.5 | 152.6 |
| 17 | Hold at twice the relay rate: 6 s to go | 67.3 | - | 153.6 | - | 67.3 | 110.4 | 153.6 |
| 18 | Hold at twice the relay rate: 5 s to go | 68.3 | - | 154.6 | - | 68.3 | 111.4 | 154.6 |
| 19 | Hold at twice the relay rate: 4 s to go | 69.3 | - | 155.6 | - | 69.3 | 112.4 | 155.6 |
| 20 | Hold at twice the relay rate: 3 s to go | 70.3 | - | 156.6 | - | 70.3 | 113.4 | 156.6 |
| 21 | Hold at twice the relay rate: 2 s to go | 71.3 | - | 157.5 | - | 71.3 | 114.4 | 157.5 |
| 22 | Hold at twice the relay rate: 1 s to go | 72.3 | - | 158.5 | - | 72.3 | 115.4 | 158.5 |
| 23 | Held for 20 seconds | 72.5 | - | 158.6 | - | 72.5 | 115.5 | 158.6 |
| 24 | Return to 10 rₛ (helm) | 99.5 | - | 184.2 | - | 99.5 | 141.8 | 184.2 |

