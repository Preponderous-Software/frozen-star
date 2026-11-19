# Playtest summary: 20261119-0012

3 sessions, build frozen-star 0.2.0 (cca83e6), generated 2026-11-19 00:38.

**Findings:** 20 reports in 19 groups -- 0 blocker, 2 major, 9 minor, 9 polish.

## Outcomes

| Session | Goal | Outcome | Fun | Minutes | Objectives | Deaths | Findings | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| s01 | A brand-new player, from the title menu: the dream, waking in the quarters, the corridor and capsule bay, the bridge, and dropping the beacon probe. Above all, watch the SHIP itself: does the ship's interior ever vanish or flash, even for one frame, leaving only the black hole visible (take a screenshot sequence while walking, turning and resizing nothing)? Also judge the new footsteps/head bob feel, the sealed hatches and interior art, and whether hints and markers overlap. | partial | 3 | 16.1 | 2 | 0 | 5 | I saw no ship-vanish or flash: across ~77 screenshots taken while walking, turning with the arrows and mouse-looking through the quarters, the corridor and the bridge, the interior was always there and the black hole showed only through the windows. The interior art (the sealed hatches with lilac hazard stripes, the TERN posters, the deck map, the capsule-bay window with Ines, the bridge with its ship/relay clock strip) is clear and charming. The run ended with a permanent freeze on stepping back from the probe console, probably the GPU process dying under heavy machine load. Footsteps could not be judged without audio, and head bob was too subtle to judge at ~10 fps. |
| s02 | Save Ines with the recall beam (try failing once first if time allows, then retry: does the retry come back cleanly with no console left open?), then take the Tern down with the helm, using the new x2/x4 buttons. Watch for the ship interior flashing out of sight for a frame, objectives lagging, and dead air. Check the spacetime map console after the rescue. | achieved | 4 | 22.9 | 7 | 0 | 6 | The rescue loop works and teaches well. The comms deadline bar, the 'as received' log with stretch factors and the late 'Fire. Fire now.' lines that arrive after you've already fired make light delay something you feel. The fail-and-retry comes back cleanly with no console left open, and the x2/x4 helm buttons are clear and quick. The main roughness is objectives lagging behind the dialogue that resolves them (reply, return to station), a failed attempt being logged as completed, and some label overlap on the spacetime map. I saw no interior flash in any screenshot. |
| s03 | Finish the story (Orpheus feed, the choice, the epilogue logbook: does it open cleanly, not on top of a console?), then the optional Postscript (photon sphere). Then photo mode: save a picture and exit photo mode; does the ship come back immediately and stay visible? Open and close the pause menu, Settings and Discoveries several times and watch for the ship flashing out. Note anything confusing. | achieved | 4 | 24.2 | 6 | 0 | 8 | The Orpheus feed is the highlight: frames that come further apart and noisier, then 'next frame due: never'. The photon-sphere laser coming back after 11.1 s is a satisfying payoff, and I could work out the answer. The main problems are around modal UI: the game pauses itself when the choice or logbook appears, so the logbook draws over the pause menu, and both story questions only appear once you leave the console, with no prompt to do so. Photo mode and the pause, Settings and Discoveries menus were solid: the ship never flashed out in about 30 screenshots across 4 cycles. |

## Answers

Each agent's own words, verbatim from its report; a missing answer is listed under problems.

### Q1. In your own words, what was the game teaching?

- **s01:** That light from near a black hole gets stretched and slowed: the black disk is the hole's shadow (about 2.5x wider than the horizon), the bright ring is bent starlight, and a falling probe's clock and pings will look slower and redder to you on the ship (the 'light stretched by' factor and the x2 dashed line) than they are for the probe itself. I only got to the start of the fall (x1.03), so I saw the setup, not the payoff.
- **s02:** That what you see of something falling toward a black hole is old, stretched light. Her picture lags behind where she really is and slows and reddens near the horizon, so you can't judge the rescue by looking at her; you need the computed light-speed deadline. The helm part teaches gravitational time dilation: the lower you hold station, the faster far-away clocks run compared with yours (x2 at 1.33 rs, x4 at 1.07 rs), and you can't feel the field that holds you up (equivalence principle).
- **s03:** How gravity near a black hole changes time and light. A probe falling in sends frames at a steady rate on its own clock, but you receive them further and further apart, more and more stretched and faint, until they stop arriving at all. So from outside it seems to freeze at the edge, while it actually falls straight through. Also that what you see depends on how you move (WREN: same place, different motion, different sky), that clocks run slow when you hover deep (the relay runs ×1.73 at 1.5 rs), and that at the photon sphere light can orbit: a laser pulse fired along the hull came back to the stern after 11.1 s by the ship's clock.

