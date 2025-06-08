let menuNavInProgress = false;

/**
 * Initialiserer header, footer og navigation ved DOMContentLoaded.
 */
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

/**
 * Deaktiverer header auto-hide indtil scroll slutter.
 */
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

/**
 * Låser eller frigiver scroll baseret på parameter.
 */
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

/**
 * Synkroniserer scroll lock med hamburger-menu.
 */
function syncScrollLockWithHamburger() {
  const hb = document.querySelector('.hamburger');
  if (!hb) return;
  if (hb.classList.contains('open')) lockScrollPreservePosition();
  else unlockScrollRestorePosition();
  console.log("[SCROLLLOCK] Sync with hamburger:", hb.classList.contains('open'));
}

/**
 * Synkroniserer scroll lock med nav-links.
 */
function syncScrollLockWithNav() {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;
  if (navLinks.classList.contains('active')) lockScrollPreservePosition();
  else unlockScrollRestorePosition();
  console.log("[SCROLLLOCK] Sync with nav:", navLinks.classList.contains('active'));
}

let _lockedScrollPos = 0;
let _scrollLockDepth = 0;

/**
 * Dybdebaseret lås af scroll med bevarelse af position.
 */
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

/**
 * Dybdebaseret frigivelse af scroll og genopret position.
 */
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

/**
 * Initialiserer dropdown-menuer og håndterer åbn/lyt.
 */
const dropdownOriginalHtml = new Map();
const menuStack = new Map();
/**
 * Alustaa kaikki .dropdown-elementit ilman cloneNode-kikkailuja.
 * – Säilyttää alkuperäisen HTML:n
 * – Yhden stackin per dropdown
 * – Yhden attachMenuHandlers-funktion joka sitoo sekä back-napin että alavalikko-linkit
 */
function initDropdowns() {
  document.querySelectorAll('.dropdown').forEach(dd => {
    const toggle = dd.querySelector('.dropdown-toggle');
    const menu   = dd.querySelector('.dropdown-menu');
    if (!toggle || !menu) return;

    const originalHtml = menu.innerHTML;
    let stack = [];

    // Aukeamisen yhteydessä nollataan pino ja palautetaan alkuperäinen
    toggle.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const isOpening = !dd.classList.contains('open');
      if (isOpening) {
        stack = [];
        menu.innerHTML = originalHtml;
        attachMenuHandlers(menu);
      }
      dd.classList.toggle('open');
    });

    // Sulje dropdown klikkauksen ulkopuolella
    document.addEventListener('click', e => {
      if (!dd.contains(e.target) && dd.classList.contains('open')) {
        dd.classList.remove('open');
      }
    });

    // Ensimmäinen kerta: liitetään eventit
    attachMenuHandlers(menu);

    function attachMenuHandlers(currentMenu) {
      // Back-nappi
      const backBtn = currentMenu.querySelector('.dropdown-back');
      if (backBtn) {
        backBtn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          if (!stack.length) return;
          const { html } = stack.pop();
          currentMenu.innerHTML = html;
          attachMenuHandlers(currentMenu);
        });
      }
      // Submenu-linkit
      currentMenu.querySelectorAll('a[data-submenu]').forEach(link => {
        link.addEventListener('click', async e => {
          e.preventDefault();
          e.stopPropagation();

          // tallenna nykyinen näkymä pinoon
          stack.push({ html: currentMenu.innerHTML });

          // näytä lataus
          currentMenu.innerHTML = '<li class="loading">Loading…</li>';
          try {
            const url = link.getAttribute('data-submenu') + 'items.json';
            const res = await fetch(url);
            if (!res.ok) throw new Error(res.statusText);
            const items = await res.json();

            // rakenna takaisin-napin otsikko käyttäen linkin tekstiä
            const title = link.textContent.trim().toUpperCase();

            const backHtml = `
              <li class="back">
                <button type="button" class="dropdown-back">
                  ← Return from ${title}
                </button>
              </li>`;

            // listaa kansiot ja tiedostot
            const itemsHtml = items
              .filter(i => i.type === 'dir' || i.href.endsWith('.html'))
              .map(i => {
                const attrs = i.type === 'dir' ? `data-submenu="${i.href}"` : '';
                return `<li><a href="${i.href}" ${attrs}>${i.name}</a></li>`;
              })
              .join('');

            currentMenu.innerHTML = backHtml + itemsHtml;
            attachMenuHandlers(currentMenu);
          } catch (err) {
            console.error('[DROPDOWN JSON] error:', err);
            currentMenu.innerHTML = '<li class="error">Error loading categories</li>';
          }
        });
      });
    }
  });
}


