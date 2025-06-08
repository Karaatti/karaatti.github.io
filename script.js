let menuNavInProgress = false;

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", function () {
  console.log("[INIT] DOMContentLoaded");
  document.documentElement.classList.add('ajax-loading');
  loadHeaderFooter()
    .then(() => {
      console.log("[INIT] Header/Footer loaded");
      initCollectionLoader('.collection-btn', '#collection-content');
      initPjaxNavigation();
    })
    .catch(err => console.error('[INIT] Header/Footer load failed:', err))
    .finally(() => {
      document.documentElement.classList.remove('ajax-loading');
      console.log("[INIT] ajax-loading class removed");
    });
});

// ==================== HEADER AUTO-HIDE ====================
let disableHeaderAutoHide = false;
function disableHeaderHideUntilScrollEnd() {
  disableHeaderAutoHide = true;
  console.log("[HEADER] Auto-hide disabled until scroll end");
  let scrollEndTimeout;
  function onScroll() {
    clearTimeout(scrollEndTimeout);
    scrollEndTimeout = setTimeout(() => {
      disableHeaderAutoHide = false;
      window.removeEventListener("scroll", onScroll);
      console.log("[HEADER] Auto-hide re-enabled after scroll");
    }, 100);
  }
  window.addEventListener("scroll", onScroll);
}

// ==================== SCROLL LOCK ====================
let _scrollLocked = false;
let _savedScrollPos = 0;
function applyScrollLock(shouldLock) {
  if (shouldLock && !_scrollLocked) {
    _savedScrollPos = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.top = `-${_savedScrollPos}px`;
    document.body.classList.add('no-scroll');
    _scrollLocked = true;
    console.log("[SCROLLLOCK] Scroll locked at pos", _savedScrollPos);
  } else if (!shouldLock && _scrollLocked) {
    document.body.classList.remove('no-scroll');
    document.body.style.top = '';
    window.scrollTo(0, _savedScrollPos);
    _scrollLocked = false;
    console.log("[SCROLLLOCK] Scroll unlocked, restored to", _savedScrollPos);
  }
}
function syncScrollLockWithHamburger() {
  const hb = document.querySelector('.hamburger');
  if (!hb) return;
  if (hb.classList.contains('open')) lockScrollPreservePosition();
  else unlockScrollRestorePosition();
  console.log("[SCROLLLOCK] Sync with hamburger:", hb.classList.contains('open'));
}
function syncScrollLockWithNav() {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;
  if (navLinks.classList.contains('active')) lockScrollPreservePosition();
  else unlockScrollRestorePosition();
  console.log("[SCROLLLOCK] Sync with nav:", navLinks.classList.contains('active'));
}
let _lockedScrollPos = 0;
let _scrollLockDepth = 0;
function lockScrollPreservePosition() {
  if (_scrollLockDepth === 0) {
    _lockedScrollPos = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.top = `-${_lockedScrollPos}px`;
    document.body.classList.add('no-scroll');
    console.log("[SCROLLLOCK] Locked, depth=1 at", _lockedScrollPos);
  }
  _scrollLockDepth++;
  console.log("[SCROLLLOCK] lockScrollPreservePosition, depth", _scrollLockDepth);
}
function unlockScrollRestorePosition() {
  if (_scrollLockDepth === 0) return;
  _scrollLockDepth--;
  console.log("[SCROLLLOCK] unlockScrollRestorePosition, depth", _scrollLockDepth);
  if (_scrollLockDepth === 0) {
    document.body.classList.remove('no-scroll');
    document.body.style.top = '';
    requestAnimationFrame(() => {
      window.scrollTo(0, _lockedScrollPos);
      console.log("[SCROLLLOCK] Scroll position restored to", _lockedScrollPos);
    });
  }
}


// ==================== DROPDOWN SUBMENU ====================
const dropdownOriginalHtml = new Map();
const menuStack = new Map();