### Q2. Which moment was the most confusing, and why?

- **s01:** Getting to the probe console on the bridge. 'Left, by the window' was clear, but walking straight at it I got stuck behind the helm chair and slid sideways. It took several strafes before the use prompt appeared. Also, the wake-up screen piles four hint layers over the porthole just as WREN tells you to look at the black hole.
- **s02:** Right after firing too late. The panel already said the beam was fired 6 s after the deadline, and WREN said 'The beam never caught her', but Ines kept sending 'Okay. Maybe now, doc?', 'Fire. Fire now.' and 'I can't tell if you've fired.' for a while afterwards. It makes sense as old light once you think about it, but WREN's verdict came before those lines, so it first looked like the dialogue was out of order. Second: the 'Watch Ines launch: the port side of the bridge window' objective. I faced the left side windows first and nothing happened; the capsule appeared over the front window.
- **s03:** After the feed ended and Ines asked 'Did it fall in, or is it stuck there?', I sat at the feed console waiting to answer. No answer buttons appeared and the objective disappeared. The choice only showed up when I pressed Esc. The same thing happened in the Postscript: 'log a prediction' with no way to do it until I left the helm. Close behind: a pause menu appearing by itself behind the epilogue logbook.

### Q3. Did anything look broken on screen? Describe each problem, where you were and which way you were facing.

- **s01:** I saw no ship vanishing or flashing in any frame, whether walking, turning or mouse-looking in the quarters, corridor or bridge. The one real break: after pressing Esc at the probe console (bridge, facing the probe console and the left window), the game froze on one frame for good. It looks like the browser's GPU process died under heavy machine load. Smaller things: the 'Probe 2 m' marker drew on top of the use reticle and the console's screen text, and the 'Bridge 9 m' marker sat on a TERN poster in the corridor (facing aft/right). The pointer-lock banner from Chrome showed at the top after clicking to look, which is the browser's, not the game's.
- **s02:** Nothing badly broken, and I saw no interior flash. (1) During the fade to black after the failed rescue, at the helm facing forward, the 'Capsule · Ines 15 m' label and an orange bracket reticle near the bottom centre stayed bright over the black screen. (2) At the map console on the bridge's port wall, facing it after the rescue, the 'Ines' label overlaps 'Engine burn: climbing out'. The comms panel's map had 'ship · now' overlapping another label. (3) At the helm at 1.33 rs and 1.06 rs, facing the front windows, the windows were almost fully black. That matches WREN's explanation that the shadow covers more than half the sky, so I don't think it is a bug. (4) The ship interior turned a pink/red tint during the rescue, which I took to be an alert lighting state.
- **s03:** 1) Epilogue: on the bridge, facing the starboard feed screen up close (yaw about -160, feed console): the expedition logbook drew on top of a pause menu that had opened by itself, with the two panels overlapping on the right. 2) Feed panel (same spot): the 'sent every 0.9 s' chart label overlaps the bars. 3) Photo mode at the helm (yaw about -294): the 'Saved...' line pushed the buttons up, so Done moved under the cursor. Nothing else: the black-hole view, the windows going black at 1.5 rs, and the ship after leaving photo mode and the menus all looked right. Apart from blur, no flicker and no ship flash-out.

## Findings

### 1. [major] Epilogue logbook opens on top of the pause menu (both panels drawn, overlapping)

