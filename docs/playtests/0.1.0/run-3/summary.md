# Playtest summary: 20261115-0822

2 sessions, build frozen-star 0.1.0 (6a54bd2), generated 2026-11-15 11:24.

**Findings:** 19 reports in 18 groups -- 0 blocker, 2 major, 12 minor, 5 polish.

## Outcomes

| Session | Goal | Outcome | Fun | Minutes | Objectives | Deaths | Findings | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| s01 | Play from the very beginning as a brand-new player who has never seen the game: the title menu, the dream, waking up, finding the bridge and dropping the beacon probe. Note every moment of confusion, and screenshot anything that looks broken on screen. | achieved | 4 | 14.7 | 3 | 0 | 8 | The opening works: a beautiful title, a dream that sets up the frozen-star idea, a clear objective and on-screen markers ('Bridge 9 m', 'Probe 6 m') that made finding the bridge and launching K-1 painless. The probe console is the standout, with growing ping gaps, a prediction that pays off and the 'old light' explanation landing well. Fix the unusable datapad and the crosshair/target mismatch in the quarters first: they are the very first interactions a new player tries. Also tighten the console's status text so it never says 'frozen at the horizon' while its own numbers say 3 rs. |
| s02 | A player who has just finished the first chapter. Do the rescue, then wander: open every console and wall screen on the bridge, read each panel fully, and judge whether the words, numbers and diagrams make sense to someone with no physics background. Note jargon, unexplained numbers, text that is too long to read before it changes, and anything that looks broken. | achieved | 4 | 13.5 | 1 | 0 | 10 | The rescue is excellent: 'wait as long as you dare' plus WREN's debrief that you fired 4 seconds before the deadline while she still looked fine teaches the core idea in one gut-punch. The bridge consoles around it undercut it: three unexplained units in the rescue readout, a spacetime map that seems to show Ines dying right after you saved her, and archive text that leans on e^9, 10^-23 and GM/c^3. Rewording the numbers in plain language and fixing the map's labels would make the post-rescue wander teach rather than confuse. |

## Answers

Each agent's own words, verbatim from its report; a missing answer is listed under problems.

### Q1. In your own words, what was the game teaching?

- **s01:** That near a black hole, what you see and what actually happens come apart. A probe dropped from the ship crosses the horizon in under a minute by its own clock and is gone. But its light reaches you later and later, so the picture of it slows, reddens, dims and seems to freeze at the edge. The black disk is the hole's shadow, larger than the horizon, and the bright ring is bent starlight. Also: clocks at different heights run at different rates (the ship and relay clocks on the bridge differ), and time can be measured in 'M' for the hole.
- **s02:** That what you see of something falling into a black hole is old, slowed-down light. On my screen Ines looked almost normal, but the real moment to act had already nearly passed (WREN: 'You fired 4 seconds before the last possible moment', and she still looked fine on my screen). Clocks near the hole run slow compared with clocks far away, signals take longer and longer to climb out, and the light gets redder and dimmer until it effectively stops arriving. So you have to act on reasoning, not on what the picture shows.

### Q2. Which moment was the most confusing, and why?

- **s01:** In my quarters, trying to read the datapad. The help says E uses the datapad. With the crosshair right on it there was no prompt, and E either did nothing or replayed a porthole line, because the target brackets had jumped to the porthole off in the corner. I could not tell whether I was too close, too far or aiming wrong. A close second was the probe console's 'ITS OWN CLOCK' and 'ship clock' showing the same number the whole way down, which made me unsure what 'its own clock' was meant to show me.
- **s02:** Opening the spacetime map right after rescuing Ines. The wall screen titled 'capsule' showed a gold line falling through the horizon into the singularity, the panel title said 'Ines's fall', the caption said the gold line was 'the probe', and the panel's own plot had no gold line at all. I had just been told she was saved, and the diagram seemed to say she died. Also, during the rescue, the readouts (M, 1+Z, rs) were three unexplained units on a 50-second clock.

### Q3. Did anything look broken on screen? Describe each problem, where you were and which way you were facing.

