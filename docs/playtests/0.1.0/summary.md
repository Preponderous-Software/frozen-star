# Playtest summary: 20261114-2110

4 sessions, build frozen-star 0.1.0 (c667e1e), generated 2026-11-14 21:34.

**Findings:** 34 reports in 34 groups -- 0 blocker, 2 major, 17 minor, 15 polish.

## Outcomes

| Session | Goal | Outcome | Fun | Minutes | Objectives | Deaths | Findings | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| s01 | Play from the very beginning as a brand-new player who has never seen the game: the title menu, the dream, waking up, finding the bridge and dropping the beacon probe. Note every moment of confusion, and screenshot anything that looks broken on screen. | achieved | 3 | 20.8 | 4 | 0 | 10 | The opening works: the dream is striking, the HUD objective and door/bridge waypoints made the way to the bridge clear, and the probe fall paid off (WREN and Ines explain that the probe crossed the horizon in about 58 s of its own time while its picture lingers, reddening and fading). What hurts most is graphical: a corridor outside the quarters that opens straight onto empty space, and recurring hard seams in the black-hole ray trace (dream and bridge window). After that, the console's unexplained units (M, r_s) and an optional map objective that completes itself are the biggest sources of new-player confusion. |
| s02 | Graphics hunt. Walk every room of the ship (bridge, corridor, quarters, lab) and look in every direction, including up at the ceiling, down at the floor and out of every window. Screenshot and describe anything that looks wrong: flicker, gaps or seams between walls, surfaces fighting each other, black or garbled windows, the sky in a window not lining up as you turn, stretched or blurry textures, text or UI overlapping. | achieved | 3 | 17.3 | 0 | 0 | 9 | The ship holds together well: rooms read clearly, the porthole and bridge windows track the black hole believably as you turn, and nothing flickered. The clearest defect is a paneled wall floating outside the aft corridor window. After that come the handrail and floor strip running across the lab doorway, and a set of polish problems: z-fighting on the door light strips, a clipped bridge readout, the archive prompt covering its own list, and heavy lighting banding. |
| s03 | The rescue: Ines's capsule loses power. Save her with the recall beam from the comms console. Note whether you understood why waiting fails, and whether anything on screen looked broken. | achieved | 4 | 10.7 | 1 | 0 | 6 | The rescue is a strong scene: Ines begging you not to fire, the capsule view still looking 'almost normal', and WREN's debrief ('12 seconds before the last possible moment... 7.8 rs out, looking almost normal') make the light-delay lesson land. The weak spots are that after she says she is climbing, the panel keeps showing her falling deeper, which confused me, and that the panel's labels (a 'PROBE CLOCK' on the capsule panel, unexplained M units) are hard to read. Nothing in the ray-traced views looked broken beyond the expected blur. |
| s04 | The descent and Orpheus: take the ship down at the helm, come back up, then launch Orpheus and watch its feed to the end. Note whether you understood what you saw, and screenshot any visual problems, especially in the window and on the screens. | achieved | 4 | 21 | 5 | 0 | 9 | The Orpheus feed is the highlight: frames arrive further apart, the picture gets noisy, and it stops on 'Next frame due: never'. It teaches the frozen-star idea without a lecture, and the closing choice lands. The descent works too ('the universe aged 63 seconds more than we did'), but the helm slider is easy to overshoot, the 20 s hold has no timer and only completes when you climb, and the Launch Orpheus button was dead on my first visit. |

## Answers

Each agent's own words, verbatim from its report; a missing answer is listed under problems.

### Q1. In your own words, what was the game teaching?