/**
 * Vedhæfter handlers til dropdown-menu-indgange og tilbage-knap.
 */
function attachDropdownHandlers(menu, dd) {
  const freshMenu = menu.cloneNode(true);
  menu.parentNode.replaceChild(freshMenu, menu);
  menu = freshMenu;
  const stack = menuStack.get(menu);
  const backBtn = menu.querySelector('.dropdown-back');
  if (backBtn) {
    backBtn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (stack.length === 0) return;
      const prevHtml = stack.pop();
      menu.innerHTML = prevHtml;
      attachDropdownHandlers(menu, dd);
    });
  }
  menu.querySelectorAll('a[data-submenu]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      stack.push(menu.innerHTML);
      loadDropdownJson(menu, link.getAttribute('data-submenu'), dd);
    });
  });
}

/**
 * Henter JSON for dropdown og gengiver indhold med tilbage-knap.
 */
async function loadDropdownJson(menu, basePath, dd) {
  menu.innerHTML = '<li class="loading">Loading…</li>';
  try {
    const res = await fetch(basePath + 'items.json');
    if (!res.ok) throw new Error(res.statusText);
    const items = await res.json();
    const stack = menuStack.get(menu);
    const parentTitle = stack.length
      ? stack[stack.length - 1]
        .match(/← Back to (.+)/)?.[1] || ''
      : '';
    const backHtml = parentTitle
      ? `<li class="back">
           <button type="button" class="dropdown-back">
             ← Back to ${parentTitle}
           </button>
         </li>`
      : '';
    const itemsHtml = items
      .filter(i => i.type === 'dir' || i.href.endsWith('.html'))
      .map(i => {
        const attrs = i.type === 'dir' ? `data-submenu="${i.href}"` : '';
        return `<li>
                  <a href="${i.href}" ${attrs}>
                    ${i.name}
                  </a>
                </li>`;
      })
      .join('');
    menu.innerHTML = backHtml + itemsHtml;
    attachDropdownHandlers(menu, dd);
  } catch (err) {
    console.error('[DROPDOWN JSON] error:', err);
    menu.innerHTML = '<li class="error">Error loading categories</li>';
  }
}

/**
 * Initialiserer header- og navigations-opførsel.
 */
/**
 * Yksinkertaistettu headerin alustus:
 * – scroll-hide / show -logiikka
 * – hamburger-napin toggle + scroll-lock
 * – yksi paikka dropdownien käsittelylle (initDropdowns)
 */
function initHeaderFunctions() {
  const header = document.querySelector('.header');
  if (!header) return;

  // 1) Auto-hide header scrollatessa
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    if (disableHeaderAutoHide) {
      header.classList.remove('header-hidden');
      lastScrollY = window.scrollY;
      return;
    }
    const now = window.scrollY;
    if (now > lastScrollY && now > 1) header.classList.add('header-hidden');
    if (now < lastScrollY) header.classList.remove('header-hidden');
    lastScrollY = now;
  });

  // 2) Hamburger-napin toggle ja nav-linkit
  const hamburger = header.querySelector('.hamburger');
  const navLinks  = header.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('active');
      syncScrollLockWithHamburger();
    });
  }

  // 3) Klikkaus muualla: sulje navLinks + hamburger
  document.addEventListener('click', e => {
    if (e.target.closest('.dropdown-menu')) return;
    if (navLinks.classList.contains('active') &&
        !navLinks.contains(e.target) &&
        !hamburger.contains(e.target)) {
      navLinks.classList.remove('active');
      hamburger.classList.remove('open');
      syncScrollLockWithHamburger();
    }
  });

  // 4) Kun klikataan tavallista linkkiä, sulje kaikki menut
  header.querySelectorAll('.nav-links a, .dropdown a').forEach(link => {
    link.addEventListener('click', () => {
      if (link.hasAttribute('data-submenu')) return;
      navLinks.classList.remove('active');
      hamburger.classList.remove('open');
      header.querySelectorAll('.dropdown.open').forEach(dd => dd.classList.remove('open'));
      syncScrollLockWithHamburger();
      header.classList.remove('header-hidden');
    });
  });

  // 5) Logo-scroll-to-top
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
      }
    });
  }

  // 6) Lopuksi: hoida kaikki dropdownit yhdestä paikasta
  initDropdowns();
}