- **s01:** 1) The black hole's inner ring is drawn as a string of separate bright dots, with a bright vertical smear on the shadow's left inner edge. I saw it in the dream (looking straight at the hole), through the quarters porthole (facing the porthole at yaw about -6) and through the bridge windows (facing forward toward the helm). 2) In the quarters, facing the desk (yaw -26) and looking down, the target brackets drew on the porthole in the top-left instead of on what the crosshair was on. 3) At the probe console (bridge, left console, yaw about 23) the side panel covered half the in-world screen, and its 'Esc or Q to step back' hint ran under the menu button. 4) On the same console's physical screen, after stepping back, the redshift read '8.80e+3' in raw exponent form. The ray-traced view was blurry and ran at about 10 fps, but apart from the dotted ring I saw no flicker, holes or garbled colour.
- **s02:** 1) At the helm (centre desk, facing forward toward the main windows), the whole 3D half of the screen was solid black for as long as the helm panel was open. 2) At the map console (left-rear of the bridge, facing the wall screen), faint large ghost text showed through behind the SPACETIME MAP screen, and the 'Progress saved' toast covered panel text. 3) On the probe console (left of the helm, facing forward), the wall screen said 'ORPHEUS locked' while the panel offered a 'Launch Orpheus' button that did nothing. 4) In the lab, facing the waypoint to the helm, the waypoint and door marker pointed into a blank wall. The ray-traced black hole through the windows looked right apart from the expected blur.

## Findings

### 1. [major] Quarters: the datapad cannot be used; crosshair on it shows no prompt and E does nothing

- **Category:** bug; **reported by** 1 agent(s): s01
- **Detail:** The on-screen help and the brief say E uses 'the datapad'. Standing at the desk 1.3 m away, facing it (datapad bearing +0) with the crosshair dot squarely on the light-blue datapad, no use prompt appears and E does nothing. Expected an 'E Read your datapad' prompt (state lists that label). A new player's first instinct is to read the datapad, and it silently fails.
- **Repro:** pt start ...; pt key Return; wait out the dream to WORLD; pt face 21; pt click 640 300; pt look 0 250; pt hold w 0.9; pt look 0 -120; pt look 0 140; pt key e
- **Screenshots:** [datapad-no-prompt.png](s01/shots/datapad-no-prompt.png)

### 2. [major] Spacetime map after a successful rescue shows the capsule's gold line ending on the singularity

- **Category:** text, ux; **reported by** 1 agent(s): s02
- **Also reported as:** "Spacetime map panel caption refers to a gold line and light cones the plot does not show"
- **Detail:** After the rescue succeeded (WREN: 'Beam delivered, in time'; Ines: 'I'm climbing. I'm coming home!'), the in-world wall screen titled 'SPACETIME MAP - capsule' draws a gold line diving through the horizon and ending at r = 0 (singularity). To a non-physicist this reads as 'Ines died'. The side panel is titled 'Ines's fall', its caption says 'The gold line is the probe', and its own plot shows no gold line at all (its time window 't 139-189 M' has scrolled past the fall), while the wall screen shows a different window ('t 113-203 M'). Title, caption, wall screen and panel plot disagree about what is drawn. Expected: the map shows Ines's actual path (falling, then climbing back out), labelled consistently, with the panel and the wall screen showing the same thing.
- **Repro:** pt start --profile tools/playtest/frozen-star.json --game-dir . --checkpoint probe-done; walk to comms, press e, click 'Fire recall beam' about 44 s after the power loss; after 'Beam delivered', walk to the map console (left-rear of the bridge), press e.
- **Screenshots:** [map_capsule_hits_singularity.png](s02/shots/map_capsule_hits_singularity.png) [map_no_gold_line.png](s02/shots/map_no_gold_line.png)

### 3. [minor] Archive 'Two Clocks' uses e^9, powers of ten, GM/c^3 and '6.5e+3 million suns'