- **s01:** That time and light behave strangely near a black hole. A probe dropped toward the hole keeps its own clock ticking normally and crosses the horizon in under a minute of its own time. Seen from the ship, its signal gets redshifted (1+z climbing), its pings arrive further and further apart, and its picture slows, reddens and fades at the edge of the shadow long after the probe itself is gone, because what you see is 'old light'.
- **s02:** From the short stretch I played (only the bridge checkpoint, no objective done): how a black hole looks up close. The black disk out of the window is the hole's shadow, about two and a half times wider than the horizon itself, and the bright ring around it is starlight from behind the hole, bent all the way around. The SHIP and RELAY clocks drifting apart (x1.054) hint at gravitational time dilation, but I did not get far enough to have it explained.
- **s03:** That what you see of something falling toward a black hole is old, delayed and redshifted light. Ines looked like she was still 7-8 rs out and 'almost normal' on my screen, but the recall beam also travels at light speed and must catch her before the horizon. So you have to act on where she really is, not on how she looks. Waiting until she looks in danger fails, because by then it is already too late.
- **s04:** Gravitational time dilation and the event horizon. Going lower makes your clock run slow compared with the far-away relay: x2 below about 1.33 rs, and the universe aged 63 s more than us during the dip. You do not feel the field because it pushes everything equally (equivalence principle). Very low, the black hole's shadow fills most of the sky. A falling probe's signals arrive further and further apart and fainter until the last frame never gets followed: from outside it looks frozen at the edge even though it fell in.

### Q2. Which moment was the most confusing, and why?

- **s01:** The probe console right after launch. It fills with numbers in 'M' and 'r_s' ('2.1 M', '1.22 s for this hole', 'proper time tau') and nothing explains those units, so I could not tell which number mattered. A close second was walking out of the quarters into what looked like open space, and the optional map objective vanishing before I could do it.
- **s02:** Leveling the view. Mouse look skipped its first input after capture and then moved by very different amounts for the same motion, and arrow turns were slow at about 10 fps, so it was hard to look at things deliberately. Also the dark rectangle above the bunk in the quarters: I could not tell if it was a screen, a picture or a missing texture.
- **s03:** Right after the rescue. Ines's 'Engine's lit, I'm climbing, coming home' arrived, but the capsule view kept showing her falling closer to the horizon and getting redder, still captioned 'Falling. It looks almost normal from here', and then another line arrived that sounded like it came from before the rescue ('so bright I can barely read the instruments'). I was not sure whether the rescue had worked until WREN's debrief. The clock readouts in M (ship clock vs 'probe clock you see') were also unclear.
- **s04:** The probe console right after the descent. 'Launch Orpheus' did nothing for four clicks while WREN said Orpheus was loaded, and there was no objective on screen. Second most confusing: 'Hold for 20 seconds' had no timer, and Ines told me to take us back up while the objective still said hold. Also the rear-camera image at 1.16 rs: the caption says all stars are squeezed into a patch, but it looks like a big ring with a dark centre.

### Q3. Did anything look broken on screen? Describe each problem, where you were and which way you were facing.

- **s01:** Yes. (1) In the corridor just outside the quarters door (x=-0.66, z=4.05, facing yaw 87, straight across from the door), the wall, floor and ceiling were missing and I saw open starfield with a wall panel floating in it. (2) In the dream, the black-hole render had bright vertical slivers at the shadow edges, and near the end the lensed inner ring stopped with hard square cuts at both ends. (3) The same slivers showed through the bridge front window, seen from the probe console facing forward (yaw -6). (4) The quarters porthole at wake-up (facing yaw -6) was almost black with a hard grey strip down its left inner edge. (5) On the bridge, the 'Click to look around' pill printed on top of the K-1 probe label. (6) A small panel with three yellow lights floated in the port bridge window. Separately, a black bar appeared at the top of the screen when the mouse was captured, which looked like the browser's pointer-lock banner rather than the game.
- **s02:** Yes. (1) Aft corridor near the quarters door, facing the side windows (yaw ~86): a paneled interior wall floats out in space, visible through the window. (2) Corridor, facing the lab door or looking aft from the bridge door: the handrail and yellow floor strip run straight across the lab doorway. (3) Bridge spawn facing the rear door: the yellow strip over the door is stair-stepped with black dashes (z-fighting); the same on other doors. (4) Bridge facing forward at the helm: the overhead readout is clipped after '10.0'. (5) Lab facing the archive: the 'E Open the archive' prompt covers a list entry, and the list skips number 6. (6) Corridor and lab walls and ceilings: strong concentric banding around the lights, and once the lab window sky was posterized. (7) Bridge and quarters looking up: light fixtures have jagged, stair-stepped black outlines. (8) Quarters facing the bunk wall: a blank dark panel with a stray yellow fleck. I saw no flicker, and the sky lined up with the window frames as I turned.
- **s03:** Nothing in the black-hole rendering looked broken beyond the expected blur: no flicker, holes or garbled colours through the bridge windows, facing forward (yaw 0) or toward comms (yaw about -31). Small issues: walking up to the comms console (about 1.6 m away, facing it), the floating 'Capsule · Ines' tag overlapped the 'Comms 2 m' waypoint. At the comms panel, the capsule's clock is labelled 'PROBE CLOCK YOU SEE'. A Chrome for Testing infobar covered the top 57 px of the window all session, which is a harness issue.
- **s04:** Nothing badly broken. The ray-traced windows were blurry, as expected. They went fully black at 1.16 rs (bridge, facing the forward window), which the dialogue explains. (1) At the helm console the 3D view behind the panel is a close-up of the helm desk, so you cannot see the window during the descent. (2) At the feed console (starboard, facing the screens) the in-world screens are cut off by the panel and drawn at a skewed angle. (3) The final choice box straddles the 3D view and the panel, covering the feed caption. (4) The in-world PROBE screen still says 'ORPHEUS ready' after launch. A 'Chrome for Testing' banner covers the top ~55 px of every screenshot; it looks like a harness artifact, not the game.

