// The capsule bay: Ines's capsule on its cradle, Ines herself, the launch door, and the bay's status panel.
// buildBay() adds the moving parts to the ship; attach(g) keeps them in step with the story, so the player can
// see where Ines is: in the bay doing pre-flight, out in the capsule, or docked again.
//
// Everything here is static geometry with baked canvas textures. Nothing is a light, and the per-frame work is
// a few transforms while the capsule is flying; the panel's canvas is redrawn only when the bay's state changes.
import * as THREE from 'three';

const MONO = '"IBM Plex Mono", ui-monospace, monospace', SANS = '"Bricolage Grotesque", system-ui, sans-serif';
export const BAY_COLOR = '#b49cff';

// where the capsule sits on its cradle (ship coordinates, metres): nose forward (−Z), the launch door to port (−X)
const DOCK = new THREE.Vector3(-3.2, 0.95, 4.85);
// where it holds station after launch: off the port bow, low in the left of the bridge window
const HOLD = new THREE.Vector3(-6.2, -0.4, -24);
const OUT_X = -7.6; // clear of the hull, before it turns forward

function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const clamp01 = (k) => Math.max(0, Math.min(1, k));

function hullTexture() {
  return tex(256, 256, (g, w, h) => {
    g.fillStyle = '#e9e7e1'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(60,64,80,0.05)'; for (let i = 0; i < 90; i++) g.fillRect((i * 97) % w, (i * 61) % h, 6 + (i % 5) * 4, 4 + (i % 3) * 5);
    g.strokeStyle = '#b9bcc6'; g.lineWidth = 3;
    for (const x of [0, w / 2]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (const y of [0, h / 3, (2 * h) / 3]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
}
/** The capsule's name on its flank: an amber flash, the call sign and the pilot. */
function flankTexture() {
  return tex(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#ffb45c'; g.fillRect(8, 20, 14, h - 40); g.fillRect(30, 20, 6, h - 40);
    g.fillStyle = '#23273a'; g.font = `700 58px ${MONO}`; g.textBaseline = 'middle'; g.fillText('C-1', 52, 50);
    g.font = `600 30px ${SANS}`; g.fillText('TERN · OKAFOR', 54, 100);
  });
}
function bayDoorTexture() {
  return tex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a3f52'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffb45c'; for (let x = -h; x < w + h; x += 40) { g.beginPath(); g.moveTo(x, 18); g.lineTo(x + 20, 18); g.lineTo(x + 38, 0); g.lineTo(x + 18, 0); g.closePath(); g.fill(); }
    g.fillStyle = '#2a2e3c'; g.fillRect(0, 18, w, 4);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 3; for (const x of [w / 3, (2 * w) / 3]) { g.beginPath(); g.moveTo(x, 22); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = 'rgba(236,240,246,0.55)'; g.font = `700 22px ${MONO}`; g.textAlign = 'center'; g.fillText('LAUNCH DOOR', w / 2, h / 2 + 8);
  });
}

const STATES = {
  preflight: { word: 'PRE-FLIGHT', who: 'INES OKAFOR · PRE-FLIGHT', note: 'capsule C-1 on the cradle · bay pressurised', color: '#ffb45c', light: 0xffb45c, where: 'capsule bay' },
  out: { word: 'CAPSULE OUT', who: 'INES OKAFOR · IN FLIGHT', note: 'cradle empty · launch door cycled', color: '#ff6b5c', light: 0xff6b5c, where: 'capsule' },
  docked: { word: 'DOCKED', who: 'INES OKAFOR · IN THE BAY', note: 'capsule C-1 secured · tanks topping up', color: '#7fd6a8', light: 0x7fd6a8, where: 'capsule bay' },
};

function drawPanel(g, w, h, st) {
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0a0e1c'); bg.addColorStop(1, '#05070f');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = BAY_COLOR; g.fillRect(0, 0, w, 6);
  g.fillStyle = BAY_COLOR; g.font = `600 30px ${SANS}`; g.textBaseline = 'middle'; g.fillText('CAPSULE BAY', 22, 38);
  g.fillStyle = 'rgba(236,240,246,0.5)'; g.font = `500 17px ${MONO}`; g.textAlign = 'right'; g.fillText('bay status', w - 22, 40); g.textAlign = 'left';
  // a small capsule pictogram: on its cradle, or a dashed outline where it should be
  const cx = 70, cy = 128;
  g.lineWidth = 4; g.strokeStyle = st.color; g.fillStyle = st === STATES.out ? 'rgba(0,0,0,0)' : st.color + '55';
  if (st === STATES.out) g.setLineDash([8, 7]);
  g.beginPath(); g.ellipse(cx, cy, 46, 22, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.setLineDash([]);
  g.fillStyle = 'rgba(236,240,246,0.35)'; g.fillRect(cx - 34, cy + 26, 20, 8); g.fillRect(cx + 14, cy + 26, 20, 8);
  g.fillStyle = st.color; g.font = `700 50px ${MONO}`; g.fillText(st.word, 140, 118, w - 160);
  g.fillStyle = '#eef0f6'; g.font = `600 22px ${MONO}`; g.fillText(st.who, 142, 160, w - 160);
  g.fillStyle = 'rgba(236,240,246,0.55)'; g.font = `500 18px ${MONO}`; g.fillText(st.note, 22, 214, w - 44);
  g.fillStyle = 'rgba(236,240,246,0.35)'; g.font = `500 16px ${MONO}`; g.fillText('intercom open · bridge comms channel 2', 22, 248, w - 44);
}

/** The bay's moving parts. `ctx` carries the ship builder's group, materials and lists. */
export function buildBay({ group, M, interactables, blinkers }) {
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.25, map: hullTexture(), emissive: 0x4c505e }); // a self-glow keeps it readable against space, even far out
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x23273a, roughness: 0.5, metalness: 0.5 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1a2440, roughness: 0.12, metalness: 0.6, emissive: 0x2a3c66, emissiveIntensity: 0.5 });
  const amberMat = new THREE.MeshStandardMaterial({ color: 0xffb45c, emissive: 0xffa040, emissiveIntensity: 0.6 });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffb45c, emissive: 0xffb45c, emissiveIntensity: 1.5 });
  const flankMat = new THREE.MeshStandardMaterial({ map: flankTexture(), transparent: true, alphaTest: 0.3, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -1 });

  // ---- the capsule: a short lander, nose forward ----
  const capsule = new THREE.Group(); capsule.position.copy(DOCK); group.add(capsule);
  const part = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); capsule.add(m); return m; };
  const R = 0.68;
  part(new THREE.CylinderGeometry(R, R, 2.0, 24), hullMat, 0, 0, 0, Math.PI / 2);
  { const nose = part(new THREE.SphereGeometry(R, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hullMat, 0, 0, -1.0, -Math.PI / 2); nose.scale.set(1, 1.1, 1); }
  part(new THREE.CylinderGeometry(R * 0.92, R, 0.12, 24), darkMat, 0, 0, 1.04, Math.PI / 2);                 // aft heat ring
  part(new THREE.CylinderGeometry(0.28, 0.46, 0.5, 18, 1, true), darkMat, 0, 0, 1.33, Math.PI / 2);           // engine bell
  part(new THREE.CylinderGeometry(R + 0.012, R + 0.012, 0.14, 24), amberMat, 0, 0, 0.62, Math.PI / 2);        // amber band
  { const c = part(new THREE.SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), canopyMat, 0, 0.42, -0.62); c.scale.set(0.9, 0.62, 1.15); } // canopy
  for (const sx of [-1, 1]) {
    part(new THREE.BoxGeometry(0.08, 0.06, 2.5), darkMat, sx * 0.46, -0.66, 0);                               // landing skids
    for (const z of [-0.8, 0.8]) part(new THREE.BoxGeometry(0.05, 0.16, 0.05), darkMat, sx * 0.4, -0.58, z);
    part(new THREE.BoxGeometry(0.06, 0.32, 0.5), darkMat, sx * (R - 0.02), 0.05, 0.25);                        // RCS pods
    const flank = part(new THREE.PlaneGeometry(1.25, 0.31), flankMat, sx * (R + 0.015), 0.06, -0.15, 0, sx * Math.PI / 2);
    if (sx < 0) flank.scale.x = -1; // read nose-to-tail on both sides
  }
  part(new THREE.BoxGeometry(0.06, 0.6, 0.4), darkMat, 0.0, 0.56, 0.62); // dorsal fin with the status light
  const statusLight = part(new THREE.SphereGeometry(0.06, 10, 8), lightMat, 0, 0.9, 0.62);
  blinkers.push({ mat: lightMat, rate: 0.45, phase: 0.3 });
  // running lights, big enough to read from the bridge: red to port, green to starboard, a white strobe on the nose
  for (const [sx, col] of [[-1, 0xff3b30], [1, 0x34e07a]]) part(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.2 }), sx * (R + 0.06), 0.05, 0.25);
  { const strobe = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 }); part(new THREE.SphereGeometry(0.1, 10, 8), strobe, 0, 0.62, -1.0); blinkers.push({ mat: strobe, rate: 0.8, phase: 0 }); }

  // ---- the launch door in the port wall: it drops into the deck to open ----
  const doorMats = [new THREE.MeshStandardMaterial({ map: bayDoorTexture(), roughness: 0.6, metalness: 0.3 }), M.hull, M.trim, M.trim, M.trim, M.trim];
  doorMats[0].map.wrapS = THREE.RepeatWrapping; doorMats[0].map.repeat.set(2, 1);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.3, 3.8), doorMats); door.position.set(-5, 1.15, 4.9); group.add(door);

  // ---- Ines, in a flight suit, with her checklist and her helmet ----
  const crew = new THREE.Group(); group.add(crew);
  const ines = new THREE.Group(); crew.add(ines);
  const suit = new THREE.MeshStandardMaterial({ color: 0xd8692e, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x262a36, roughness: 0.7 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x8a5636, roughness: 0.6 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x17110d, roughness: 0.9 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x8fb8ff, emissive: 0x8fb8ff, emissiveIntensity: 0.9 });
  const add = (geo, mat, x, y, z, parent = ines) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  /** A limb as a capsule from a to b. */
  const limb = (r, a, b, mat) => {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const m = add(new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 4, 10), mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const sx of [-1, 1]) {
    limb(0.075, V(sx * 0.1, 0.12, 0), V(sx * 0.1, 0.86, 0), suit);
    add(new THREE.BoxGeometry(0.13, 0.11, 0.25), dark, sx * 0.1, 0.055, 0.04);                    // boots
    limb(0.055, V(sx * 0.2, 1.38, -0.01), V(sx * 0.22, 1.12, 0.06), suit);                         // upper arms
    limb(0.048, V(sx * 0.22, 1.12, 0.06), V(sx * 0.09, 1.1, 0.27), suit);                          // forearms, to the slate
    add(new THREE.SphereGeometry(0.045, 8, 6), dark, sx * 0.09, 1.1, 0.28);                         // gloves
  }
  { const t = add(new THREE.CapsuleGeometry(0.16, 0.36, 4, 12), suit, 0, 1.13, 0); t.scale.set(1.05, 1, 0.7); }
  add(new THREE.BoxGeometry(0.34, 0.05, 0.25), dark, 0, 0.88, 0);                                  // belt
  add(new THREE.BoxGeometry(0.1, 0.07, 0.02), amberMat, -0.09, 1.3, 0.11);                          // name patch
  add(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 8), skin, 0, 1.5, 0);
  { const head = add(new THREE.SphereGeometry(0.105, 16, 12), skin, 0, 1.6, 0.01); head.scale.set(0.92, 1.08, 1); }
  { const hr = add(new THREE.SphereGeometry(0.112, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 1.615, -0.012); hr.rotation.x = -0.35; hr.scale.set(0.95, 1.05, 1); }
  { const slate = add(new THREE.BoxGeometry(0.26, 0.012, 0.18), dark, 0, 1.13, 0.27); slate.rotation.x = -0.7;
    const face = add(new THREE.PlaneGeometry(0.22, 0.14), glow, 0, 1.135, 0.265); face.rotation.x = -0.7 - Math.PI / 2; face.translateZ(0.008); }
  // the helmet waits on a kit crate by the aft window
  const helmet = new THREE.Group(); crew.add(helmet); helmet.position.set(-1.62, 0.56, 6.9);
  add(new THREE.SphereGeometry(0.16, 18, 12), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.35 }), 0, 0.15, 0, helmet);
  { const v = add(new THREE.SphereGeometry(0.163, 18, 10, -0.9, 1.8, 0.75, 0.95), canopyMat, 0, 0.15, 0, helmet); v.rotation.y = Math.PI / 2; }

  const POSE = {
    preflight: { x: -2.25, z: 3.45, yaw: 1.2 },   // by the capsule's nose, facing the corridor windows over her checklist
    docked: { x: -1.85, z: 5.95, yaw: 1.85 },     // back by the aft window, unwinding
  };

  // ---- status panel, on the corridor wall between the two bay windows ----
  const pc = document.createElement('canvas'); pc.width = 512; pc.height = 288;
  const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace; ptex.anisotropy = 4;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.4275), new THREE.MeshBasicMaterial({ map: ptex, toneMapped: false }));
  panel.position.set(-0.925, 1.46, 4.9); panel.rotation.y = Math.PI / 2; group.add(panel);
  { const back = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.82), M.trim); back.position.set(-0.95, 1.46, 4.9); group.add(back); }
  // and a repeater facing into the bay, above the launch door, for anyone looking through the windows
  const pc2 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5625), new THREE.MeshBasicMaterial({ map: ptex, toneMapped: false }));
  pc2.position.set(-4.93, 1.65, 7.45); pc2.rotation.y = Math.PI / 2; group.add(pc2);
  { const back = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.62, 1.06), M.trim); back.position.set(-4.95, 1.65, 7.45); group.add(back); }

  const it = { id: 'bay', pos: new THREE.Vector3(-0.93, 1.46, 4.9), radius: 2.2, label: 'Look into the capsule bay' };
  interactables.push(it);

  // ---- state ----
  let state = null, flight = null, shown = null;
  const ctl = {
    capsule, ines, crew, door, statusLight,
    get state() { return state; },
    /** Ines takes the capsule out: board, open the launch door, slide out to port and run forward to hold station. */
    launch(t0 = 0) { if (!flight) flight = { t: t0 }; }, // t0 > 0 skips ahead (screenshots)
    /** Where the capsule holds station after launch (ship coordinates). */
    hold: HOLD,
    attach(g) {
      g.bay = ctl;
      g.hud.where = g.hud.where || {};
      const lines = {
        preflight: [['INES', 'Morning, doc. Checklist first, then coffee. The view\'s on the bridge, not in here.'], ['INES', 'Seals, fuel, transponder. She\'s a good little boat. I\'ll wave when I go past the window.']],
        out: [['WREN', 'The cradle is empty, Doctor. Ines is out in the capsule. Her channel is on the bridge comms console.']],
        docked: [['INES', 'Still here, doc. Topping up the tanks, and my nerves.'], ['INES', 'I\'m fine in here. Go on, the window\'s yours.']],
      };
      const said = { preflight: 0, out: 0, docked: 0 };
      g.on('bay', () => {
        // free roam: the intercom reaches the same chats as the comms console (its free-roam handler takes no console)
        if (state === 'docked' && g.flags.finished && g.handlers.comms && g.handlers.comms.length === 0) return g.handlers.comms();
        const l = lines[state]; const line = l[Math.min(said[state]++, l.length - 1)];
        if (line[0] === 'INES') g.audio.radio?.();
        return g.say(line[0], line[1]);
      });
      Object.defineProperty(it, 'label', { get: () => (state === 'out' ? 'Look into the capsule bay' : 'Talk to Ines (bay intercom)'), configurable: true });
      const derive = () => (g.flags.inesHome ? 'docked' : (flight || g.flags.rescueIntro || g.capsule) ? 'out' : 'preflight');
      // Ines's subtitle tag is read when she speaks, so it is right even before the first frame
      Object.defineProperty(g.hud.where, 'INES', { get: () => STATES[derive()].where, configurable: true, enumerable: true });
      const update = (dt) => {
        if (g.flags.inesHome) flight = null;
        const next = derive();
        if (next !== state) {
          state = next;
          const st = STATES[state];
          drawPanel(pc.getContext('2d'), pc.width, pc.height, st); ptex.needsUpdate = true;
          lightMat.color.setHex(st.light); lightMat.emissive.setHex(st.light);
          ines.visible = helmet.visible = state !== 'out';
          if (state !== 'out') { const p = POSE[state]; ines.position.set(p.x, 0, p.z); ines.rotation.y = p.yaw; }
          shown = null;
        }
        // the capsule: on the cradle, flying out, holding station, or gone (falling: the window marker shows her light)
        let pos = DOCK, open = 0, vis = true;
        if (state === 'out') {
          if (!flight || g.capsule) vis = false;
          else {
            flight.t += dt;
            const t = flight.t;
            open = clamp01(t / 1.4) * (1 - clamp01((t - 5.5) / 1.5));
            const a = ease((t - 1.4) / 2.6), b = ease((t - 4) / 5.5);
            const z = DOCK.z + (HOLD.z - DOCK.z) * b;
            const x = DOCK.x + (OUT_X - DOCK.x) * a + (HOLD.x - OUT_X) * ease((-11 - z) / 6.5);
            pos = tmp.set(x, DOCK.y + (HOLD.y - DOCK.y) * b + (t > 9.5 ? Math.sin((t - 9.5) * 0.9) * 0.06 : 0), z);
          }
        }
        if (vis !== shown || state === 'out') {
          capsule.visible = vis; capsule.position.copy(pos);
          door.position.y = 1.15 - open * 2.4;
          shown = vis;
        }
      };
      update(0);
      g.ticks.add(update);
      // the "Capsule · Ines" bracket on the capsule itself while it flies and holds station outside (the window
      // check hides it while the capsule is still in the bay); once she is falling, the story's marker takes over
      const at = new THREE.Vector3();
      g.addMarker?.(() => {
        if (state !== 'out' || !flight || !capsule.visible) return null;
        capsule.getWorldPosition(at).sub(g.camera.position);
        const dist = at.length();
        return { dir: at.normalize().toArray(), rgb: [1, 0.9, 0.8], flux: 0, size: 0.01, label: `Capsule · Ines<br>${Math.round(dist)} m${flight.t > 9 ? ', holding station' : ''}` };
      });
    },
  };
  const tmp = new THREE.Vector3();
  return ctl;
}
