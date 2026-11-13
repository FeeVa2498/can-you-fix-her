/* =========================================================
   TEST CHAMBER · Projector 3D
   The panel is projected as a floating platform in a vaporwave
   void: boxes tumble, dash boxes fire rockets, the line is a little
   box pulling a glowing rope. The camera looks straight up the grid
   (W = away from you), so keys never feel rotated.
   Uses three.js r149 (vendor/three.min.js). Falls back to the 2D
   board if WebGL isn't available.
   ========================================================= */
const P3 = (() => {
  const has = () => { try { if (!window.THREE) return false; const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } };
  const BOXHEX = [0xff8cc6, 0xb48cff, 0x7be3a4, 0xffd86e];
  const LOCKX = [0, 0x4fa8ff, 0xffd23f, 0xff4d5e];   // switch / door colours 1..3 (blue, yellow, red)
  const PORTALHEX = [0xffd86e, 0x8fdcf7, 0x7be3a4];
  const GIRL = { prim: 0x8d6fbf, trix: 0x6f8fcf, paige: 0x9a7cc8, vel: 0xc58bd8, myne: 0x7fb6c8 };

  /* ---------- small helpers ---------- */
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.magFilter = THREE.LinearFilter; return t;
  }
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .6, metalness: .05, flatShading: true, ...o });
  const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
  const additive = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  function edges(mesh, color, opacity = 1) {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
    mesh.add(l); return mesh;
  }
  function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }
  function chevron(color, s = .16) {
    const sh = new THREE.Shape(); sh.moveTo(-s, -s * .9); sh.lineTo(0, s * .3); sh.lineTo(s, -s * .9); sh.lineTo(s, -s * .3); sh.lineTo(0, s * .9); sh.lineTo(-s, -s * .3); sh.lineTo(-s, -s * .9);
    const mat = basic(color, { side: THREE.DoubleSide, transparent: true }), m = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat);
    m.rotation.x = -Math.PI / 2;   // flat, pointing to -z (= up on screen); turn the group with rotation.y
    const g = new THREE.Group(); g.add(m); g.mat = mat; return g;
  }
  // a flat thing pointing along (dx,dz)
  const yawOf = (dx, dz) => Math.atan2(-dx, -dz);
  function numTex(text, fg = '#f4e9ff', plate = false) {
    return canvasTex(128, 128, (g, w, h) => {
      if (plate) { g.fillStyle = 'rgba(20,10,34,.88)'; g.strokeStyle = fg; g.lineWidth = 5; g.beginPath(); g.roundRect ? g.roundRect(6, 24, w - 12, h - 48, 16) : g.rect(6, 24, w - 12, h - 48); g.fill(); g.stroke(); } g.fillStyle = fg; g.font = `bold ${text.length > 2 ? 60 : 92}px "Courier New", monospace`; g.strokeStyle = '#1a1024'; g.lineWidth = 8; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText(text, w / 2, h / 2 + 4); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4); });
  }

  /* ---------- the void ---------- */
  function backdrop(scene, cx, cz) {
    scene.background = canvasTex(4, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#12062b'); gr.addColorStop(.42, '#3b1063'); gr.addColorStop(.62, '#a2287f'); gr.addColorStop(.7, '#ff6fb5'); gr.addColorStop(.74, '#ffb36b'); gr.addColorStop(.76, '#2a0d45'); gr.addColorStop(1, '#14052a');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    scene.fog = new THREE.Fog(0x2a0d45, 16, 62);
    const sun = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ transparent: true, fog: false, depthWrite: false,
      map: canvasTex(256, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff3a0'); gr.addColorStop(.55, '#ff9a6b'); gr.addColorStop(1, '#ff4fa3');
        g.fillStyle = gr; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); g.fill();
        g.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 7; i++) { const y = h * .52 + i * 17, t = 2 + i * 1.6; g.fillRect(0, y, w, t); }
      }) }));
    sun.position.set(cx, 3.5, cz - 40); sun.renderOrder = -2; scene.add(sun);
    const grid = new THREE.GridHelper(240, 120, 0xff4fd8, 0x8a2bdf);
    grid.material.transparent = true; grid.material.opacity = .55; grid.position.set(cx, -3, cz); scene.add(grid);
    // wireframe mountains on the horizon
    const mg = new THREE.PlaneGeometry(140, 18, 56, 6); mg.rotateX(-Math.PI / 2);
    const pos = mg.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); const edge = (z + 9) / 18; pos.setY(i, Math.max(0, (Math.sin(x * .35) + Math.sin(x * .13 + 1) * 1.6 + Math.cos(x * .7) * .5 + 2.2) * (1 - edge) * 2.4)); }
    const mt = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: 0xff6fe0, wireframe: true, transparent: true, opacity: .5 }));
    mt.position.set(cx, -3, cz - 38); scene.add(mt);
    const sv = []; for (let i = 0; i < 260; i++) sv.push(cx + (Math.random() - .5) * 120, 4 + Math.random() * 40, cz - 30 - Math.random() * 30);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: .18, fog: false, transparent: true, opacity: .8 })));
    scene.add(new THREE.HemisphereLight(0xffd6f5, 0x2a0f4a, .55));
    const sunL = new THREE.DirectionalLight(0xffffff, .55); sunL.position.set(-4, 10, 7); scene.add(sunL);
    const rim = new THREE.DirectionalLight(0xff6fb5, .35); rim.position.set(5, 3, -8); scene.add(rim);
    return { grid };
  }

  /* ---------- the view ---------- */
  function create(host, p) {
    const HUEX = (typeof HUE5 !== 'undefined' ? HUE5 : ['#ff7eb6', '#ff4d5e', '#a46bff', '#ffd23f', '#4fa8ff']).map(h => parseInt(h.slice(1), 16)), ROPEX = c => HUEX[c];
    const E = PanelEngine, d = E.dims(p), isBox = !!p.boxes;
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
    const cv = renderer.domElement; cv.className = 'pj3-canvas'; host.appendChild(cv);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(36, 1, .1, 200);
    const cx = (d.cols - 1) / 2, cz = (d.rows - 1) / 2;
    const bg = backdrop(scene, cx, cz);
    const world = new THREE.Group(), dyn = new THREE.Group(); scene.add(world, dyn);
    const anim = { spin: [], pulse: [], flow: [], flames: [], breathe: [] };
    let retro = true, alive = true, t0 = performance.now();

    /* static board */
    const symbols = new THREE.Group(); world.add(symbols);
    const ringMats = new Map();
    const CHX = [0x4fd8ff, 0xffa040], plates3 = [], gates3 = [];
    let symKey = '';
    const numObjs = [];
    const tiles3 = new Map(), fragDec = new Map(), lights3 = [], sw3 = [], dice3 = [], touch3 = [];
    if (isBox) buildBoxBoard(); else buildLineBoard();

    function plateMats(top, side) { const s = std(side), t = std(top); return [s, s, t, s, s, s]; }
    function buildBoxBoard() {
      const pads = new Map((p.pads || []).map(q => [q[0] + ',' + q[1], [q[2], q[3]]])), stops = new Set((p.stops || []).map(q => q.join(',')));
      const goals = new Map((p.exit || []).map(g => [g[0] + ',' + g[1], g[2] || 0])), cracks = new Set((p.cracks || []).map(q => q[0] + ',' + q[1])), frags = new Set((p.fragile || []).map(q => q[0] + ',' + q[1]));
      for (let y = 0; y < d.rows; y++) for (let x = 0; x < d.cols; x++) {
        if (!E.inside(p, x, y)) continue;
        const k = x + ',' + y, top = goals.has(k) ? 0x5c3d2a : pads.has(k) ? 0x24503a : stops.has(k) ? 0x5a2f3a : cracks.has(k) ? 0x4a3550 : 0x3b2560;
        const t = box(.96, .7, .96, plateMats(top, 0x1c0f30), x, -.35, y);
        world.add(edges(t, 0xff6fd8, .35)); tiles3.set(k, t);
        if (frags.has(k)) {   // Vel's glass tile: clear when whole, a crack decal shows after the first time a box leaves it
          t.material[2] = new THREE.MeshStandardMaterial({ color: 0x9fe6ff, emissive: 0x2a6a88, emissiveIntensity: .35, transparent: true, opacity: .7, roughness: .15, metalness: .1 });
          const dec = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0, map: canvasTex(128, 128, (g) => {
            g.strokeStyle = '#0d1c2a'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
            g.moveTo(10, 50); g.lineTo(54, 70); g.lineTo(38, 118); g.moveTo(54, 70); g.lineTo(92, 50); g.lineTo(120, 88); g.moveTo(92, 50); g.lineTo(76, 8); g.moveTo(54, 70); g.lineTo(70, 100); g.stroke();
            g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.stroke();
          }) }));
          dec.rotation.x = -Math.PI / 2; dec.position.y = .352; t.add(dec); fragDec.set(k, dec);
        }
        if (cracks.has(k)) {
          const dec = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(128, 128, (g, w, h) => {
            g.strokeStyle = '#140a22'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
            g.moveTo(14, 40); g.lineTo(52, 66); g.lineTo(42, 112); g.moveTo(52, 66); g.lineTo(88, 54); g.lineTo(116, 82); g.moveTo(88, 54); g.lineTo(80, 12); g.stroke();
            g.strokeStyle = 'rgba(255,111,216,.55)'; g.lineWidth = 2; g.stroke();
          }) }));
          dec.rotation.x = -Math.PI / 2; dec.position.y = .351; t.add(dec);
        }
        if (pads.has(k)) { const [dx, dz] = pads.get(k); [-.14, .14].forEach((o, i) => { const c = chevron(0x7be3a4, .15); c.position.set(x + dx * o, .012, y + dz * o); c.rotation.y = yawOf(dx, dz); world.add(c); anim.flow.push({ m: c, i }); }); }
        if (stops.has(k)) world.add(box(.5, .05, .12, basic(0xff9f5a), x, .02, y));
      }
      (p.exit || []).forEach(([x, y, c]) => world.add(goalTile(x, y, .96, c != null ? HUEX[c] : 0xfff4fb)));
      (p.paints || []).forEach(([x, y, c]) => {
        const col = '#' + HUEX[c].toString(16).padStart(6, '0');
        const m = new THREE.Mesh(new THREE.PlaneGeometry(.8, .8), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(128, 128, (g, w, h) => {
          g.fillStyle = col; g.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = (i % 2 ? 30 : 46) + Math.sin(i * 3.1) * 6; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.fill();
          [[18, 22, 7], [108, 30, 5], [100, 106, 8], [24, 100, 5]].forEach(([a, b2, r]) => { g.beginPath(); g.arc(a, b2, r, 0, 7); g.fill(); });
        }) }));
        m.rotation.x = -Math.PI / 2; m.position.set(x, .014, y); world.add(m);
      });
      (p.lights || []).forEach(([x, y]) => {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(.2, .24, .05, 12), std(0x1a1024)); base.position.set(x, .025, y);
        const mat = std(0x6a5a3a, { emissive: 0xffd86e, emissiveIntensity: 0 }), bulb = new THREE.Mesh(new THREE.SphereGeometry(.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat); bulb.position.set(x, .05, y);
        const glow = new THREE.Mesh(new THREE.CircleGeometry(.42, 20), additive(0xffd86e, 0)); glow.rotation.x = -Math.PI / 2; glow.position.set(x, .016, y);
        world.add(base, edges(bulb, 0xfff1b8, .5), glow); lights3.push({ mat, glow });
      });
      (p.touch || []).forEach(([x, y, n]) => {   // number tiles: a low brass plate; big number on top, a lamp per side
        const blk = box(.84, .16, .84, std(0x3a2410, { emissive: 0x2a1404, emissiveIntensity: .5 }), x, .08, y); world.add(edges(blk, 0xffc94d, .9));
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(.84, .84), new THREE.MeshBasicMaterial({ transparent: true })); scr.rotation.x = -Math.PI / 2; scr.position.set(x, .162, y); world.add(scr);
        touch3.push({ scr, n, x, y, key: '' });
      });
      (p.dice || []).forEach(([x, y, v]) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(.88, .88), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, .015, y); m.renderOrder = 2; world.add(m);
        dice3.push({ m, x, y, v, key: '' });
      });
      walls(true);
      portals();
      locks();
      // edge numbers: a square drawn through the centres of the four tiles around it (the rope pieces that count), number in the middle
      (p.nums || []).forEach(([x, y, n], i) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(.62, .62), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x + .5, .05, y + .5); m.renderOrder = 3; world.add(m);
        const fm = new THREE.MeshBasicMaterial({ color: 0xf4e9ff, transparent: true, opacity: .55, depthWrite: false });
        [[x + .5, y, 1, .05], [x + .5, y + 1, 1, .05], [x, y + .5, .05, 1], [x + 1, y + .5, .05, 1]].forEach(([cx, cz, w, d]) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(w, d), fm); b.rotation.x = -Math.PI / 2; b.position.set(cx, .022, cz); b.renderOrder = 2; world.add(b); });
        numObjs.push({ m, x, y, n, i, key: '', fm });
      });
    }
    // switches (a button in its colour; a double one shows the colour it opens next, ringed by the other) and doors
    function locks() {
      (p.switches || []).forEach(([x, y, c, c2]) => {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(.36, .38, .05, 20), std(0x1a1024)); base.position.set(x, .02, y);
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(c2 == null ? .26 : .19, c2 == null ? .28 : .21, .1, 20), std(LOCKX[c], { emissive: LOCKX[c], emissiveIntensity: .25 })); btn.position.set(x, .09, y);
        world.add(base, edges(btn, 0xffffff, .6));
        let ring = null;
        if (c2 != null) { ring = new THREE.Mesh(new THREE.TorusGeometry(.28, .045, 6, 24), std(LOCKX[c2], { emissive: LOCKX[c2], emissiveIntensity: .35 })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, .07, y); world.add(ring); }
        sw3.push({ btn, ring, c, c2, y0: btn.position.y });
      });
      (p.doors || []).forEach(([x1, y1, x2, y2, c]) => {
        const hor = x1 !== x2, mx = (x1 + x2) / 2, my = (y1 + y2) / 2, L = 1.0, H = .62;
        const mat = std(LOCKX[c], { emissive: LOCKX[c], emissiveIntensity: .45, transparent: true, opacity: .88 });
        const g = new THREE.Group(); g.position.set(mx, 0, my);
        const bar = box(hor ? .12 : L, H, hor ? L : .12, mat, 0, H / 2, 0); g.add(edges(bar, 0xffffff, .8));
        for (let i = -1; i <= 1; i += 2) g.add(box(hor ? .14 : .05, H * .9, hor ? .05 : .14, basic(0x1a1024), hor ? 0 : i * L * .25, H / 2, hor ? i * L * .25 : 0));
        world.add(g); gates3.push({ g, c, H, cur: 0, want: 0 });
      });
    }
    function setLocks(s) {
      sw3.forEach((q, i) => {
        if (q.c2 == null) { const on = !!(s.open & (1 << q.c)); q.btn.position.y = q.y0 - (on ? .06 : 0); q.btn.material.emissiveIntensity = on ? .9 : .25; return; }
        const cur = E.swUp([0, 0, q.c, q.c2], s.open), oth = cur === q.c ? q.c2 : q.c;
        q.btn.material.color.setHex(LOCKX[cur]); q.btn.material.emissive.setHex(LOCKX[cur]); q.ring.material.color.setHex(LOCKX[oth]); q.ring.material.emissive.setHex(LOCKX[oth]);
      });
      gates3.forEach(gt => { if (gt.c !== undefined) gt.want = s.open & (1 << gt.c) ? 1 : 0; });
    }
    function buildLineBoard() {
      for (let y = 0; y < d.rows; y++) for (let x = 0; x < d.cols; x++) if (E.inside(p, x, y)) world.add(box(1, .5, 1, plateMats(0x34204f, 0x1c0f30), x, -.33, y));
      const rail = std(GIRL[p.girl] || 0x8d6fbf, { emissive: GIRL[p.girl] || 0x8d6fbf, emissiveIntensity: .15 }), br = E.brokenSet(p);
      for (let y = 0; y < d.rows; y++) for (let x = 0; x < d.cols; x++) {
        if (!E.inside(p, x, y)) continue;
        world.add(box(.2, .1, .2, rail, x, -.03, y));
        for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) {
          if (!E.inside(p, nx, ny)) continue;
          const hor = nx !== x, mx = (x + nx) / 2, my = (y + ny) / 2;
          if (br.has(E.ekey(x, y, nx, ny))) {
            [[x, y, 1], [nx, ny, -1]].forEach(([ax, ay, s]) => world.add(hor ? box(.34, .1, .16, rail, ax + s * .17, -.03, ay) : box(.16, .1, .34, rail, ax, -.03, ay + s * .17)));
          } else world.add(hor ? box(1, .1, .16, rail, mx, -.03, my) : box(.16, .1, 1, rail, mx, -.03, my));
        }
      }
      walls(false);
      portals();
      switches(false);
      (p.bridges || []).forEach(([x, y]) => { const b = box(.36, .16, .36, std(0xf4e9ff), x, .04, y); b.rotation.y = Math.PI / 4; world.add(edges(b, 0x2b1b3d)); });
      (p.exit || []).forEach(([x, y]) => world.add(exitGate(x, y)));
      buildSymbols({});
    }
    function walls(isTiles) {
      if (isTiles) {
        const br = E.brokenSet(p), glass = std(0xd8d0f0, { emissive: 0x8a82a8, emissiveIntensity: .35, transparent: true, opacity: .55 });
        for (let y = 0; y < d.rows; y++) for (let x = 0; x < d.cols; x++) for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) {
          if (!E.inside(p, x, y) || !E.inside(p, nx, ny) || !br.has(E.ekey(x, y, nx, ny))) continue;
          const w = nx !== x ? box(.1, .62, 1.02, glass, (x + nx) / 2, .31, y) : box(1.02, .62, .1, glass, x, .31, (y + ny) / 2);
          world.add(edges(w, 0xffffff, .9));
        }
      }
      (p.oneway || []).forEach(e => { const c = chevron(0xffd86e, isTiles ? .17 : .12); c.position.set((e[0] + e[2]) / 2, isTiles ? .02 : .04, (e[1] + e[3]) / 2); c.rotation.y = yawOf(e[2] - e[0], e[3] - e[1]); world.add(c); });
    }
    function portals() {
      (p.portals || []).forEach((q, i) => [[q[0], q[1]], [q[2], q[3]]].forEach(([x, y]) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.3, .05, 6, 16), basic(PORTALHEX[i % 3])); ring.rotation.x = -Math.PI / 2; ring.position.set(x, .05, y);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(.26, 16), additive(PORTALHEX[i % 3], .45)); disc.rotation.x = -Math.PI / 2; disc.position.set(x, .03, y);
        const halo = new THREE.Mesh(new THREE.TorusGeometry(.2, .025, 4, 12), basic(PORTALHEX[i % 3])); halo.position.set(x, .45, y);
        world.add(ring, disc, halo); anim.spin.push(halo);
      }));
    }
    // a goal: a gold-framed tile with a soft glow that breathes, brighter while something stands on it
    function goalTile(x, y, size, col = 0xffd86e) {
      const g = new THREE.Group(); g.position.set(x, .012, y);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(size * .9, size * .9), additive(col, .25)); glow.rotation.x = -Math.PI / 2; g.add(glow);
      const fr = size * .38, t = size * .07;
      [[0, -fr, fr * 2 + t, t], [0, fr, fr * 2 + t, t], [-fr, 0, t, fr * 2], [fr, 0, t, fr * 2]].forEach(([a, b2, w, h]) => g.add(box(w, .04, h, basic(col), a, .01, b2)));
      const ring = new THREE.Group(); ring.position.y = .02;
      const r2 = size * .26, t2 = size * .04;
      [[0, -r2, r2 * 2 + t2, t2], [0, r2, r2 * 2 + t2, t2], [-r2, 0, t2, r2 * 2], [r2, 0, t2, r2 * 2]].forEach(([a, b2, w, h]) => ring.add(box(w, .02, h, additive(0xfff1b8, .8), a, 0, b2)));
      g.add(ring);
      anim.pulse.push({ m: glow, base: .25, at: x + ',' + y }); anim.breathe.push(ring);
      return g;
    }
    function exitGate(x, y) { return goalTile(x, y, .78); }
    // pressure plates and gates
    function switches(isTiles) {
      (p.plates || []).forEach(([x, y, c]) => {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(isTiles ? .36 : .22, isTiles ? .38 : .24, .05, 20), std(0x1a1024)); base.position.set(x, isTiles ? .02 : .03, y);
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(isTiles ? .28 : .16, isTiles ? .3 : .17, .1, 20), std(CHX[c], { emissive: CHX[c], emissiveIntensity: .2 })); btn.position.set(x, (isTiles ? .02 : .03) + .07, y);
        world.add(base, edges(btn, 0xffffff, .6)); plates3.push({ k: x + ',' + y, btn, y0: btn.position.y });
      });
      (p.gates || []).forEach(([x1, y1, x2, y2, c, inv]) => {
        const hor = x1 !== x2, mx = (x1 + x2) / 2, my = (y1 + y2) / 2, L = isTiles ? 1.0 : .5, H = isTiles ? .62 : .34;
        const mat = std(CHX[c], { emissive: CHX[c], emissiveIntensity: .45, transparent: true, opacity: .85 });
        const g = new THREE.Group(); g.position.set(mx, 0, my);
        const bar = box(hor ? .12 : L, H, hor ? L : .12, mat, 0, H / 2, 0); g.add(edges(bar, 0xffffff, .8));
        if (inv) for (let i = -1; i <= 1; i++) g.add(box(hor ? .13 : .06, H * .9, hor ? .06 : .13, basic(0x1a1024), hor ? 0 : i * L * .3, H / 2, hor ? i * L * .3 : 0));
        world.add(g); gates3.push({ g, key: E.ekey(x1, y1, x2, y2), H, cur: 0, want: 0 });
      });
    }
    function setSwitches(on) {
      if (!plates3.length) return;
      const shut = E.gateClosed(p, k => on.has(k));
      plates3.forEach(pl => { const pr = on.has(pl.k); pl.btn.position.y = pl.y0 - (pr ? .06 : 0); pl.btn.material.emissiveIntensity = pr ? .9 : .2; });
      gates3.forEach(gt => { gt.want = shut.has(gt.key) ? 0 : 1; });
    }
    // cell & edge symbols for line panels (rebuilt when the "bad" highlights change)
    function buildSymbols(bad, seen, used) {
      const key = JSON.stringify(Object.fromEntries(Object.entries(bad).map(([k, v]) => [k, v === true ? 1 : [...v]])));
      if (key === symKey && symbols.children.length) { refreshRings(seen); refreshNums(used, bad); return; }
      symKey = key; symbols.clear(); ringMats.clear(); numObjs.length = 0;
      const B = (k, i) => bad[k] && bad[k].has && bad[k].has(i);
      const dashes = (e, color, lift, i, k) => {
        const [x1, y1, x2, y2] = e, hor = x1 !== x2;
        for (let s = 0; s < 4; s++) { const t = -.36 + s * .24; symbols.add(hor ? box(.13, .03, .07, basic(B(k, i) ? 0xff4d7a : color), (x1 + x2) / 2 + t, lift, y1) : box(.07, .03, .13, basic(B(k, i) ? 0xff4d7a : color), x1, lift, (y1 + y2) / 2 + t)); }
      };
      (p.sketch || []).forEach((e, i) => dashes(e, 0xfff6d8, .035, i, 'sketch'));
      (p.avoid || []).forEach((e, i) => dashes(e, 0x0d0714, .035, i, 'avoid'));
      (p.squares || []).forEach(([x, y, c], i) => { const m = box(.28, .28, .28, std(B('squares', i) ? 0xff4d7a : c === 'pink' ? 0xff6fb5 : 0x140a22), x + .5, .06, y + .5); symbols.add(edges(m, B('squares', i) ? 0xff4d7a : 0xffffff, .9)); });
      (p.nums || []).forEach(([x, y, n], i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.66, .66), new THREE.MeshBasicMaterial({ transparent: true })); m.rotation.x = -Math.PI / 2; m.position.set(x + .5, -.075, y + .5); symbols.add(m); numObjs.push({ m, x, y, n, i, key: '' }); });
      (p.dots || []).forEach(([x, y], i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .08, 6), std(B('dots', i) ? 0xff4d7a : 0x1a1024)); m.position.set(x, .04, y); symbols.add(edges(m, 0xffffff, .9)); });
      if (p.visitAll) for (let y = 0; y < d.rows; y++) for (let x = 0; x < d.cols; x++) if (E.inside(p, x, y)) {
        const mat = basic(bad.visitAll ? 0xff4d7a : 0xcbb8ea), m = new THREE.Mesh(new THREE.TorusGeometry(.13, .025, 4, 12), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, .03, y); symbols.add(m); ringMats.set(x + ',' + y, mat);
      }
      refreshRings(seen); refreshNums(used, bad);
    }
    // edge counts: "touched/needed", green when exactly right, red when over (or broken on submit)
    function refreshNums(used, bad) {
      numObjs.forEach(o => {
        const c = used ? E.cellSides(o.x, o.y).filter(k => used.has(k)).length : 0;
        const col = (bad.nums && bad.nums.has && bad.nums.has(o.i)) || c > o.n ? '#ff4d7a' : c === o.n && used ? '#7be3a4' : '#f4e9ff';
        const label = used ? `${c}/${o.n}` : String(o.n), k = label + col;
        if (k === o.key) return; o.key = k;
        if (o.m.material.map) o.m.material.map.dispose();
        o.m.material.map = numTex(label, col, isBox); o.m.material.needsUpdate = true;
        if (o.fm) { o.fm.color.set(col); o.fm.opacity = col === '#f4e9ff' ? .55 : .95; }
      });
    }
    function refreshRings(seen) { if (!seen) return; ringMats.forEach((m, k) => { if (m.color.getHex() !== 0xff4d7a) m.color.setHex(seen.has(k) ? 0xff8cc6 : 0xcbb8ea); }); }

    /* ---------- moving things ---------- */
    // a cube body that tumbles; tops carry a decal (twin marks, budget number)
    function makeCube(size, color, o = {}) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const mat = std(color, { emissive: color, emissiveIntensity: .05 });
      const c = box(size, size, size, mat, 0, 0, 0); edges(c, o.edge || 0xffffff, .95); body.add(c);
      body.position.y = size / 2;
      const top = new THREE.Mesh(new THREE.PlaneGeometry(size * .9, size * .9), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
      top.rotation.x = -Math.PI / 2; top.position.y = size / 2 + .002; top.visible = false; body.add(top);
      return { g, body, mat, top, size, decal: '' };
    }
    function setDecal(cu, mark, num) {
      const k = (mark || '') + '|' + (num == null ? '' : num); if (k === cu.decal) return; cu.decal = k;
      if (!mark && num == null) { cu.top.visible = false; if (cu.front) cu.front.visible = false; if (cu.badge) cu.badge.visible = false; return; }
      if (cu.top.material.map) cu.top.material.map.dispose();
      cu.top.material.map = canvasTex(128, 128, (g, w, h) => {
        g.strokeStyle = 'rgba(26,16,36,.6)'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath();
        if (mark === 'mx') { g.moveTo(w / 2, 8); g.lineTo(w / 2, h - 8); }
        if (mark === 'my') { g.moveTo(8, h / 2); g.lineTo(w - 8, h / 2); }
        // reverse twin: two crossed arrows
        if (mark === 'opp') { g.lineJoin = 'round';
          g.moveTo(22, h - 22); g.lineTo(w - 24, 24); g.moveTo(w - 24, 24); g.lineTo(w - 54, 24); g.moveTo(w - 24, 24); g.lineTo(w - 24, 54);
          g.moveTo(22, 22); g.lineTo(w - 24, h - 24); g.moveTo(w - 24, h - 24); g.lineTo(w - 54, h - 24); g.moveTo(w - 24, h - 24); g.lineTo(w - 24, h - 54); }
        g.stroke();
      });
      cu.top.material.needsUpdate = true; cu.top.visible = !!mark;
      // the mark is drawn on the side facing you as well (a landmine sits on top of the box and hides the lid)
      if (!cu.front) { cu.front = new THREE.Mesh(new THREE.PlaneGeometry(cu.size * .9, cu.size * .9), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })); cu.front.position.z = cu.size / 2 + .002; cu.body.add(cu.front); }
      cu.front.material.map = cu.top.material.map; cu.front.material.needsUpdate = true; cu.front.visible = !!mark;
      // the move budget floats above the box as a badge that always faces you
      if (num == null) { if (cu.badge) cu.badge.visible = false; return; }
      if (!cu.badge) { cu.badge = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true })); cu.badge.scale.set(.5, .5, 1); cu.badge.renderOrder = 5; cu.g.add(cu.badge); }
      cu.badge.position.set(0, cu.size + (cu.bomb ? .5 : .38), 0); cu.badge.visible = true;
      if (cu.badge.material.map) cu.badge.material.map.dispose();
      cu.badge.material.map = canvasTex(64, 64, (g, w, h) => {
        g.fillStyle = num !== 0 ? '#fff8fc' : '#ff4d7a'; g.strokeStyle = '#1a1024'; g.lineWidth = 5; g.beginPath(); g.roundRect ? g.roundRect(4, 4, w - 8, h - 8, 12) : g.rect(4, 4, w - 8, h - 8); g.fill(); g.stroke();
        g.fillStyle = num !== 0 ? '#1a1024' : '#fff'; g.font = (String(num).length > 1 ? 'bold 30px' : 'bold 44px') + ' "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(num), w / 2, h / 2 + 3);
      });
      cu.badge.material.map.magFilter = THREE.NearestFilter; cu.badge.material.needsUpdate = true;
    }
    function addRocket(cu) {
      const pack = new THREE.Group(); cu.g.add(pack); pack.position.y = cu.size * .55;
      const metal = std(0xe8e8f4, { metalness: .5, roughness: .3 }), red = std(0xff4d7a);
      [-.2, .2].forEach(x => {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .42, 8), metal); tube.rotation.x = Math.PI / 2; tube.position.set(x, .02, cu.size / 2 + .12); pack.add(tube);
        const fin = box(.02, .14, .14, red, x, .1, cu.size / 2 + .26); pack.add(fin);
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.06, .095, .08, 8), red); nozzle.rotation.x = Math.PI / 2; nozzle.position.set(x, .02, cu.size / 2 + .37); pack.add(nozzle);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(.08, .45, 8), additive(0xffa040, .9)); flame.rotation.x = -Math.PI / 2; flame.position.set(x, .02, cu.size / 2 + .62); flame.visible = false; pack.add(flame);
        anim.flames.push(flame); (cu.flames = cu.flames || []).push(flame);
      });
      cu.pack = pack;
    }
    // rope pieces: unit boxes stretched from a to b
    function ropePiece(a, b, mat, thick = .15, h = .08, y = .04) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, h, thick).translate(.5, 0, 0), mat);
      m.position.set(a[0], y, a[1]); m.rotation.y = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
      m.userData.len = Math.hypot(b[0] - a[0], b[1] - a[1]); m.scale.x = m.userData.len; return m;
    }

    /* ---------- line panels: one or two heads ---------- */
    const L = { heads: [], rope: new THREE.Group(), ghost: new THREE.Group(), hint: new THREE.Group(), path: [], jump: [], anim: null, stateCls: '' };
    const ropeMats = { draw: std(0xff5fa8, { emissive: 0xff2f93, emissiveIntensity: .35 }), idle: std(0xff5fa8, { emissive: 0xff2f93, emissiveIntensity: .25 }), win: std(0xffd86e, { emissive: 0xffb02e, emissiveIntensity: .5 }), fail: std(0xff2050, { emissive: 0xff2050, emissiveIntensity: .4 }), sol: std(0x3fb8f0, { emissive: 0x1f9fcf, emissiveIntensity: .4 }), other: std(0x2b1b3d, { emissive: 0x6a4a9a, emissiveIntensity: .3 }) };
    const ghostMat = std(0x8fdcf7, { transparent: true, opacity: .28, emissive: 0x8fdcf7, emissiveIntensity: .4 }), hintMat = std(0xffffff, { transparent: true, opacity: .5, emissive: 0xffffff, emissiveIntensity: .5 });
    if (!isBox) {
      dyn.add(L.rope, L.ghost, L.hint);
      const s0 = p.start[0];
      L.heads.push(makeCube(.36, 0xff8cc6));
      if (p.mirror) L.heads.push(makeCube(.36, 0x2b1b3d, { edge: 0xcbb8ea }));
      L.heads.forEach(h => dyn.add(h.g));
      placeHeads([s0], [false], 0);
    }
    function headNodes(path) { return p.mirror ? [path, path.map(n => E.mirrorOf(p, n))] : [path]; }
    function placeHeads(path) { headNodes(path).forEach((ln, i) => { const n = ln[ln.length - 1]; L.heads[i].g.position.set(n[0], 0, n[1]); L.heads[i].body.quaternion.identity(); L.heads[i].body.position.y = L.heads[i].size / 2; }); }
    function buildRope(group, path, jump, mat, matOther) {
      group.clear(); const pieces = [];
      headNodes(path).forEach((ln, li) => {
        for (let k = 1; k < ln.length; k++) {
          if (jump[k]) { pieces.push(null); continue; }
          const m = ropePiece(ln[k - 1], ln[k], li ? matOther : mat); group.add(m); pieces[li * 1000 + k] = m;
        }
      });
      return pieces;
    }
    function syncLine(o) {
      if (fx && o.cls !== 'win') { restore(); L.sig = null; }
      const path = o.path && o.path.length ? o.path : [p.start[0]], jump = o.jump || [false];
      const cls = o.cls || 'draw';
      const sig = JSON.stringify([path, cls, o.hint && o.hint.path, !!o.ghost]);
      if (sig === L.sig) { buildSymbols(o.bad || {}, o.seen, o.used); setSwitches(o.seen || new Set()); return; }
      L.sig = sig;
      const extends_ = L.path.length && path.length > L.path.length && L.path.every((n, i) => n[0] === path[i][0] && n[1] === path[i][1]);
      const from = extends_ ? L.path.length - 1 : null;
      L.path = path.map(n => n.slice()); L.jump = jump.slice(); L.stateCls = cls;
      L.pieces = buildRope(L.rope, path, jump, ropeMats[cls] || ropeMats.draw, ropeMats.other);
      L.heads.forEach(h => { h.mat.emissiveIntensity = cls === 'win' ? .6 : .08; h.mat.color.setHex(h === L.heads[0] ? (cls === 'fail' ? 0xff4d7a : cls === 'sol' ? 0x8fdcf7 : cls === 'win' ? 0xfff1b8 : 0xff8cc6) : 0x2b1b3d); });
      if (o.ghost) { ghostMat.opacity = .28; buildRope(L.ghost, o.ghost.path, o.ghost.jump, ghostMat, ghostMat); } else L.ghost.clear();
      if (o.hint) buildRope(L.hint, o.hint.path, o.hint.jump, hintMat, hintMat); else L.hint.clear();
      buildSymbols(o.bad || {}, o.seen, o.used);
      setSwitches(o.seen || new Set()); anim.pulse.forEach(pu => { if (pu.at) pu.on = !!(o.seen && o.seen.has(pu.at)); });
      if (from !== null && !REDUCED) {
        const steps = []; for (let k = from + 1; k < path.length; k++) steps.push(k);
        L.anim = { steps, t: performance.now(), dur: steps.length > 1 ? 70 : 140 };
        // hide pieces not reached yet
        steps.forEach(k => [k, 1000 + k].forEach(i => { if (L.pieces[i]) L.pieces[i].visible = false; }));
        const prevPath = path.slice(0, from + 1); placeHeads(prevPath);
      } else { L.anim = null; placeHeads(path); }
    }
    function stepLine(now) {
      const A = L.anim; if (!A) return;
      const u = Math.max(0, (now - A.t) / A.dur), k = Math.min(A.steps.length - 1, Math.floor(u)), w = Math.min(1, u - k);
      if (u >= A.steps.length) { A.steps.forEach(k => [k, 1000 + k].forEach(i => { const m = L.pieces[i]; if (m) { m.visible = true; m.scale.x = m.userData.len; } })); L.anim = null; placeHeads(L.path); return; }
      A.steps.forEach((s, j) => [s, 1000 + s].forEach(i => { const m = L.pieces[i]; if (!m) return; m.visible = j <= k; m.scale.x = m.userData.len * (j < k ? 1 : j === k ? w : 0); }));
      const idx = A.steps[k];
      headNodes(L.path).forEach((ln, i) => {
        const a = ln[idx - 1], b = ln[idx], h = L.heads[i];
        if (L.jump[idx]) { const s = w < .5 ? 1 - w * 2 : (w - .5) * 2, at = w < .5 ? a : b; h.g.position.set(at[0], 0, at[1]); h.body.scale.setScalar(Math.max(.05, s)); return; }
        h.body.scale.setScalar(1);
        tumble(h, a, b, w, A.dur > 100);
      });
    }
    function tumble(h, a, b, w, roll) {
      const dx = b[0] - a[0], dz = b[1] - a[1], e = w * w * (3 - 2 * w);
      h.g.position.set(a[0] + dx * e, 0, a[1] + dz * e);
      if (roll) {
        h.body.quaternion.setFromAxisAngle(new THREE.Vector3(dz, 0, -dx).normalize(), e * Math.PI / 2);
        h.body.position.y = h.size / 2 + Math.sin(e * Math.PI) * h.size * .21;
      } else { h.body.quaternion.identity(); h.body.position.y = h.size / 2; }
    }

    /* ---------- box panels ---------- */
    const Bx = { cubes: [], ropes: [], last: null, anim: null };
    if (isBox) {
      p.boxes.forEach((b, i) => {
        const c0 = b.c != null ? b.c : E.girlHue(p), cu = makeCube(.78, HUEX[c0]); cu.b = b; cu.col = c0; if (b.dash) addRocket(cu); dyn.add(cu.g); Bx.cubes.push(cu);
        if (b.n != null) {   // landmine boxes carry a mine on top: a flat dark disc with studs and a blinking red light
          const bomb = new THREE.Group(); bomb.position.y = cu.size + .06;
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(.26, .3, .1, 16), std(0x2a2034, { roughness: .4, metalness: .5 })); bomb.add(edges(disc, 0xff7eb6, .6));
          for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, st = new THREE.Mesh(new THREE.CylinderGeometry(.03, .04, .06, 6), std(0x9a8ab8)); st.position.set(Math.cos(a) * .2, .07, Math.sin(a) * .2); bomb.add(st); }
          const spark = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), additive(0xff3050, .95)); spark.position.set(0, .08, 0); bomb.add(spark);
          anim.flames.push(spark); spark.visible = true; cu.g.add(bomb); cu.bomb = bomb;
        }
        if (b.die) {   // a die: each face shows its pips
          const c = cu.body.children[0]; cu.dieMats = [0, 1, 2, 3, 4, 5].map(() => std(0xffffff, { emissive: HUEX[c0], emissiveIntensity: .06 }));
          c.material = cu.dieMats; cu.dieKey = '';
        }
        if (b.trail) {   // rope boxes wear a coil of their rope round the middle
          cu.coil = std(ROPEX(cu.col), { emissive: ROPEX(cu.col), emissiveIntensity: .4 });
          [-.12, .02, .16].forEach(yy => { const r = box(.82, .07, .82, cu.coil, 0, yy, 0); cu.body.add(r); });
        }
        const rg = new THREE.Group(); dyn.add(rg); Bx.ropes.push(rg);
      });
    }
    const ropeMatB = [0, 1, 2, 3, 4].map(c => std(ROPEX(c), { emissive: ROPEX(c), emissiveIntensity: .3 }));
    const booms = [];
    // a countdown ran out: the box bursts into glowing bits
    function boom(i, q) {
      const cu = Bx.cubes[i]; cu.g.visible = false; if (REDUCED) return;
      const at = new THREE.Vector3(q[0], 0, q[1]), bits = [];
      for (let k = 0; k < 26; k++) { const m = box(.12, .12, .12, basic(k % 3 ? HUEX[cu.col] : 0xffa040), at.x, .4, at.z); dyn.add(m); bits.push({ m, v: new THREE.Vector3((Math.random() - .5) * 5, 2 + Math.random() * 4, (Math.random() - .5) * 5) }); }
      const flash = new THREE.Mesh(new THREE.SphereGeometry(.5, 12, 8), additive(0xffd86e, .9)); flash.position.set(at.x, .4, at.z); dyn.add(flash);
      booms.push({ bits, flash, t0: performance.now(), i });
    }
    function stepBooms(now) {
      for (let j = booms.length - 1; j >= 0; j--) {
        const b = booms[j], t = (now - b.t0) / 1000;
        b.bits.forEach(q => { q.m.position.x += q.v.x * .016; q.m.position.z += q.v.z * .016; q.m.position.y = Math.max(.05, .4 + q.v.y * t - 6 * t * t); q.m.rotation.x += .2; q.m.rotation.y += .15; });
        b.flash.scale.setScalar(1 + t * 4); b.flash.material.opacity = Math.max(0, .9 - t * 2.2);
        if (t > 1.6) { b.bits.forEach(q => dyn.remove(q.m)); dyn.remove(b.flash); booms.splice(j, 1); }
      }
    }
    function syncBoxes(s, o = {}) {
      if (fx && o.cls !== 'win') { restore(); Bx.last = null; }
      if (s === Bx.last && (o.cls || '') === Bx.cls) return;
      if (s === Bx.last) { Bx.cls = o.cls || ''; Bx.cubes.forEach(cu => { cu.mat.emissiveIntensity = o.cls === 'win' ? .7 : cu.mat.emissiveIntensity; }); return; }
      const prev = Bx.last;
      const fwd = prev && s.inputs.length === prev.inputs.length + 1 && s.inputs.startsWith(prev.inputs) && s.tracks.every((t, i) => t.length >= prev.tracks[i].length);
      Bx.last = s; Bx.cls = o.cls || '';
      // ropes
      Bx.pieces = p.boxes.map((b, i) => {
        const rg = Bx.ropes[i]; rg.clear(); if (!b.trail) return [];
        return E.ropeSegs(s, i).map(([a, z]) => { const m = ropePiece(a, z, ropeMatB[s.col[i]], .2, .1, .05); rg.add(m); return m; });
      });
      const prevSegs = p.boxes.map((b, i) => b.trail && prev && prev.ropes ? E.ropeSegs(prev, i).length : 0);
      Bx.cubes.forEach((cu, i) => {
        const left = s.left[i], col = s.col[i], onG = (p.exit || []).some(g => g[0] === s.pos[i][0] && g[1] === s.pos[i][1] && (g[2] == null || g[2] === col));
        if (cu.col !== col && !cu.dieMats) { cu.col = col; cu.mat.color.setHex(HUEX[col]); cu.mat.emissive.setHex(HUEX[col]); if (cu.coil) { cu.coil.color.setHex(ROPEX(col)); cu.coil.emissive.setHex(ROPEX(col)); } }
        setDecal(cu, cu.b.m && cu.b.m !== 'same' ? cu.b.m : '', left);
        cu.mat.emissiveIntensity = o.cls === 'win' ? .7 : onG ? .35 : .08;
        if (s.dead === i) { if (cu.g.visible && !(prev && prev.dead === i)) boom(i, s.pos[i]); cu.g.visible = false; } else cu.g.visible = true;
      });
      const occupied = new Set(s.pos.map(q => q.join(',')));
      anim.pulse.forEach(pu => { if (pu.at) pu.on = occupied.has(pu.at); });
      setLocks(s);
      // dice targets: the number wanted (faint), or the number printed there (green when right, red when wrong)
      dice3.forEach(t => {
        const got = s.stamp ? s.stamp.get(t.x + ',' + t.y) : undefined, k = got === undefined ? 'w' + t.v : (got === t.v ? 'ok' : 'bad' + got);
        if (k === t.key) return; t.key = k;
        const v = got || 1, fg = got === t.v ? '#1f8a4c' : '#c0283a', P = { 1: [[.5, .5]], 2: [[.3, .3], [.7, .7]], 3: [[.3, .3], [.5, .5], [.7, .7]], 4: [[.3, .3], [.7, .3], [.3, .7], [.7, .7]], 5: [[.3, .3], [.7, .3], [.5, .5], [.3, .7], [.7, .7]], 6: [[.3, .27], [.7, .27], [.3, .5], [.7, .5], [.3, .73], [.7, .73]] }[v];
        if (t.m.material.map) t.m.material.map.dispose();
        t.m.material.map = canvasTex(128, 128, (g, w, h) => {
          // a white canvas tile: blank until the die prints on it (green pips = what the brief wants, red = wrong)
          g.fillStyle = '#f8f4ff'; g.fillRect(4, 4, w - 8, h - 8);
          if (got !== undefined) { g.strokeStyle = got === t.v ? '#7be3a4' : '#ff4d5e'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = fg; P.forEach(([a, b2]) => { g.beginPath(); g.arc(a * w, b2 * h, 11, 0, 7); g.fill(); }); }
        });
        t.m.material.needsUpdate = true;
      });
      const N = E.boxNeed(p, s), dark = new Set(N.lights);
      { const tn = new Map(N.touch.map(q => [q.i, q.c]));
        const ropeAt = k => s.trail.has(k) || s.pos.some((q, b) => p.boxes[b].trail && q[0] + ',' + q[1] === k);
        touch3.forEach((t, i) => {
          const c = tn.has(i) ? tn.get(i) : t.n, col = c === t.n ? '#7be3a4' : c > t.n ? '#ff4d5e' : '#ffd65e', frame = c === t.n ? '#7be3a4' : c > t.n ? '#ff4d5e' : '#ffc94d';
          const on = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => ropeAt((t.x + dx) + ',' + (t.y + dy)));
          const k = col + on.join(); if (k === t.key) return; t.key = k;
          if (t.scr.material.map) t.scr.material.map.dispose();
          t.scr.material.map = canvasTex(128, 128, (g, w, h) => {
            g.fillStyle = '#3a2410'; g.fillRect(0, 0, w, h); g.strokeStyle = frame; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
            g.fillStyle = '#170c05'; g.fillRect(34, 34, 60, 60);
            g.lineCap = 'round'; g.lineWidth = 9;
            [[44, 20, 84, 20], [108, 44, 108, 84], [44, 108, 84, 108], [20, 44, 20, 84]].forEach(([a, b, c2, d], j) => { g.strokeStyle = on[j] ? (c === t.n ? '#7be3a4' : c > t.n ? '#ff4d5e' : '#ffe27a') : '#5a4020'; g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); });
            g.fillStyle = col; g.font = 'bold 58px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(t.n), w / 2, h / 2 + 3);
          });
          t.scr.material.needsUpdate = true;
        }); }
      lights3.forEach((l, i) => { const on = !dark.has(i); l.mat.emissiveIntensity = on ? 1.2 : 0; l.mat.color.setHex(on ? 0xfff1b8 : 0x6a5a3a); l.glow.material.opacity = on ? .45 : 0; });
      refreshNums(s.rope.size ? s.rope : null, {});
      fragDec.forEach((dec, k) => { dec.material.opacity = s.frg && s.frg.has(k) ? 1 : 0; });
      tiles3.forEach((t, k) => { const gone = s.crk.has(k); if (gone && !t.userData.gone) { t.userData.gone = performance.now(); fallers.push(t); } if (!gone && t.userData.gone) { t.userData.gone = 0; t.visible = true; t.position.y = -.35; } });
      if (fwd && !REDUCED) {
        // ticks per box: every plain step is one tick; a portal jump rides along in the same tick
        const ticks = s.tracks.map((t, i) => {
          const from = prev.tracks[i].length - 1, J = s.jumps[i], out = [];
          for (let k = from + 1; k < t.length; k++) { if (J[k]) { if (out.length) out[out.length - 1].warp = t[k]; continue; } out.push({ a: t[k - 1], b: t[k], k: prevSegs[i] + out.length }); }
          return out;
        });
        const n = Math.max(...ticks.map(t => t.length));
        if (n > 0) {
          Bx.anim = { ticks, n, t: performance.now(), dur: n > 1 ? 85 : 170, from: prevSegs };
          Bx.pieces.forEach((ps, i) => ps.forEach((m, k) => { if (m && k >= Bx.anim.from[i]) m.visible = false; }));
          // rockets turn to face their flight
          Bx.cubes.forEach((cu, i) => { const tk = ticks[i][0]; if (cu.pack && tk) cu.pack.rotation.y = yawOf(tk.b[0] - tk.a[0], tk.b[1] - tk.a[1]); });
          return;
        }
      }
      Bx.anim = null; placeBoxes(s);
    }
    // pip textures in the die's colour, made once per value
    const pipTex = {};
    function pipMap(v, col) {
      const k = v + '|' + col; if (pipTex[k]) return pipTex[k];
      const hex = '#' + col.toString(16).padStart(6, '0'), P = { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.27, .27], [.5, .5], [.73, .73]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.27, .27], [.73, .27], [.5, .5], [.27, .73], [.73, .73]], 6: [[.27, .25], [.73, .25], [.27, .5], [.73, .5], [.27, .75], [.73, .75]] }[v];
      return (pipTex[k] = canvasTex(128, 128, (g, w, h) => { g.fillStyle = hex; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1024'; P.forEach(([a, b2]) => { g.beginPath(); g.arc(a * w, b2 * h, 12, 0, 7); g.fill(); }); }));
    }
    function setDie(cu, d) {
      if (!cu.dieMats || !d) return; const k = d.join(''); if (k === cu.dieKey) return; cu.dieKey = k;
      [d[2], 7 - d[2], d[0], 7 - d[0], d[1], 7 - d[1]].forEach((v, f) => { cu.dieMats[f].map = pipMap(v, HUEX[cu.col]); cu.dieMats[f].color.setHex(0xffffff); cu.dieMats[f].needsUpdate = true; });
    }
    function placeBoxes(s) {
      Bx.cubes.forEach((cu, i) => setDie(cu, s.dice && s.dice[i]));
      Bx.cubes.forEach((cu, i) => { const q = s.pos[i]; cu.g.visible = s.dead !== i; cu.g.position.set(q[0], 0, q[1]); cu.body.quaternion.identity(); cu.body.position.y = cu.size / 2; cu.body.scale.setScalar(1); cu.body.rotation.z = 0; if (cu.flames) cu.flames.forEach(f => f.visible = false); });
    }
    const fallers = [];
    function stepFall(now) {
      for (let j = fallers.length - 1; j >= 0; j--) { const t = fallers[j]; if (!t.userData.gone) { fallers.splice(j, 1); continue; } const u = (now - t.userData.gone) / 1000; t.position.y = -.35 - 6 * u * u; t.rotation.z = u * .8; if (u > .7) { t.visible = false; t.rotation.z = 0; fallers.splice(j, 1); } }
      tiles3.forEach(t => { if (t.userData.gone && !fallers.includes(t)) { t.visible = false; } else if (!t.userData.gone) t.rotation.z = 0; });
    }
    function stepBoxes(now) {
      const A = Bx.anim; if (!A) return;
      const u = Math.max(0, (now - A.t) / A.dur);
      if (u >= A.n) { Bx.anim = null; Bx.pieces.forEach(ps => ps.forEach(m => { if (m) { m.visible = true; m.scale.x = m.userData.len; } })); placeBoxes(Bx.last); return; }
      const k = Math.floor(u), w = u - k;
      Bx.cubes.forEach((cu, i) => {
        const T = A.ticks[i], b = cu.b;
        T.forEach((tk, j) => { const m = Bx.pieces[i] && Bx.pieces[i][tk.k]; if (m) { m.visible = j <= k; m.scale.x = m.userData.len * (j < k ? 1 : j === k ? w : 0); } });
        const flying = b.dash || T.length > 1;
        if (cu.flames) cu.flames.forEach(f => f.visible = k < T.length);
        if (k >= T.length) { const end = T.length ? (T[T.length - 1].warp || T[T.length - 1].b) : Bx.last.pos[i]; cu.g.position.set(end[0], 0, end[1]); cu.body.quaternion.identity(); cu.body.position.y = cu.size / 2; cu.body.scale.setScalar(1); return; }
        const tk = T[k];
        if (tk.warp) {
          if (w < .5) { tumble(cu, tk.a, tk.b, w * 2, !flying); cu.body.scale.setScalar(Math.max(.05, 1 - w * 2)); }
          else { cu.g.position.set(tk.warp[0], 0, tk.warp[1]); cu.body.quaternion.identity(); cu.body.scale.setScalar(Math.max(.05, (w - .5) * 2)); }
          return;
        }
        cu.body.scale.setScalar(1);
        if (flying) {
          const dx = tk.b[0] - tk.a[0], dz = tk.b[1] - tk.a[1];
          cu.g.position.set(tk.a[0] + dx * w, 0, tk.a[1] + dz * w); cu.body.quaternion.identity();
          cu.body.position.y = cu.size / 2 + (b.dash ? .1 : .02);
        } else tumble(cu, tk.a, tk.b, w, true);
      });
    }

    /* ---------- win: the pieces shoot up into the sky, then the level breaks apart ---------- */
    let fx = null;
    function winFx() {
      if (fx || REDUCED) return;
      const flyers = isBox ? Bx.cubes.map(c => c.g) : L.heads.map(h => h.g);
      const parts = [...world.children, ...dyn.children.filter(o => !flyers.includes(o))].map(o => ({ o, p0: o.position.clone(), r0: o.rotation.clone(), s0: o.scale.clone(),
        v: new THREE.Vector3((o.position.x - cx) * .9 + (Math.random() - .5) * 2, 1.5 + Math.random() * 3, (o.position.z - cz) * .9 + (Math.random() - .5) * 2),
        w: new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(6), delay: .45 + Math.random() * .25 + Math.hypot(o.position.x - cx, o.position.z - cz) * .04 }));
      fx = { t0: performance.now(), flyers: flyers.map(o => ({ o, p0: o.position.clone(), r0: o.rotation.clone() })), parts };
    }
    function stepFx(now) {
      const t = (now - fx.t0) / 1000;
      fx.flyers.forEach((f, i) => { const u = Math.max(0, t - i * .06); f.o.position.y = f.p0.y + (u < .12 ? -u * .8 : 8 * Math.pow(u - .12, 2) * 3); f.o.rotation.y = f.r0.y + u * 9; });
      fx.parts.forEach(q => {
        const u = t - q.delay; if (u <= 0) return;
        q.o.position.set(q.p0.x + q.v.x * u, q.p0.y + q.v.y * u - 9 * u * u, q.p0.z + q.v.z * u);
        q.o.rotation.set(q.r0.x + q.w.x * u, q.r0.y + q.w.y * u, q.r0.z + q.w.z * u);
        const k = Math.max(.001, 1 - u * .45); q.o.scale.set(q.s0.x * k, q.s0.y * k, q.s0.z * k);
      });
      if (t > 3.2) { fx.parts.forEach(q => q.o.visible = false); fx.flyers.forEach(f => f.o.visible = false); fx.done = true; }
    }
    function restore() {
      if (!fx) return;
      fx.parts.forEach(q => { q.o.position.copy(q.p0); q.o.rotation.copy(q.r0); q.o.scale.copy(q.s0); q.o.visible = true; });
      fx.flyers.forEach(f => { f.o.position.copy(f.p0); f.o.rotation.copy(f.r0); f.o.visible = true; });
      fx = null;
    }

    /* ---------- camera, size, loop ---------- */
    // fit the whole platform (and anything standing on it) inside the viewport, straight up the grid
    function fit() {
      const W = host.clientWidth || 400, H = host.clientHeight || 300;
      renderer.setPixelRatio(retro ? .65 : Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(W, H, false); cv.style.width = W + 'px'; cv.style.height = H + 'px';
      // dice panels: the brief floats on the right, so the board is fitted into the rest of the view
      const side = host.classList.contains('has-side') ? Math.min(170, W * .3) : 0, Wf = W - side;
      cam.clearViewOffset(); cam.aspect = Wf / H; cam.updateProjectionMatrix();
      const pitch = 58 * Math.PI / 180, pts = [], bx = [-.55, d.cols - .45], bz = [-.55, d.rows - .45];
      for (const x of bx) for (const z of bz) for (const y of [0, isBox ? .85 : .5]) pts.push(new THREE.Vector3(x, y, z));
      let dist = 12, tz = cz;
      const place = () => { cam.position.set(cx, dist * Math.sin(pitch), tz + dist * Math.cos(pitch)); cam.lookAt(cx, 0, tz); cam.updateMatrixWorld(); };
      for (let it = 0; it < 12; it++) {
        place(); let mx = 0, y0 = 9, y1 = -9;
        pts.forEach(v => { const q = v.clone().project(cam); mx = Math.max(mx, Math.abs(q.x)); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); });
        tz -= (y0 + y1) / 2 * (d.rows + 1) * .35;
        dist *= Math.max(mx, (y1 - y0) / 2) / .86;
      }
      place();
      if (side) { cam.setViewOffset(Wf, H, 0, 0, W, H); cam.updateProjectionMatrix(); }
    }
    const ro = new ResizeObserver(fit); ro.observe(host); fit();
    let fps = 0, frames = 0, fpsT = performance.now();
    function loop(now) {
      if (!alive) return;
      const t = (now - t0) / 1000;
      bg.grid.position.z = cz + (t * .8) % 2;
      anim.spin.forEach(m => { if (m.userData.y0 === undefined) m.userData.y0 = m.position.y; m.rotation.y = t * 2; m.position.y = m.userData.y0 + Math.sin(t * 2.4) * .06; });
      anim.pulse.forEach(pu => { pu.m.material.opacity = (pu.on ? pu.base * 2.6 : pu.base) * (.75 + .35 * Math.sin(t * 3.2)); });
      anim.breathe.forEach((r, i) => { const k = (t * .7 + i * .37) % 1; r.scale.set(1 + k * .55, 1, 1 + k * .55); r.children.forEach(c => c.material.opacity = .8 * (1 - k)); });
      gates3.forEach(gt => { gt.cur += (gt.want - gt.cur) * .2; gt.g.position.y = -gt.cur * (gt.H + .05); gt.g.visible = gt.cur < .88; });
      lights3.forEach(l => { if (l.glow.material.opacity > 0) l.glow.material.opacity = .35 + .15 * Math.sin(t * 3); });
      if (fx) stepFx(now);
      anim.flow.forEach(f => { f.m.mat.opacity = .35 + .65 * Math.max(0, Math.sin(t * 4 - f.i * 1.1)); });
      anim.flames.forEach(f => { if (f.visible) f.scale.set(1, .7 + Math.random() * .6, 1); });
      stepLine(now); stepBoxes(now); stepBooms(now); stepFall(now);
      renderer.render(scene, cam);
      frames++; if (now - fpsT > 1000) { fps = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now; }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // pointer → board coordinates (line panels can be dragged)
    const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
    function toBoard(e) {
      const r = cv.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
      return ray.ray.intersectPlane(plane, hit) ? [hit.x, hit.z] : [-99, -99];
    }
    return {
      canvas: cv, isBox, toBoard, winFx, restore, get exploding() { return !!fx; },
      syncLine, syncBoxes,
      busy: () => !!(L.anim || Bx.anim),
      fps: () => fps,
      setRetro(v) { retro = v; fit(); },
      get retro() { return retro; },
      dispose() { alive = false; ro.disconnect(); renderer.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); cv.remove(); },
    };
  }
  return { has, create, kit: { backdrop, canvasTex, std, basic, additive, edges, box, numTex } };
})();

