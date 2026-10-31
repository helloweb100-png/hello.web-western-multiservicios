/* ==========================================================================
   WESTERN MULTISERVICES & ICLICK · app.js
   Dependencias (CDN, opcionales): GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13.
   Si no cargan, la página sigue siendo completamente funcional (sin animación de scroll).

   Orden del archivo
     1. Utilidades y estado
     2. WhatsApp
     3. Loader (puertas de cantina)
     4. Scroll suave + navegación
     5. Hero: embers, girasol (phyllotaxis), parallax del escenario
     6. Marquee con velocidad de scroll
     7. Animaciones de scroll (GSAP): panel horizontal, imagen expansiva, etc.
     8. Buscador de servicios
     9. Oficinas, FAQ, video, formulario
    10. Efectos de puntero (tilt, spotlight, magnético)
    11. Traducción automática (Google Website Translator)
   ========================================================================== */
(() => {
    'use strict';

    /* ---------- 1. Utilidades y estado ---------- */
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const root = document.documentElement;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const rand = (a, b) => a + Math.random() * (b - a);

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasLibs = !!(window.gsap && window.ScrollTrigger);
    const animate = hasLibs && !reduce; // GSAP activo y el usuario no pidió menos movimiento

    let lenis = null;
    let heroVisible = true;
    let offerTranslate = null; // lo define initTranslate(); se llama cuando el sitio ya abrió
    const loops = new Set(); // funciones que corren cada frame

    // Idioma en el que se está mostrando la página ('es' = original). Lo cambia initTranslate().
    // T() elige entre español e inglés los textos que el propio JS escribe en pantalla,
    // porque Google solo traduce el DOM que existe, no las cadenas que armamos después.
    const state = { lang: 'es' };
    const T = (es, en) => (state.lang === 'es' ? es : en);

    if (animate) {
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });
        root.classList.add('has-gsap');
    }

    /* ---------- 2. WhatsApp ---------- */
    const WA = '12142585434';
    const waLink = (text) => `https://wa.me/${WA}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
    $$('[data-wa]').forEach((a) => { a.href = waLink(a.dataset.wa); });

    /* ---------- 3. Loader: puertas de cantina ---------- */
    function runLoader() {
        const loader = $('#loader');
        const pctEl = $('#ld-pct');
        if (!loader) { startSite(); return; }

        document.body.classList.add('is-locked');
        const MIN = reduce ? 500 : 2000;       // el spinner se queda lo suficiente para verse
        const t0 = performance.now();
        let loaded = document.readyState === 'complete';
        addEventListener('load', () => { loaded = true; }, { once: true });
        setTimeout(() => { loaded = true; }, 6500); // tope: nunca bloquear al usuario

        let p = 0, last = t0, closing = false;
        const frame = (now) => {
            const dt = Math.min((now - last) / 1000, .1);
            last = now;
            const ready = loaded && now - t0 >= MIN;
            const cap = ready ? 100 : 90;
            p += (cap - p) * (1 - Math.exp(-dt * (ready ? 6 : 2.1)));
            if (ready && p > 99.4) p = 100;
            pctEl.textContent = Math.round(p);
            if (p >= 100 && !closing) { closing = true; open(); return; }
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);

        function open() {
            setTimeout(() => {
                loader.classList.add('is-open');
                setTimeout(startSite, reduce ? 0 : 520);          // el hero entra mientras las puertas se abren
                setTimeout(() => loader.remove(), reduce ? 50 : 1500);
            }, reduce ? 0 : 260);
        }
    }

    /* ---------- 4. Scroll suave + navegación ---------- */
    function initScroll() {
        if (reduce || !window.Lenis) return;
        lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, wheelMultiplier: .92 });
        if (hasLibs) {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((t) => lenis.raf(t * 1000));
            gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        }
    }

    const hdr = $('#hdr');
    const burger = $('#burger');
    const menu = $('#menu');
    function setMenu(open) {
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? T('Cerrar menú', 'Close menu') : T('Abrir menú', 'Open menu'));
        menu.classList.toggle('is-open', open);
        menu.setAttribute('aria-hidden', String(!open));
        document.body.classList.toggle('is-locked', open);
        if (lenis) open ? lenis.stop() : lenis.start();
    }
    burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
    hdr.addEventListener('focusin', () => hdr.classList.remove('is-hidden')); // navegación por teclado
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false); });

    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        const wasOpen = menu.classList.contains('is-open');
        if (wasOpen) setMenu(false);
        const go = () => {
            if (lenis) lenis.scrollTo(target, { offset: -64, duration: 1.7 });
            else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        };
        wasOpen ? setTimeout(go, 120) : go();
        history.replaceState(null, '', id);
    });

    // Header: sólido al bajar, se oculta al bajar rápido y reaparece al subir
    function initHeader() {
        if (animate) {
            ScrollTrigger.create({
                start: 0, end: 'max',
                onUpdate: (self) => {
                    const y = self.scroll();
                    hdr.classList.toggle('is-solid', y > 40);
                    if (menu.classList.contains('is-open')) return;
                    if (self.direction === 1 && y > 360) hdr.classList.add('is-hidden');
                    else if (self.direction === -1 || y < 120) hdr.classList.remove('is-hidden');
                }
            });
            gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
        } else {
            const onScroll = () => hdr.classList.toggle('is-solid', scrollY > 40);
            addEventListener('scroll', onScroll, { passive: true });
            onScroll();
        }

        // Sección activa en el menú
        const links = $$('.nav a');
        const map = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                links.forEach((l) => l.removeAttribute('aria-current'));
                const l = map.get(en.target.id);
                if (l) l.setAttribute('aria-current', 'true');
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }

    /* ---------- 5. Hero ---------- */
    // 5.a Brasas: partículas doradas que suben y se conectan entre sí y con el cursor
    function initEmbers() {
        const c = $('#embers');
        if (!c) return;
        const ctx = c.getContext('2d');
        const hero = $('.hero');
        let w = 0, h = 0, dpr = 1, parts = [];
        const mouse = { x: -999, y: -999 };

        const resize = () => {
            dpr = Math.min(devicePixelRatio || 1, 2);
            w = c.clientWidth; h = c.clientHeight;
            c.width = w * dpr; c.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const n = w < 700 ? 34 : 68;
            parts = Array.from({ length: n }, () => ({
                x: rand(0, w), y: rand(0, h), r: rand(.7, 2.3),
                vx: rand(-.08, .08), vy: -rand(.12, .5),
                a: rand(.25, .9), ph: rand(0, 6.28), sp: rand(.6, 2)
            }));
        };
        resize();
        addEventListener('resize', resize);
        if (finePointer) {
            hero.addEventListener('pointermove', (e) => {
                const r = c.getBoundingClientRect();
                mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
            });
            hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
        }

        const LINK = w < 700 ? 90 : 120;
        const draw = (t, dt) => {
            ctx.clearRect(0, 0, w, h);
            const k = dt * 60;
            for (const p of parts) {
                p.x += (p.vx + Math.sin(t * .0005 + p.ph) * .12) * k;
                p.y += p.vy * k;
                if (p.y < -12) { p.y = h + 12; p.x = rand(0, w); }
                if (p.x < -12) p.x = w + 12; else if (p.x > w + 12) p.x = -12;
            }
            ctx.lineWidth = 1;
            for (let i = 0; i < parts.length; i++) {
                const a = parts[i];
                for (let j = i + 1; j < parts.length; j++) {
                    const b = parts[j];
                    const dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
                    if (d < LINK * LINK) {
                        ctx.strokeStyle = `rgba(232,184,74,${(1 - Math.sqrt(d) / LINK) * .2})`;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
                const mx = a.x - mouse.x, my = a.y - mouse.y, md = mx * mx + my * my;
                if (md < 190 * 190) {
                    ctx.strokeStyle = `rgba(247,217,138,${(1 - Math.sqrt(md) / 190) * .45})`;
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
                }
            }
            for (const p of parts) {
                const tw = .55 + .45 * Math.sin(t * .001 * p.sp + p.ph);
                ctx.fillStyle = `rgba(247,217,138,${p.a * tw})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
            }
        };
        if (reduce) { draw(0, 0); return; }
        loops.add((t, dt) => { if (heroVisible) draw(t, dt); });
    }

    // 5.b Girasol: patrón de Vogel (ángulo áureo), respira y se aparta del cursor
    function initSun() {
        const c = $('#sun');
        if (!c) return;
        const ctx = c.getContext('2d');
        const GOLDEN = Math.PI * (3 - Math.sqrt(5));
        let size = 0, dpr = 1, N = 800;
        const mouse = { x: -9999, y: -9999 };

        const palette = Array.from({ length: 16 }, (_, k) => {
            const f = k / 15;
            const c0 = [96, 46, 22], c1 = [190, 124, 38], c2 = [248, 208, 100];
            const [a, b, u] = f < .55 ? [c0, c1, f / .55] : [c1, c2, (f - .55) / .45];
            const rgb = a.map((v, i) => Math.round(v + (b[i] - v) * u));
            return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(.6 + .38 * f).toFixed(2)})`;
        });

        const resize = () => {
            dpr = Math.min(devicePixelRatio || 1, 2);
            size = c.clientWidth;
            c.width = size * dpr; c.height = size * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            N = size < 520 ? 520 : 820;
        };
        resize();
        addEventListener('resize', resize);

        if (finePointer) {
            $('.hero').addEventListener('pointermove', (e) => {
                const r = c.getBoundingClientRect();
                mouse.x = (e.clientX - r.left) / r.width * size;
                mouse.y = (e.clientY - r.top) / r.height * size;
            });
            $('.hero').addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
        }

        const petals = (cx, cy, R, rot, t, layer) => {
            const n = 34, step = Math.PI * 2 / n;
            for (let k = 0; k < n; k++) {
                const a = k * step + rot + layer * step / 2;
                const len = R * (.26 + .04 * Math.sin(t * .0014 + k * .7 + layer)) * (layer ? 1.18 : 1);
                const r0 = R * .93, r1 = r0 + len, hw = .056;
                const bl = [cx + Math.cos(a - hw) * r0, cy + Math.sin(a - hw) * r0];
                const br = [cx + Math.cos(a + hw) * r0, cy + Math.sin(a + hw) * r0];
                const tip = [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1];
                const cl = [cx + Math.cos(a - hw * 1.6) * (r0 + len * .55), cy + Math.sin(a - hw * 1.6) * (r0 + len * .55)];
                const cr = [cx + Math.cos(a + hw * 1.6) * (r0 + len * .55), cy + Math.sin(a + hw * 1.6) * (r0 + len * .55)];
                ctx.beginPath();
                ctx.moveTo(bl[0], bl[1]);
                ctx.quadraticCurveTo(cl[0], cl[1], tip[0], tip[1]);
                ctx.quadraticCurveTo(cr[0], cr[1], br[0], br[1]);
                ctx.closePath();
                ctx.fillStyle = layer ? 'rgba(183,132,40,.13)' : 'rgba(232,184,74,.17)';
                ctx.fill();
                ctx.strokeStyle = layer ? 'rgba(232,184,74,.16)' : 'rgba(247,217,138,.34)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        };

        const draw = (t) => {
            ctx.clearRect(0, 0, size, size);
            const cx = size / 2, cy = size / 2, R = size * .285;
            const rot = t * .00006;

            const glow = ctx.createRadialGradient(cx, cy, R * .1, cx, cy, R * 1.55);
            glow.addColorStop(0, 'rgba(232,184,74,.2)');
            glow.addColorStop(.6, 'rgba(120,26,40,.14)');
            glow.addColorStop(1, 'rgba(120,26,40,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, size, size);

            petals(cx, cy, R, -rot * .6, t, 1);
            petals(cx, cy, R, -rot * .6, t, 0);

            const scale = size / 700;
            let lastB = -1;
            for (let i = 0; i < N; i++) {
                const f = i / N;
                let r = R * Math.sqrt(f) * (1 + .03 * Math.sin(t * .0013 - i * .018));
                const a = i * GOLDEN + rot;
                let x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
                const dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy;
                if (d2 < 14400) {
                    const d = Math.sqrt(d2) || 1, push = (1 - d / 120) ** 2 * 26;
                    x += dx / d * push; y += dy / d * push;
                }
                const b = Math.min(15, (f * 16) | 0);
                if (b !== lastB) { ctx.fillStyle = palette[b]; lastB = b; }
                const s = (.9 + 2.9 * Math.pow(f, .62)) * scale + .3;
                ctx.beginPath(); ctx.arc(x, y, s, 0, 6.2832); ctx.fill();
            }
        };
        if (reduce) { draw(0); return; }
        loops.add((t) => { if (heroVisible) draw(t); });
    }

    // 5.c Parallax del escenario: sigue al cursor y, sin cursor, oscila solo
    function initStage() {
        const stage = $('#stage');
        if (!stage) return;
        const hero = $('.hero');
        let tx = 0, ty = 0, cx = 0, cy = 0, active = false;
        if (finePointer) {
            hero.addEventListener('pointermove', (e) => {
                const r = stage.getBoundingClientRect();
                tx = clamp((e.clientX - (r.left + r.width / 2)) / (innerWidth * .5), -1, 1);
                ty = clamp((e.clientY - (r.top + r.height / 2)) / (innerHeight * .5), -1, 1);
                active = true;
            });
            hero.addEventListener('pointerleave', () => { active = false; });
        }
        if (reduce) return;
        loops.add((t) => {
            if (!heroVisible) return;
            const ix = Math.sin(t * .00042) * .45, iy = Math.cos(t * .00031) * .32;
            const gx = active ? tx : ix, gy = active ? ty : iy;
            cx = lerp(cx, gx, .06); cy = lerp(cy, gy, .06);
            stage.style.setProperty('--px', cx.toFixed(3));
            stage.style.setProperty('--py', cy.toFixed(3));
        });
    }

    /* ---------- 6. Marquee: acelera y se invierte con el scroll ---------- */
    function initMarquee() {
        const track = $('#mq');
        if (!track) return;
        track.appendChild(track.firstElementChild.cloneNode(true)); // segundo set para el bucle continuo
        if (reduce) { track.style.animation = 'none'; return; }
        const io = new IntersectionObserver(([en]) => {
            track.style.animationPlayState = en.isIntersecting ? 'running' : 'paused';
        });
        io.observe(track);
        if (!animate) return;
        let boost = 0, rate = 1;
        ScrollTrigger.create({
            start: 0, end: 'max',
            onUpdate: (self) => { boost = clamp(self.getVelocity() / 420, -7, 7); }
        });
        loops.add(() => {
            const anim = track.getAnimations()[0];
            if (!anim) return;
            rate = lerp(rate, 1 + boost, .08);
            boost *= .9;
            anim.playbackRate = rate;
        });
    }

    /* ---------- Bucle central de dibujo ---------- */
    function startLoop() {
        if (reduce) return;
        let last = performance.now();
        const frame = (now) => {
            const dt = Math.min((now - last) / 1000, .1);
            last = now;
            if (!document.hidden) loops.forEach((fn) => fn(now, dt));
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
        const hero = $('.hero');
        new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; }, { threshold: 0 }).observe(hero);
    }

    /* ---------- 7. Animaciones de scroll (GSAP) ---------- */
    function heroIntro() {
        root.classList.remove('loading');
        document.body.classList.remove('is-locked');
        if (lenis) lenis.start();
        if (!animate) { afterIntro(); return; }

        gsap.set('.h1', { autoAlpha: 1, y: 0 });
        const tl = gsap.timeline({ onComplete: afterIntro });
        tl.fromTo('.h1 .ln > span', { yPercent: 118 }, { yPercent: 0, duration: 1.3, stagger: .13, ease: 'expo.out' }, 0)
            .fromTo('.eyebrow[data-h], .lead[data-h], .cta-row[data-h]', { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 1.05, stagger: .13, ease: 'power3.out', clearProps: 'transform' }, .22)
            .fromTo('.stage', { autoAlpha: 0, scale: .84 }, { autoAlpha: 1, scale: 1, duration: 1.8, ease: 'expo.out' }, 0)
            .fromTo('.ring', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.4, stagger: .18, ease: 'power2.out' }, .5)
            .fromTo('.wa-float', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', clearProps: 'all' }, 1.1);
    }

    function afterIntro() {
        if (!animate) return;
        // parallax de salida del hero (se crea al terminar la intro para no pelear con ella)
        gsap.to('.stage', { yPercent: -9, scale: .93, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.hero-copy', { yPercent: -7, autoAlpha: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: '55% top', end: 'bottom top', scrub: true } });
        ScrollTrigger.refresh();
    }

    // Manifiesto: cada palabra se enciende con el scroll
    let wordTween = null;
    function revealWords() {
        const words = $$('.manifesto-txt .w');
        if (!animate || !words.length) return;
        wordTween = gsap.to(words, {
            opacity: 1, ease: 'none', stagger: .12,
            scrollTrigger: { trigger: '.manifesto-txt', start: 'top 80%', end: 'bottom 50%', scrub: .5 }
        });
    }
    // Google traduce por bloque de texto: con una <span> por palabra la frase sale desordenada.
    // Mientras la página está traducida el manifiesto va como texto corrido; al volver a español se recupera el efecto.
    function flattenWords() {
        const el = $('[data-words]');
        if (!el || !$('.w', el)) return;
        if (wordTween) { wordTween.scrollTrigger.kill(); wordTween.kill(); wordTween = null; }
        el.textContent = el.textContent.replace(/\s+/g, ' ').trim();
    }
    function restoreWords() {
        const el = $('[data-words]');
        if (!el || $('.w', el)) return;
        prepareText(); revealWords();
        if (animate) ScrollTrigger.refresh();
    }

    function initScrollAnimations() {
        if (!animate) {
            // Sin GSAP: todo visible, sin pins
            $$('.step').forEach((s) => s.classList.add('is-on'));
            const line = $('.steps-line'), wrap = $('#steps');
            if (line && wrap) layoutLine(line, wrap);
            return;
        }

        const mm = gsap.matchMedia();

        // --- Panel horizontal de servicios (se fija; en móvil es un carrusel nativo)
        mm.add('(min-width: 900px)', () => {
            const pan = $('[data-pan]'), track = $('#pan-track'), bar = $('#pan-bar');
            if (!pan || !track) return;
            const dist = () => Math.max(0, track.scrollWidth - innerWidth);
            const tween = gsap.to(track, {
                x: () => -dist(), ease: 'none',
                scrollTrigger: {
                    trigger: pan, start: 'top top', end: () => '+=' + dist(),
                    pin: true, scrub: .8, anticipatePin: 1, invalidateOnRefresh: true,
                    onUpdate: (self) => { bar.style.transform = `scaleX(${self.progress})`; }
                }
            });
            $$('.panel', track).forEach((panel) => {
                const tiles = $$('.svc, h3, .sub, .cta-row', panel);
                if (!tiles.length) return;
                ScrollTrigger.create({
                    trigger: panel, containerAnimation: tween, start: 'left 88%', once: true,
                    onEnter: () => gsap.from(tiles, { autoAlpha: 0, y: 34, duration: .9, stagger: .07, ease: 'power3.out', clearProps: 'all' })
                });
            });
            $$('.panel-n', track).forEach((n) => {
                gsap.fromTo(n, { xPercent: 22 }, { xPercent: -22, ease: 'none', scrollTrigger: { trigger: n.closest('.panel'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
            });
        });

        // --- Imagen que se abre en pantalla completa
        mm.add({ desk: '(min-width: 900px)', mob: '(max-width: 899px)' }, (ctx) => {
            const sec = $('[data-expand]');
            if (!sec) return;
            const from = ctx.conditions.desk ? 'inset(30% 24% 8% 24% round 28px)' : 'inset(34% 7% 9% 7% round 28px)';
            const tl = gsap.timeline({
                defaults: { ease: 'none' },
                scrollTrigger: { trigger: sec, start: 'top top', end: '+=140%', scrub: .7, pin: true, anticipatePin: 1, invalidateOnRefresh: true }
            });
            tl.fromTo('[data-exp-media]', { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1 }, 0)
                .fromTo('[data-exp-media] img', { scale: 1.18 }, { scale: 1, duration: 1 }, 0)
                .fromTo('.exp-shade', { opacity: .45 }, { opacity: 1, duration: 1 }, 0)
                .to('.exp-lead', { yPercent: -40, autoAlpha: 0, duration: .5 }, .08)
                .fromTo('[data-exp-text]', { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: .4 }, .62);
        });

        // --- A partir de aquí, nada se fija: se crean después de los pins para que midan bien
        // Manifiesto: palabra por palabra
        revealWords();

        // Contadores
        $$('[data-count]').forEach((el) => {
            const target = Number(el.dataset.count), o = { v: 0 };
            el.textContent = '0';
            ScrollTrigger.create({
                trigger: el, start: 'top 90%', once: true,
                onEnter: () => gsap.to(o, { v: target, duration: 2.2, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } })
            });
        });

        // Entradas generales
        ScrollTrigger.batch('[data-reveal]', {
            start: 'top 90%', once: true,
            onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: .09, overwrite: true })
        });

        // Galería del recorrido: parallax suave dentro de cada marco
        $$('.tour-gal figure img').forEach((img, i) => {
            gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
            img.style.transform = 'scale(1.18)'; // evita bordes al desplazar
        });

        // Línea del proceso: se dibuja con el scroll y enciende cada paso
        const steps = $$('.step'), wrap = $('#steps'), line = $('.steps-line'), fill = $('#steps-fill');
        if (wrap && line && fill) {
            layoutLine(line, wrap);
            addEventListener('resize', () => layoutLine(line, wrap));
            gsap.to(fill, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top 68%', end: 'bottom 62%', scrub: .4 } });
            steps.forEach((s) => ScrollTrigger.create({
                trigger: s, start: 'top 68%',
                onEnter: () => s.classList.add('is-on'),
                onLeaveBack: () => s.classList.remove('is-on')
            }));
        }

        // Palabra gigante del footer
        gsap.fromTo('#ft-word', { xPercent: -7 }, { xPercent: 7, ease: 'none', scrollTrigger: { trigger: '.ft', start: 'top bottom', end: 'bottom bottom', scrub: true } });

        // Brillo de la sección de contacto sigue el scroll
        gsap.fromTo('.contact-glow', { yPercent: -12 }, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });
    }

    function layoutLine(line, wrap) {
        const nodes = $$('.step-node', wrap);
        if (nodes.length < 2) return;
        const wr = wrap.getBoundingClientRect();
        const a = nodes[0].getBoundingClientRect(), b = nodes[nodes.length - 1].getBoundingClientRect();
        line.style.top = (a.top - wr.top + a.height / 2) + 'px';
        line.style.height = (b.top - a.top) + 'px';
    }

    /* ---------- 8. Buscador de servicios ---------- */
    function initFinder() {
        const input = $('#q'), list = $('#q-list'), empty = $('#q-empty'), emptyCta = $('#q-empty-cta');
        const clear = $('#q-clear'), field = input.closest('.finder-field'), typeEl = $('#q-type');
        const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

        const items = $$('[data-service]').map((el) => {
            const ic = el.querySelector('i');
            return {
                el, name: el.dataset.service, group: el.dataset.group,
                keys: norm(`${el.dataset.service} ${el.dataset.keys || ''} ${el.dataset.group}`),
                icon: ic ? Array.from(ic.classList).find((c) => c.startsWith('ph-') && c !== 'ph-fill') : 'ph-star-four',
                msg: el.dataset.wa
            };
        });
        // Google no traduce lo que se inserta después de traducir la página. Si está traducida,
        // los resultados toman el texto que ya tiene la tarjeta del servicio en el DOM.
        const labelOf = (it) => {
            if (state.lang === 'es') return { name: it.name, group: it.group };
            const t = it.el.querySelector('.svc-t, h3'), p = it.el.closest('.panel'), g = p && p.querySelector('.panel-head h3');
            return { name: (t && t.textContent.trim()) || it.name, group: (g && g.textContent.trim()) || it.group };
        };

        let active = -1, shown = [];
        const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
        const highlight = (name, tokens) => {
            const n = norm(name);
            for (const t of tokens) {
                const i = n.indexOf(t);
                if (i > -1) return `${esc(name.slice(0, i))}<mark>${esc(name.slice(i, i + t.length))}</mark>${esc(name.slice(i + t.length))}`;
            }
            return esc(name);
        };

        const render = () => {
            const q = norm(input.value.trim());
            field.classList.toggle('has-text', !!q);
            clear.hidden = !q;
            list.innerHTML = '';
            active = -1; shown = [];
            input.setAttribute('aria-expanded', 'false');
            input.removeAttribute('aria-activedescendant');
            empty.hidden = true;
            if (!q) return;

            const tokens = q.split(/\s+/).filter(Boolean);
            shown = items
                .filter((it) => tokens.every((t) => it.keys.includes(t)))
                .map((it) => { const n = norm(labelOf(it).name); return { it, score: (n.startsWith(tokens[0]) ? 3 : 0) + (n.includes(tokens[0]) ? 2 : 0) + 1 }; })
                .sort((a, b) => b.score - a.score)
                .slice(0, 8).map((o) => o.it);

            if (!shown.length) {
                empty.hidden = false;
                emptyCta.href = waLink(`Hola Western Multiservices, quisiera saber si me pueden ayudar con: ${input.value.trim()}`);
                return;
            }
            const frag = document.createDocumentFragment();
            shown.forEach((it, i) => {
                const li = document.createElement('li');
                const { name, group } = labelOf(it);
                li.setAttribute('role', 'option'); li.id = `q-opt-${i}`;
                li.innerHTML = `<a href="${waLink(it.msg)}" target="_blank" rel="noopener">
                    <span class="f-ic"><i class="ph ${it.icon}" aria-hidden="true"></i></span>
                    <span><span class="f-t">${highlight(name, tokens)}</span><span class="f-g">${esc(group)}</span></span>
                    <span class="f-go">${T('Preguntar por este servicio', 'Ask about this service')} <i class="ph ph-arrow-up-right" aria-hidden="true"></i></span></a>`;
                frag.appendChild(li);
            });
            list.appendChild(frag);
            input.setAttribute('aria-expanded', 'true');
            setActive(0);
        };

        const setActive = (i) => {
            const opts = $$('li', list);
            if (!opts.length) return;
            active = (i + opts.length) % opts.length;
            opts.forEach((li, k) => {
                const on = k === active;
                li.setAttribute('aria-selected', String(on));
                li.firstElementChild.classList.toggle('is-active', on);
            });
            input.setAttribute('aria-activedescendant', opts[active].id);
            opts[active].scrollIntoView({ block: 'nearest' });
        };

        input.addEventListener('input', render);
        input.addEventListener('focus', () => { input.placeholder = T('Ej. renovar mi ITIN', 'e.g. income tax'); });
        input.addEventListener('blur', () => { input.placeholder = ''; });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
            else if (e.key === 'Enter') {
                const a = $$('li a', list)[active];
                if (a) { e.preventDefault(); window.open(a.href, '_blank', 'noopener'); }
            } else if (e.key === 'Escape') { input.value = ''; render(); }
        });
        clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); });
        $$('.finder-chips button').forEach((b) => b.addEventListener('click', () => {
            input.value = b.dataset.q; render(); input.focus();
        }));

        // Máquina de escribir: ejemplos de lo que la gente suele pedir
        // (en inglés son palabras clave que sí devuelven resultados en el buscador)
        const PHRASES = {
            es: ['renovar mi ITIN', 'cita en el consulado', 'placas para mi carro', 'seguro de auto', 'reparar mi pantalla', 'declarar mis impuestos', 'abrir mi LLC', 'un celular liberado'],
            en: ['income tax', 'consulate appointment', 'title plates', 'car insurance', 'screen repair', 'immigration', 'business registration', 'unlocked phone']
        };
        const phraseSet = () => PHRASES[state.lang === 'es' ? 'es' : 'en'];
        if (reduce) { typeEl.textContent = phraseSet()[0]; return; }
        let pi = 0, ci = 0, del = false, typedLang = state.lang;
        const tick = () => {
            if (field.classList.contains('has-text') || document.activeElement === input || document.hidden) { setTimeout(tick, 700); return; }
            if (typedLang !== state.lang) { typedLang = state.lang; pi = ci = 0; del = false; } // cambió el idioma: empezar de nuevo
            const phrases = phraseSet();
            const full = phrases[pi % phrases.length];
            ci += del ? -1 : 1;
            typeEl.textContent = full.slice(0, ci);
            let d = del ? 26 : 64;
            if (!del && ci === full.length) { del = true; d = 1700; }
            else if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; d = 420; }
            setTimeout(tick, d);
        };
        tick();
    }

    /* ---------- 9. Oficinas, FAQ, video, formulario ---------- */
    function initOffices() {
        const tabs = $$('.of-tab'), panels = $$('.of-panel'), frame = $('#of-frame');
        let mapOn = false, current = 0;

        panels.forEach((p) => {
            const a = $('[data-dir-link]', p);
            a.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.dataset.dir)}`;
        });

        const activate = (i, focus) => {
            current = i;
            tabs.forEach((t, k) => {
                const on = k === i;
                t.classList.toggle('is-on', on);
                t.setAttribute('aria-selected', String(on));
                t.tabIndex = on ? 0 : -1;
                panels[k].hidden = !on;
                panels[k].classList.toggle('is-on', on);
            });
            if (focus) tabs[i].focus();
            if (mapOn) frame.src = panels[i].dataset.map;
        };
        tabs.forEach((t, i) => {
            t.addEventListener('click', () => activate(i));
            t.addEventListener('keydown', (e) => {
                const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
                if (k) { e.preventDefault(); activate((i + k + tabs.length) % tabs.length, true); }
                else if (e.key === 'Home') { e.preventDefault(); activate(0, true); }
                else if (e.key === 'End') { e.preventDefault(); activate(tabs.length - 1, true); }
            });
        });

        // El mapa se carga solo cuando la sección está cerca
        new IntersectionObserver((en, io) => {
            if (en[0].isIntersecting) { mapOn = true; frame.src = panels[current].dataset.map; io.disconnect(); }
        }, { rootMargin: '500px 0px' }).observe($('.of-stage'));
    }

    function initFaq() {
        const qs = $$('.q');
        qs.forEach((q) => {
            const btn = $('button', q), ans = $('.q-a', q);
            btn.addEventListener('click', () => {
                const open = btn.getAttribute('aria-expanded') !== 'true';
                qs.forEach((o) => {
                    $('button', o).setAttribute('aria-expanded', 'false');
                    $('.q-a', o).classList.remove('is-open');
                });
                btn.setAttribute('aria-expanded', String(open));
                ans.classList.toggle('is-open', open);
                if (animate) setTimeout(() => ScrollTrigger.refresh(), 650);
            });
        });
        // La primera respuesta (aviso de "no somos abogados") queda abierta
        $('button', qs[0]).click();
    }

    function initVideo() {
        const v = $('#tour-video'), btn = $('#tour-toggle');
        if (!v) return;
        const icon = $('i', btn);
        const sync = () => {
            const playing = !v.paused;
            icon.className = playing ? 'ph-fill ph-pause' : 'ph-fill ph-play';
            btn.setAttribute('aria-label', playing ? T('Pausar video', 'Pause video') : T('Reproducir video', 'Play video'));
            btn.setAttribute('aria-pressed', String(!playing));
        };
        let loadedSrc = false, userPaused = reduce;
        const ensure = () => {
            if (loadedSrc) return;
            loadedSrc = true;
            const s = $('source', v); s.src = s.dataset.src; v.load();
        };
        new IntersectionObserver(([en]) => {
            if (en.isIntersecting) {
                ensure();
                if (!userPaused) v.play().catch(() => { }).finally(sync);
            } else { v.pause(); sync(); }
        }, { threshold: .35 }).observe(v);
        btn.addEventListener('click', () => {
            ensure();
            if (v.paused) { userPaused = false; v.play().catch(() => { }).finally(sync); }
            else { userPaused = true; v.pause(); sync(); }
        });
        v.addEventListener('play', sync); v.addEventListener('pause', sync);
        sync();
    }

    function initForm() {
        const form = $('#wa-form');
        if (!form) return;
        const f = {
            name: $('#f-name'), phone: $('#f-phone'), service: $('#f-service'), office: $('#f-office'), msg: $('#f-msg')
        };
        const bad = (input, errId, on) => {
            $(errId).hidden = !on;
            input.closest('.field').classList.toggle('is-bad', on);
            input.setAttribute('aria-invalid', String(on));
        };
        [f.name, f.phone, f.service].forEach((el) => el.addEventListener('input', () => {
            if (el === f.name) bad(f.name, '#e-name', f.name.value.trim().length < 2 && f.name.value !== '');
        }));

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = f.name.value.trim();
            const phoneDigits = f.phone.value.replace(/\D/g, '');
            const okName = name.length >= 2;
            const okPhone = !f.phone.value.trim() || (phoneDigits.length >= 10 && phoneDigits.length <= 15);
            const okService = !!f.service.value;
            bad(f.name, '#e-name', !okName);
            bad(f.phone, '#e-phone', !okPhone);
            bad(f.service, '#e-service', !okService);
            if (!(okName && okPhone && okService)) {
                (!okName ? f.name : !okService ? f.service : f.phone).focus();
                return;
            }
            const parts = [`Hola Western Multiservices, soy ${name}.`, `Me interesa: ${f.service.value}.`];
            if (f.office.value) parts.push(`Oficina que me queda mejor: ${f.office.value}.`);
            if (f.phone.value.trim()) parts.push(`Mi teléfono: ${f.phone.value.trim()}.`);
            if (f.msg.value.trim()) parts.push(f.msg.value.trim());
            const url = waLink(parts.join(' '));

            const btn = $('#f-submit'), label = $('span', btn);
            const old = label.textContent;
            label.textContent = T('Abriendo WhatsApp', 'Opening WhatsApp');
            btn.disabled = true;
            $('#f-ok').hidden = false;
            const w = window.open(url, '_blank', 'noopener');
            if (!w) location.href = url; // si el navegador bloquea la ventana
            setTimeout(() => { label.textContent = old; btn.disabled = false; }, 3200);
        });
    }

    function initWaTip() {
        const tip = $('#wa-tip');
        if (!tip) return;
        setTimeout(() => tip.classList.add('show'), 7000);
        setTimeout(() => tip.classList.remove('show'), 13000);
    }

    /* ---------- 10. Efectos de puntero ---------- */
    function initPointerFx() {
        if (!finePointer || reduce) return;

        // Luz que sigue al cursor dentro de tarjetas
        $$('.svc, [data-spot]').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                el.style.setProperty('--my', (e.clientY - r.top) + 'px');
            });
        });

        // Inclinación 3D
        $$('[data-tilt]').forEach((el) => {
            const max = el.classList.contains('phone') ? 8 : 9;
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
                if (animate) gsap.to(el, { rotationY: x * max * 2, rotationX: -y * max * 2, transformPerspective: 900, duration: .7, ease: 'power3.out', overwrite: 'auto' });
                else el.style.transform = `perspective(900px) rotateY(${x * max * 2}deg) rotateX(${-y * max * 2}deg)`;
            });
            el.addEventListener('pointerleave', () => {
                if (animate) gsap.to(el, { rotationY: 0, rotationX: 0, duration: 1, ease: 'elastic.out(1,.6)', overwrite: 'auto' });
                else el.style.transform = '';
            });
        });

        // Botones magnéticos
        if (animate) {
            $$('[data-magnetic]').forEach((el) => {
                el.addEventListener('pointermove', (e) => {
                    const r = el.getBoundingClientRect();
                    gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * .22, y: (e.clientY - (r.top + r.height / 2)) * .3, duration: .5, ease: 'power3.out', overwrite: 'auto' });
                });
                el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1,.5)', overwrite: 'auto' }));
            });
        }
    }

    /* ---------- 11. Traducción automática (Google Website Translator) ---------- */
    // El sitio se escribe solo en español; Google lo traduce en el navegador, así no hay dos versiones que mantener.
    //  · Si el idioma del dispositivo no es español, se ofrece traducir (aviso discreto, una vez).
    //  · El selector ES | EN del header cambia de idioma en cualquier momento.
    //  · El script de Google solo se descarga cuando el visitante lo pide (o si ya había elegido traducir antes).
    function initTranslate() {
        const box = $('#lang'), bar = $('#tr-bar'), host = $('#google_translate_element');
        if (!box || !bar || !host) return;
        const SRC = 'es', KEY = 'wms-lang', SEEN = 'wms-lang-offered';
        const store = {
            get: () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
            set: (v) => { try { localStorage.setItem(KEY, v); } catch (e) { } }
        };

        // Texto del aviso en el idioma del visitante: [mensaje, botón de traducir, botón de rechazar]. Si no hay, inglés.
        const OFFER = {
            en: ['This page is in Spanish. Would you like to translate it?', 'Translate', 'No, thanks'],
            pt: ['Esta página está em espanhol. Deseja traduzi-la?', 'Traduzir', 'Não, obrigado'],
            fr: ['Cette page est en espagnol. Voulez-vous la traduire ?', 'Traduire', 'Non, merci'],
            de: ['Diese Seite ist auf Spanisch. Möchten Sie sie übersetzen?', 'Übersetzen', 'Nein, danke'],
            it: ['Questa pagina è in spagnolo. Vuoi tradurla?', 'Traduci', 'No, grazie'],
            vi: ['Trang này bằng tiếng Tây Ban Nha. Bạn có muốn dịch không?', 'Dịch', 'Không, cảm ơn'],
            ko: ['이 페이지는 스페인어입니다. 번역하시겠습니까?', '번역', '아니요'],
            'zh-CN': ['此页面为西班牙语。是否翻译？', '翻译', '不用了'],
            'zh-TW': ['此頁面為西班牙文。是否翻譯？', '翻譯', '不用了']
        };
        const ERR = 'Translation is not available right now. Please try again later.';

        // Idioma del navegador -> código de Google (es-MX -> es, zh-TW -> zh-TW, he -> iw)
        const toGoogle = (tag) => {
            const t = String(tag || '').toLowerCase(), b = t.split('-')[0];
            if (b === 'zh') return /tw|hk|mo|hant/.test(t) ? 'zh-TW' : 'zh-CN';
            return { he: 'iw', nb: 'no', nn: 'no', fil: 'tl' }[b] || b;
        };
        const deviceLang = () => toGoogle((navigator.languages && navigator.languages[0]) || navigator.language || SRC);

        // Google deja la clase translated-ltr puesta aunque se vuelva al original; lo que sí cambia es <html lang>
        const translated = () => /\btranslated-(ltr|rtl)\b/.test(root.className) && root.lang !== SRC;
        const combo = () => host.querySelector('select.goog-te-combo');
        const until = (test, ms) => new Promise((done) => {
            const t0 = Date.now();
            (function poll() { if (test()) done(true); else if (Date.now() - t0 > ms) done(false); else setTimeout(poll, 100); })();
        });
        const fire = (el) => el.dispatchEvent(new Event('change'));
        const clearCookie = () => { // Google recuerda el idioma en la cookie googtrans
            const past = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/', h = location.hostname;
            document.cookie = past; document.cookie = `${past}; domain=${h}`; document.cookie = `${past}; domain=.${h}`;
        };

        // El script de Google se descarga la primera vez que hace falta y se reutiliza.
        let loading = null;
        const loadGoogle = () => loading || (loading = new Promise((ok, fail) => {
            window.googleTranslateElementInit = () => {
                try { new google.translate.TranslateElement({ pageLanguage: SRC, autoDisplay: false }, 'google_translate_element'); }
                catch (e) { fail(e); return; }
                until(() => combo() && combo().options.length > 1, 8000).then((found) => (found ? ok() : fail(new Error('selector de idiomas no disponible'))));
            };
            const s = document.createElement('script');
            s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            s.async = true;
            s.onerror = () => fail(new Error('no se pudo cargar el script de Google'));
            document.head.appendChild(s);
            setTimeout(() => fail(new Error('Google tardó demasiado')), 12000);
        })).catch((e) => { loading = null; throw e; });

        // Selector ES | EN (+ un tercer botón si se tradujo a otro idioma)
        const extra = $('#lang-x');
        const paint = () => {
            const known = state.lang === SRC || state.lang === 'en';
            extra.hidden = known;
            if (!known) { extra.dataset.lang = state.lang; extra.lang = state.lang; extra.textContent = state.lang.split('-')[0].toUpperCase(); extra.setAttribute('aria-label', state.lang); }
            $$('.lang-b', box).forEach((b) => {
                const on = b.dataset.lang === state.lang;
                b.classList.toggle('is-on', on);
                b.setAttribute('aria-pressed', String(on));
            });
        };

        // Al traducir cambia el largo de los textos: hay que volver a medir los bloques fijados por GSAP
        const relayout = () => [700, 2200].forEach((ms) => setTimeout(() => { if (animate) ScrollTrigger.refresh(); if (lenis) lenis.resize(); }, ms));

        async function translateTo(code) {
            flattenWords(); // antes de cargar Google: si ya hay cookie de idioma, traduce apenas inicia
            await loadGoogle();
            const sel = combo();
            if (![...sel.options].some((o) => o.value === code)) code = 'en'; // idioma que Google no ofrece: inglés
            sel.value = code; fire(sel);
            if (!(await until(translated, 2500))) { sel.value = code; fire(sel); } // a veces el primer cambio se pierde
            if (!(await until(translated, 6000))) throw new Error('Google no tradujo la página');
            state.lang = code; store.set(code); relayout();
        }
        async function restore() {
            store.set(SRC); clearCookie();
            const sel = combo();
            if (translated() && sel && [...sel.options].some((o) => o.value === SRC)) {
                sel.value = SRC; fire(sel); // elegir el idioma original en el selector de Google restaura el texto
                if (await until(() => !translated(), 3000)) { clearCookie(); state.lang = SRC; restoreWords(); relayout(); return; }
            }
            if (translated()) { clearCookie(); location.reload(); return; } // plan B: recargar el original
            state.lang = SRC; restoreWords(); relayout();
        }

        let busy = false;
        async function go(code) {
            if (busy || !code || code === state.lang) return;
            busy = true; box.classList.add('is-busy');
            try { await (code === SRC ? restore() : translateTo(code)); }
            catch (e) { console.warn('translate', e); say(null); }
            busy = false; box.classList.remove('is-busy'); paint();
        }

        // Aviso (también se usa para avisar que la traducción falló)
        const msg = $('#tr-msg'), yes = $('#tr-yes'), no = $('#tr-no');
        let offered = null, hideTimer = 0, hideEnd = 0;
        function say(code) {
            const err = !code, key = !err && (OFFER[code] ? code : OFFER[code.split('-')[0]] ? code.split('-')[0] : 'en');
            const txt = err ? OFFER.en : OFFER[key];
            bar.lang = err ? 'en' : key;
            msg.textContent = err ? ERR : txt[0];
            yes.textContent = txt[1]; yes.hidden = err;
            no.textContent = err ? 'OK' : txt[2];
            offered = code;
            clearTimeout(hideEnd); // por si un hide() anterior todavía iba a ocultarlo
            bar.hidden = false;
            requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('is-in')));
            clearTimeout(hideTimer); hideTimer = setTimeout(hide, err ? 8000 : 22000);
        }
        function hide() {
            clearTimeout(hideTimer); bar.classList.remove('is-in');
            clearTimeout(hideEnd); hideEnd = setTimeout(() => { bar.hidden = true; }, 700);
        }

        yes.addEventListener('click', () => { hide(); go(offered); });
        no.addEventListener('click', () => { hide(); if (offered) store.set(SRC); }); // "no, gracias": no se vuelve a ofrecer
        box.addEventListener('click', (e) => { const b = e.target.closest('.lang-b'); if (b) { hide(); go(b.dataset.lang); } });
        addEventListener('keydown', (e) => { if (e.key === 'Escape' && !bar.hidden) hide(); });

        // Arranque: ¿ya había elegido idioma? ¿el dispositivo está en otro idioma?
        box.hidden = false;
        const saved = store.get();
        if (saved && saved !== SRC) go(saved);
        else if (!saved) {
            const dev = deviceLang();
            let seen = false; try { seen = !!sessionStorage.getItem(SEEN); } catch (e) { }
            if (dev !== SRC && !seen) {
                offerTranslate = () => {
                    try { sessionStorage.setItem(SEEN, '1'); } catch (e) { }
                    if (state.lang === SRC && !translated()) say(dev);
                };
            }
        }
        paint();
    }

    /* ---------- Arranque ---------- */
    function prepareText() {
        const el = $('[data-words]');
        if (!el) return;
        const hl = /laberinto|techo|español|vecino/i;
        el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w${hl.test(w) ? ' hl' : ''}">${w}</span>`).join(' ');
    }

    let started = false;
    function startSite() {
        if (started) return;
        started = true;
        initScroll();
        heroIntro();
        if (offerTranslate) setTimeout(offerTranslate, 2400); // el aviso de traducción espera a que el hero termine de entrar
    }

    function boot() {
        prepareText();
        try { initHeader(); } catch (e) { console.warn('header', e); }
        initEmbers(); initSun(); initStage(); initMarquee();
        startLoop();
        try { initScrollAnimations(); } catch (e) {
            console.warn('scroll animations', e);
            root.classList.remove('has-gsap');
            $$('[data-reveal]').forEach((n) => { n.style.opacity = 1; n.style.transform = 'none'; });
        }
        initFinder(); initOffices(); initFaq(); initVideo(); initForm(); initWaTip(); initPointerFx();
        try { initTranslate(); } catch (e) { console.warn('translate', e); }
        runLoader();
        if (animate) {
            addEventListener('load', () => ScrollTrigger.refresh());
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
        }
    }

    boot();
})();
