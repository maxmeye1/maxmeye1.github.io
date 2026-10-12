/* Projects page.
   - Scatters the project paisleys (the <article class="paisley"> elements) across
     the page like a printed textile, and fills the gaps with smaller ornate
     paisleys and sprigs that never overlap and rustle as the mouse passes.
   - Clicking a project breaks its border at the tip and unrolls every layer of
     the ornament into the nested frame of a panel; the others move out of the way. */
(function () {
    const NS = 'http://www.w3.org/2000/svg';
    const field = document.getElementById('field');
    const projects = Array.prototype.slice.call(field.querySelectorAll('.paisley'));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- geometry helpers ---------- */

    /* Paisley outlines in a 200 x 220 box, each starting at the tip (the break point):
       classic, slender, long-tailed, squat and slim. */
    const OUTLINES = [
        'M180 20 C160 28 152 44 160 62 C172 94 192 120 190 150 C188 186 150 212 100 212 C46 212 10 174 10 124 C10 74 44 40 90 28 C122 20 150 8 180 20 Z',
        'M172 10 C152 22 146 44 152 66 C162 102 176 138 170 168 C162 200 134 214 104 212 C68 210 44 184 42 148 C40 106 60 66 94 40 C118 22 144 4 172 10 Z',
        'M192 46 C176 34 156 36 148 54 C140 74 156 96 164 124 C176 166 152 208 104 212 C58 216 22 188 20 148 C18 108 46 74 82 56 C118 38 158 22 192 46 Z',
        'M186 64 C168 56 150 62 146 80 C142 98 158 112 162 136 C168 176 140 210 98 212 C52 214 16 186 16 148 C16 108 48 82 88 72 C124 62 160 48 186 64 Z',
        'M166 6 C148 18 142 40 148 64 C158 106 166 150 154 180 C142 206 122 216 102 212 C76 206 62 182 62 150 C62 104 80 60 110 32 C128 16 146 0 166 6 Z'
    ];
    const N = 240;                      // points per layer

    /* Ornament layers, outermost first. `s` = scale inside the paisley,
       `inset` = distance in from the panel edge once unrolled (in ornament units). */
    const LAYERS = [
        { k: 'outline', s: 1.00, inset: 0 },
        { k: 'dots',    s: 0.90, inset: 6,  count: 72 },
        { k: 'line',    s: 0.82, inset: 10 },
        { k: 'leaves',  s: 0.72, inset: 15, count: 34 },
        { k: 'dash',    s: 0.63, inset: 20 },
        { k: 'medal',   s: 0.55, inset: 24 },
        { k: 'beads',   s: 0.50, inset: 27, count: 24 },
        { k: 'petals',  s: 0.45, inset: 30, count: 22 },
        { k: 'dots2',   s: 0.40, inset: 33, count: 36 }
    ];

    const scratch = document.createElementNS(NS, 'svg');
    scratch.setAttribute('aria-hidden', 'true');
    scratch.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    document.body.appendChild(scratch);

    function sample(d, n) {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', d);
        scratch.appendChild(p);
        const len = p.getTotalLength(), pts = [];
        for (let i = 0; i < n; i++) {
            const q = p.getPointAtLength(len * i / (n - 1));
            pts.push({ x: q.x, y: q.y });
        }
        scratch.removeChild(p);
        return pts;
    }
    function area(pts) {
        let a = 0;
        for (let i = 0; i < pts.length - 1; i++) a += pts[i].x * pts[i + 1].y - pts[i + 1].x * pts[i].y;
        return a / 2;
    }
    function f1(v) { return v.toFixed(1); }
    function line(pts, close) {
        let d = '';
        for (let i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + f1(pts[i].x) + ' ' + f1(pts[i].y);
        return d + (close ? 'Z' : '');
    }

    /* Inner layers are true inward offsets of the outline: every point moves in by
       the same distance, and the stretch of the tail too thin for that depth is
       dropped, so each ring is a smaller paisley nested inside the last and none
       of them cross at the cusp. */
    function resample(pts, n) {
        const L = [0];
        for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
        const T = L[L.length - 1], out = [];
        let j = 0;
        for (let k = 0; k < n; k++) {
            const t = T * k / (n - 1);
            while (j < L.length - 2 && L[j + 1] < t) j++;
            const f = (t - L[j]) / ((L[j + 1] - L[j]) || 1);
            out.push({ x: pts[j].x + (pts[j + 1].x - pts[j].x) * f, y: pts[j].y + (pts[j + 1].y - pts[j].y) * f });
        }
        return out;
    }
    function offsetRing(pts, d) {
        if (d <= 0) return { pts: pts, chord: 0 };
        const n = pts.length, o = Math.sign(area(pts)), raw = [];
        for (let i = 0; i < n - 1; i++) {
            const a = pts[(i - 5 + n - 1) % (n - 1)], b = pts[(i + 5) % (n - 1)];
            const tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
            raw.push({ x: pts[i].x - o * ty / l * d, y: pts[i].y + o * tx / l * d });
        }
        const m = raw.length;
        const good = raw.map(function (q) {
            if (!inside(pts, q.x, q.y)) return false;
            let md = Infinity;
            for (let k = 0; k < pts.length; k++) md = Math.min(md, Math.hypot(pts[k].x - q.x, pts[k].y - q.y));
            return md >= d * 0.96;
        });
        // Keep the longest unbroken run (it starts just past the tip, so the break point stays at the tip end).
        let best = [], cur = [];
        for (let k = 0; k < 2 * m; k++) {
            const i = k % m;
            if (good[i]) { cur.push(raw[i]); if (cur.length > best.length) best = cur.slice(); } else cur = [];
            if (cur.length >= m) break;
        }
        if (best.length < 8) return null;
        const chord = Math.hypot(best[0].x - best[best.length - 1].x, best[0].y - best[best.length - 1].y);
        best.push(best[0]);
        return { pts: resample(best, n), chord: chord };
    }
    function inside(pts, x, y) {
        let c = false;
        for (let i = 0, k = pts.length - 1; i < pts.length; k = i++) {
            if ((pts[i].y > y) !== (pts[k].y > y) && x < (pts[k].x - pts[i].x) * (y - pts[i].y) / (pts[k].y - pts[i].y) + pts[i].x) c = !c;
        }
        return c;
    }
    const SHAPES = OUTLINES.map(function (d) {
        const base = sample(d, N);
        // Collision shape: the largest circles that fit inside, greedily, plus the curl.
        const cands = [];
        for (let x = 4; x < 200; x += 5) for (let y = 4; y < 220; y += 5) {
            if (!inside(base, x, y)) continue;
            let r = Infinity;
            base.forEach(function (p) { r = Math.min(r, Math.hypot(p.x - x, p.y - y)); });
            cands.push({ x: x, y: y, r: r });
        }
        cands.sort(function (p, q) { return q.r - p.r; });
        const hull = [];
        cands.forEach(function (c) {
            if (hull.length >= 9 || c.r < 6) return;
            if (hull.some(function (h) { return Math.hypot(h.x - c.x, h.y - c.y) + c.r * 0.45 < h.r; })) return;
            hull.push(c);
        });
        const centre = { x: hull[0].x, y: hull[0].y }, R = hull[0].r;
        hull.push({ x: base[0].x + 8, y: base[0].y + 10, r: 13 });          // the tendril
        // Go as deep as the shape allows before the innermost ring would need a long straight closing edge.
        let dmax = R * 0.8;
        for (; dmax > 10; dmax -= 2) { const t = offsetRing(base, dmax); if (t && t.chord < R * 0.3) break; }
        const DEEP = 1 - LAYERS[LAYERS.length - 1].s;
        return {
            base: base,
            C: centre,
            R: R,
            room: R - dmax * 0.95,                                         // plain space left in the middle
            local: LAYERS.map(function (L) {
                const t = offsetRing(base, (1 - L.s) / DEEP * dmax * 0.95);
                return t ? t.pts : base;
            }),
            // project paisleys stop a little shallower, leaving room for their names
            localP: LAYERS.map(function (L) {
                const t = offsetRing(base, (1 - L.s) / DEEP * dmax * 0.6);
                return t ? t.pts : base;
            }),
            hull: hull.map(function (h) { return [h.x - centre.x, h.y - centre.y, h.r + 6]; })
        };
    });
    /* Where a project's name goes: the roomiest point inside its innermost ring. */
    SHAPES.forEach(function (sh) {
        const ring = sh.localP[sh.localP.length - 1];
        let best = { x: sh.C.x, y: sh.C.y, r: 0 };
        for (let x = 0; x < 200; x += 2) for (let y = 0; y < 220; y += 2) {
            if (!inside(ring, x, y)) continue;
            let r = Infinity;
            for (let i = 0; i < ring.length; i += 2) r = Math.min(r, Math.hypot(ring[i].x - x, ring[i].y - y));
            if (r > best.r) best = { x: x, y: y, r: r };
        }
        sh.N = best;
    });
    const C = { x: 100, y: 132 };       // where the motifs below are drawn; moved onto each shape's centre

    /* Tendril that curls off the tip, as offsets from the tip. */
    const CURL = (function () {
        const pts = [{ x: 0, y: 0 }], cx = 8, cy = 10, r0 = 11, turns = 1.4, steps = 56;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps, a = -2.2 + t * turns * Math.PI * 2, r = r0 * (1 - t * 0.85);
            pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }
        return pts;
    })();

    function matrixFor(node, w, ox, oy) {
        const c = SHAPES[node.shape].C;
        return new DOMMatrix().translate(ox || 0, oy || 0).scale(w / 200).translate(c.x, c.y)
            .rotate(node.rot).scale(node.mir ? -1 : 1, 1).translate(-c.x, -c.y);
    }
    function rings(node) { return node.kind === 'project' ? SHAPES[node.shape].localP : SHAPES[node.shape].local; }
    function mapAll(m, pts) {
        return pts.map(function (p) { const q = m.transformPoint(new DOMPoint(p.x, p.y)); return { x: q.x, y: q.y }; });
    }
    function paisleyLayers(node, w, ox, oy) {
        const m = matrixFor(node, w, ox, oy);
        return rings(node).map(function (pts) { return mapAll(m, pts); });
    }
    function rectD(x0, y0, w, h) {
        const r = Math.max(2, Math.min(18, w / 6, h / 6)), x1 = x0 + w, y1 = y0 + h;
        return 'M' + (x0 + r) + ' ' + y0 + 'H' + (x1 - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + x1 + ' ' + (y0 + r) +
               'V' + (y1 - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x1 - r) + ' ' + y1 +
               'H' + (x0 + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + x0 + ' ' + (y1 - r) +
               'V' + (y0 + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x0 + r) + ' ' + y0 + 'Z';
    }
    /* Panel frame layers, each starting nearest its paisley layer's start and running the same way round. */
    function panelLayers(w, h, ox, oy, u, like) {
        return LAYERS.map(function (L, li) {
            const i = 2 + L.inset * u;
            let pts = sample(rectD(ox + i, oy + i, w - 2 * i, h - 2 * i), N).slice(0, N - 1);
            const ref = like[li];
            if (Math.sign(area(pts.concat([pts[0]]))) !== Math.sign(area(ref))) pts.reverse();
            let best = 0, bd = Infinity;
            pts.forEach(function (p, n) { const d = Math.hypot(p.x - ref[0].x, p.y - ref[0].y); if (d < bd) { bd = d; best = n; } });
            pts = pts.slice(best).concat(pts.slice(0, best));
            pts.push({ x: pts[0].x, y: pts[0].y });
            return pts;
        });
    }

    /* ---------- drawing: the same routine draws paisleys, panels and every frame in between ---------- */

    function pick(pts, count) {
        const out = [];
        for (let j = 0; j < count; j++) out.push(Math.round(j * (pts.length - 1) / count));
        return out;
    }
    function draw(layers, u, curlVecs, closed, dens) {
        dens = dens || 1;
        function cnt(c) { return Math.max(8, Math.round(c * dens)); }
        let s = '';
        const orient = Math.sign(area(layers[0])) || 1;
        layers.forEach(function (pts, li) {
            const k = LAYERS[li].k;
            if (k === 'outline') {
                // Scalloped fringe riding just outside the border.
                const idx = pick(pts, cnt(58));
                let fr = '', beads = '';
                for (let j = 0; j < idx.length; j++) {
                    const a = pts[idx[j]], b = pts[idx[(j + 1) % idx.length]];
                    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
                    const nx = orient * dy / l, ny = -orient * dx / l;
                    const mx = (a.x + b.x) / 2 + nx * 6 * u, my = (a.y + b.y) / 2 + ny * 6 * u;
                    if (!closed && j === idx.length - 1) break;            // leave the break open
                    fr += 'M' + f1(a.x) + ' ' + f1(a.y) + 'Q' + f1(mx) + ' ' + f1(my) + ' ' + f1(b.x) + ' ' + f1(b.y);
                    if (j % 2 === 0) beads += '<circle class="o-dot" cx="' + f1(mx + nx * 3.5 * u) + '" cy="' + f1(my + ny * 3.5 * u) + '" r="' + f1(0.9 * u) + '"/>';
                }
                s += '<path class="o-fill" stroke-width="' + f1(1.4 * u) + '" d="' + line(pts, closed) + '"/>';
                s += '<path class="o-fringe" stroke-width="' + f1(0.9 * u) + '" d="' + fr + '"/>' + beads;
            } else if (k === 'dots' || k === 'beads' || k === 'dots2') {
                const r = (k === 'dots' ? 1.1 : k === 'dots2' ? 0.75 : 0.6) * u;
                pick(pts, cnt(LAYERS[li].count)).forEach(function (n) {
                    s += '<circle class="o-dot" cx="' + f1(pts[n].x) + '" cy="' + f1(pts[n].y) + '" r="' + f1(r) + '"/>';
                });
            } else if (k === 'leaves') {
                pick(pts, cnt(LAYERS[li].count)).forEach(function (n, j) {
                    const a = pts[n], b = pts[Math.min(n + 3, pts.length - 1)];
                    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + (j % 2 ? 28 : -28);
                    s += '<path class="o-leaf" transform="translate(' + f1(a.x) + ' ' + f1(a.y) + ') rotate(' + ang.toFixed(0) + ') scale(' + u.toFixed(3) + ')" d="M-4.5 0Q0 -3 4.5 0Q0 3 -4.5 0Z"/>';
                });
            } else if (k === 'petals') {
                // Small petals standing on the inner ring, pointing in toward the centre.
                pick(pts, cnt(LAYERS[li].count)).forEach(function (n) {
                    const a = pts[n], b = pts[Math.min(n + 3, pts.length - 1)];
                    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 90 * orient;
                    s += '<path class="o-leaf" transform="translate(' + f1(a.x) + ' ' + f1(a.y) + ') rotate(' + ang.toFixed(0) + ') scale(' + (u * 0.8).toFixed(3) + ')" d="M0 0Q2.6 -3 0 -7Q-2.6 -3 0 0Z"/>';
                });
            } else if (k === 'line') {
                s += '<path class="o-line" stroke-width="' + f1(0.7 * u) + '" d="' + line(pts, closed) + '"/>';
            } else if (k === 'dash') {
                s += '<path class="o-dash" stroke-width="' + f1(0.8 * u) + '" stroke-dasharray="' + f1(2 * u) + ' ' + f1(3 * u) + '" d="' + line(pts, closed) + '"/>';
            } else if (k === 'medal') {
                s += '<path class="o-medal" stroke-width="' + f1(0.9 * u) + '" d="' + line(pts, closed) + '"/>';
            }
        });
        if (curlVecs) {
            const tip = layers[0][0];
            s += '<path class="o-curl" stroke-width="' + f1(1.3 * u) + '" d="' + line(curlVecs.map(function (v) { return { x: tip.x + v.x, y: tip.y + v.y }; })) + '"/>';
        }
        return s;
    }
    function curlFor(m) {               // tendril offsets under a paisley's rotation/mirror
        return CURL.map(function (v) { return { x: m.a * v.x + m.c * v.y, y: m.b * v.x + m.d * v.y }; });
    }
    function curlPanel(u, tip, w, h, ox, oy) {   // in a panel the tendril curls inward from its corner
        const sx = tip.x > (ox || 0) + w / 2 ? -1 : 1, sy = tip.y > (oy || 0) + h / 2 ? -1 : 1;
        return CURL.map(function (v) { return { x: sx * v.x * u * 0.8, y: sy * v.y * u * 0.8 }; });
    }


    /* Centre motifs for the filler paisleys, drawn in the 200 x 220 local box. */
    function petal(cx, cy, ang, rx, ry, cls) {
        return '<ellipse class="' + cls + '" cx="0" cy="0" rx="' + rx + '" ry="' + ry + '" transform="translate(' + f1(cx) + ' ' + f1(cy) + ') rotate(' + ang.toFixed(0) + ')"/>';
    }
    const MOTIFS = [
        function rosette() {
            let s = '';
            for (let k = 0; k < 8; k++) {
                const a = k * Math.PI / 4;
                s += petal(C.x + Math.cos(a) * 15, C.y + Math.sin(a) * 15, a * 180 / Math.PI, 9, 4, 'm-petal');
            }
            for (let k = 0; k < 14; k++) {
                const a = k * Math.PI / 7;
                s += '<circle class="m-dot" cx="' + f1(C.x + Math.cos(a) * 29) + '" cy="' + f1(C.y + Math.sin(a) * 29) + '" r="1.8"/>';
            }
            return s + '<circle class="m-core" cx="' + C.x + '" cy="' + C.y + '" r="5"/>';
        },
        function nested() {
            let s = '';
            [0.42, 0.31].forEach(function (k) {
                s += '<path class="m-line" d="' + line(SHAPES[0].base.map(function (p) { return { x: C.x + (p.x - C.x) * k, y: C.y + (p.y - C.y) * k }; }), true) + '"/>';
            });
            s += '<path class="m-core" d="' + line(SHAPES[0].base.map(function (p) { return { x: C.x + (p.x - C.x) * 0.17, y: C.y + (p.y - C.y) * 0.17 }; }), true) + '"/>';
            return s;
        },
        function seeds() {
            let s = '<circle class="m-core" cx="' + C.x + '" cy="' + C.y + '" r="3.5"/>';
            [[10, 6], [19, 12], [28, 18]].forEach(function (ring) {
                for (let k = 0; k < ring[1]; k++) {
                    const a = k * 2 * Math.PI / ring[1] + ring[0];
                    s += '<circle class="m-dot" cx="' + f1(C.x + Math.cos(a) * ring[0]) + '" cy="' + f1(C.y + Math.sin(a) * ring[0]) + '" r="' + (ring[0] === 28 ? 1.4 : 2) + '"/>';
                }
            });
            return s;
        },
        function sprigInside() {
            let s = '<path class="m-line" d="M' + (C.x - 4) + ' ' + (C.y + 30) + 'Q' + (C.x + 10) + ' ' + C.y + ' ' + (C.x - 2) + ' ' + (C.y - 26) + '"/>';
            [[-18, 8], [16, -2], [-14, -12], [12, 16]].forEach(function (l, k) {
                s += petal(C.x + l[0] * 0.6, C.y + l[1], (k % 2 ? -40 : 40), 8, 3.2, 'm-petal');
            });
            return s + '<circle class="m-core" cx="' + (C.x - 2) + '" cy="' + (C.y - 28) + '" r="4"/>';
        }
    ].map(function (fn) { return fn(); });

    function sprigSVG(w, variant) {
        const c = w / 2, r = w / 2;
        let s = '';
        if (variant === 0) {                    // five-petal flower
            for (let k = 0; k < 5; k++) {
                const a = k * 2 * Math.PI / 5 - Math.PI / 2;
                s += '<ellipse class="m-petal" cx="0" cy="0" rx="' + f1(r * 0.42) + '" ry="' + f1(r * 0.2) + '" transform="translate(' + f1(c + Math.cos(a) * r * 0.48) + ' ' + f1(c + Math.sin(a) * r * 0.48) + ') rotate(' + (a * 180 / Math.PI).toFixed(0) + ')"/>';
            }
            s += '<circle class="m-core" cx="' + f1(c) + '" cy="' + f1(c) + '" r="' + f1(r * 0.18) + '"/>';
        } else if (variant === 1) {             // trio of dots
            for (let k = 0; k < 3; k++) {
                const a = k * 2 * Math.PI / 3 - Math.PI / 2;
                s += '<circle class="m-dot" cx="' + f1(c + Math.cos(a) * r * 0.45) + '" cy="' + f1(c + Math.sin(a) * r * 0.45) + '" r="' + f1(r * 0.24) + '"/>';
            }
        } else {                                // little leaf pair
            s += '<ellipse class="m-petal" cx="0" cy="0" rx="' + f1(r * 0.55) + '" ry="' + f1(r * 0.2) + '" transform="translate(' + f1(c - r * 0.3) + ' ' + f1(c) + ') rotate(-35)"/>';
            s += '<ellipse class="m-petal" cx="0" cy="0" rx="' + f1(r * 0.55) + '" ry="' + f1(r * 0.2) + '" transform="translate(' + f1(c + r * 0.3) + ' ' + f1(c) + ') rotate(35)"/>';
            s += '<circle class="m-core" cx="' + f1(c) + '" cy="' + f1(c + r * 0.05) + '" r="' + f1(r * 0.14) + '"/>';
        }
        return s;
    }

    /* ---------- nodes ---------- */

    function rng(seed) {
        return function () {
            seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const SIZES = [1.08, 0.9, 1, 0.84, 1.12, 0.94, 0.88, 1.04];
    const nodes = projects.map(function (el, i) {
        const r = rng(i * 977 + 13);
        const shape = [0, 1, 2, 0, 3, 1, 2, 0][i % 8];
        el.style.setProperty('--cx', SHAPES[shape].C.x / 2 + '%');
        el.style.setProperty('--cy', SHAPES[shape].C.y / 2.2 + '%');
        const room = SHAPES[shape].room;                                                    // radius of the plain centre
        el.style.setProperty('--nw', (room * 1.0).toFixed(1) + '%');                       // name fits inside it
        el.style.setProperty('--nk', Math.min(1.15, room / 30).toFixed(2));
        return { el: el, kind: 'project', shape: shape, f: SIZES[i % SIZES.length], rot: (r() - 0.5) * 50, mir: r() > 0.5 };
    });
    let fillers = [];

    function svgIn(el) {
        let svg = el.querySelector('.paisley-art');
        if (!svg) {
            svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('class', 'paisley-art');
            svg.setAttribute('aria-hidden', 'true');
            el.insertBefore(svg, el.firstChild);
        }
        return svg;
    }
    function isOpen(node) { return node.kind === 'project' && node.el.hasAttribute('data-open'); }

    function render(node, appear) {
        const el = node.el, svg = svgIn(el), w = el.offsetWidth, h = el.offsetHeight;
        if (!w) return;
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        if (node.kind === 'sprig') {
            svg.innerHTML = sprigSVG(w, node.variant);
        } else if (isOpen(node)) {
            const P = panelLayers(w, h, 0, 0, node.u, paisleyLayers(node, node.w));
            svg.innerHTML = draw(P, node.u, curlPanel(node.u, P[0][0], w, h), true);
        } else {
            const m = matrixFor(node, w);
            node.u = w / 200;
            const dens = node.kind === 'deco' ? Math.max(0.35, Math.min(1, w / (S * 0.8))) : 1;
            const sh = SHAPES[node.shape];
            let s = draw(rings(node).map(function (pts) { return mapAll(m, pts); }), node.u, curlFor(m), true, dens);
            if (node.kind === 'deco') s += '<g transform="matrix(' + [m.a, m.b, m.c, m.d, m.e, m.f].map(function (v) { return +v.toFixed(4); }).join(' ') + ')"><g transform="translate(' + f1(sh.C.x) + ' ' + f1(sh.C.y) + ') scale(' + Math.min(1, sh.room / 34).toFixed(3) + ') translate(' + (-C.x) + ' ' + (-C.y) + ')">' + MOTIFS[node.motif] + '</g></g>';
            svg.innerHTML = '<g class="orn' + (appear ? ' appear' : '') + '">' + s + '</g>';
        }
        if (node.kind === 'project') fitName(node);
    }

    /* Size a project's name to sit inside the innermost ring, centred, clear of it:
       the text box (and its edges) must stay a small margin inside that ring. */
    function fitName(node) {
        const name = node.el.querySelector('.paisley-name');
        if (isOpen(node)) { name.style.fontSize = ''; name.style.width = ''; name.style.maxWidth = ''; return; }
        const sh = SHAPES[node.shape], u = node.w / 200;
        const ring = mapAll(matrixFor(node, node.w), sh.localP[sh.localP.length - 1]);
        const np = matrixFor(node, node.w).transformPoint(new DOMPoint(sh.N.x, sh.N.y));
        const cx = np.x, cy = np.y, margin = 4 * u;
        node.el.style.setProperty('--nx', (cx / node.w * 100).toFixed(2) + '%');
        node.el.style.setProperty('--ny', (cy / node.el.offsetHeight * 100).toFixed(2) + '%');
        function clear(x, y) {
            if (!inside(ring, x, y)) return false;
            for (let i = 0; i < ring.length; i++) if (Math.hypot(ring[i].x - x, ring[i].y - y) < margin) return false;
            return true;
        }
        // widest the text may wrap to: the ring's width through the centre line
        let reach = 0;
        while (clear(cx - reach - 1, cy) && clear(cx + reach + 1, cy) && reach < node.w) reach++;
        name.style.width = 'max-content';
        name.style.maxWidth = Math.max(20, reach * 2 * 0.92).toFixed(1) + 'px';
        let size = 22;
        for (let i = 0; i < 16; i++) {
            name.style.fontSize = size.toFixed(1) + 'px';
            const hw = name.offsetWidth / 2, hh = name.offsetHeight / 2;
            const ok = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]].every(function (k) {
                return clear(cx + k[0] * hw, cy + k[1] * hh);
            });
            if (ok || size <= 9) break;
            size *= 0.92;
        }
    }

    /* ---------- collision shapes ---------- */

    /* A paisley is approximated by four circles (bulb, neck, tip, curl), in local
       units relative to the bulb centre C. Positions (n.x, n.y) are C in the field. */
    function circles(n, x, y) {
        x = x === undefined ? n.x : x; y = y === undefined ? n.y : y;
        if (n.kind === 'sprig') return [{ x: x, y: y, r: n.w / 2 }];
        const s = n.w / 200, a = n.rot * Math.PI / 180, c = Math.cos(a), si = Math.sin(a);
        return SHAPES[n.shape].hull.map(function (h) {
            const dx = n.mir ? -h[0] : h[0], dy = h[1];
            return { x: x + (dx * c - dy * si) * s, y: y + (dx * si + dy * c) * s, r: h[2] * s };
        });
    }
    /* Smallest gap between two sets of circles; `stop` lets it bail out early once it can't win. */
    function clearance(cs, others, stop) {
        let best = Infinity;
        let cx = 0, cy = 0, reach = 0;
        cs.forEach(function (c) { cx += c.x / cs.length; cy += c.y / cs.length; });
        cs.forEach(function (c) { reach = Math.max(reach, Math.hypot(c.x - cx, c.y - cy) + c.r); });
        for (let j = 0; j < others.length; j++) {
            const b = others[j];
            if (Math.hypot(b.x - cx, b.y - cy) - reach - b.r > best) continue;      // too far to matter
            for (let i = 0; i < cs.length; i++) {
                const a = cs[i];
                best = Math.min(best, Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r);
            }
            if (stop !== undefined && best < stop) return best;
        }
        return best;
    }
    function hitsRect(cs, rect, pad) {
        return cs.some(function (c) {
            const px = Math.max(rect.x - pad, Math.min(c.x, rect.x + rect.w + pad));
            const py = Math.max(rect.y - pad, Math.min(c.y, rect.y + rect.h + pad));
            return Math.hypot(c.x - px, c.y - py) < c.r;
        });
    }

    /* ---------- layout ---------- */

    let W = 0, H = 0, S = 0, gap = 0, base = null, openNode = null;

    function keepInside(n, bottomFree) {
        const cs = circles(n);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        cs.forEach(function (c) { minX = Math.min(minX, c.x - c.r); maxX = Math.max(maxX, c.x + c.r); minY = Math.min(minY, c.y - c.r); maxY = Math.max(maxY, c.y + c.r); });
        if (minX < 0) n.x -= minX; else if (maxX > W) n.x -= maxX - W;
        if (minY < 0) n.y -= minY; else if (!bottomFree && maxY > H) n.y -= maxY - H;
    }

    function relax(list, rect, bottomFree) {
        for (let it = 0; it < 140; it++) {
            for (let i = 0; i < list.length; i++) {
                for (let j = i + 1; j < list.length; j++) {
                    const a = list[i], b = list[j], ca = circles(a), cb = circles(b);
                    for (let p = 0; p < ca.length; p++) for (let q = 0; q < cb.length; q++) {
                        let dx = cb[q].x - ca[p].x, dy = cb[q].y - ca[p].y;
                        const d = Math.hypot(dx, dy) || 0.01, min = ca[p].r + cb[q].r + gap;
                        if (d < min) {
                            const push = (min - d) / 2 * 0.5;
                            dx /= d; dy /= d;
                            a.x -= dx * push; a.y -= dy * push;
                            b.x += dx * push; b.y += dy * push;
                        }
                    }
                }
            }
            list.forEach(function (n) {
                if (rect && hitsRect(circles(n), rect, gap)) {
                    // Leave the panel by the shortest way out that stays on the page.
                    const cs = circles(n);
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    cs.forEach(function (c) { minX = Math.min(minX, c.x - c.r); maxX = Math.max(maxX, c.x + c.r); minY = Math.min(minY, c.y - c.r); maxY = Math.max(maxY, c.y + c.r); });
                    const exits = [
                        [rect.x - gap - maxX, 0], [rect.x + rect.w + gap - minX, 0],
                        [0, rect.y - gap - maxY], [0, rect.y + rect.h + gap - minY]
                    ].filter(function (e) {
                        return minX + e[0] >= 0 && maxX + e[0] <= W && minY + e[1] >= 0;
                    });
                    exits.sort(function (p, q) { return Math.abs(p[0]) + Math.abs(p[1]) - Math.abs(q[0]) - Math.abs(q[1]); });
                    if (exits.length) { n.x += exits[0][0]; n.y += exits[0][1]; }
                }
                keepInside(n, bottomFree);
            });
        }
    }

    function makeFiller(kind, w, x, y, rot, mir, extra) {
        const el = document.createElement('div');
        el.className = kind === 'sprig' ? 'paisley-sprig' : 'paisley-deco';
        el.setAttribute('aria-hidden', 'true');
        field.appendChild(el);
        const n = { el: el, kind: kind, w: w, x: x, y: y, rot: rot, mir: mir };
        for (const k in extra) n[k] = extra[k];
        if (kind === 'deco') { el.style.setProperty('--cx', SHAPES[n.shape].C.x / 2 + '%'); el.style.setProperty('--cy', SHAPES[n.shape].C.y / 2.2 + '%'); }
        return n;
    }

    function computeBase() {
        const vh = window.innerHeight - field.getBoundingClientRect().top - window.scrollY;
        W = field.clientWidth;
        const narrow = W < 700;
        S = narrow ? W * 0.5 : Math.min(W * 0.19, Math.max(vh, 560) * 0.32, 320);
        gap = S * 0.04;
        nodes.forEach(function (n) { n.w = S * n.f; });
        const need = nodes.reduce(function (sum, n) { return sum + Math.pow(n.w * 1.2 + gap, 2); }, 0) * 1.35 / W;
        H = Math.max(narrow ? 0 : vh - 16, need);

        // Projects: best-candidate sampling on their real outlines, then relax.
        const rand = rng(7), placed = [];
        nodes.forEach(function (n) {
            let best = null, bestScore = -Infinity;
            for (let t = 0; t < 90; t++) {
                const x = n.w * 0.55 + rand() * (W - n.w * 1.1), y = n.w * 0.8 + rand() * Math.max(1, H - n.w * 1.3);
                const sc = placed.length ? clearance(circles(n, x, y), placed) : 0;
                if (sc > bestScore) { bestScore = sc; best = [x, y]; }
            }
            n.x = best[0]; n.y = best[1];
            keepInside(n);
            placed.push.apply(placed, circles(n));
        });
        relax(nodes, null, false);
        base = nodes.map(function (n) { return { x: n.x, y: n.y }; });

        // Fillers: big to small, each in a gap with clear space around it.
        fillers.forEach(function (f) { f.el.remove(); });
        fillers = [];
        const frand = rng(31);
        const occupied = [];
        nodes.forEach(function (n) { occupied.push.apply(occupied, circles(n)); });
        const tiers = [[0.5, 0.7, 10], [0.32, 0.5, 26], [0.2, 0.32, 45], [0.13, 0.2, 45]];
        tiers.forEach(function (tier) {
            let made = 0, misses = 0;
            while (made < tier[2] && misses < 30) {
                const w = S * (tier[0] + frand() * (tier[1] - tier[0]));
                const probe = { kind: 'deco', w: w, shape: [0, 1, 2, 3, 4, 4, 1, 2][Math.floor(frand() * 8)], rot: (frand() - 0.5) * 300, mir: frand() > 0.5 };
                let best = null, bestScore = -Infinity;
                for (let t = 0; t < 50; t++) {
                    const x = -w * 0.3 + frand() * (W + w * 0.6), y = -w * 0.3 + frand() * (H + w * 0.5);
                    const sc = clearance(circles(probe, x, y), occupied, bestScore);
                    if (sc > bestScore) { bestScore = sc; best = [x, y]; }
                }
                if (bestScore < gap * 0.6) { misses++; continue; }
                misses = 0; made++;
                const f = makeFiller('deco', w, best[0], best[1], probe.rot, probe.mir, { shape: probe.shape, motif: Math.floor(frand() * MOTIFS.length) });
                fillers.push(f);
                occupied.push.apply(occupied, circles(f));
            }
        });
        // Sprigs: tiny flowers and dots in whatever space is left, as on printed paisley.
        let misses = 0;
        while (misses < 50 && fillers.length < 420) {
            const w = S * (0.05 + frand() * 0.06), probe = { kind: 'sprig', w: w };
            let best = null, bestScore = -Infinity;
            for (let t = 0; t < 30; t++) {
                const x = frand() * W, y = frand() * H;
                const sc = clearance(circles(probe, x, y), occupied, bestScore);
                if (sc > bestScore) { bestScore = sc; best = [x, y]; }
            }
            if (bestScore < gap * 0.5) { misses++; continue; }
            misses = 0;
            const f = makeFiller('sprig', w, best[0], best[1], frand() * 360, false, { variant: Math.floor(frand() * 3) });
            fillers.push(f);
            occupied.push.apply(occupied, circles(f));
        }
    }

    /* Where everything goes; with `open`, that project becomes a panel and the rest move aside. */
    function layout(open) {
        nodes.forEach(function (n, i) { n.x = base[i].x; n.y = base[i].y; });
        let rect = null;
        if (open) {
            const pw = Math.min(W - 2 * gap, 780);
            open.el.style.width = pw + 'px';
            const ph = open.el.offsetHeight;
            const left = Math.max(gap, Math.min(W - pw - gap, open.x - pw / 2));
            const top = Math.max(gap, open.y - open.w * SHAPES[open.shape].C.y / 200);
            rect = { x: left, y: top, w: pw, h: ph };
            open.px = left; open.py = top;
            relax(nodes.filter(function (n) { return n !== open; }), rect, true);
        }
        let bottom = H;
        nodes.forEach(function (n) {
            if (n === open) { bottom = Math.max(bottom, rect.y + rect.h + gap * 2); return; }
            circles(n).forEach(function (c) { bottom = Math.max(bottom, c.y + c.r + gap); });
        });
        field.style.height = bottom + 'px';

        // Fillers stay put; any that would touch the panel or a moved project tuck away.
        const solids = [];
        nodes.forEach(function (n) { if (n !== open) solids.push.apply(solids, circles(n)); });
        fillers.forEach(function (f) {
            const cs = circles(f);
            const hit = clearance(cs, solids) < gap * 0.3 || (rect && hitsRect(cs, rect, gap));
            f.el.classList.toggle('tucked', !!hit);
        });
    }

    function apply(n) {
        if (isOpen(n)) {
            n.el.style.transform = 'translate(' + n.px + 'px,' + n.py + 'px)';
            return;
        }
        n.el.style.width = n.w + 'px';
        if (n.kind === 'project') n.el.style.setProperty('--size', n.w + 'px');
        const c = n.kind === 'sprig' ? { x: 100, y: 100 } : SHAPES[n.shape].C;
        n.el.style.transform = 'translate(' + f1(n.x - n.w * c.x / 200) + 'px,' + f1(n.y - n.w * c.y / 200) + 'px)';
    }

    function full() {
        projects.forEach(function (el) { el.style.transition = 'none'; });
        computeBase();
        layout(openNode);
        nodes.forEach(apply);
        fillers.forEach(apply);
        nodes.forEach(function (n) { render(n); });
        fillers.forEach(function (f) { render(f); });
        requestAnimationFrame(function () { projects.forEach(function (el) { el.style.transition = ''; }); });
    }

    /* ---------- the unrolling ---------- */

    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    function unroll(node, src, dst, curlSrc, curlDst, forward) {
        const el = node.el, svg = svgIn(el), w = el.offsetWidth, h = el.offsetHeight;
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        const D = 1400, SPREAD = 0.42, LAYER = 0.035, TRAVEL = 0.37, t0 = performance.now();
        el.classList.add('animating');
        if (node.raf) cancelAnimationFrame(node.raf);
        (function frame(now) {
            const t = Math.min(1, (now - t0) / D);
            let tipP = 0;
            const layers = src.map(function (sl, li) {
                const dl = dst[li], out = new Array(N);
                const ld = (forward ? li : LAYERS.length - 1 - li) * LAYER;
                for (let i = 0; i < N; i++) {
                    const order = forward ? i / (N - 1) : 1 - i / (N - 1);
                    const p = ease(Math.max(0, Math.min(1, (t - ld - order * SPREAD) / TRAVEL)));
                    if (li === 0 && i === 0) tipP = p;
                    const a = sl[i], b = dl[i];
                    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
                    const lift = Math.sin(p * Math.PI) * Math.min(20, l * 0.22);   // the strand lifts as it travels
                    out[i] = { x: a.x + dx * p - dy / l * lift, y: a.y + dy * p + dx / l * lift };
                }
                return out;
            });
            const curl = curlSrc.map(function (v, i) { return { x: v.x + (curlDst[i].x - v.x) * tipP, y: v.y + (curlDst[i].y - v.y) * tipP }; });
            svg.innerHTML = draw(layers, node.u, curl, t >= 1);
            if (t < 1) node.raf = requestAnimationFrame(frame);
            else { node.raf = null; el.classList.remove('animating'); render(node); }
        })(t0);
    }

    function setOpen(node, open) {
        node.el.toggleAttribute('data-open', open);
        node.el.querySelector('.paisley-name').setAttribute('aria-expanded', open);
    }

    function toggle(node) {
        const willOpen = !isOpen(node);
        const fieldBox = field.getBoundingClientRect();
        const before = nodes.map(function (n) {
            const r = n.el.getBoundingClientRect();
            return { x: r.left - fieldBox.left, y: r.top - fieldBox.top, w: n.el.offsetWidth, h: n.el.offsetHeight, open: isOpen(n) };
        });

        nodes.forEach(function (n) { setOpen(n, n === node && willOpen); });
        openNode = willOpen ? node : null;
        layout(openNode);

        nodes.forEach(function (n, i) {
            const b = before[i], changed = isOpen(n) !== b.open;
            if (changed) n.el.style.transition = 'none';
            apply(n);
            if (!changed) return;
            n.el.getBoundingClientRect();                       // commit the jump; the morph supplies the motion
            const now = n.el.getBoundingClientRect();
            const ox = b.x - (now.left - fieldBox.left), oy = b.y - (now.top - fieldBox.top);
            const w = n.el.offsetWidth, h = n.el.offsetHeight;
            requestAnimationFrame(function () { n.el.style.transition = ''; });
            if (reduce) { render(n); return; }
            if (isOpen(n)) {
                const m = matrixFor(n, b.w, ox, oy), src = paisleyLayers(n, b.w, ox, oy);
                const P = panelLayers(w, h, 0, 0, n.u, src);
                unroll(n, src, P, curlFor(m), curlPanel(n.u, P[0][0], w, h), true);
            } else {
                const m = matrixFor(n, w), dst = paisleyLayers(n, w);
                const P = panelLayers(b.w, b.h, ox, oy, n.u, dst);
                unroll(n, P, dst, curlPanel(n.u, P[0][0], b.w, b.h, ox, oy), curlFor(m), false);
            }
        });

        if (willOpen) setTimeout(function () { node.el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); }, 600);
    }

    nodes.forEach(function (node) {
        const el = node.el, name = el.querySelector('.paisley-name');
        name.setAttribute('aria-expanded', 'false');
        name.addEventListener('click', function (e) { e.stopPropagation(); toggle(node); });
        el.addEventListener('click', function () { if (!isOpen(node)) toggle(node); });
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'paisley-close';
        close.setAttribute('aria-label', 'Close');
        close.addEventListener('click', function (e) { e.stopPropagation(); toggle(node); });
        el.appendChild(close);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && openNode) {
            const n = openNode;
            toggle(n);
            n.el.querySelector('.paisley-name').focus();
        }
    });

    /* ---------- rustling: like a stick dragged through, nearby paisleys lean the
       way the pointer is moving and get nudged along, then ease back (no bounce) ---------- */

    const swaying = new Set();
    let swayRaf = null;
    function swayStep() {
        swaying.forEach(function (n) {
            n.a += (n.ta - n.a) * 0.2;          // follow the target...
            n.ox += (n.tx - n.ox) * 0.2;
            n.oy += (n.ty - n.oy) * 0.2;
            n.ta *= 0.9;                        // ...which itself fades back to rest
            n.tx *= 0.9;
            n.ty *= 0.9;
            if (Math.abs(n.a) < 0.03 && Math.abs(n.ta) < 0.03 && Math.abs(n.ox) + Math.abs(n.oy) < 0.05) {
                n.a = n.ta = n.ox = n.oy = n.tx = n.ty = 0;
                n.el.style.removeProperty('--sr');
                n.el.style.removeProperty('--sx');
                n.el.style.removeProperty('--sy');
                swaying.delete(n);
            } else {
                // Applied to the drawing (and name) inside, pivoting on the bulb, so the
                // paisley turns in place instead of swinging around the page corner.
                n.el.style.setProperty('--sr', n.a.toFixed(2) + 'deg');
                n.el.style.setProperty('--sx', n.ox.toFixed(2) + 'px');
                n.el.style.setProperty('--sy', n.oy.toFixed(2) + 'px');
            }
        });
        swayRaf = swaying.size ? requestAnimationFrame(swayStep) : null;
    }
    let lastX = null, lastY = null;
    field.addEventListener('pointermove', function (e) {
        if (reduce || e.pointerType === 'touch') return;
        const fb = field.getBoundingClientRect(), mx = e.clientX - fb.left, my = e.clientY - fb.top;
        const vx = lastX === null ? 0 : mx - lastX, vy = lastY === null ? 0 : my - lastY;
        lastX = mx; lastY = my;
        const speed = Math.hypot(vx, vy);
        if (!speed) return;
        const ux = vx / speed, uy = vy / speed, reach = S * 0.3;
        nodes.concat(fillers).forEach(function (n) {
            if (isOpen(n) || n.el.classList.contains('animating') || n.el.classList.contains('tucked')) return;
            const dx = n.x - mx, dy = n.y - my, dist = Math.hypot(dx, dy);
            const edge = dist - n.w * 0.4;
            if (edge > reach) return;
            const near = 1 - Math.max(0, edge) / reach;
            const heft = n.kind === 'project' ? 5 : n.kind === 'sprig' ? 0.7 : 1 + 1.5 * n.w / S;
            const maxA = n.kind === 'project' ? 4 : n.kind === 'sprig' ? 16 : 7 + 6 * (1 - Math.min(1, n.w / S));
            // Lean: which side of the stroke the paisley is on decides the turn.
            const side = (dx * uy - dy * ux) / (dist || 1);
            // Same size of turn however fast the pointer moves; only how close it passes matters.
            const lean = Math.sign(side) * Math.min(1, Math.abs(side) * 2.5) * near * maxA;
            if (n.ta === undefined) { n.a = n.ta = n.ox = n.oy = n.tx = n.ty = 0; }
            if (Math.abs(lean) > Math.abs(n.ta) || Math.sign(lean) !== Math.sign(n.ta)) n.ta = Math.max(-maxA, Math.min(maxA, lean));
            const push = near * 1 / heft;
            n.tx = Math.max(-push, Math.min(push, n.tx + ux * push * 0.4));
            n.ty = Math.max(-push, Math.min(push, n.ty + uy * push * 0.4));
            swaying.add(n);
        });
        if (!swayRaf && swaying.size) swayRaf = requestAnimationFrame(swayStep);
    });
    field.addEventListener('pointerleave', function () { lastX = lastY = null; });

    let lastW = 0, timer = null;
    window.addEventListener('resize', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { if (field.clientWidth !== lastW) { lastW = field.clientWidth; full(); } }, 150);
    });
    lastW = field.clientWidth;
    full();
    if (document.fonts) document.fonts.ready.then(function () { if (openNode) full(); else nodes.forEach(fitName); });
})();