/* glue: draw the current panel state into the 3D view */
function draw3D() {
  const V = PJ.view, p = PJ.p;
  if (p.boxes) { V.syncBoxes(PJ.bs, { cls: PJ.state === 'win' ? 'win' : '' }); return; }
  const bad = {};
  if (PJ.state === 'fail') PJ.bad.forEach(x => { if (x.kind === 'visitAll') bad.visitAll = true; else (bad[x.kind] = bad[x.kind] || new Set()).add(x.i); });
  const path = pjPath(), seen = new Set((path.length ? PanelEngine.lines(p, path).flat() : []).map(n => n.join(',')));
  const jump = PJ.st ? PJ.st.jump : [false], used = PanelEngine.usedEdges(p, path, jump);
  V.syncLine({ path, jump, cls: PJ.state === 'idle' ? 'idle' : PJ.state, hint: PJ.hint, bad, seen, used });
}
function drawSol3D() {
  const V = PJ.view, p = PJ.p, E = PanelEngine, k = PJ.solK;
  if (p.boxes) { V.syncBoxes(E.boxReplay(p, p.solIn.slice(0, k)), { cls: k === PJ.solData.n ? 'win' : '' }); return; }
  const { st, ends } = solMovesOf(p), upto = ends[k], pts = p.sol.slice(0, upto + 1);
  V.syncLine({ path: pts, jump: st.jump.slice(0, upto + 1), cls: 'sol', ghost: { path: p.sol, jump: st.jump }, seen: new Set(E.lines(p, pts).flat().map(n => n.join(','))), used: E.usedEdges(p, pts, st.jump.slice(0, upto + 1)) });
}
// a flash over the viewport
function pj3Flash(text, cls) {
  const vp = $('#pj-vp'); if (!vp) return;
  const el = document.createElement('div'); el.className = 'pj3-flash ' + cls; el.textContent = text; vp.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}