- **Category:** bug; **reported by** 1 agent(s): s03
- **Detail:** After the Orpheus choice and the closing lines, the 'Expedition log: What you saw, and what happened' logbook appeared, but the game also switched to PAUSE on its own (event WORLD->PAUSE at tick 7988, no key pressed since ~7016). The pause menu's title and buttons stick out from behind the logbook on the right. The background is the feed console's static, seen close up, because the camera was still parked at the feed screen. After choosing 'Postscript' in the logbook the game was still paused and I had to click Resume. Expected: the logbook alone, centred, with the game not paused underneath. It did not open on top of a console panel, but it did open on top of the pause menu.
- **Repro:** pt start --checkpoint helm-done; launch Orpheus at the probe console; watch the feed at the starboard screen to the end; Esc; pick answer 1; wait ~10 s without input
- **Screenshots:** [logbook-over-pause.png](s03/shots/logbook-over-pause.png)

### 2. [major] Game froze permanently on stepping back (Esc) from the probe console after launching K-1

- **Category:** crash; **reported by** 1 agent(s): s01
- **Detail:** After launching Beacon K-1 and watching the panel for ~40 s, I pressed Esc to step back. The screen went CONSOLE -> CUTSCENE (mode 'tweening') at tick 7563 and the game never ticked again: tick stuck at 7581, state.json stale for over 2 minutes, every screenshot byte-identical (the probe readout 'its clock 12.23 M' never changed), Space and other keys did nothing. The Chrome tree had no GPU process left and data/chrome.log shows a crashpad dump at 00:28:02. Load average on the machine was ~52 and the kernel logged an NMI, so this is probably the SwiftShader GPU process dying under load rather than game code, but it happened exactly on the console step-back camera tween, so worth a check. A player would see a frozen frame with no error or 'reload' message; the game could detect a lost WebGL context and say so.
- **Repro:** pt start ...; pt key Return; skip dream; walk to the bridge; walk to the probe console (left of helm); pt key e; click 'Launch Beacon K-1' (992,378); pt wait 40; pt key Escape
- **Screenshots:** [frozen-after-console.png](s01/shots/frozen-after-console.png)

### 3. [minor] After a failed rescue the objective is logged as completed and the retry restarts as objective #3 with a ~3 s gap

- **Category:** bug; **reported by** 1 agent(s): s02
- **Detail:** I let the deadline pass and fired 6 s late. WREN: 'The beam never caught her...', and the card 'That isn't how it went. Not yet. Try again.' The failed objective #2 'Save Ines' was recorded as objective_completed (tick 6567). After the fade back to WORLD (tick 6650), no objective was on screen until tick 6836, when the same 'Save Ines' objective started as #3. Expected the failed attempt not to count as completed and the objective to stay visible across the retry.
- **Repro:** pt start --checkpoint probe-done; open comms; wait until the panel says 'The deadline has passed'; click Fire recall beam; wait for the retry card; pt events
- **Screenshots:** [retry1.png](s02/shots/retry1.png)

### 4. [minor] Feed says nothing sent after 1.21 rs will ever get out, though it was still outside the horizon

- **Category:** text; **reported by** 1 agent(s): s03
- **Detail:** On the last frame (sent from 1.211 rs) the panel says 'This is the last frame that will ever arrive. Everything Orpheus sent later is still climbing, and never gets out.' Frames sent between 1.21 rs and the horizon at 1 rs are outside the horizon, so they should get out eventually, just very late and very red. The wording suggests light from outside the horizon is trapped. Something like 'the rest would take longer than you will wait, and anything sent from inside never gets out' would be accurate.
- **Repro:** Watch the Orpheus feed to the end
- **Screenshots:** [last-frame-claim.png](s03/shots/last-frame-claim.png)

### 5. [minor] Game auto-pauses during the 'What do you tell Ines?' choice; number keys still answer while paused

