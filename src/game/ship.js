// Research vessel Tern, built from boxes. Ship coordinates: metres, Y up, the nose at −Z.
//
//   Bridge     x −3.4…3.4, z −13…−5   big window forward, side windows, three consoles, two wall screens
//   Corridor   x −1…1,     z −5…8     windows to port, doors to the lab and your quarters
//   Quarters   x 1…5,      z 2…6.5    bunk, desk, a porthole facing the hole
//   Lab        x −5…−1,    z −3.5…1.5 the archive terminal
import * as THREE from 'three';

const T = 0.12; // wall thickness

function panelTexture(base, seam, w = 256, h = 256, rows = 2, cols = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.strokeStyle = seam; g.lineWidth = 3;
  for (let i = 0; i <= rows; i++) { g.beginPath(); g.moveTo(0, (i * h) / rows); g.lineTo(w, (i * h) / rows); g.stroke(); }
  for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo((i * w) / cols, 0); g.lineTo((i * w) / cols, h); g.stroke(); }
  // a few fasteners
  g.fillStyle = seam;
  for (const [x, y] of [[10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function labelTexture(text, { w = 512, h = 128, fg = '#ece8f4', bg = 'rgba(0,0,0,0)', font = '600 64px "Bricolage Grotesque", system-ui, sans-serif', sub } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.font = font; g.textBaseline = 'middle';
  g.fillText(text, 24, sub ? h * 0.38 : h / 2);
  if (sub) { g.font = '400 30px "IBM Plex Mono", monospace'; g.globalAlpha = 0.7; g.fillText(sub, 26, h * 0.76); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildShip() {
  const group = new THREE.Group();
  const colliders = [], windows = [], interactables = [], doors = [], rooms = [], screens = {}, lights = {}, blinkers = [];

  const M = {
    wall: new THREE.MeshStandardMaterial({ color: 0xdfe2ea, roughness: 0.75, metalness: 0.05, map: panelTexture('#e6e8ee', '#b9bdc9', 256, 256, 2, 1) }),
    wallDark: new THREE.MeshStandardMaterial({ color: 0x3a3f52, roughness: 0.6, metalness: 0.2 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x23273a, roughness: 0.5, metalness: 0.4 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x9aa0b4, roughness: 0.85, map: panelTexture('#3a3f50', '#2a2e3c', 256, 256, 1, 1) }),
    ceil: new THREE.MeshStandardMaterial({ color: 0xc9cdd8, roughness: 0.9, map: panelTexture('#d4d7df', '#aeb3c0', 256, 256, 1, 2) }),
    glass: new THREE.MeshStandardMaterial({ color: 0xbcd4ff, transparent: true, opacity: 0.06, roughness: 0.05, metalness: 0, depthWrite: false }),
    lightStrip: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf3efe6, emissiveIntensity: 0.8 }),
    rail: new THREE.MeshStandardMaterial({ color: 0x9aa1b3, roughness: 0.35, metalness: 0.8 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x5b6274, roughness: 0.5, metalness: 0.6 }),
    rug: new THREE.MeshStandardMaterial({ color: 0x6b3f3a, roughness: 1 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xffb45c, emissive: 0xffa040, emissiveIntensity: 1.2 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x45506e, roughness: 0.95 }),
    sheet: new THREE.MeshStandardMaterial({ color: 0xd8dbe4, roughness: 0.95 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b5340, roughness: 0.7 }),
    door: new THREE.MeshStandardMaterial({ color: 0xb8bdca, roughness: 0.5, metalness: 0.3, map: panelTexture('#c2c7d3', '#8d93a3', 128, 256, 3, 1) }),
    console: new THREE.MeshStandardMaterial({ color: 0x2b3044, roughness: 0.55, metalness: 0.35 }),
    hull: (() => { const t = panelTexture('#3c404c', '#2a2d36', 256, 256, 2, 2); return new THREE.MeshStandardMaterial({ color: 0x3a3e4a, roughness: 0.7, metalness: 0.5, map: t, emissive: 0x5a5f70, emissiveMap: t, emissiveIntensity: 1.5 }); })(), // lit faintly by the disk, so its panels read as hull, not a hole in the view
  };
  for (const m of Object.values(M)) m.dithering = true; // soften the banding of point-light falloff

  const box = (w, h, d, mat, x, y, z, parent = group) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m;
  };

  /** A wall along `axis` ('x' or 'z') at `at`, spanning from..to, with door/window openings in wall coordinates. */
  function wall(axis, at, from, to, height, openings = [], { exterior = false } = {}) {
    const ops = [...openings].sort((a, b) => a.a - b.a);
    const piece = (a, b, y0, y1, solid) => {
      if (b - a < 1e-3 || y1 - y0 < 1e-3) return;
      const len = b - a, mid = (a + b) / 2, h = y1 - y0, y = (y0 + y1) / 2;
      const mat = exterior ? M.wall : M.wall;
      const m = axis === 'x' ? box(len, h, T, mat, mid, y, at) : box(T, h, len, mat, at, y, mid);
      const rep = Math.max(1, Math.round(len / 1.6));
      m.material = mat.clone(); m.material.map = mat.map.clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set(rep, Math.max(1, Math.round(h / 1.3)));
      if (solid) colliders.push(axis === 'x' ? [a, at - T / 2, b, at + T / 2] : [at - T / 2, a, at + T / 2, b]);
    };
    let cur = from;
    for (const o of ops) {
      piece(cur, o.a, 0, height, true);
      if (o.type === 'window') {
        piece(o.a, o.b, 0, o.y0, true);
        piece(o.a, o.b, o.y1, height, false);
        const w = o.b - o.a, hh = o.y1 - o.y0, cx = (o.a + o.b) / 2, cy = (o.y0 + o.y1) / 2;
        const glass = axis === 'x' ? box(w, hh, 0.02, M.glass, cx, cy, at) : box(0.02, hh, w, M.glass, at, cy, cx);
        glass.renderOrder = 10; windows.push(glass);
        // frame
        const f = 0.07;
        for (const [fw, fh, fx, fy] of [[w + f, f, cx, o.y0], [w + f, f, cx, o.y1], [f, hh, o.a, cy], [f, hh, o.b, cy]]) {
          axis === 'x' ? box(fw, fh, T + 0.04, M.trim, fx, fy, at) : box(T + 0.04, fh, fw, M.trim, at, fy, fx);
        }
        if (o.mullions) for (let k = 1; k < o.mullions; k++) {
          const mx = o.a + (w * k) / o.mullions;
          axis === 'x' ? box(0.05, hh, T, M.trim, mx, cy, at) : box(T, hh, 0.05, M.trim, at, cy, mx);
        }
      } else if (o.type === 'door') {
        piece(o.a, o.b, 2.15, height, false);
        const w = o.b - o.a, cx = (o.a + o.b) / 2;
        const panel = axis === 'x' ? box(w, 2.15, 0.06, M.door, cx, 1.075, at) : box(0.06, 2.15, w, M.door, at, 1.075, cx);
        const trimTop = axis === 'x' ? box(w + 0.1, 0.06, T + 0.05, M.amber, cx, 2.18, at) : box(T + 0.05, 0.06, w + 0.1, M.amber, at, 2.18, cx);
        trimTop.material = M.amber;
        const coll = { box: axis === 'x' ? [o.a, at - T / 2, o.b, at + T / 2] : [at - T / 2, o.a, at + T / 2, o.b], off: false };
        colliders.push(coll);
        doors.push({ id: o.id, panel, axis, closed: cx, width: w, open: 0, coll, center: axis === 'x' ? [cx, at] : [at, cx], locked: !!o.locked, label: o.label });
      }
      cur = o.b;
    }
    piece(cur, to, 0, height, true);
  }

  function room(id, x0, z0, x1, z1, height, light = 0xf2f4ff) {
    rooms.push({ id, box: [x0, z0, x1, z1] });
    const w = x1 - x0, d = z1 - z0;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.floor.clone());
    fl.material.map = M.floor.map.clone(); fl.material.map.needsUpdate = true; fl.material.map.repeat.set(w / 1.2, d / 1.2);
    fl.rotation.x = -Math.PI / 2; fl.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); group.add(fl);
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.ceil.clone());
    ce.material.map = M.ceil.map.clone(); ce.material.map.needsUpdate = true; ce.material.map.repeat.set(w / 2, d / 2);
    ce.rotation.x = Math.PI / 2; ce.position.set((x0 + x1) / 2, height, (z0 + z1) / 2); group.add(ce);
    // ceiling light strips run along the longer side
    const along = d > w;
    const n = Math.max(1, Math.round((along ? d : w) / 3.2));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const cx = along ? (x0 + x1) / 2 : x0 + w * t, cz = along ? z0 + d * t : (z0 + z1) / 2;
      along ? box(0.22, 0.02, 1.4, M.lightStrip, cx, height - 0.035, cz) : box(1.4, 0.02, 0.22, M.lightStrip, cx, height - 0.035, cz);
      along ? box(0.34, 0.03, 1.52, M.trim, cx, height - 0.012, cz) : box(1.52, 0.03, 0.34, M.trim, cx, height - 0.012, cz);
    }
    const pl = new THREE.PointLight(light, 7, Math.max(w, d) * 1.7, 1.3); pl.position.set((x0 + x1) / 2, height - 0.4, (z0 + z1) / 2); group.add(pl); lights[id] = pl;
    // floor trim
    box(w, 0.06, 0.04, M.amber, (x0 + x1) / 2, 0.03, z0 + 0.08).material = M.trim;
  }

  // ---- Rooms ----
  room('bridge', -3.4, -13, 3.4, -5, 3.2, 0xdfe6ff);
  room('corridor', -1, -5, 1, 8, 2.5, 0xffe9cf);
  room('quarters', 1, 2, 5, 6.5, 2.5, 0xffe2c0);
  room('lab', -5, -3.5, -1, 1.5, 2.5, 0xe6f0ff);

  // ---- Walls ----
  // Bridge
  wall('x', -13, -3.4, 3.4, 3.2, [{ type: 'window', a: -3.0, b: 3.0, y0: 0.75, y1: 2.95, mullions: 3 }], { exterior: true });
  wall('z', -3.4, -13, -5, 3.2, [{ type: 'window', a: -12.5, b: -9.2, y0: 0.9, y1: 2.6, mullions: 2 }]);
  wall('z', 3.4, -13, -5, 3.2, [{ type: 'window', a: -12.5, b: -9.2, y0: 0.9, y1: 2.6, mullions: 2 }]);
  wall('x', -5, -3.4, 3.4, 3.2, [{ type: 'door', id: 'bridge', a: -0.7, b: 0.7, label: 'Bridge' }]);
  // Corridor
  wall('z', -1, -5, 8, 2.5, [{ type: 'door', id: 'lab', a: -1.6, b: -0.4, label: 'Lab' }, { type: 'window', a: 3.2, b: 4.4, y0: 0.9, y1: 1.9 }, { type: 'window', a: 5.4, b: 6.6, y0: 0.9, y1: 1.9 }]);
  wall('z', 1, -5, 8, 2.5, [{ type: 'door', id: 'quarters', a: 3.5, b: 4.7, label: 'Quarters' }]);
  wall('x', 8, -1, 1, 2.5, [{ type: 'door', id: 'engineering', a: -0.6, b: 0.6, locked: true, label: 'Engineering' }]);
  // Quarters
  wall('x', 2, 1, 5, 2.5, [{ type: 'window', a: 3.5, b: 4.85, y0: 0.8, y1: 2.1 }], { exterior: true });
  wall('x', 6.5, 1, 5, 2.5);
  wall('z', 5, 2, 6.5, 2.5);
  // Lab
  wall('x', -3.5, -5, -1, 2.5);
  wall('x', 1.5, -5, -1, 2.5);
  wall('z', -5, -3.5, 1.5, 2.5, [{ type: 'window', a: -2.6, b: 0.6, y0: 0.9, y1: 2.0, mullions: 2 }], { exterior: true });

  // ---- Signs ----
  const sign = (text, sub, x, y, z, ry, w = 0.9) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: labelTexture(text, { sub }), transparent: true }));
    m.position.set(x, y, z); m.rotation.y = ry; group.add(m); return m;
  };
  sign('BRIDGE', 'forward', 0, 2.35, -4.92, 0, 0.8);
  sign('BRIDGE ↑', null, 0.98, 1.7, 2.2, -Math.PI / 2, 0.7);
  sign('QUARTERS', 'Dr. — science', 0.93, 2.35, 4.1, -Math.PI / 2, 0.8);
  sign('LAB', 'archive', -0.93, 2.35, -1.0, Math.PI / 2, 0.6);
  sign('ENGINEERING', 'crew only', 0, 2.35, 7.92, Math.PI, 0.9);
  sign('TERN', 'research vessel', -2.3, 2.75, -5.08, Math.PI, 1.2);

  // ---- Quarters props ----
  const bunk = new THREE.Group(); group.add(bunk);
  box(3.0, 0.35, 1.05, M.trim, 3.1, 0.25, 5.9, bunk);
  colliders.push([1.6, 5.37, 4.6, 6.45]);
  box(2.9, 0.18, 0.95, M.sheet, 3.1, 0.52, 5.9, bunk);
  box(0.5, 0.12, 0.7, M.sheet, 4.25, 0.66, 5.9, bunk);
  box(1.9, 0.08, 0.98, M.fabric, 2.6, 0.64, 5.9, bunk);
  box(3.1, 1.2, 0.08, M.wallDark, 3.1, 1.4, 6.42, bunk);
  // desk
  box(0.7, 0.05, 1.4, M.wood, 4.6, 0.76, 3.3);
  colliders.push([4.25, 2.6, 5, 4.0], [1.15, 2.08, 2.05, 2.62]);
  box(0.06, 0.74, 1.3, M.trim, 4.85, 0.38, 3.3);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.22), new THREE.MeshBasicMaterial({ color: 0x8fb8ff }));
  pad.rotation.x = -Math.PI / 2; pad.rotation.z = Math.PI / 2; pad.position.set(4.55, 0.79, 3.0); group.add(pad);
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.24), new THREE.MeshStandardMaterial({ map: photoTexture(), roughness: 0.6 }));
  photo.position.set(4.82, 0.95, 3.7); photo.rotation.y = -Math.PI / 2 + 0.25; group.add(photo);
  box(0.45, 0.5, 0.45, M.fabric, 4.05, 0.25, 3.3);
  box(0.9, 2.1, 0.55, M.door, 1.6, 1.05, 2.35); // locker
  interactables.push({ id: 'datapad', pos: new THREE.Vector3(4.55, 0.85, 3.0), radius: 1.3, label: 'Read your datapad' });
  interactables.push({ id: 'photo', pos: new THREE.Vector3(4.8, 0.95, 3.7), radius: 1.2, label: 'Look at the photo' });
  interactables.push({ id: 'porthole', pos: new THREE.Vector3(4.1, 1.45, 2.05), radius: 3.2, label: 'Look out of the porthole' });

  // ---- Bridge consoles ----
  function makeConsole(id, x, z, ry, label, { low = false } = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; group.add(g);
    const bodyH = low ? 0.62 : 0.85;
    box(1.3, bodyH, 0.7, M.console, 0, bodyH / 2, 0, g);
    const top = box(1.3, 0.06, 0.55, M.trim, 0, bodyH + 0.05, 0.05, g); top.rotation.x = -0.35;
    box(1.32, 0.03, 0.03, M.amber, 0, bodyH + 0.01, 0.36, g);
    const c = document.createElement('canvas'); c.width = 640; c.height = 384;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.69), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    const sy = low ? 0.86 : 1.32, tilt = low ? -0.95 : -0.28;
    scr.position.set(0, sy, low ? 0.02 : -0.18); scr.rotation.x = tilt; g.add(scr);
    const bez = box(1.2, 0.74, 0.04, M.trim, 0, sy, low ? -0.01 : -0.21, g); bez.rotation.x = tilt;
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: labelTexture(label, { font: '500 54px "IBM Plex Mono", monospace', fg: '#ffc882' }), transparent: true }));
    lab.position.set(0, low ? 0.45 : 0.7, 0.36); g.add(lab);
    g.updateMatrixWorld(true);
    const screenWorld = new THREE.Vector3(); scr.getWorldPosition(screenWorld);
    const front = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion);
    const focusPos = screenWorld.clone().addScaledVector(front, low ? 0.85 : 1.05); focusPos.y = low ? 1.45 : 1.58;
    screens[id] = { canvas: c, ctx: c.getContext('2d'), tex, mesh: scr, w: c.width, h: c.height };
    colliders.push(aabbOf(g));
    interactables.push({ id, pos: screenWorld, radius: 1.9, label: `Use the ${label.toLowerCase()} console`, console: true, focus: { pos: focusPos, look: screenWorld.clone().add(new THREE.Vector3(0, 0.05, 0)) } });
    return g;
  }
  makeConsole('probe', -1.95, -11.2, 0.3, 'PROBE');
  makeConsole('helm', 0, -11.3, 0, 'HELM', { low: true });
  { const it = interactables.find((i) => i.id === 'helm'); it.radius = 2.8; /* usable from behind the chair */ it.focus = { pos: new THREE.Vector3(0, 1.75, -9.4), look: new THREE.Vector3(0, 1.45, -13) }; } // at the helm, watch the window
  makeConsole('comms', 1.95, -11.2, -0.3, 'COMMS');
  // chair
  box(0.55, 0.45, 0.55, M.fabric, 0, 0.23, -9.3); box(0.55, 0.55, 0.1, M.fabric, 0, 0.72, -9.03);
  colliders.push([-0.3, -9.6, 0.3, -8.98]);

  // Wall screens: the spacetime map (port wall) and the clocks above the window.
  function wallScreen(id, w, h, pw, ph, x, y, z, ry) {
    const c = document.createElement('canvas'); c.width = pw; c.height = ph;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    m.position.set(x, y, z); m.rotation.y = ry; group.add(m);
    const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.04), M.trim); back.position.copy(m.position); back.rotation.y = ry; back.translateZ(-0.03); group.add(back);
    screens[id] = { canvas: c, ctx: c.getContext('2d'), tex, mesh: m, w: pw, h: ph };
    return m;
  }
  wallScreen('map', 2.4, 1.35, 1024, 576, -3.32, 1.75, -6.9, Math.PI / 2);
  const mapWorld = new THREE.Vector3(-3.32, 1.75, -6.9);
  interactables.push({ id: 'map', pos: mapWorld, radius: 2.6, label: 'Study the spacetime map', console: true, focus: { pos: new THREE.Vector3(-1.2, 1.6, -6.9), look: mapWorld } });
  wallScreen('clocks', 3.2, 0.21, 1024, 66, 0, 3.07, -12.93, 0);
  wallScreen('feed', 2.4, 1.35, 960, 540, 3.32, 1.75, -6.9, -Math.PI / 2);
  const feedWorld = new THREE.Vector3(3.32, 1.75, -6.9);
  interactables.push({ id: 'feed', pos: feedWorld, radius: 2.6, label: 'Watch the probe camera', console: true, focus: { pos: new THREE.Vector3(1.2, 1.6, -6.9), look: feedWorld } });

  // ---- Lab ----
  const term = new THREE.Group(); term.position.set(-4.4, 0, -1.0); term.rotation.y = Math.PI / 2; group.add(term);
  box(1.4, 0.9, 0.6, M.console, 0, 0.45, 0, term);
  const archC = document.createElement('canvas'); archC.width = 640; archC.height = 384;
  const archTex = new THREE.CanvasTexture(archC); archTex.colorSpace = THREE.SRGBColorSpace;
  const archScr = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.72), new THREE.MeshBasicMaterial({ map: archTex, toneMapped: false }));
  archScr.position.set(0, 1.4, -0.2); term.add(archScr);
  box(1.3, 0.82, 0.05, M.console, 0, 1.4, -0.235, term); box(0.14, 0.5, 0.08, M.console, 0, 0.95, -0.25, term); // a bezel and a stand, so the screen sits on the console, not on the window
  screens.archive = { canvas: archC, ctx: archC.getContext('2d'), tex: archTex, mesh: archScr, w: 640, h: 384 };
  term.updateMatrixWorld(true);
  colliders.push(aabbOf(term));
  const archWorld = new THREE.Vector3(); archScr.getWorldPosition(archWorld);
  interactables.push({ id: 'archive', pos: archWorld, radius: 1.9, label: 'Open the archive', console: true, focus: { pos: new THREE.Vector3(-3.2, 1.58, -1.0), look: archWorld } });
  box(1.8, 0.8, 0.7, M.wallDark, -2.0, 0.4, -3.0); colliders.push([-2.9, -3.4, -1.1, -2.6]);

  // ---- detail ----
  const cyl = (r, len, mat, x, y, z, axis) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat); m.position.set(x, y, z);
    if (axis === 'z') m.rotation.x = Math.PI / 2; else if (axis === 'x') m.rotation.z = Math.PI / 2;
    group.add(m); return m;
  };
  // corridor handrails and ceiling pipes
  // handrails stop at the doorways: lab door on the port side (z -1.6..-0.4), quarters to starboard (z 3.5..4.7)
  const railRuns = { [-0.9]: [[-4.8, -1.7], [-0.3, 7.8]], [0.9]: [[-4.8, 3.4], [4.8, 7.8]] };
  for (const sx of [-0.9, 0.9]) {
    for (const [a, b] of railRuns[sx]) {
      cyl(0.025, b - a, M.rail, sx, 1.0, (a + b) / 2, 'z');
      box(0.04, 0.04, 0.12, M.rail, sx + Math.sign(sx) * 0.05, 1.0, a + 0.08); box(0.04, 0.04, 0.12, M.rail, sx + Math.sign(sx) * 0.05, 1.0, b - 0.08);
      box(0.04, 0.015, b - a, M.amber, sx * 1.033, 0.01, (a + b) / 2);
    }
    cyl(0.05, 13, M.pipe, sx * 0.95, 2.36, 1.5, 'z');
  }
  cyl(0.035, 13, M.pipe, -0.78, 2.4, 1.5, 'z');
  // amber floor strips in the corridor, and under the bridge window
  box(6.0, 0.03, 0.05, M.amber, 0, 0.73, -12.9);
  box(6.2, 0.06, 0.3, M.trim, 0, 0.72, -12.8);
  // status lights beside doors (they blink)
  const ledMat = (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5 });
  for (const [x, y, z, ry, c, rate] of [[0.94, 1.35, 3.3, -Math.PI / 2, 0x7fd6a8, 0.7], [-0.94, 1.35, -0.2, Math.PI / 2, 0x7fd6a8, 0.9], [0.8, 1.4, -4.94, 0, 0x8fb8ff, 0.5], [0, 1.5, 7.94, Math.PI, 0xff6b5c, 1.6], [-3.32, 2.0, -7.9, Math.PI / 2, 0xffb45c, 0.35]]) {
    const plate = box(0.16, 0.24, 0.02, M.trim, x, y, z); plate.rotation.y = ry;
    for (let k = 0; k < 3; k++) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.01), ledMat(k === 2 ? 0xffb45c : c));
      led.position.set(x, y + 0.07 - k * 0.07, z); led.rotation.y = ry; led.translateZ(0.015); group.add(led);
      blinkers.push({ mat: led.material, rate: rate * (1 + k * 0.37), phase: k * 1.7 });
    }
  }
  // quarters: shelf with books, a mug, a rug
  box(0.9, 0.03, 0.25, M.trim, 4.85, 1.5, 3.3).rotation.y = Math.PI / 2;
  const bookCols = [0x8a3b3b, 0x3b5a8a, 0xc9a54a, 0x3e7a5a, 0x6b4f8a, 0xa8a8a8];
  for (let i = 0; i < 9; i++) { const hgt = 0.18 + ((i * 37) % 7) * 0.012; box(0.16, hgt, 0.04, new THREE.MeshStandardMaterial({ color: bookCols[i % 6], roughness: 0.8 }), 4.86, 1.515 + hgt / 2, 2.95 + i * 0.075); }
  cyl(0.04, 0.09, new THREE.MeshStandardMaterial({ color: 0xece8f4, roughness: 0.4 }), 4.45, 0.83, 3.65);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), M.rug); rug.rotation.x = -Math.PI / 2; rug.position.set(3.2, 0.006, 4.4); group.add(rug);
  // bridge: overhead cable trays and floor plates
  box(6.4, 0.05, 0.4, M.trim, 0, 3.1, -9);
  box(0.4, 0.05, 7.6, M.trim, -2.9, 3.1, -9); box(0.4, 0.05, 7.6, M.trim, 2.9, 3.1, -9);

  // ---- hull: the outside faces of walls that a window can see, so no wall shows its inside to space ----
  const skin = (w, hh, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), M.hull); m.position.set(x, y, z); m.rotation.y = ry; group.add(m); };
  skin(4.2, 2.6, -3.0, 1.25, 1.58, 0);            // lab's aft wall, seen from the corridor windows
  skin(2.5, 3.3, -2.25, 1.6, -4.92, 0);           // bridge back wall, port of the corridor
  skin(2.5, 3.3, 2.25, 1.6, -4.92, 0);            // bridge back wall, starboard (seen from the porthole)
  // running lights on the bridge's aft corner, so from the porthole it reads as the ship's bow
  for (const [x, y, c] of [[3.42, 3.15, 0xff4a4a], [3.42, 0.15, 0xff4a4a], [1.1, 3.15, 0xffb45c]]) {
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), ledMat(c)); led.position.set(x, y, -4.88); group.add(led);
    blinkers.push({ mat: led.material, rate: 0.6, phase: x });
  }
  for (const sx of [1, -1]) {                       // bridge side walls, outside (leaving the side windows clear)
    skin(4.2, 3.3, sx * 3.48, 1.6, -7.1, sx * Math.PI / 2);
    skin(0.5, 3.3, sx * 3.48, 1.6, -12.75, sx * Math.PI / 2);
    skin(3.3, 0.9, sx * 3.48, 0.45, -10.85, sx * Math.PI / 2);   // below the window
    skin(3.3, 0.6, sx * 3.48, 2.9, -10.85, sx * Math.PI / 2);    // above it
  }
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 5.1), M.hull); roof.rotation.x = -Math.PI / 2; roof.position.set(-3.0, 2.56, -1.0); group.add(roof);
  const roofB = new THREE.Mesh(new THREE.PlaneGeometry(6.9, 8.1), M.hull); roofB.rotation.x = -Math.PI / 2; roofB.position.set(0, 3.26, -9.0); group.add(roofB);

  const hemi = new THREE.HemisphereLight(0xdfe6ff, 0x30333f, 0.9); group.add(hemi);

  return { group, colliders, windows, interactables, doors, rooms, screens, lights, blinkers, materials: M };
}

function aabbOf(obj) {
  const b = new THREE.Box3().setFromObject(obj);
  return [b.min.x, b.min.z, b.max.x, b.max.z];
}

function photoTexture() {
  const c = document.createElement('canvas'); c.width = 180; c.height = 240;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 240); sky.addColorStop(0, '#7fb2e8'); sky.addColorStop(0.62, '#cfe3f2'); sky.addColorStop(0.62, '#4f7a3e'); sky.addColorStop(1, '#2e4a24');
  g.fillStyle = sky; g.fillRect(0, 0, 180, 240);
  g.fillStyle = '#f5e6a8'; g.beginPath(); g.arc(130, 50, 16, 0, 7); g.fill();
  g.fillStyle = '#3b3a48'; for (const [x, h] of [[40, 70], [90, 56]]) { g.fillRect(x, 150 - h * 0.2, 14, h * 0.6); g.beginPath(); g.arc(x + 7, 140 - h * 0.2, 9, 0, 7); g.fill(); }
  g.strokeStyle = '#fff'; g.lineWidth = 10; g.strokeRect(0, 0, 180, 240);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