// korvaa tämä:
function initDropdownItemClicks(menu) {
  // luo pino jos puuttuu
  if (!menuStack.has(menu)) {
    menuStack.set(menu, []);
  }

  // BACK-painikkeen käsittely
  const backBtn = menu.querySelector('.dropdown-back');
  if (backBtn) {
    backBtn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const stack = menuStack.get(menu);
      if (!stack.length) return;
      // nouda edellinen tila
      const prev = stack.pop();
      menu.innerHTML = prev.html;
      initDropdownItemClicks(menu);
    });
  }

  // alavalikon linkit
  menu.querySelectorAll('a[data-submenu]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const url   = link.getAttribute('data-submenu');
      const title = link.textContent.trim();
      // tallenna nykyinen näkymä pinon päälle
      menuStack.get(menu).push({
        html:  menu.innerHTML,
        title
      });
      // lataa seuraava taso
      loadDropdownSubmenu(menu, url);
    });
  });
}

async function loadDropdownSubmenu(menu, url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.statusText);
    const text = await res.text();
    const doc  = new DOMParser().parseFromString(text, 'text/html');
    const newSub = doc.querySelector('.submenu');
    const itemsHtml = newSub
      ? newSub.innerHTML
      : '<li>Ei vaihtoehtoja</li>';

    // ota pinon ylin title (jos pino ei tyhjä)
    const stack       = menuStack.get(menu) || [];
    const parentTitle = stack.length
      ? stack[stack.length - 1].title
      : '';

    // rakennetaan back-nappi vain, jos title löytyy
    const backHtml = parentTitle
      ? `<li class="back">
           <button type="button" class="dropdown-back">
             ← Back to ${parentTitle}
           </button>
         </li>`
      : '';

    menu.innerHTML = backHtml + itemsHtml;
    initDropdownItemClicks(menu);
  } catch (err) {
    console.error('[DROPDOWN] loadDropdownSubmenu error:', err);
    menu.innerHTML = '<li>Virhe</li>';
  }
}

// ==================== NAV + HEADER FUNCTIONS ====================
function initHeaderToiminnot() {
  const header = document.querySelector('.header');
  if (!header) return;
  let viimeisinScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    if (disableHeaderAutoHide) {
      header.classList.remove('header-hidden');
      viimeisinScrollY = window.scrollY;
      return;
    }
    const nyt = window.scrollY;
    if (nyt > viimeisinScrollY && nyt > 1) header.classList.add('header-hidden');
    if (nyt < viimeisinScrollY) header.classList.remove('header-hidden');
    viimeisinScrollY = nyt;
  });

  const hamburger = header.querySelector('.hamburger');
  const navLinks = header.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('active');
      syncScrollLockWithHamburger();
      console.log("[HEADER] Hamburger toggled. open:", hamburger.classList.contains('open'));
    });
  }
// pino-map scriptin alkuun (vain kerran)
const menuStack = new Map();

// korvaa attachDropdownHandlers:
function attachDropdownHandlers(menu) {
  if (!menuStack.has(menu)) {
    menuStack.set(menu, []);
  }

  // BACK-painike
  const backBtn = menu.querySelector('.dropdown-back');
  if (backBtn) {
    backBtn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const stack = menuStack.get(menu);
      if (!stack.length) return;
      const prev = stack.pop();
      menu.innerHTML = prev.html;
      attachDropdownHandlers(menu);
    });
  }

  // alavalikon linkit
  menu.querySelectorAll('a[data-submenu]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const url   = link.getAttribute('data-submenu');
      const title = link.textContent.trim();
      menuStack.get(menu).push({
        html:  menu.innerHTML,
        title
      });
      loadDropdownJson(menu, url);
    });
  });
}

