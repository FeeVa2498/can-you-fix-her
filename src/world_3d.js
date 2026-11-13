/* =========================================================
   THE MAP IN 3D · her mind as one long floating level
   Same void and plates as the projector levels. You are a cube
   that rolls tile to tile; memories glow in her colour, seals are
   bars of light, gates are doors that slide apart.
   Falls back to the 2D map (owDraw) when WebGL isn't there.
   ========================================================= */
const OW3 = (() => {
  const ROLL_MS = 170;
  const hex = c => parseInt(c.slice(1), 16);
  function create(host, g) {
    const K = P3.kit, M = owBuild(g), T = OW_THEME[g], ACC = hex(T.acc);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    const cv = renderer.domElement; cv.className = 'ow3-canvas'; host.prepend(cv);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(36, 1, .1, 200);
    // the vaporwave void follows the camera sideways (the map is long)
    const before = scene.children.length, bg = K.backdrop(scene, 0, 0), bgG = new THREE.Group();
    scene.children.slice(before).forEach(o => bgG.add(o)); scene.add(bgG);
    const world = new THREE.Group(); scene.add(world);
    const plate = (top, side = 0x1c0f30) => { const s = K.std(side), t = K.std(top); return [s, s, t, s, s, s]; };
    const decal = (tex, size = .8, y = .352) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = y; return m; };
    const sprite = (tex, w, h) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.scale.set(w, h, 1); return s; };
    const label = (text, fg, w = 256, h = 96, px = 54) => K.canvasTex(w, h, (c, W, H) => {
      c.fillStyle = 'rgba(20,10,34,.86)'; c.strokeStyle = fg; c.lineWidth = 5;
      c.beginPath(); c.roundRect ? c.roundRect(4, 4, W - 8, H - 8, 18) : c.rect(4, 4, W - 8, H - 8); c.fill(); c.stroke();
      c.fillStyle = fg; c.font = `bold ${px}px "Courier New", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, W / 2, H / 2 + 3);
    });
    const anim = { pulse: [], spin: [] };

    /* ---- floor ---- */
    const F0 = hex(T.floor[0]), F1 = hex(T.floor[1]);
    for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) {
      const v = M.t[y * M.W + x]; if (!v) continue;
      const t = K.box(.96, .7, .96, plate((x + y) & 1 ? F1 : F0), x, -.35, y); world.add(K.edges(t, ACC, .28));
    }
    /* ---- memories ---- */
    const nodes3 = M.nodes.map(n => {
      const top = new THREE.MeshStandardMaterial({ color: ACC, emissive: ACC, emissiveIntensity: .5, roughness: .4, flatShading: true });
      const t = K.box(.9, .1, .9, top, n.x, .05, n.y); world.add(K.edges(t, 0xffffff, .6));
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), K.additive(ACC, .25)); glow.rotation.x = -Math.PI / 2; glow.position.set(n.x, .02, n.y); world.add(glow);
      const o = { n, top, t, glow, key: '', dec: null, tag: null };
      anim.pulse.push(o); return o;
    });
    function nodeFace(o) {
      const solved = !!owState(g).solved[o.n.pid], p = PANELS.find(q => q.id === o.n.pid), locked = g === 'ray' && rayLocked(o.n);
      const k = (solved ? 's' : 'o') + (locked ? 'l' : '') ; if (k === o.key) return; o.key = k;
      if (o.dec) { o.t.remove(o.dec); o.dec.material.map.dispose(); }
      o.dec = decal(K.numTex(solved ? '✓' : locked ? '×' : String(o.n.i + 1), solved ? '#c8f5da' : '#fff'), .78, .052); o.t.add(o.dec);
      o.top.color.setHex(solved ? 0x3a2a4a : ACC); o.top.emissive.setHex(solved ? 0x000000 : ACC);
      o.glow.visible = !solved;
      if (o.tag) { world.remove(o.tag); o.tag = null; }
      if (p && p.tut && !solved) { o.tag = sprite(label('NEW', '#ffd86e', 160, 72, 44), .7, .32); o.tag.position.set(o.n.x, .85, o.n.y); world.add(o.tag); anim.spin.push({ m: o.tag, bob: true }); }
    }
    /* ---- seals: bars of light ---- */
    const seals3 = M.seals.map(s => {
      const G = new THREE.Group(); G.position.set(s.x, 0, s.y);
      for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.1, .08), K.additive(ACC, .8)); b.position.set(0, .55, (i - 1) * .3); G.add(b); }
      world.add(G); return { s, G };
    });
    /* ---- gates: two doors in a frame, a lock with the key count ---- */
    const gates3 = M.gates.map(Gt => {
      const G = new THREE.Group(); G.position.set(Gt.x, 0, Gt.y); world.add(G);
      const fr = K.std(0x120818, { emissive: ACC, emissiveIntensity: .12 });
      [-1.5, 1.5].forEach(z => G.add(K.edges(K.box(.5, 2, .3, fr, 0, 1, z), ACC, .9)));
      G.add(K.edges(K.box(.5, .3, 3.3, fr, 0, 2.1, 0), ACC, .9));
      const dm = K.std(0x2a1636, { emissive: ACC, emissiveIntensity: .08 });
      const dA = K.edges(K.box(.22, 1.85, 1.35, dm, 0, .93, -.68), ACC, .6), dB = K.edges(K.box(.22, 1.85, 1.35, dm, 0, .93, .68), ACC, .6); G.add(dA, dB);
      const tag = sprite(label('', T.acc), 1.5, .56); tag.position.set(0, 2.75, 0); G.add(tag);
      return { Gt, G, dA, dB, tag, key: '', open: 0 };
    });
    /* ---- the core ---- */
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(.42), K.std(0xffffff, { emissive: ACC, emissiveIntensity: .6 }));
    core.position.set(M.core[0], .8, M.core[1]); K.edges(core, 0xffffff, .8); world.add(core);
    const coreGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), K.additive(ACC, .3)); coreGlow.rotation.x = -Math.PI / 2; coreGlow.position.set(M.core[0], .02, M.core[1]); world.add(coreGlow);
    /* ---- you: a cube that rolls ---- */
    const pl = new THREE.Group(), body = new THREE.Group(); pl.add(body); world.add(pl);
    const S0 = .72, cube = K.box(S0, S0, S0, K.std(ACC, { emissive: ACC, emissiveIntensity: .25 }), 0, 0, 0); K.edges(cube, 0xffffff, .95); body.add(cube);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(.42, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .01; pl.add(shadow);
    const AX = new THREE.Vector3();
    function placePlayer(now) {
      const o = owState(g); let x = o.x, z = o.y; body.quaternion.identity(); body.position.set(0, S0 / 2, 0);
      const A = OW.anim;
      if (A) {
        const k = Math.min(1, (now - A.t0) / ROLL_MS), [fx, fz] = A.from, [tx, tz] = A.to, dx = Math.sign(tx - fx), dz = Math.sign(tz - fz);
        AX.set(dz, 0, -dx).normalize();
        if (A.bump) {   // tips toward the wall and falls back
          const e = Math.sin(k * Math.PI); x = fx + (tx - fx) * e * .6; z = fz + (tz - fz) * e * .6;
          body.quaternion.setFromAxisAngle(AX, e * .35);
        } else {
          const e = k * k * (3 - 2 * k); x = fx + (tx - fx) * e; z = fz + (tz - fz) * e;
          body.quaternion.setFromAxisAngle(AX, e * Math.PI / 2);
          body.position.y = S0 / 2 + Math.sin(e * Math.PI) * S0 * .21;
        }
        if (k >= 1) OW.anim = null;
      }
      pl.position.set(x, 0, z); return [x, z];
    }

    /* ---- camera ---- */
    let W = 0, H = 0, camX = null, camZ = null;
    function fit() {
      W = host.clientWidth || 400; H = host.clientHeight || 300;
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
      renderer.setSize(W, H, false); cv.style.width = W + 'px'; cv.style.height = H + 'px';
      cam.aspect = W / H; cam.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(fit); ro.observe(host); fit();
    function placeCam(px, pz, now) {
      const half = Math.tan(cam.fov * Math.PI / 360), want = 8;   // about eight tiles across
      const dist = Math.max(want / (2 * half * cam.aspect), 7.2 / (2 * half)) * .95, pitch = 60 * Math.PI / 180;
      const viewW = 2 * half * cam.aspect * dist, lo = viewW / 2 - 1, hi = M.W - viewW / 2;
      let tx = lo < hi ? clamp(px, lo, hi) : (M.W - 1) / 2, tz = clamp(pz, OW_MID - 2.6, OW_MID + 2.6);
      if (camX == null) { camX = tx; camZ = tz; }
      camX += (tx - camX) * .12; camZ += (tz - camZ) * .08;
      const sh = OW.shake && now - OW.shake < 350 ? Math.sin((now - OW.shake) / 18) * .12 * (1 - (now - OW.shake) / 350) : 0;
      cam.position.set(camX + sh, dist * Math.sin(pitch), camZ + .6 + dist * Math.cos(pitch)); cam.lookAt(camX + sh, 0, camZ + .6);
      bgG.position.x = camX;
    }

    /* ---- per frame ---- */
    let alive = true; const t0 = performance.now();
    function frame(now = performance.now()) {
      if (!alive) return;
      const t = (now - t0) / 1000;
      bg.grid.position.z = (t * .8) % 2;
      nodes3.forEach((o, i) => { nodeFace(o); if (o.glow.visible) { const k = .55 + .45 * Math.sin(t * 2.4 + i); o.glow.material.opacity = .12 + .22 * k; o.top.emissiveIntensity = .35 + .35 * k; } });
      anim.spin.forEach(s => { if (s.m.parent) s.m.position.y = .85 + Math.sin(t * 3) * .05; });
      seals3.forEach((q, i) => { q.G.visible = !owPassable(g, q.s.x, q.s.y); q.G.children.forEach((b, j) => b.material.opacity = .55 + .3 * Math.sin(t * 4 + i + j)); });
      gates3.forEach(q => {
        const open = owGateOpen(g, q.Gt), fx = OW.gateFx && OW.gateFx.G === q.Gt ? Math.min(1, (now - OW.gateFx.t0) / 1200) : open ? 1 : 0;
        q.dA.position.z = -.68 - fx * 1.25; q.dB.position.z = .68 + fx * 1.25; q.dA.visible = q.dB.visible = fx < .98;
        const ks = owKeys(g)[q.Gt.layer - 1], txt = fx >= 1 ? `LAYER ${q.Gt.layer} ✓` : `🔒 ${ks.have}/${q.Gt.need}`;
        if (txt !== q.key) { q.key = txt; if (q.tag.material.map) q.tag.material.map.dispose(); q.tag.material.map = label(txt, fx >= 1 ? '#c8f5da' : T.acc); q.tag.material.needsUpdate = true; }
      });
      const coreOn = S.g[g].layer >= 3; core.rotation.y = t * 1.2; core.position.y = .8 + Math.sin(t * 2) * .08; core.material.emissiveIntensity = coreOn ? .9 : .25; coreGlow.visible = coreOn;
      const [px, pz] = placePlayer(now);
      placeCam(px, pz, now);
      renderer.render(scene, cam);
    }
    return {
      frame,
      dispose() { alive = false; ro.disconnect(); renderer.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); }); cv.remove(); },
    };
  }
  return { create, ROLL_MS };
})();