- **Category:** text; **reported by** 1 agent(s): s02
- **Detail:** The archive sim explains M well, then adds 'GM/c3'. The playback slider is labelled '8 M/s'. The black-hole list uses calculator notation ('6.5e+3 million suns', '4.0e+4 million suns'). The final verdict reads 'Gone. The light is stretched more than e^9 times', with REDSHIFT '4x10^3' and BRIGHTNESS '10^-23'. The quiz feedback 'Your prediction missed: it arrived at 108.8 M.' says I was wrong but not why. The result is several boxes below the fold.
- **Repro:** Walk to the archive (lab terminal), press e, click '1. Two Clocks', pick 'about 300 M', click 'Drop the probe', wait about 30 s, scroll down.
- **Screenshots:** [two_clocks_result_jargon.png](s02/shots/two_clocks_result_jargon.png)

### 4. [minor] Black-hole render: the photon ring inside the shadow is a ring of separate dots, plus a bright smear on its left edge

- **Category:** bug; **reported by** 1 agent(s): s01
- **Detail:** In the dream, and through the bridge window and the quarters porthole, the bright ring just inside the shadow is drawn as evenly spaced separate bright dots, not a continuous ring. A bright vertical streak sits on the left inner edge of the shadow (~x 520, y 340-390 in the dream). It looks like a sampling artefact, not the expected blur from software rendering. It is visible in every view of the hole (dream, porthole, bridge windows).
- **Repro:** pt start ...; pt key Return; pt wait 8; pt shot x (DREAM, tick ~450-1400)
- **Screenshots:** [dream-dotted-ring.png](s01/shots/dream-dotted-ring.png)

### 5. [minor] Comms diagram does not label the capsule; the Fire button scrolls away while reading her messages

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** In 'CAPSULE - WHAT YOU SEE' the horizon and the station are labelled, but the capsule is an unlabelled glowing dot that changes colour (green, then yellow, then orange) with no legend. Ines's messages ('INES, AS RECEIVED') are below the fold; scrolling down to read them scrolls the 'Fire recall beam' button off the top of the panel during a time-critical decision.
- **Repro:** During the rescue, at comms, move the pointer over the panel and scroll down 5.
- **Screenshots:** [capsule_dot_unlabelled.png](s02/shots/capsule_dot_unlabelled.png)

### 6. [minor] Comms rescue panel opens with three unexplained units (M, 1+Z, rs)

- **Category:** text; **reported by** 1 agent(s): s02
- **Detail:** The first screenful of the comms panel during the rescue shows '28.8 M / 17.1 s for this hole', 'REDSHIFT 1+Z 1.082', 'BRIGHTNESS 73%', 'APPEARS AT 9.51 rs'. The one-line explanation of rs and M sits below the fold, under the diagram, and redshift is never explained. In the 50 seconds of the rescue, the only number that helps the decision is how close she is, and I had to work that out from 'APPEARS AT ... rs'. The status line also stayed 'Falling. It looks almost normal from here.' the whole time, even with brightness down to 30%.
- **Repro:** pt start ... --checkpoint probe-done; wait for 'capsule has lost main power'; walk to comms, press e.
- **Screenshots:** [comms_jargon.png](s02/shots/comms_jargon.png)

### 7. [minor] Dream: the last line '(Nothing happened.)' is on screen for under a second

- **Category:** text; **reported by** 1 agent(s): s01
- **Detail:** The dream has 3 subtitle lines: tick 144, then ~22 s of silence, then 'The black is spreading...' at 1501, '(Nothing happened.)' at 1641, and the cut to CUTSCENE at 1683 (0.7 s later). The last line, which is the dream's punchline (you cross the horizon and nothing happens), cannot be read. My shot at tick 1641 still shows the previous line.
- **Repro:** pt start ...; pt key Return; screenshot about every 5 s through the dream
- **Screenshots:** [dream6.png](s01/shots/dream6.png)