// korvaa loadDropdownJson:
async function loadDropdownJson(menu, basePath) {
  menu.innerHTML = '<li class="loading">Loading…</li>';
  try {
    const res   = await fetch(basePath + 'items.json');
    if (!res.ok) throw new Error(res.statusText);
    const items = await res.json();

    // haetaan pino ja ylin title
    const stack       = menuStack.get(menu) || [];
    const parentTitle = stack.length
      ? stack[stack.length - 1].title
      : '';

    // back-nappin HTML
    const backHtml = parentTitle
      ? `<li class="back">
           <button type="button" class="dropdown-back">
             ← Back to ${parentTitle}
           </button>
         </li>`
      : '';

    // renderöidään itemit
    const itemsHtml = items
      .filter(item => item.type === 'dir' || item.href.endsWith('.html'))
      .map(item => {
        const attrs = item.type === 'dir'
          ? `data-submenu="${item.href}"`
          : '';
        return `<li>
                  <a href="${item.href}" ${attrs}>
                    ${item.name}
                  </a>
                </li>`;
      })
      .join('');

    menu.innerHTML = backHtml + itemsHtml;
    attachDropdownHandlers(menu);
  } catch (err) {
    console.error('[DROPDOWN JSON] error:', err);
    menu.innerHTML = '<li class="error">Error loading categories</li>';
  }
}


  const dropdowns = header.querySelectorAll('.dropdown');
  dropdowns.forEach(dd => {
    const btn = dd.querySelector('.dropdown-toggle');
    const menu = dd.querySelector('.dropdown-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', e => {
      e.preventDefault();
      dd.classList.toggle('open');
      console.log("[DROPDOWN] Dropdown toggle clicked, open:", dd.classList.contains('open'));
      if (!dropdownOriginalHtml.has(menu)) {
        dropdownOriginalHtml.set(menu, menu.innerHTML);
        console.log("[DROPDOWN] Saved original menu HTML for", menu);
      }
      attachDropdownHandlers(menu);
    });
  });

  document.addEventListener('click', e => {
    // Estetään sulkeminen jos navigoidaan menun sisällä
    if (menuNavInProgress) {
      console.log("[MENU] menuNavInProgress=true, NOT closing menus.");
      return;
    }
    if (e.target.closest('.dropdown-menu')) {
      console.log("[MENU] Clicked inside .dropdown-menu, NOT closing");
      return;
    }
    dropdowns.forEach(dd => {
      if (dd.classList.contains('open') && !dd.contains(e.target)) {
        dd.classList.remove('open');
        console.log("[MENU] Click outside, closing dropdown", dd);
      }
    });
    if (
      navLinks.classList.contains('active') &&
      !navLinks.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      navLinks.classList.remove('active');
      hamburger.classList.remove('open');
      syncScrollLockWithHamburger();
      console.log("[MENU] Click outside, closing navLinks/hamburger");
    }
  });

  // nav/link clicks close all
  header.querySelectorAll('.nav-links a, .dropdown a').forEach(link => {
    link.addEventListener('click', (e) => {
      if (link.hasAttribute('data-submenu')) {
        console.log("[MENU] data-submenu link clicked, NOT closing menu");
        return;
      }
      navLinks.classList.remove('active');
      hamburger.classList.remove('open');
      dropdowns.forEach(dd => dd.classList.remove('open'));
      syncScrollLockWithHamburger();
      header.classList.remove('header-hidden');
      console.log("[MENU] Normal nav/dropdown link clicked, closing all menus");
    });
  });

  // logo click: smooth scroll til top
  const logo = header.querySelector('.logo');
  if (logo) {
    logo.addEventListener('click', e => {
      const path = window.location.pathname;
      if (path === '/' || path.endsWith('index.html')) {
        e.preventDefault();
        e.stopPropagation();
        disableHeaderHideUntilScrollEnd();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        header.classList.remove('header-hidden');
        console.log("[HEADER] Logo clicked, smooth scroll to top");
      }
    });
  }
}

function initFooterToiminnot() {
  const btn = document.getElementById('scroll-btn');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.style.display = window.pageYOffset > 100 ? 'block' : 'none';
  });
  btn.addEventListener('click', () => {
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      document.activeElement.blur();
    }
    disableHeaderHideUntilScrollEnd();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log("[FOOTER] Scroll-btn clicked, scroll to top");
  });
}

// ==================== CLOSE ALL MENUS ====================
function closeAllMenus() {
  if (window.menuNavInProgress) {
    console.log("[MENU] closeAllMenus: menuNavInProgress=true, NOT closing menus.");
    return;
  }
  const header = document.querySelector('.header');
  if (!header) return;
  const hamburger = header.querySelector('.hamburger');
  const navLinks = header.querySelector('.nav-links');
  const dropdowns = header.querySelectorAll('.dropdown');
  navLinks.classList.remove('active');
  hamburger?.classList.remove('open');
  dropdowns.forEach(dd => dd.classList.remove('open'));
  syncScrollLockWithHamburger();
  setTimeout(() => header.classList.remove('header-hidden'), 0);
  console.log("[MENU] closeAllMenus called - all menus closed");
}


// ==================== HEADER & FOOTER LOAD ====================
function computePrefix() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts.map(_ => '../').join('');
}