/**
 * Initialiserer footer scroll-knap og scroll-top.
 */
function initFooterFunctions() {
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

/**
 * Lukker alle åbne menuer.
 */
function closeAllMenus() {
  if (window.menuNavInProgress) return;
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

/**
 * Beregner sti-prefix til header/footer inkluder.
 */
function computePrefix() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts.map(_ => '../').join('');
}

/**
 * Henter og indsætter header og footer via AJAX.
 */
function loadHeaderFooter() {
  const prefix = computePrefix();
  console.log("[LOAD] Header/Footer load with prefix", prefix);
  const headerPromise = fetch(prefix + 'header.html')
    .then(r => { if (!r.ok) throw new Error('Header load: ' + r.status); return r.text(); })
    .then(html => {
      let headerContainer = document.getElementById('site-header');
      if (!headerContainer) {
        headerContainer = document.createElement('header');
        headerContainer.id = 'site-header';
        document.body.insertAdjacentElement('afterbegin', headerContainer);
      }
      headerContainer.innerHTML = html;
      initHeaderFunctions();
      initDynamicHash();
      console.log("[LOAD] Header loaded and initialized");
    });
  const footerPromise = fetch(prefix + 'footer.html')
    .then(r => { if (!r.ok) throw new Error('Footer load: ' + r.status); return r.text(); })
    .then(html => {
      let footerContainer = document.getElementById('site-footer');
      if (!footerContainer) {
        footerContainer = document.createElement('footer');
        footerContainer.id = 'site-footer';
        document.body.insertAdjacentElement('beforeend', footerContainer);
      }
      footerContainer.innerHTML = html;
      initFooterFunctions();
      console.log("[LOAD] Footer loaded and initialized");
    });
  return Promise.all([headerPromise, footerPromise]);
}

/**
 * Initialiserer PJAX navigation for interne links.
 */
function initPjaxNavigation() {
  // Kaikki body:n linkkiklikit käsitellään PJAX:na
  document.body.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    // Vain samasta originista tulevat html- tai hakemistolinkit
    if (!href || link.origin !== location.origin || href.startsWith('#')) return;
    if (link.hasAttribute('data-submenu')) return;

    const isHtml = href.endsWith('.html');
    const isDir  = href.endsWith('/');

    if (isHtml || isDir) {
      e.preventDefault();
      closeAllMenus();  // sulje kaikki auki olevat valikot
      console.log("[PJAX] Navigating to", href);
      // ladataan sivu AJAXilla; history.pushState, kun replaceState=false
      loadPageViaAjax(href, { replaceState: false });
    }
  });

  // Selaimen back/forward -nappien tuki
  window.addEventListener('popstate', () => {
    console.log("[PJAX] popstate, loading", location.pathname);
    // korvataan sisältö nykyisellä polulla; history.replaceState, kun replaceState=true
    loadPageViaAjax(location.pathname, { replaceState: true });
  });
}


/**
 * Loader side via AJAX med content-udskiftning og history.
 */
function loadPageViaAjax(url, options = {}) {
  document.documentElement.classList.add('ajax-loading');
  console.log("[PJAX] Loading page via AJAX", url);
  fetch(url)
    .then(r => { if (!r.ok) throw new Error('Ajax load: ' + r.status); return r.text(); })
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
    .catch (err => console.error('[PJAX] error:', err))
    .finally(() => {
  document.documentElement.classList.remove('ajax-loading');
  console.log("[PJAX] ajax-loading class removed");
});
updateActiveNavLink();

}

/**
 * Opdaterer aktiv navigation baseret på sti.
 */