## Findings

### 1. [major] 'Launch Orpheus' button on the probe console does nothing on first visit

- **Category:** bug; **reported by** 1 agent(s): s04
- **Detail:** After the helm chapter ended (card 'IV . Orpheus' at tick 5599) I opened the probe console. The panel showed 'Launch Orpheus' but no objective was on screen. Four clicks and a mouse-hold over ~45 s real time did nothing: no launch, no message, no disabled look. WREN even said 'Orpheus is loaded at the probe console' while I was clicking. After Step back and pressing E again, objective 4 appeared and the first click launched. Expected: the button works, or looks disabled and says why.
- **Repro:** pt start ... --checkpoint rescue-done; complete the helm descent and return; walk to the probe console during the chapter-IV card/dialogue, pt key e, pt click 1000 283 (repeat); then click Step back, pt key e, pt click 1000 283
- **Screenshots:** [launch-dead.png](s04/shots/launch-dead.png)

### 2. [major] Corridor outside the quarters door opens onto empty space: no wall, floor or ceiling

- **Category:** bug; **reported by** 1 agent(s): s01
- **Detail:** After leaving the quarters and walking straight on (x=-0.66, z=4.05, yaw 87, room=corridor) the whole view ahead is open starfield and galaxy band, with no wall, floor, ceiling or window frame. A lone wall panel floats on the right and a dark pillar sits on the left. Turning right shows the real corridor, and from that angle the area on the left is a big black opening with the panel hanging in space. I expected a corridor wall, or at least a framed window.
- **Repro:** pt start ...; pt key Return; skip or watch the dream; pt await WORLD; turn left to the quarters door (Door 3 m marker); pt walkto door; pt hold w 6; pt shot
- **Screenshots:** [corridor_hole.png](s01/shots/corridor_hole.png)

### 3. [minor] 'Hold for 20 seconds' never completes on its own and has no countdown; Ines then says to go back up while the objective still says hold

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** Objective 2 started at tick 2452. The 20 game seconds had passed by about tick 3650, but the objective only completed at tick 4733, when I clicked 'Return to 10 rs'. Meanwhile Ines said 'Okay. That's enough. Take us back up.' (tick 4511) while the box still read 'Hold for 20 seconds'. There is no timer or progress anywhere. At ~6-8 ticks/s this was more than 3 real minutes with no sign of progress. Expected: a visible countdown, and the objective switching to 'Return to 10 rs' when the hold is done.
- **Repro:** pt start ... --checkpoint rescue-done; walk to helm, pt key e; drag the hold slider below 1.33 rs; wait; watch the objective box and subtitles
- **Screenshots:** [hold-objective-stuck.png](s04/shots/hold-objective-stuck.png)

### 4. [minor] Black-hole ray trace in the dream: inner lensed ring ends in hard cuts, bright slivers at the shadow edges

- **Category:** bug; **reported by** 1 agent(s): s01
- **Detail:** All through the dream, thin bright vertical slivers and notches sit on the left and right edges of the shadow where the disk crosses it. Near the end of the dream the lensed ring under the shadow stops abruptly with square-cut ends (about x=425 and x=855, y=355) instead of closing or fading, and the left edge of the shadow is a jagged stair-step. Plain low resolution would blur this, not cut it, so it looks like a march cutoff or seam.
- **Repro:** pt start ...; pt key Return; pt await DREAM; pt wait 20..60; pt shot
- **Screenshots:** [dream_ring_cut.png](s01/shots/dream_ring_cut.png)