### 8. [minor] Hard to get from the lab back to the bridge: the waypoint and door point into a blank wall

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** After using the archive, the 'Helm 9 m' waypoint and the nearest 'bridge' door both point into a blank wall corner of the lab. Walking toward them slides along the wall. I had reached the lab by sidling through a doorway from the corridor and could not find that doorway again by sight in about 2 minutes. There is no signage in the lab.
- **Repro:** From the archive, press Esc, turn toward the 'Helm' waypoint and hold w.
- **Screenshots:** [lab_return_confusing.png](s02/shots/lab_return_confusing.png)

### 9. [minor] Helm console: the whole 3D view goes solid black while the helm panel is open

- **Category:** bug; **reported by** 1 agent(s): s02
- **Detail:** At the helm (centre desk, facing forward toward the main windows) the left half of the screen is pure black for as long as the panel is open; re-shot after 3 s, still black. At comms, probe, map and feed the left half shows the console screen and the room. The helm panel itself is one line ('Holding station at 10 rs. Descent is locked until the survey plan calls for it.') with no hint of what the survey plan is or where to find it.
- **Repro:** After the rescue, walk to the helm (low centre desk), press e, take a screenshot.
- **Screenshots:** [helm_black_view.png](s02/shots/helm_black_view.png)

### 10. [minor] Probe console status says 'Frozen at the horizon, too red to see' while it still shows the probe at ~3 rs with 1+z about 2

- **Category:** text; **reported by** 1 agent(s): s01
- **Detail:** Around tick 11400-11560 the status box read 'Frozen at the horizon and too red to see by eye. An infrared telescope still catches it, barely. Its clock has nearly stopped.' The same panel showed APPEARS AT 3.22-2.82 rs, REDSHIFT 1+z 1.9-2.1 and brightness 5-7%, and the map showed the image well outside the horizon. The text runs ahead of the numbers beside it, which undermines the lesson about gradual freezing.
- **Repro:** pt walkto probe console from bridge entry; pt key e; click 'Launch Beacon K-1'; wait ~65 game seconds; scroll panel to 'SHIP · WHAT YOU SEE'
- **Screenshots:** [frozen-text-mismatch.png](s01/shots/frozen-text-mismatch.png)

### 11. [minor] Probe console: wall screen says 'ORPHEUS locked' while the panel shows a 'Launch Orpheus' button that silently does nothing

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** The in-world probe screen reads 'K-1 spent / ORPHEUS locked', but the panel shows a dimmed 'Launch Orpheus' button with no text saying it is locked or why. Clicking it does nothing, with no feedback. 'Erebus' is used by name with no reminder that it is the black hole, and 'K-1 spent' is not explained.
- **Repro:** After the rescue, walk to the probe console (left of the helm), press e, click 'Launch Orpheus'.
- **Screenshots:** [probe_locked_vs_launch.png](s02/shots/probe_locked_vs_launch.png)

### 12. [minor] Quarters: the use target ignores where the crosshair points after a mouse look; brackets jump onto the off-centre porthole

- **Category:** bug; **reported by** 1 agent(s): s01
- **Detail:** After clicking into the game and looking down at the desk, the crosshair dot sat beside the datapad, but the orange target brackets were drawn on the porthole in the top-left of the screen and the prompt said 'E Look out of the porthole'. Pressing E replayed the porthole line. The target seems to follow body yaw, not the camera's view direction. Expected the target to be what the crosshair is on.
- **Repro:** after waking: pt face 21; pt click 640 300; pt look 0 250; pt shot x; pt key e
- **Screenshots:** [prompt-mismatch-datapad.png](s01/shots/prompt-mismatch-datapad.png)

### 13. [minor] Timed prediction question gives no confirmation of the chosen answer

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** 'Ping 7 arrived late. Log a prediction: when will ping 9 arrive?' popped up over the console with a draining timer bar. I pressed 2. The dialog closed with nothing to confirm the pick or that it was logged. The payoff ('Ping 9, right on your prediction.') arrived ~15 game seconds later, which is nice, but in between I could not tell whether the key had registered or the timer had run out. No event for the choice appeared in events.jsonl either.
- **Repro:** launch K-1, stay at the probe console; when the CHOICE screen appears (~tick 10317) pt key 2
- **Screenshots:** [choice-no-feedback.png](s01/shots/choice-no-feedback.png)