function updateActiveNavLink() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a =>
    a.classList.toggle('active', a.getAttribute('href') === path)
  );
  console.log("[PJAX] Updated active nav link:", path);
}

/**
 * Initialiserer indlæsning af kollektionsindhold.
 */
function initCollectionLoader(buttonSelector, targetSelector) {
  const buttons = document.querySelectorAll(buttonSelector);
  const target = document.querySelector(targetSelector);
  if (!target) return;
  let currentURL = null;
  let activeBtn = null;
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
        target.style.height = `${startH}px`;
        target.getBoundingClientRect();
        toggleHeight(0);
        currentURL = null;
        btn.classList.remove('active');
        activeBtn = null;
        console.log("[COLLECTION] Already open, closing collection");
      } else {
        toggleHeight(target.scrollHeight);
        currentURL = url;
        btn.classList.add('active');
        activeBtn = btn;
        console.log("[COLLECTION] Already closed, opening collection");
      }
      return;
    }
    const oldH = target.getBoundingClientRect().height;
    target.style.height = `${oldH}px`;
    target.getBoundingClientRect();
    let html = '';
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.statusText);
      html = await res.text();
    } catch (err) {
      console.error('[COLLECTION] Fetch error:', err);
      target.innerHTML = '<p>Sorry, could not load content.</p>';
    }
    if (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const main = doc.querySelector('main');
      target.innerHTML = main ? main.innerHTML : '<p>Error: no <main> found</p>';
    }
    await new Promise(requestAnimationFrame);
    target.style.height = 'auto';
    const newH = target.scrollHeight;
    target.style.height = `${oldH}px`;
    toggleHeight(newH);
    currentURL = url;
    if (activeBtn) activeBtn.classList.remove('active');
    btn.classList.add('active');
    activeBtn = btn;
    console.log("[COLLECTION] New collection loaded:", url);
  }));
  function toggleHeight(toPx) {
    target.getBoundingClientRect();
    requestAnimationFrame(() => target.style.height = `${toPx}px`);
  }
}

/**
 * Loader og gengiver items baseret på items.json.
 */
function loadItems() {
  let path = window.location.pathname;
  if (path.endsWith('.html')) path = path.substring(0, path.lastIndexOf('/') + 1);
  else if (!path.endsWith('/')) path += '/';
  const jsonUrl = path + 'items.json';
  fetch(jsonUrl)
    .then(res => { if (!res.ok) throw new Error(res.status); return res.json(); })
    .then(items => {
      const container = document.getElementById('items-container');
      if (!container) return;
      container.innerHTML = '';
      items.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('item-card', item.type === 'dir' ? 'item-dir' : 'item-file');
        const link = document.createElement('a');
        link.href = item.href;
        link.textContent = item.name;
        card.appendChild(link);
        container.appendChild(card);
      });
      console.log("[ITEMS] Loaded items.json and rendered items");
    })
    .catch(err => console.error('[ITEMS] items load error', err));
}
document.addEventListener('DOMContentLoaded', () => {
  const c = document.getElementById('items-container');
  if (c && window.initialItemsJson) loadItems();
});

/**
 * Dynamisk opdatering af URL-hash baseret på sektioner i view.
 */
function initDynamicHash() {
  const header = document.querySelector('.header');
  if (!header) return;
  const sections = document.querySelectorAll("section[id]:not([id='hero'])");
  if (!sections.length) return;
  let lastHash = window.location.hash;
  const opts = { root: null, rootMargin: `-${header.offsetHeight}px 0px -50% 0px`, threshold: 0 };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const newHash = `#${entry.target.id}`;
        if (lastHash !== newHash) {
          history.replaceState(null, '', newHash);
          lastHash = newHash;
          console.log("[HASH] Section intersected, updated hash to", newHash);
        }
      }
    });
  }, opts);
  sections.forEach(s => observer.observe(s));
  window.addEventListener('scroll', () => {
    if (window.scrollY <= header.offsetHeight && window.location.hash) {
      history.replaceState(null, '', location.pathname + location.search);
      lastHash = '';
      console.log("[HASH] At top, hash cleared");
    }
  });
}
