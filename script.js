// 1) Näyttöfunktio: luo loaderin tarvittaessa, lisää luokat ja käynnistää fade-inin
function showLoader() {
  let loader = document.getElementById('loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'loader';
    loader.textContent = 'Sivua ladataan...';
  }
  if (!document.body.contains(loader)) {
    document.body.appendChild(loader);
  }
  document.body.classList.add('no-scroll');
  document.documentElement.classList.add('ajax-loading');

  // Käynnistä fade-in (CSS:ssä ei vielä ole opacity:1)
  loader.style.transition = 'opacity 0.1s ease-out';
  // Aloitusarvoksi 0, jos ei vielä asetettu
  if (getComputedStyle(loader).opacity === '' || getComputedStyle(loader).opacity === '1') {
    loader.style.opacity = '0';
  }
  requestAnimationFrame(() => {
    loader.style.opacity = '1';
  });
}

// 2) Piilotusfunktio: fade-out ja luokkien poisto
function hideLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;

  loader.style.transition = 'opacity 0.1s ease-out';
  loader.style.opacity = '0';
  setTimeout(() => {
    loader.remove();
    document.body.classList.remove('no-scroll');
    document.documentElement.classList.remove('ajax-loading');
  }, 100);
}
/**
 * Kuuntelee .logo img -elementtiä ja piilottaa loaderin,
 * kun kuva on dekoodattu tai latautunut / epäonnistunut.
 */
function watchLogo(img) {
  if (img.decode) {
    img.decode().then(hideLoader, hideLoader);
  } else if (img.complete) {
    hideLoader();
  } else {
    img.addEventListener('load', hideLoader);
    img.addEventListener('error', hideLoader);
  }
}

/**
 * Käynnistää loaderin näyttämisen ja odottaa logon latautumista.
 */
function initLogoLoader() {
  showLoader();

  const logoImg = document.querySelector('.logo img');
  if (logoImg) {
    watchLogo(logoImg);
  } else {
    // Jos logoa ei heti löydy, käytä MutationObserveria
    const observer = new MutationObserver((records, obs) => {
      const img = document.querySelector('.logo img');
      if (img) {
        watchLogo(img);
        obs.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Varautuminen: piilota loader viiden sekunnin kuluttua
    setTimeout(hideLoader, 5000);
  }
}

// Käynnistä heti, kun DOM on valmis
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLogoLoader);
} else {
  initLogoLoader();
}

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
  const shouldLock = hb && hb.classList.contains('open');

  if (shouldLock) {
    lockScrollPreservePosition();
  } else {
    unlockScrollRestorePosition();
  }
  console.log("[SCROLLLOCK] Hamburger sync – locked?", shouldLock);
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

  // 4) Klikattaessa normaalia linkkiä: sulje kaikki menut
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

  // 5) Logo PJAX-etusivulle — delegoitu click-kuuntelija, varmistaa loaderin
header.addEventListener('click', e => {
  const link = e.target.closest('.logo a, a.logo');
  if (!link) return;

  e.preventDefault();
  e.stopPropagation();

  closeAllMenus();

  // flashaa loader nopeasti
  showLoader();
  setTimeout(hideLoader, 150);

  console.log("[HEADER] Logo clicked — quick loader flash");

  // PJAX-lataus
  setTimeout(() => {
    loadPageViaAjax(link.href, { replaceState: false });
  }, 50);
});
  // 6) Dropdownit
  initDropdowns();

  // 7) Smooth-scroll headerin linkeille
  initHeaderScrollHandlers();
}

/**
 * Lukee CSS-muuttujan ja palauttaa sen pikseleinä.
 * @param {string} varName - esim. '--header-height'
 * @returns {number} arvo pikseleinä
 */
function getCssVarPx(varName) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return 0;

  // Luo väliaikainen elementti, anna sille height=raw, mittaa ja poista
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.height = raw;
  document.body.appendChild(div);
  const px = div.getBoundingClientRect().height;
  document.body.removeChild(div);

  console.log(`[SCROLL LOG] ${varName} raw='${raw}', measured=${px}px`);
  return px;
}

/**
 * Palauttaa scroll-offsetin: header-height + scroll-margin (pikseleinä).
 */
function getScrollOffset() {
  const headerHeight = getCssVarPx('--header-height');
  const scrollMargin = getCssVarPx('--scroll-margin');
  const total = headerHeight + scrollMargin;
  console.log(`[SCROLL LOG] total scroll-offset = header(${headerHeight}px) + margin(${scrollMargin}px) = ${total}px`);
  return total;
}

/**
 * Rullaa sulavasti haluttuun sek­tioon tai ylös, jättämällä tilaa headerille ja marginille.
 * Tulostaa tarkat lokit.
 * @param {string} hash - Hash, esim. '#about'
 */