### 5. [minor] Comms capsule panel labels Ines's clock 'PROBE CLOCK YOU SEE'

- **Category:** text; **reported by** 1 agent(s): s03
- **Detail:** The panel is headed 'CAPSULE · WHAT YOU SEE', but the clock readout is labelled 'PROBE CLOCK YOU SEE'. The label looks copied from the probe panel. The big number (e.g. 47.7 M) with 'ship clock' and '28.2 s for this hole' is also not explained, so a newcomer cannot tell what M means or which clock is which.
- **Repro:** pt start --checkpoint probe-done; walk to comms console; E; pt shot
- **Screenshots:** [probe-label.png](s03/shots/probe-label.png)

### 6. [minor] Comms capsule view keeps showing Ines falling after her 'I'm climbing' message arrives

- **Category:** bug; **reported by** 1 agent(s): s03
- **Detail:** After firing the beam (~tick 3200) Ines's reply 'Engine's lit! ... I'm climbing. I'm coming home!' arrived at tick 3406 and the objective completed. But for the next 500+ ticks the comms panel's CAPSULE view kept showing her falling deeper (appears at 7.7 -> 6.2 rs, redshift 1.22 -> 1.36, brightness 45% -> 29%, caption still 'Falling. It looks almost normal from here.'), and another line that sounds like it was sent before the rescue arrived afterwards ('Everything overhead is so bright I can barely read the instruments.'). Radio and image both travel at light speed, so once I had heard she was climbing I expected the picture to show her climbing too. The mixed signals made me doubt the rescue had worked until WREN's debrief.
- **Repro:** pt start --checkpoint probe-done; walk to comms, E; wait until ~tick 3000; click 'Fire recall beam' (992,179); pt wait 30; read panel
- **Screenshots:** [after-rescue.png](s03/shots/after-rescue.png)

### 7. [minor] Corridor handrail and floor edge strip run straight across the lab doorway

- **Category:** bug; **reported by** 1 agent(s): s02
- **Detail:** Looking aft down the corridor from the bridge door, and again facing the lab door from the corridor (k_yaw86.png), the waist-height handrail on the lab side runs unbroken across the open lab doorway, and so does the yellow floor edge strip. The doorway looks barred, and you walk through the rail. Expected: the rail and strip stop at the door frame.
- **Repro:** pt start ... --checkpoint bridge; walk through the bridge door into the corridor (x0.4 z-2.6) and face aft (yaw ~190); or stand at x0.2 z-1.2 and face the lab door
- **Screenshots:** [f04_rail_across_door.png](s02/shots/f04_rail_across_door.png)

### 8. [minor] Corridor window shows a paneled interior wall floating out in space

- **Category:** bug; **reported by** 1 agent(s): s02
- **Detail:** At the aft end of the corridor near the quarters door, facing the side wall (yaw ~86, state yawDeg -634), the right-hand corridor window shows a blue-grey wall section with interior panel seams and bolts hanging at an angle beyond the glass, covering about half the starfield. Stepping closer confirms it is outside the ship, with stars above and below it. Expected: only stars and the black-hole sky. It looks like a neighbouring room's wall (lab/engineering) sticking out through the hull, or the window being drawn without the room behind it culled.
- **Repro:** pt start --profile /root/frozen-star/tools/playtest/frozen-star.json --game-dir /root/frozen-star --checkpoint bridge; open bridge door, walk aft to the quarters door (x~-0.2 z~4.5); turn to face the corridor side wall with the windows (yaw ~86); look slightly up
- **Screenshots:** [f06b_wall_in_window_close.png](s02/shots/f06b_wall_in_window_close.png)

### 9. [minor] Esc does not leave the helm console once the slider has focus

- **Category:** bug; **reported by** 1 agent(s): s04
- **Detail:** The panel says 'Esc or Q to step back'. After I dragged the slider, pressing Esc only put a focus ring on the slider and the panel stayed open. I had to click the Step back button.
- **Repro:** At helm: pt drag 985 166 900 166 1.5 1; later pt key Escape
- **Screenshots:** [esc-eaten.png](s04/shots/esc-eaten.png)

