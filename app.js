/**
 * TKGMNetChat tanıtım sitesi — küçük, bağımsız davranış katmanı.
 * 1) GitHub Releases'ten en son sürümü, Windows .exe dosyasını ve boyutu çeker.
 * 2) Modül sekmelerini klavye ve dokunmayla erişilebilir biçimde değiştirir.
 * 3) Bölümleri görünür oldukça açar, mobil menüyü ve cam navigasyonu yönetir.
 * API'ye ulaşılamazsa düğmeler mevcut deponun releases/latest adresinde çalışır.
 */
(() => {
  'use strict'

  const FALLBACK_REPO = 'TKGMNetChat/tkgmnetchat.github.io'
  const RELEASE_REPOS = [
    FALLBACK_REPO,
  ]

  const setText = (selector, value) => {
    document.querySelectorAll(selector).forEach((node) => { node.textContent = value })
  }

  const setHref = (selector, value) => {
    document.querySelectorAll(selector).forEach((node) => { node.href = value })
  }

  const finishDownloadState = () => {
    document.querySelectorAll('[data-download]').forEach((node) => {
      node.setAttribute('aria-busy', 'false')
      node.removeAttribute('data-fallback')
    })
  }

  const formatSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return 'Boyut GitHub\'da'
    const mb = bytes / (1024 * 1024)
    return `${mb.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`
  }

  const normalizedVersion = (release) => {
    const raw = String(release.tag_name || release.name || '').trim()
    if (!raw) return ''
    return /^v/i.test(raw) ? raw : `v${raw}`
  }

  async function fetchRelease(repo) {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 6500)
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal,
      })
      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    } finally {
      window.clearTimeout(timer)
    }
  }

  async function loadLatestRelease() {
    for (const repo of RELEASE_REPOS) {
      const release = await fetchRelease(repo)
      if (!release) continue

      const assets = Array.isArray(release.assets) ? release.assets : []
      const exe = assets.find((asset) => /\.exe$/i.test(asset.name || '') && /setup|installer|kurulum|x64|win/i.test(asset.name || ''))
        || assets.find((asset) => /\.exe$/i.test(asset.name || ''))

      const version = normalizedVersion(release)
      if (version) setText('[data-release-version]', version)
      setText('[data-release-size]', exe ? formatSize(exe.size) : 'Boyut GitHub\'da')
      setHref('[data-download]', exe?.browser_download_url || `https://github.com/${repo}/releases/latest`)
      setHref('[data-release-link]', release.html_url || `https://github.com/${repo}/releases`)
      finishDownloadState()
      return
    }

    // Sessiz geri dönüş: bilinen depo üzerinden indirme sayfası açılır.
    const fallbackBase = `https://github.com/${FALLBACK_REPO}`
    setText('[data-release-size]', 'Boyut GitHub\'da')
    setHref('[data-download]', `${fallbackBase}/releases/latest`)
    setHref('[data-release-link]', `${fallbackBase}/releases`)
    document.querySelectorAll('[data-download]').forEach((node) => node.setAttribute('data-fallback', 'true'))
    finishDownloadState()
  }

  function wireTabs() {
    const tabs = Array.from(document.querySelectorAll('[data-tab]'))
    if (!tabs.length) return

    const shots = Array.from(document.querySelectorAll('.module-shot[data-panel]'))
    const panels = Array.from(document.querySelectorAll('.module-panel[data-panel]'))

    const syncPanel = (element, active) => {
      element.classList.toggle('is-active', active)
      element.setAttribute('aria-hidden', String(!active))
    }

    const selectTab = (id, focusTab = false) => {
      tabs.forEach((tab) => {
        const active = tab.dataset.tab === id
        tab.classList.toggle('is-active', active)
        tab.setAttribute('aria-selected', String(active))
        tab.tabIndex = active ? 0 : -1
        if (active && focusTab) tab.focus()
      })
      shots.forEach((shot) => syncPanel(shot, shot.dataset.panel === id))
      panels.forEach((panel) => syncPanel(panel, panel.dataset.panel === id))
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => selectTab(tab.dataset.tab))
    })

    document.querySelector('.tabs')?.addEventListener('keydown', (event) => {
      const current = event.target.closest('[data-tab]')
      if (!current) return

      const index = tabs.indexOf(current)
      let nextIndex = null
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
      if (event.key === 'Home') nextIndex = 0
      if (event.key === 'End') nextIndex = tabs.length - 1
      if (nextIndex === null) return

      event.preventDefault()
      selectTab(tabs[nextIndex].dataset.tab, true)
    })
  }

  function wireReveal() {
    const items = document.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-in'))
      return
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-in')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    items.forEach((item) => observer.observe(item))
  }

  function wireNav() {
    const nav = document.querySelector('.nav')
    if (!nav) return

    let ticking = false
    const update = () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 24)
      ticking = false
    }
    window.addEventListener('scroll', () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(update)
    }, { passive: true })
    update()

    const toggle = nav.querySelector('.nav__toggle')
    const menu = nav.querySelector('#nav-menu')
    if (!toggle || !menu) return

    const setOpen = (open) => {
      menu.classList.toggle('is-open', open)
      toggle.setAttribute('aria-expanded', String(open))
      toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç')
    }

    toggle.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')))
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)))

    document.addEventListener('click', (event) => {
      if (!menu.classList.contains('is-open')) return
      if (!nav.contains(event.target)) setOpen(false)
    })

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false)
    })

    window.addEventListener('resize', () => {
      if (window.innerWidth > 920) setOpen(false)
    }, { passive: true })
  }

  const year = document.querySelector('[data-year]')
  if (year) year.textContent = String(new Date().getFullYear())

  wireNav()
  wireTabs()
  wireReveal()
  void loadLatestRelease()
})()
