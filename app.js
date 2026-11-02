/* TKGMNetChat tanıtım sitesi v3 — sürüm/boyut/SHA256 GitHub'dan; hareketler yalnız transform/opacity. */
(() => {
  'use strict'
  const REPO = 'TKGMNetChat/tkgmnetchat.github.io'
  const FALLBACK = {
    version: 'v1.0.4',
    size: 282010354,
    name: 'TKGMNetChat-Kurulum.exe',
    sha256: '1b34699177b1e0bc7ae442eb633ebd761b44382186635df26b7be2c37878842d',
    url: `https://github.com/${REPO}/releases/latest/download/TKGMNetChat-Kurulum.exe`,
  }
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s))
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  const mb = (bytes) => `${Math.round(bytes / 1048576)} MB`

  function paint({ version, size, name, sha256, url }) {
    $$('[data-version]').forEach((n) => { n.textContent = version })
    $$('[data-size]').forEach((n) => { n.textContent = mb(size) })
    $$('[data-download]').forEach((a) => { a.href = url })
    const cmd = $('#cmd'); if (cmd) cmd.textContent = `Get-FileHash .\\${name} -Algorithm SHA256`
    const hash = $('#hash'); if (hash && sha256) hash.textContent = sha256
  }

  async function loadRelease() {
    paint(FALLBACK)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6500)
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' }, signal: ctrl.signal })
      if (!res.ok) return
      const rel = await res.json()
      const exes = (rel.assets || []).filter((a) => /\.exe$/i.test(a.name))
      const exe = exes.find((a) => /kurulum/i.test(a.name)) || exes[0]
      if (!exe) return
      const digest = /^sha256:([a-f0-9]{64})$/i.exec(exe.digest || '')
      paint({
        version: /^v/i.test(rel.tag_name || '') ? rel.tag_name : `v${rel.tag_name}`,
        size: exe.size,
        name: exe.name,
        url: exe.browser_download_url,
        sha256: (digest && digest[1]) || (exe.name === FALLBACK.name ? FALLBACK.sha256 : ''),
      })
    } catch { /* yedek değerler zaten yazıldı */ } finally { clearTimeout(timer) }
  }

  // Tek rAF döngüsü: nav durumu + hero eğimi (yalnız görünürken).
  function wireScroll() {
    const nav = $('#nav')
    const hero = $('#hero-frame')
    let ticking = false
    const update = () => {
      ticking = false
      const y = window.scrollY
      nav.classList.toggle('is-stuck', y > 8)
      if (!hero || reduce.matches || innerWidth <= 960) return
      const p = Math.min(1, Math.max(0, y / (innerHeight * 0.7)))
      if (p >= 1 && hero.dataset.flat) return
      hero.dataset.flat = p >= 1 ? '1' : ''
      // Pencere hafif eğik başlar, kaydırdıkça masaya iner gibi düzleşir.
      hero.style.transform = `translate3d(0, ${(-24 * p).toFixed(2)}px, 0) rotateX(${(10 * (1 - p)).toFixed(2)}deg) scale(${(0.955 + 0.045 * p).toFixed(4)})`
    }
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }
    update()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onScroll, { passive: true })
  }

  function wireCopy() {
    $$('[data-copy]').forEach((btn) => {
      const label = btn.textContent
      btn.addEventListener('click', async () => {
        const text = $(btn.dataset.copy)?.textContent || ''
        try { await navigator.clipboard.writeText(text); btn.textContent = 'Kopyalandı' } catch { btn.textContent = 'Seçip kopyalayın' }
        setTimeout(() => { btn.textContent = label }, 1600)
      })
    })
  }

  function wireReveal() {
    const items = $$('.reveal')
    if (!('IntersectionObserver' in window)) { items.forEach((n) => n.classList.add('is-in')); return }
    // Aynı satırdaki kardeşler 60 ms arayla gelir.
    items.forEach((n) => {
      const sibs = $$(':scope > .reveal', n.parentElement)
      if (sibs.length > 1) n.style.setProperty('--d', `${sibs.indexOf(n) * 60}ms`)
    })
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) } })
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 })
    items.forEach((n) => io.observe(n))
  }

  function wireStory() {
    const track = $('#story-track')
    if (!track) return
    const items = $$('.story__item', track)
    const now = $('#story-now')
    const [prev, next] = $$('[data-story]')
    let index = 0
    const sync = () => {
      const left = track.scrollLeft
      let best = 0
      items.forEach((it, i) => { if (Math.abs(it.offsetLeft - track.offsetLeft - left - parseFloat(getComputedStyle(track).scrollPaddingLeft || 0)) < Math.abs(items[best].offsetLeft - track.offsetLeft - left - parseFloat(getComputedStyle(track).scrollPaddingLeft || 0))) best = i })
      index = best
      now.textContent = String(best + 1).padStart(2, '0')
      prev.disabled = best === 0
      next.disabled = best === items.length - 1
    }
    const go = (dir) => {
      const target = items[Math.min(items.length - 1, Math.max(0, index + dir))]
      track.scrollTo({ left: target.offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).scrollPaddingLeft || 0), behavior: reduce.matches ? 'auto' : 'smooth' })
    }
    prev.addEventListener('click', () => go(-1))
    next.addEventListener('click', () => go(1))
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
    })
    let raf = 0
    track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync) }, { passive: true })
    sync()
  }

  // Yapışkan pencere: masaüstünde adım görünür olunca ekran yumuşakça değişir.
  function wireTour() {
    const frame = $('#tour-frame')
    const steps = $$('#tour-steps .step')
    const now = $('#tour-now')
    if (!frame || !steps.length) return
    const desktop = matchMedia('(min-width: 961px)')
    let layers = []
    const build = () => {
      if (layers.length || !desktop.matches) return
      layers = steps.map((s, i) => {
        const img = new Image()
        img.className = 'layer' + (i === 0 ? ' is-on' : '')
        img.width = 1920; img.height = 1080
        img.alt = ''
        img.decoding = 'async'
        if (i > 1) img.loading = 'lazy'
        img.sizes = '(min-width: 1320px) 760px, 58vw'
        img.srcset = `assets/shots/${s.dataset.shot}-1600.webp 1600w, assets/shots/${s.dataset.shot}-2400.webp 2400w`
        img.src = `assets/shots/${s.dataset.shot}-1600.webp`
        frame.appendChild(img)
        return img
      })
    }
    const activate = (i) => {
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i))
      layers.forEach((l, k) => l.classList.toggle('is-on', k === i))
      now.textContent = String(i + 1).padStart(2, '0')
    }
    build()
    desktop.addEventListener?.('change', build)
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) activate(steps.indexOf(e.target)) })
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 })
    steps.forEach((s) => io.observe(s))
    activate(0)
  }

  loadRelease(); wireScroll(); wireCopy(); wireReveal(); wireStory(); wireTour()
})()