### 10. [minor] Game ran at ~4-10 ticks/s with inputs landing seconds late during a timed rescue

- **Category:** perf; **reported by** 1 agent(s): s03
- **Detail:** fps was 10 and game time ran at about 4-10 ticks per real second. Key holds and scrolls landed several seconds late, or in bursts (pt face overshot or did nothing, a scroll landed after my next click, so my first 'Fire recall beam' click hit the wrong place). The machine was shared with other sessions, so this is partly environmental, but in a timed rescue, input lag on a slow machine could cost a player the rescue.
- **Repro:** pt start --checkpoint probe-done; pt face 25; pt state (yaw unchanged); pt hold Right 2 and compare yaw
- **Screenshots:** [s3.png](s03/shots/s3.png)

### 11. [minor] Helm slider is very nonlinear and goes far past the 2x target with no guidance

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** On opening, the target reads 9.997 rs while ALTITUDE NOW reads 10.000 rs, with the thumb pinned at the right end. A short drag left (about a third of the track) set the target to 1.164 rs, deep below the 1.33 rs goal, and the ship dropped there (stretch 1.85 g, relay x2.66). Nothing on the slider marks where x2 is, so it is easy to overshoot. The 3D view behind the helm panel is a close-up of the desk, so the window is hidden during the whole descent.
- **Repro:** At helm: pt drag 985 166 900 166 1.5 1
- **Screenshots:** [helm-panel-slider.png](s04/shots/helm-panel-slider.png)

### 12. [minor] No hint of how much time is left before the beam can no longer reach her

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** I understood the lesson only from WREN's debrief: 'You fired 12 seconds before the last possible moment. At that moment your screen showed her 7.8 rs out, looking almost normal.' Before firing, the only clue was WREN's 'The recall beam travels at light speed. It must reach her before she crosses the horizon.' While waiting, everything on screen (7.7 rs, 'looks almost normal') suggested there was plenty of time. That is the point of the scene, but a first-time player gets no warning that the safe window is shorter than it looks, and the payoff lands only for players who fire in time. I could not check the fail branch within my time budget.
- **Repro:** pt start --checkpoint probe-done; go to comms; watch the panel while waiting
- **Screenshots:** [s11.png](s03/shots/s11.png)

### 13. [minor] No objective shown after returning to 10 rs; walking into consoles is fiddly

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** After the return, the objective box vanished until I reopened the probe console. Also, getting to the helm took about 3 real minutes. pt walkto console went to the nearest console (map). Holding W near the probe/helm desks moved me only ~0.25 m/s, as if I was sliding along their edges.
- **Repro:** pt start ... --checkpoint rescue-done; pt walkto console; then try to reach helm with pt face/pt hold w
- **Screenshots:** [stuck.png](s04/shots/stuck.png)

### 14. [minor] Optional 'study the spacetime map' objective completes by itself in about 10 s; a stale Map waypoint stays

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** Objective 4 'Optional: study the spacetime map (port wall)' started at tick 12783 and was marked completed at tick 13389 although I stood still and never touched the map console. The objective box disappeared, but a 'Map 4 m' waypoint kept pointing left. I expected the optional objective to wait until I used the map, or to say it had been skipped.
- **Repro:** drop K-1; stay at the probe console until 'Watch the probe fall' completes; do nothing for 10 s; pt events 30
- **Screenshots:** [optional_autocomplete.png](s01/shots/optional_autocomplete.png)

### 15. [minor] Probe console leads with 'M', 'r_s' and 's for this hole' and never explains them

- **Category:** text; **reported by** 1 agent(s): s01
- **Detail:** After launch the panel's biggest numbers are '2.1 M', '1.22 s for this hole', 'APPEARS AT 10.00 r_s' and 'proper time tau'. As a new player I could not tell what M or r_s measure. WREN's line 'every ten M of its own time, about six seconds' is the only hint, and it is gone in seconds. Also the top-right menu button sits on top of the panel's scrollbar.
- **Repro:** pt walkto the probe console; e; click Launch Beacon K-1; pt shot
- **Screenshots:** [units_M.png](s01/shots/units_M.png)