### 14. [polish] Bridge header strip 'SHIP / RELAY / x1.054 / 10.00 rs' is never explained

- **Category:** text; **reported by** 1 agent(s): s02
- **Detail:** The strip above the forward windows shows 'SHIP 06:40:04 RELAY 06:40:04 x1.054 10.00 rs'. Nothing says what 'x1.054' is (the relay clock rate relative to the ship). The next objective, 'Take the Tern down until the relay clock runs twice as fast', depends on reading exactly this number.
- **Repro:** pt start ... --checkpoint probe-done; look forward from the start position.
- **Screenshots:** [start.png](s02/shots/start.png)

### 15. [polish] Camera feed console is a dead end ('No signal.')

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** The feed panel is just 'Camera feed / No signal.' with nothing to say what will feed it or when. The hamburger menu button also overlaps the 'Esc or Q to step back' hint on the short panels (feed, helm, probe).
- **Repro:** Walk to the feed wall screen (right of the bridge entrance), press e.
- **Screenshots:** [feed_no_signal.png](s02/shots/feed_no_signal.png)

### 16. [polish] Console side panel hides half the in-world console screen, and its 'Esc or Q to step back' hint runs under the menu button

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** At the probe console the right-hand panel covers the right half of the physical console screen, so 'BEACON K-1 · as seen from the ship' and the 'its clock' readout are cut off. Before the panel gets a scrollbar, the top-right hint 'Esc or Q to step back' runs into the hamburger menu button. The panel also took ~3 s wall time to slide in after E. During that time the screen showed only the zoomed console, and I wondered whether E had worked.
- **Repro:** on the bridge: pt walkto console (probe); pt key e; pt shot x
- **Screenshots:** [panel-hint-overlap.png](s01/shots/panel-hint-overlap.png)

### 17. [polish] Faint ghost text shows behind the in-world spacetime map screen; 'Progress saved' toast covers panel text

- **Category:** bug; **reported by** 1 agent(s): s02
- **Detail:** At the map console, large faint text (something like 'III The des...') shows through behind the SPACETIME MAP wall screen, as if a chapter-title card or a second screen is z-fighting with it. The 'Progress saved' toast at bottom right covers the panel caption.
- **Repro:** Walk to the map console, press e, look at the left half of the screen.
- **Screenshots:** [map_ghost_text.png](s02/shots/map_ghost_text.png)

### 18. [polish] In-world probe readout once showed raw exponent '1+z 8.80e+3'; later frames show '7.1x10^6' superscript

- **Category:** text; **reported by** 1 agent(s): s01
- **Detail:** After stepping back from the probe console (~tick 13160), the physical screen's bottom line read '1+z 8.80e+3'. A few seconds later the same field used proper notation ('1+z 7.1x10^6', '1.8x10^7'). The formatting switches at some threshold. Note: the shot attached was retaken under the same name and now shows the later x10^7 form; the original e+3 frame was overwritten.
- **Repro:** launch K-1, wait for the horizon crossing, press Escape at ~tick 13100, pt shot x
- **Screenshots:** [stepback.png](s01/shots/stepback.png)

## Objective timings

Game seconds from the start of the world to each objective (event tick / the game's ticks per second, from events.jsonl). Game time, not wall time: with many sessions on one machine a world can run slower than real time, and wall-clock timings would mostly measure the machine.

| # | Objective | s01 | s02 | min | median | max |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Go to the bridge | 111.1 | - | 111.1 | 111.1 | 111.1 |
| 1 | Save Ines: fire the recall beam from the comms console. Wait as long as you dare. | - | 68.4 | 68.4 | 68.4 | 68.4 |
| 2 | Drop the beacon probe (probe console, left) | 125.5 | - | 125.5 | 125.5 | 125.5 |
| 3 | Watch the probe fall | 230.4 | - | 230.4 | 230.4 | 230.4 |