// ==================== UPDATED loadHeaderFooter() ====================
function loadHeaderFooter() {
  const prefix = computePrefix();
  console.log("[LOAD] Header/Footer load with prefix", prefix);
  const headerPromise = fetch(prefix + 'header.html')
    .then(r => {
      if (!r.ok) throw new Error('Header load: ' + r.status);
      return r.text();
    })
    .then(html => {
      let headerContainer = document.getElementById('site-header');
      if (!headerContainer) {
        headerContainer = document.createElement('header');
        headerContainer.id = 'site-header';
        document.body.insertAdjacentElement('afterbegin', headerContainer);
      }
      headerContainer.innerHTML = html;
      initHeaderToiminnot();
      initDynamicHash();
      console.log("[LOAD] Header loaded and initialized");
    });

  const footerPromise = fetch(prefix + 'footer.html')
    .then(r => {
      if (!r.ok) throw new Error('Footer load: ' + r.status);
      return r.text();
    })
    .then(html => {
      let footerContainer = document.getElementById('site-footer');
      if (!footerContainer) {
        footerContainer = document.createElement('footer');
        footerContainer.id = 'site-footer';
        document.body.insertAdjacentElement('beforeend', footerContainer);
      }
      footerContainer.innerHTML = html;
      initFooterToiminnot();
      console.log("[LOAD] Footer loaded and initialized");
    });
  return Promise.all([headerPromise, footerPromise]);
}

// ==================== PJAX NAVIGATION ====================
function initPjaxNavigation() {
  document.body.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || link.origin !== location.origin || href.startsWith('#')) return;

    // ---- LISÄTÄÄN TÄMÄ: ----
    if (link.hasAttribute('data-submenu')) {
      // Jos kyseessä on submenu-linkki, EI tehdä PJAX:ia, eikä suljeta menuja
      return;
    }
    // ------------------------

    const isHtml = href.endsWith('.html');
    const isDir  = href.endsWith('/');

    if (isHtml || isDir) {
      e.preventDefault();
      closeAllMenus();
      console.log("[PJAX] Navigating to", href, "Menus closed before navigation");
      // You would loadPageViaAjax here
    }
  });
}


function loadPageViaAjax(url, options = {}) {
  document.documentElement.classList.add('ajax-loading');
  console.log("[PJAX] Loading page via AJAX", url);
  fetch(url)
    .then(r => {
      if (!r.ok) throw new Error('Ajax load: ' + r.status);
      return r.text();
    })
    .then(htmlText => {
      const doc = new DOMParser().parseFromString(htmlText, 'text/html');
      const newContentEl = doc.getElementById('content') || doc.querySelector('main');
      if (!newContentEl) throw new Error('No content element found in ' + url);
      newContentEl.id = 'content';
      const currentEl = document.getElementById('content') || document.querySelector('main');
      currentEl.replaceWith(newContentEl);
      const newTitle = doc.querySelector('title');
      if (newTitle) document.title = newTitle.textContent;
      const finalUrl = options.scrollToHash != null ? url + options.scrollToHash : url;
      if (options.replaceState) history.replaceState({}, '', finalUrl);
      else history.pushState({}, '', finalUrl);
      if (!options.scrollToHash) {
        const header = document.getElementById('site-header');
        disableHeaderHideUntilScrollEnd();
        window.scrollTo({ top: 0, behavior: 'instant' });
        header?.classList.remove('header-hidden');
      }
      updateActiveNavLink();
      initDynamicHash();
      if (options.scrollToHash && options.scrollToHash !== '#hero') {
        const target = document.getElementById(options.scrollToHash.slice(1));
        if (target) {
          const header = document.getElementById('site-header');
          const y = target.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 0);
          disableHeaderHideUntilScrollEnd();
          setTimeout(() => {
            window.scrollTo({ top: y, behavior: 'smooth' });
            header?.classList.remove('header-hidden');
          }, 50);
        }
      }
      console.log("[PJAX] Page loaded via AJAX:", url);
    })
    .catch(err => console.error('[PJAX] error:', err))
    .finally(() => {
      document.documentElement.classList.remove('ajax-loading');
      console.log("[PJAX] ajax-loading class removed");
    });
}
function updateActiveNavLink() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === path));
  console.log("[PJAX] Updated active nav link:", path);
}