### 16. [minor] Quarters porthole shows an almost black view with a hard grey strip, and E does nothing

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** At wake-up the porthole straight ahead (2.7 m) shows mostly black, a dim brown arc and a hard-edged pale grey vertical strip down the inside left of the frame. Ines then promises a 'ridiculous view'. Pressing E while looking at it did nothing and showed no prompt, even though the controls help says E uses the porthole.
- **Repro:** pt await WORLD; pt key e (facing the porthole at start); pt shot
- **Screenshots:** [porthole_bar.png](s01/shots/porthole_bar.png)

### 17. [minor] Rear-camera image at 1.16 rs does not obviously match its caption

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** The helm panel shows 'REAR CAMERA . looking away from Erebus' with the caption 'every star in the sky is squeezed into this patch', but the picture is a big lensed ring with a dark middle that looks like a black-hole shadow, not a small bright patch of sky. WREN's line ('the shadow covers more than half the sky...') helped, but I could not tell what I was looking at from the image alone.
- **Repro:** At helm, descend below ~1.2 rs; look at the panel
- **Screenshots:** [rear-camera.png](s04/shots/rear-camera.png)

### 18. [minor] Same shadow-edge seam is visible through the bridge front window

- **Category:** bug; **reported by** 1 agent(s): s01
- **Detail:** Standing at the probe console facing the front window (yaw -6): a bright vertical sliver at the right inner edge of the shadow (x~735, y~380-420) and a hooked bright fragment at the lower left (x~450, y~450), the same artifact as in the dream. It stays still frame to frame.
- **Repro:** reach the bridge; walk to the probe console; turn to face the front window; pt shot
- **Screenshots:** [bridge_window_seam.png](s01/shots/bridge_window_seam.png)

### 19. [minor] Very low frame and tick rate; walking and turning are sluggish and turning is unpredictable

- **Category:** perf; **reported by** 1 agent(s): s01
- **Detail:** fps reported 10 and the game ran at about 10-12 ticks per real second (machine load average about 31, so partly the environment). The dream showed solid black for about 20 real seconds before the first frame. A 1 s turn key-hold turned anywhere from 10 to 90 degrees, which made aiming at consoles fiddly.
- **Repro:** pt status; pt hold Right 1 several times and compare yawDeg
- **Screenshots:** [dream2.png](s01/shots/dream2.png)

### 20. [polish] 'Click to look around' pill overlaps the K-1 probe label in the window

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** After Esc from the console, mouse capture is released and the 'Click to look around' pill reappears at screen centre, exactly over the K-1 world label (1+z / clock / third status line). The two texts print on top of each other.
- **Repro:** at the probe console launch K-1; Esc; face the front window; pt shot
- **Screenshots:** [label_overlap.png](s01/shots/label_overlap.png)

### 21. [polish] Bridge overhead status readout clipped at its right end ('10.0' unit cut off)

- **Category:** text; **reported by** 1 agent(s): s02
- **Detail:** The SHIP / RELAY / x1.054 / 10.0 readout above the bridge's front window is cut off at the right edge of its panel, so the last value has no visible unit (presumably Rs). Light wall slivers show through along the top edge of the readout panel.
- **Repro:** pt start ... --checkpoint bridge; walk forward toward the helm (x-0.2 z-8.7), face forward (yaw 0)
- **Screenshots:** [f03_readout_cut.png](s02/shots/f03_readout_cut.png)

### 22. [polish] Ceiling light fixtures have thick jagged stair-stepped black outlines

- **Category:** bug; **reported by** 1 agent(s): s02
- **Detail:** Looking straight up on the bridge (spawn x0 z-7), and in the quarters, the white light panels sit in thick black borders whose edges step in blocks instead of forming a clean rectangle, and one fixture is half-hidden behind the black ceiling beam. Silhouettes against the black ceiling trim and window frames also stair-step heavily (no anti-aliasing).
- **Repro:** pt start ... --checkpoint bridge; click to capture mouse; pt look 0 -600 to look up
- **Screenshots:** [f01_ceiling_light.png](s02/shots/f01_ceiling_light.png)

### 23. [polish] Chrome for Testing infobar covers top 57 px of the game window

- **Category:** bug; **reported by** 1 agent(s): s03
- **Detail:** A 'Chrome for Testing ... only for automated testing' bar covers the top of the window for the whole session. This is likely a launcher/harness problem, not the game.
- **Repro:** pt start ...; pt shot
- **Screenshots:** [banner.png](s03/shots/banner.png)