function scrollToSection(hash) {
  console.log(`\n[SCROLL LOG] scrollToSection called with hash='${hash}'`);

  if (!hash || hash === '#') {
    console.log("[SCROLL LOG] Empty or '#' hash: scrolling to top");
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const id = hash.charAt(0) === '#' ? hash.slice(1) : hash;
  const target = document.getElementById(id);
  if (!target) {
    console.warn(`[SCROLL LOG] No element found with id='${id}'`);
    return;
  }

  const rectTop = target.getBoundingClientRect().top;
  const pageOffset = window.pageYOffset;
  console.log(`[SCROLL LOG] target.getBoundingClientRect().top=${rectTop}px, window.pageYOffset=${pageOffset}px`);

  const offset = getScrollOffset();
  const desiredScrollTop = rectTop + pageOffset - offset;
  console.log(`[SCROLL LOG] Calculated window.scrollTo top=${desiredScrollTop}px`);

  window.scrollTo({ top: desiredScrollTop, behavior: 'smooth' });
}

/**
 * Kiinnittää headerin linkeille smooth-scroll-käyttäytymisen ja lokit.
 */
/**
 * Kiinnittää headerin linkeille smooth-scroll-käyttäytymisen ja lokit.
 * Varmistaa, että scroll-lock vapautetaan ennen rullausta.
 */
function initHeaderScrollHandlers() {
  const header = document.querySelector('.header');
  if (!header) {
    console.warn("[SCROLL LOG] initHeaderScrollHandlers: .header elementtiä ei löytynyt");
    return;
  }

  const links = header.querySelectorAll('a[href*="#"]:not([data-submenu])');
  console.log(`[SCROLL LOG] initHeaderScrollHandlers: liitetään ${links.length} linkkiin`);

  links.forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      const hashIndex = href.indexOf('#');
      if (hashIndex === -1) return;

      const hash = href.slice(hashIndex);
      const path = window.location.pathname.replace(/(index\.html)?$/, '');
      const onHome = (path === '/' || path === '');

      // Suljetaan valikot heti
      closeAllMenus();
      // Estetään headerin katoaminen rullauksen aikana
      disableHeaderHideUntilScrollEnd();

      // 1) Puretaan scroll-lock
      unlockScrollRestorePosition();

      // 2) Estetään oletuskäyttäytyminen
      e.preventDefault();
      e.stopPropagation();

      // 3) Odotetaan seuraava frame, jotta body:n top-tyyli on poistunut
      requestAnimationFrame(() => {
        if (onHome) {
          // Jos ollaan etusivulla, suoraan smooth-scroll paikalle
          scrollToSection(hash);
          console.log(`[SCROLL LOG] history.replaceState with hash='${hash}'`);
          history.replaceState(null, '', hash);
        } else {
          // Muuten PJAX-lataa ja rullaa hashin jälkeen
          console.log("[SCROLL LOG] PJAX-load home with scrollToHash");
          loadPageViaAjax('/', {
            replaceState: false,
            scrollToHash: hash
          });
        }
      });
    });
  });
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
/**
 * Initialiserer PJAX navigation for interne links.
 * Nyt näyttää loaderin sekä linkkiklikissä että popstate-tapahtumassa.
 */
function initPjaxNavigation() {
  document.body.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href
      || link.origin !== location.origin
      || href.startsWith('#')
      || link.hasAttribute('data-submenu')
    ) {
      return;
    }

    const urlObj = new URL(link.href);
    const path = urlObj.pathname;

    // HTML-tiedostot ja kansiot (ml. "/"-etupalvelu)
    if (path.endsWith('.html') || path.endsWith('/')) {
      e.preventDefault();
      closeAllMenus();
      showLoader();  // ← Näytetään loader ennen AJAX-kutsua
      console.log("[PJAX] Navigating to", link.href);
      loadPageViaAjax(link.href, { replaceState: false });
    }
  });

  // back/forward -napit
  window.addEventListener('popstate', () => {
    console.log("[PJAX] popstate, loading", location.pathname);
    showLoader();  // ← Ja täälläkin
    loadPageViaAjax(location.pathname, { replaceState: true });
  });
}




/**
 * Loader side via AJAX med content-udskiftning og history.
 */
/**
 * Lataa sivun AJAXilla, korvaa #content ja päivittää historyn.
 * Näyttää loaderin ennen kutsua ja piilottaa sen lopuksi.
 */
function loadPageViaAjax(url, options = {}) {
  showLoader();                                // ← Näytetään loader heti
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

      // Scroll-to-hash tai scroll-to-top
      if (!options.scrollToHash) {
        const header = document.getElementById('site-header');
        disableHeaderHideUntilScrollEnd();
        window.scrollTo({ top: 0, behavior: 'instant' });
        header?.classList.remove('header-hidden');
      } else if (options.scrollToHash !== '#hero') {
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
    .then(() => {
      // Uudelleenkäynnistä sisällön skriptit
      console.log("[PJAX] Re-initializing content scripts");
      initCollectionLoader('.collection-btn', '#collection-content');
      initDynamicHash();
      if (document.querySelector('#items-container') && window.initialItemsJson) {
        loadItems();
      }
    })
    .catch(err => console.error('[PJAX] error:', err))
    .finally(() => {
      document.documentElement.classList.remove('ajax-loading');
      hideLoader();  // ← Piilotetaan loader lopuksi
      console.log("[PJAX] ajax-loading class removed and loader hidden");
    });
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