// ==================== COLLECTION LOADER ====================
function initCollectionLoader(buttonSelector, targetSelector) {
  const buttons = document.querySelectorAll(buttonSelector);
  const target = document.querySelector(targetSelector);
  if (!target) return;
  let currentURL = null; let activeBtn = null;
  target.addEventListener('transitionend', e => {
    if (e.propertyName === 'height' && currentURL) target.style.height = 'auto';
  });
  buttons.forEach(btn => btn.addEventListener('click', async e => {
    e.preventDefault();
    const url = btn.href;
    console.log("[COLLECTION] Button clicked:", url);
    if (currentURL === url) {
      const isOpen = target.getBoundingClientRect().height > 0;
      if (isOpen) {
        const startH = target.getBoundingClientRect().height;
        target.style.height = `${startH}px`; target.getBoundingClientRect();
        toggleHeight(0);
        currentURL = null; btn.classList.remove('active'); activeBtn = null;
        console.log("[COLLECTION] Already open, closing collection");
      } else {
        toggleHeight(target.scrollHeight); currentURL = url; btn.classList.add('active'); activeBtn = btn;
        console.log("[COLLECTION] Already closed, opening collection");
      }
      return;
    }
    const oldH = target.getBoundingClientRect().height; target.style.height = `${oldH}px`; target.getBoundingClientRect();
    let html = '';
    try { const res = await fetch(url); if (!res.ok) throw new Error(res.statusText); html = await res.text(); }
    catch (err) { console.error('[COLLECTION] Fetch error:', err); target.innerHTML = '<p>Sorry, could not load content.</p>'; }
    if (html) { const doc = new DOMParser().parseFromString(html, 'text/html'); const main = doc.querySelector('main'); target.innerHTML = main ? main.innerHTML : '<p>Error: no <main> found</p>'; }
    await new Promise(requestAnimationFrame);
    target.style.height = 'auto'; const newH = target.scrollHeight; target.style.height = `${oldH}px`; toggleHeight(newH);
    currentURL = url; if (activeBtn) activeBtn.classList.remove('active'); btn.classList.add('active'); activeBtn = btn;
    console.log("[COLLECTION] New collection loaded:", url);
  }));
  function toggleHeight(toPx) { target.getBoundingClientRect(); requestAnimationFrame(() => target.style.height = `${toPx}px`); }
}

// ==================== ITEMS LOADER ====================
function loadItems() {
  let path = window.location.pathname;
  if (path.endsWith('.html')) path = path.substring(0, path.lastIndexOf('/')+1);
  else if (!path.endsWith('/')) path += '/';
  const jsonUrl = path + 'items.json';
  fetch(jsonUrl)
    .then(res => { if (!res.ok) throw new Error(res.status); return res.json(); })
    .then(items => {
      const container = document.getElementById('items-container'); if (!container) return;
      container.innerHTML = '';
      items.forEach(item => {
        const card = document.createElement('div'); card.classList.add('item-card', item.type==='dir'?'item-dir':'item-file');
        const link = document.createElement('a'); link.href=item.href; link.textContent=item.name;
        card.appendChild(link); container.appendChild(card);
      });
      console.log("[ITEMS] Loaded items.json and rendered items");
    })
    .catch(err => console.error('[ITEMS] items load feil', err));
}
document.addEventListener('DOMContentLoaded', () => {
  const c = document.getElementById('items-container'); if (c && window.initialItemsJson) loadItems();
});

// ==================== DYNAMIC HASH ====================
function initDynamicHash() {
  const header = document.querySelector('.header'); if (!header) return;
  const sections = document.querySelectorAll("section[id]:not([id='hero'])"); if (!sections.length) return;
  let viimeisinHash = window.location.hash;
  const opts = { root: null, rootMargin: `-${header.offsetHeight}px 0px -50% 0px`, threshold:0 };
  const cb = entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      const uusi = `#${entry.target.id}`;
      if (viimeisinHash!==uusi) {
        history.replaceState(null,'',uusi); viimeisinHash=uusi;
        console.log("[HASH] Section intersected, updated hash to", uusi);
      }
    }
  });
  const obs = new IntersectionObserver(cb, opts);
  sections.forEach(s => obs.observe(s));
  window.addEventListener('scroll', () => {
    if (window.scrollY<=header.offsetHeight && window.location.hash) {
      history.replaceState(null,'',location.pathname+location.search);
      viimeisinHash='';
      console.log("[HASH] At top, hash cleared");
    }
  });
}