### 24. [polish] Final choice box overlaps the feed panel; ~17 s of silence after 'Next frame due: never'

- **Category:** ux; **reported by** 1 agent(s): s04
- **Detail:** Frame 65 (from 1.211 rs) arrived and the status changed to 'never' at about tick 11100. Ines's question and the objective completion only came at tick 12149, which felt like dead air. The 'What do you tell Ines?' box then sits across the 3D view and the panel divider, covering the feed caption and the frame counter.
- **Repro:** Watch the Orpheus feed to the end
- **Screenshots:** [choice-overlap.png](s04/shots/choice-overlap.png)

### 25. [polish] Game ran at ~6-8 ticks/s for most of the session, which makes timed story beats very long

- **Category:** perf; **reported by** 1 agent(s): s04
- **Detail:** fps 10, ticks rose ~36-50 per 5 s for most of the run (it sped up to ~20+/s near the end). Because the story waits on game time, the 20 s hold and the Orpheus fall took several real minutes each.
- **Repro:** pt status / pt state during the helm hold
- **Screenshots:** [hold-no-timer.png](s04/shots/hold-no-timer.png)

### 26. [polish] Mouse look ignores the first motion after capture and has inconsistent sensitivity

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** After clicking the game to capture the mouse, the first pt look 0 -300 did nothing, and a black bar appeared briefly at the top of the window (probably the pointer-lock banner). Later the same pixel deltas gave very different pitch changes (sometimes about 10 degrees, sometimes most of the range), which made it hard to level the view. Arrow-key turning at about 10 fps also turned far less than the documented 103 degrees a second (0.6 s of Right gave about 10 degrees).
- **Repro:** pt start ... --checkpoint bridge; pt click 640 400; pt look 0 -300 (no effect); pt look 0 -300 (works); pt hold Right 0.6
- **Screenshots:** [a02_up.png](s02/shots/a02_up.png)

### 27. [polish] No objective on screen for about 13 game seconds after reaching the bridge

- **Category:** ux; **reported by** 1 agent(s): s01
- **Detail:** 'Go to the bridge' completes at tick 4410 and the chapter card plays, but the next objective only appears at tick 5200. In between the HUD is empty and I did not know whether to wait or explore. WREN's 'drop beacon probe K-1' line helped.
- **Repro:** walk to the bridge; pt shot every few seconds; pt events
- **Screenshots:** [bridge4.png](s01/shots/bridge4.png)

### 28. [polish] Quarters: blank dark rectangle above the bunk with a stray yellow fleck

- **Category:** bug; **reported by** 1 agent(s): s02
- **Detail:** On the wall above the bunk there is a large flat dark-brown rectangle with slightly ragged edges, no frame and no content, and one small yellow chip near its left edge. It reads as a missing texture or an unlit screen; I could not tell what it is meant to be.
- **Repro:** pt start ... --checkpoint bridge; corridor -> quarters door, E; from the desk (x3.3 z3.3) turn to face the bunk wall
- **Screenshots:** [h08_back.png](s02/shots/h08_back.png)

### 29. [polish] Small dark panel with three yellow lights floats in the port bridge window

- **Category:** bug; **reported by** 1 agent(s): s01
- **Detail:** In the left (port) bridge window, next to the probe console, a small dark rectangle with three yellow squares hangs inside the window area with nothing holding it, apparently in space or on the glass.
- **Repro:** on the bridge, walk to the probe console and face it; look at the left window
- **Screenshots:** [probe4.png](s01/shots/probe4.png)

### 30. [polish] Strong concentric banding in the lighting on corridor and lab walls and ceilings

- **Category:** bug; **reported by** 1 agent(s): s02
- **Detail:** Around each ceiling light the falloff on the pale walls and ceilings is drawn as visible rings of flat grey steps, not a smooth gradient. It is very noticeable in the corridor and the lab, especially looking up (l_up.png). Once, the sky in the lab window behind the archive was also posterized into flat brown/black blotches (l_yaw97.png), though a later shot from nearly the same spot looked smooth. This may be partly the software renderer, but it is beyond plain blur.
- **Repro:** pt start ... --checkpoint bridge; stand in the corridor at x0.2 z-1.2 facing aft, or in the lab at x-3.5 z-0.7 and look up at the light
- **Screenshots:** [k_yaw159.png](s02/shots/k_yaw159.png)