- **Category:** bug; **reported by** 1 agent(s): s03
- **Detail:** The choice appeared at tick 6984; at 7002 the game went to PAUSE by itself (I had pressed nothing). With the pause menu open, pressing 1 still picked the answer (Ines's reply subtitle appeared) while the game stayed paused. Looks like the same auto-pause that fires when the logbook opens (probably on losing mouse capture). Expected: no auto-pause when a choice or logbook takes the mouse, and answer keys ignored while paused.
- **Repro:** As above; at the feed console press Esc after the objective completes; wait ~10 s; observe PAUSE; press 1
- **Screenshots:** [paused-during-choice.png](s03/shots/paused-during-choice.png)

### 6. [minor] Helm 'Return to 10 rs' objective stays open ~6 game s after the ship is back and WREN says 'Back at station'

- **Category:** bug, ux; **reported by** 1 agent(s): s02
- **Also reported as:** "'Wait for Ines's reply' objective stays open ~15 game s after her reply has arrived"
- **Detail:** After the hold, pressed 'Return to 10 rs'. Altitude reached 10 rs and WREN said 'Back at station. The rest of the universe aged 39 seconds more...' at tick 12051, but the OBJECTIVE box still read 'Return to 10 rs (helm)' after I stepped back from the console (tick 12429). It only completed at tick 12435, together with the 'IV · Orpheus' card. At the ~8-10 tps of this machine that was about a minute of real time with a stale objective. Expected the objective to tick off when WREN confirms arrival.
- **Repro:** pt start --checkpoint probe-done; complete the rescue; at helm click x2, hold 20 s, click 'Return to 10 rs'; watch the objective box after WREN's 'Back at station' line
- **Screenshots:** [obj7lag.png](s02/shots/obj7lag.png) [objlag.png](s02/shots/objlag.png)

### 7. [minor] Photo mode: 'Saved' message pushes the panel up, so the first click on Done misses

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** After Save picture, 'Saved frozen-star-...png to your Downloads folder.' shows up a second or two later and moves the photo-mode panel up about 23 px. My click on Done, aimed where it had just been, missed and photo mode stayed open. The second click on Done exited, and the ship came back immediately and stayed visible. The file was saved (frozen-star-2026-11-19-00-35-21.png). Expected: buttons stay put, with the message shown somewhere that doesn't move the layout.
- **Repro:** After the epilogue: Esc, Photo mode, Save picture, then click Done at once
- **Screenshots:** [photo-done-shift.png](s03/shots/photo-done-shift.png)

### 8. [minor] Probe console hard to reach: the helm desk/chair blocks the direct path and walking slides sideways

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** From the bridge entrance, walking straight at the probe console (bearing ~0) stalled at ~3.6 m behind the helm chair; W slid the player sideways instead of forward. It took several strafes and turns to get within the 1.9 m use range, and pt walkto console went to the helm/feed consoles instead. A new player told 'the one on the left, by the window' will bump the helm chair. A wider gap or a slightly larger use range would help.
- **Repro:** From bridge entrance at about (0,-5.6): pt face toward probe; pt hold w 1.0 x3 -> position barely changes (x 0.51, z -8.8)
- **Screenshots:** [stuck.png](s01/shots/stuck.png)

### 9. [minor] Story choices only appear after you leave the console, with nothing telling you to

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** Orpheus: the feed objective completed at tick 6618 and Ines asks 'Did it fall in, or is it stuck there?', but the answer box only appeared after I pressed Esc (tick ~6990); for ~370 ticks I sat at the feed with no objective and no hint. Postscript: the objective 'Listen to WREN, then log a prediction' started at 9534, but the prediction box (timed) only appeared after I pressed Esc at the helm at 10826, ~1300 ticks later. A player waiting at the console for the question will wait forever. Expected: the choice appears over the console, or the objective says 'step back from the console'.
- **Repro:** pt start --checkpoint helm-done; play to the end of the Orpheus feed and stay at the feed console; later stay at the helm after the field locks at 1.5 rs
- **Screenshots:** [prediction-after-esc.png](s03/shots/prediction-after-esc.png)

### 10. [minor] Waking HUD stacks four layers over the porthole you are told to look out of

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** On waking, the E use-prompt, 'Click to look around', the controls hint box and WREN's subtitle are stacked in the middle of the screen. They do not overlap each other, but together they cover the porthole and the black hole WREN is describing. The controls hint stays up until you have walked a fair way. Moving the controls hint to a corner, or showing it after the opening lines, would clear the view.
- **Repro:** pt start; pt key Return; skip dream; pt await WORLD; pt shot
- **Screenshots:** [hint-stack.png](s01/shots/hint-stack.png)

### 11. [polish] 'Probe 2 m' waypoint marker sits on the use reticle and the console's screen text

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** Once the probe console is in reach, the orange waypoint diamond and 'Probe 2 m' label are drawn on top of the reticle bracket and over the console's own text (K-1 ready / ORPHEUS locked), just above the 'E Use the probe console' prompt. Hide the waypoint when the use prompt for the same target is showing. Similarly, in the corridor the edge-clamped 'Bridge 9 m' marker sat on the TERN poster.
- **Repro:** Walk to the probe console until 'E Use the probe console' shows; pt shot
- **Screenshots:** [marker-overlap.png](s01/shots/marker-overlap.png)

### 12. [polish] Feed chart label 'sent every 0.9 s' is drawn over the bars

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** In the frame-gap chart on the feed panel, the 'sent every 0.9 s' label sits on top of the bars once they grow tall, so it is hard to read.
- **Repro:** Watch the Orpheus feed past ~3 rs
- **Screenshots:** [chart-label-overlap.png](s03/shots/chart-label-overlap.png)

### 13. [polish] Game ran at about 8-10 ticks a second, so story gaps that are a few game seconds are about a minute of real waiting

- **Category:** perf; **reported by** 1 agent(s): s02
- **Detail:** The opening has dead air on screen. Ines speaks, then nothing shows (no objective, no subtitle) until tick 378. Between 'Capsule away' (tick 1190) and the mayday (tick 1688) there was no objective or subtitle. These gaps are short in game time (6-8 s) but felt like dead air at this frame rate. The 'Watch Ines launch' objective took about 13 game s to complete. Also the probe's state.json stopped updating at tick 5721 for about 40 s real while events continued (harness or probe stall).
- **Repro:** pt start --checkpoint probe-done; pt state every 15 s
- **Screenshots:** [w1.png](s02/shots/w1.png)

### 14. [polish] Game ran at ~10 fps / ~12-15 tps here, so walking and Shift-run felt very slow

- **Category:** perf; **reported by** 1 agent(s): s01
- **Detail:** The dream, the walk and the probe fall all ran at a fraction of real time (the 1-minute probe fall would take several minutes). Shift-run did not look noticeably faster than walking at this frame rate. This is likely due to machine load (load avg ~50); noted only so pacing feedback from this session is read with that in mind.
- **Repro:** pt status; pt state (tick vs wall clock)
- **Screenshots:** [sheetF.png](s01/shots/sheetF.png)

### 15. [polish] Helm has no 1.5 rs preset; reaching the photon sphere needs fiddly slider work

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** The objective asks for 1.5 rs, but the presets are only 'Return to 10 rs', '×2 · 1.33 rs' and '×4 · 1.07 rs'. The slider is non-linear (a click jumped to 1.164 or 1.551), so I needed about 20 Left-arrow nudges to get near 1.50. The field then snapped and locked at 1.500, which is nice, but a 'photon sphere 1.5 rs' preset or snap marker would help.
- **Repro:** Postscript: open the helm, scroll down to 'Hold station at'
- **Screenshots:** [helm3.png](s03/shots/helm3.png)

### 16. [polish] Spacetime map labels overlap: 'Ines' covers 'Engine burn: climbing out'; 'ship · now' overlaps another label

- **Category:** text; **reported by** 1 agent(s): s02
- **Detail:** After the rescue, the map console (Ines's fall) draws the 'Ines' label on top of the green 'Engine burn: climbing out' label, so it reads 'Ines e burn: climbing out'. The bridge wall screen shows the same overlap. Before the rescue, the map on the comms panel also had 'ship · now' overlapping a second label at the 10 rs row. With an early shot her gold path is only a tiny stub, and the dashed green 'climb home' line is hard to find.
- **Repro:** rescue Ines early; walk to map console; press e
- **Screenshots:** [maplabels2.png](s02/shots/maplabels2.png)

### 17. [polish] The retry is clean (no console left open), but the capsule label and a bracket reticle stay bright through the black fade

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** The retry came back cleanly: WORLD screen, mode walk, no panel, facing the helm. During the fade-to-black, the 'Capsule · Ines 15 m, holding station' label and an orange bracket reticle near the bottom centre were drawn at full brightness over the black screen. The orange bracket is still there once the scene fades in. WREN's line 'The comms console now shows the spacetime map...' also started while the screen was still black.
- **Repro:** fail the rescue as above; pt shot during the fade back
- **Screenshots:** [fail5.png](s02/shots/fail5.png)

### 18. [polish] WREN's helm explainer about 1.33 rs plays after the player has already reached x2

- **Category:** text; **reported by** 1 agent(s): s02
- **Detail:** WREN's line 'The station-keeping field can take us lower. Below 1.33 rs, every second aboard is two seconds on the relay far away.' played at tick 10359, after the x2 objective had completed (9843) and during the 20 s hold. It reads like an intro to the descent. Two WREN lines were also stacked on screen at once.
- **Repro:** after the rescue, open helm and immediately click x2 · 1.33 rs
- **Screenshots:** [hold4.png](s02/shots/hold4.png)

### 19. [polish] helm-done checkpoint shows no objective for the first ~12 game seconds

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** You start on the bridge with no objective panel. WREN's line about Orpheus comes at tick 288 and the objective only at tick 708. A player who misses the subtitle has nothing on screen saying what to do.
- **Repro:** pt start --checkpoint helm-done; take shots before tick 700
- **Screenshots:** [w1.png](s03/shots/w1.png)

## Objective timings

Game seconds from the start of the world to each objective (event tick / the game's ticks per second, from events.jsonl). Game time, not wall time: with many sessions on one machine a world can run slower than real time, and wall-clock timings would mostly measure the machine.

| # | Objective | s01 | s02 | s03 | min | median | max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Go to the bridge | 64.7 | - | - | 64.7 | 64.7 | 64.7 |
| 1 | Launch Orpheus (probe console), then watch its feed (starboard screen) | - | - | 14.9 | 14.9 | 14.9 | 14.9 |
| 1 | Watch Ines launch: the port side of the bridge window | - | 19.8 | - | 19.8 | 19.8 | 19.8 |
| 2 | Drop the beacon probe (probe console, left) | 118.9 | - | - | 118.9 | 118.9 | 118.9 |
| 2 | Save Ines: fire the recall beam from the comms console. Wait as long as you dare. | - | 109.5 | - | 109.5 | 109.5 | 109.5 |
| 2 | Watch the Orpheus feed (starboard screen) | - | - | 110.3 | 110.3 | 110.3 | 110.3 |
| 3 | Optional: take the Tern down to the photon sphere, 1.5 rₛ (helm) | - | - | 158.9 | 158.9 | 158.9 | 158.9 |
| 3 | Save Ines: fire the recall beam from the comms console. Wait as long as you dare. | - | 109.5 | - | 109.5 | 109.5 | 109.5 |
| 4 | Photon sphere reached. Listen to WREN, then log a prediction | - | - | 183.1 | 183.1 | 183.1 | 183.1 |
| 4 | Wait for Ines's reply: its light is still on the way (comms console) | - | 148.3 | - | 148.3 | 148.3 | 148.3 |
| 5 | Fire the ranging laser along the hull (helm) | - | - | 188.7 | 188.7 | 188.7 | 188.7 |
| 5 | Take the Tern down until the relay clock runs twice as fast (helm) | - | 164.1 | - | 164.1 | 164.1 | 164.1 |
| 6 | Hold at twice the relay rate for 20 seconds (helm) | - | 184.2 | - | 184.2 | 184.2 | 184.2 |
| 6 | Watch the pulse go round Erebus (helm panel) | - | - | 199.8 | 199.8 | 199.8 | 199.8 |
| 7 | Return to 10 rₛ (helm) | - | 207.2 | - | 207.2 | 207.2 | 207.2 |