### 31. [polish] Unexplained jargon on the Orpheus marker and feed ('1+z', 'tau ... M')

- **Category:** text; **reported by** 1 agent(s): s04
- **Detail:** The world marker reads 'Orpheus 1+z 1.01 . its clock 2.7 M' and the feed caption reads 'sent at tau 72.00 M'. A player is never told what 1+z or M mean. Also the in-world PROBE screen still says 'ORPHEUS ready' after launch.
- **Repro:** Launch Orpheus, step back, look out of the forward window; open the feed
- **Screenshots:** [probe-screen-stale.png](s04/shots/probe-screen-stale.png)

### 32. [polish] World labels overlap: 'Capsule · Ines' tag sits on top of the 'Comms 2 m' marker

- **Category:** ux; **reported by** 1 agent(s): s03
- **Detail:** Walking up to the comms console, the floating tag 'Capsule · Ines / 1+z 1.13 · its clock 40.8 M' overlapped the orange 'Comms 2 m' waypoint, making both hard to read. Facing the comms console from about 1.6 m, bearing -16.
- **Repro:** pt start --checkpoint probe-done; walk toward comms console; pt shot
- **Screenshots:** [s5.png](s03/shots/s5.png)

### 33. [polish] World-space 'E Open the archive' prompt covers the archive list text

- **Category:** ux; **reported by** 1 agent(s): s02
- **Detail:** In the lab, facing the archive console (yaw ~97), the use prompt sits right on the archive screen and hides entry 2 ('Last Words'). From another angle it hid entry 1 instead. The list also skips from '5 Hover' to '7 Evaporation', with no 6 shown; I could not tell whether that is deliberate (a locked entry).
- **Repro:** pt start ... --checkpoint bridge; corridor -> lab door, E; walk to the archive console (x-3.7 z-0.7) and face it
- **Screenshots:** [f08_archive_prompt_overlap.png](s02/shots/f08_archive_prompt_overlap.png)

### 34. [polish] Yellow light strips above doors are stair-stepped with black dashes (z-fighting)

- **Category:** bug; **reported by** 1 agent(s): s02
- **Detail:** The yellow strip above the bridge's rear door, seen from x0 z-7 facing yaw ~187, breaks into stepped segments with black dashes along its lower edge, like two coplanar surfaces fighting. There are small slivers and steps where the wall panels meet the door frame. The same jagged strip shows on the quarters and lab doors.
- **Repro:** pt start ... --checkpoint bridge; turn to face the rear (bridge) door from spawn, level view
- **Screenshots:** [f02b_door_strip.png](s02/shots/f02b_door_strip.png)

## Objective timings

Game seconds from the start of the world to each objective (event tick / the game's ticks per second, from events.jsonl). Game time, not wall time: with many sessions on one machine a world can run slower than real time, and wall-clock timings would mostly measure the machine.

| # | Objective | s01 | s02 | s03 | s04 | min | median | max |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Go to the bridge | 73.5 | - | - | - | 73.5 | 73.5 | 73.5 |
| 1 | Save Ines: fire the recall beam from the comms console. Wait as long as you dare. | - | - | 56.8 | - | 56.8 | 56.8 | 56.8 |
| 1 | Take the Tern down until the relay clock runs twice as fast (helm) | - | - | - | 40.9 | 40.9 | 40.9 | 40.9 |
| 2 | Drop the beacon probe (probe console, left) | 108.2 | - | - | - | 108.2 | 108.2 | 108.2 |
| 2 | Hold for 20 seconds | - | - | - | 78.9 | 78.9 | 78.9 | 78.9 |
| 3 | Return to 10 rₛ (helm) | - | - | - | 93.3 | 93.3 | 93.3 | 93.3 |
| 3 | Watch the probe fall | 213.1 | - | - | - | 213.1 | 213.1 | 213.1 |
| 4 | Launch Orpheus (probe console), then watch its feed (starboard screen) | - | - | - | 107.2 | 107.2 | 107.2 | 107.2 |
| 4 | Optional: study the spacetime map (port wall) | 223.2 | - | - | - | 223.2 | 223.2 | 223.2 |
| 5 | Watch the Orpheus feed (starboard screen) | - | - | - | 202.6 | 202.6 | 202.6 | 202.6 |

