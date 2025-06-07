// script.js

document.addEventListener("DOMContentLoaded", function () {
  loadHeaderFooter();
  initCollectionLoader('.collection-btn', '#collection-content');
  initPjaxNavigation();
});


let disableHeaderAutoHide = false;

function disableHeaderHideUntilScrollEnd() {
  disableHeaderAutoHide = true;
  let scrollEndTimeout;

  function onScroll() {
    clearTimeout(scrollEndTimeout);
    scrollEndTimeout = setTimeout(() => {
      disableHeaderAutoHide = false;
      window.removeEventListener("scroll", onScroll);
    }, 100);
  }

  window.addEventListener("scroll", onScroll);
}

// =============================
// Uudet: scroll‐lukon hallinta
// =============================
let _scrollLocked   = false;
let _savedScrollPos = 0;

/** Lukitse scroll ja tallenna nykyinen sijainti */
function applyScrollLock(shouldLock) {
  if (shouldLock && !_scrollLocked) {
    _savedScrollPos = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.top = `-${_savedScrollPos}px`;
    document.body.classList.add('no-scroll');
    _scrollLocked = true;
  } else if (!shouldLock && _scrollLocked) {
    document.body.classList.remove('no-scroll');
    document.body.style.top = '';
    window.scrollTo(0, _savedScrollPos);
    _scrollLocked = false;
  }
}

/** Synkkaa scroll‐lukko hamburgerin .open‐luokan mukaan */
function syncScrollLockWithHamburger() {
  const hb = document.querySelector('.hamburger');
  if (!hb) return;
  applyScrollLock(hb.classList.contains('open'));
}

// =============================
// Nav + header‐toiminnot
// =============================
function initHeaderToiminnot() {
  const header    = document.querySelector(".header");
  if (!header) return;

  // — header‐piilotus scrollissa —
  let viimeisinScrollY = window.scrollY;
  window.addEventListener("scroll", () => {
    if (disableHeaderAutoHide) {
      header.classList.remove("header-hidden");
      viimeisinScrollY = window.scrollY;
      return;
    }
    const now = window.scrollY;
    if (now > viimeisinScrollY && now > 1)   header.classList.add("header-hidden");
    if (now < viimeisinScrollY)              header.classList.remove("header-hidden");
    viimeisinScrollY = now;
  });

  const hamburger = header.querySelector(".hamburger");
  const navLinks  = header.querySelector(".nav-links");
  const dropdowns = header.querySelectorAll(".dropdown");

  // — hamburger‐toggle —
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      hamburger.classList.toggle("open");
      navLinks.classList.toggle("active");
      syncScrollLockWithHamburger();
    });
  }

  // — dropdown‐toggle (ei vaikuta scrolliin) —
  dropdowns.forEach(dropdown => {
    const btn = dropdown.querySelector(".dropdown-toggle");
    if (!btn) return;
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      dropdown.classList.toggle("open");
    });
  });

  // — klikkaus sivun muualle: sulje dropdownit ja nav, synkkaa lukko —
  document.addEventListener("click", e => {
    // dropdownit
    dropdowns.forEach(dd => {
      if (dd.classList.contains("open") && !dd.contains(e.target)) {
        dd.classList.remove("open");
      }
    });

    // nav
    if (
      navLinks.classList.contains("active") &&
      !navLinks.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      navLinks.classList.remove("active");
      hamburger.classList.remove("open");
      syncScrollLockWithHamburger();
    }
  });

  // — nav/linkkien klikkaus: sulje kaikki, synkkaa lukko —
  header.querySelectorAll(".nav-links a, .dropdown a").forEach(link => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("active");
      hamburger.classList.remove("open");
      dropdowns.forEach(dd => dd.classList.remove("open"));
      syncScrollLockWithHamburger();
      header.classList.remove("header-hidden");
    });
  });

  // — logo‐klik: scrollaa ylös etusivulla —
  const logo = header.querySelector(".logo");
  if (logo) {
    logo.addEventListener("click", e => {
      const path = window.location.pathname;
      if (path === "/" || path.endsWith("index.html")) {
        e.preventDefault();
        disableHeaderHideUntilScrollEnd();
        window.scrollTo({ top: 0, behavior: "smooth" });
        header.classList.remove("header-hidden");
      }
    });
  }
}


function closeAllMenus() {
  const header    = document.querySelector('.header');
  if (!header) return;

  const hamburger = header.querySelector('.hamburger');
  const navLinks  = header.querySelector('.nav-links');
  const dropdowns = header.querySelectorAll('.dropdown');

  /* sulje kaikki valikot */
  navLinks.classList.remove('active');
  hamburger?.classList.remove('open');
  dropdowns.forEach(dd => dd.classList.remove('open'));

  /* synkkaa scroll-lukko hamburgerin tilaan */
  syncScrollLockWithHamburger();

  /* header takaisin näkyviin pienen viiveen jälkeen */
  setTimeout(() => header.classList.remove('header-hidden'), 0);
}



function loadHeaderFooter() {
  // ===== HEADER =====
  fetch("header.html")
    .then(r => {
      if (!r.ok) throw new Error("Headeriä ei voitu ladata: " + r.status);
      return r.text();
    })
    .then(html => {
      document.body.insertAdjacentHTML("afterbegin", html);
      initHeaderToiminnot();
      initDynamicHash();
    })
    .catch(console.error);

  // ===== FOOTER =====
  fetch("footer.html")
    .then(r => {
      if (!r.ok) throw new Error("Footeriä ei voitu ladata: " + r.status);
      return r.text();
    })
    .then(html => {
      document.body.insertAdjacentHTML("beforeend", html);
      initFooterToiminnot();
    })
    .catch(console.error);
}


function initPjaxNavigation() {
  document.body.addEventListener("click", e => {
    const link = e.target.closest("a");
    if (!link) return;
    const href = link.getAttribute("href");

    // hash‐linkit
    if (href && href.startsWith("#")) {
      if (href === "#hero") { e.preventDefault(); return; }
      e.preventDefault();
      closeAllMenus();
      const section = document.getElementById(href.slice(1));
      if (section) {
        const header = document.querySelector(".header");
        const y = section.getBoundingClientRect().top + window.scrollY
                - (header ? header.offsetHeight : 0);
        disableHeaderHideUntilScrollEnd();
        window.scrollTo({ top: y, behavior: "smooth" });
        if (header) header.classList.remove("header-hidden");
        history.replaceState(null, "", href);
      } else {
        loadPageViaAjax("index.html", { scrollToHash: href });
      }
      return;
    }

    // .html‐linkit
    if (href && href.endsWith(".html") && link.origin === location.origin) {
      e.preventDefault();
      closeAllMenus();
      const current = location.pathname.split("/").pop() || "index.html";
      if (href === current) {
        const header = document.querySelector(".header");
        disableHeaderHideUntilScrollEnd();
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (header) header.classList.remove("header-hidden");
      } else {
        loadPageViaAjax(href);
      }
    }
  });

  window.addEventListener("popstate", () => {
    const path = location.pathname.split("/").pop() || "index.html";
    const hash = window.location.hash;
    loadPageViaAjax(path, { replaceState: true, scrollToHash: hash });
  });
}

function loadPageViaAjax(url, options = {}) {
  fetch(url)
    .then(r => {
      if (!r.ok) throw new Error("Sivua ei voitu ladata: " + r.status);
      return r.text();
    })
    .then(htmlText => {
      const doc = new DOMParser().parseFromString(htmlText, "text/html");
      let newContent = doc.querySelector("#content") || doc.querySelector("main");
      if (!newContent) return console.error("Uutta sisältöä ei löytynyt: ", url);

      const current = document.querySelector("#content") || document.querySelector("main");
      if (!current) return;
      current.replaceWith(newContent);

      const newTitle = doc.querySelector("title");
      if (newTitle) document.title = newTitle.textContent;

      const finalUrl = options.scrollToHash != null ? url + options.scrollToHash : url;
      if (options.replaceState) history.replaceState({}, "", finalUrl);
      else history.pushState({}, "", finalUrl);

      if (!options.scrollToHash) {
        const header = document.querySelector(".header");
        disableHeaderHideUntilScrollEnd();
        window.scrollTo({ top: 0, behavior: "instant" });
        if (header) header.classList.remove("header-hidden");
      }

      updateActiveNavLink();
      initDynamicHash();

      if (options.scrollToHash && options.scrollToHash !== "#hero") {
        const target = document.getElementById(options.scrollToHash.slice(1));
        if (target) {
          const header = document.querySelector(".header");
          const y = target.getBoundingClientRect().top + window.scrollY
                  - (header ? header.offsetHeight : 0);
          disableHeaderHideUntilScrollEnd();
          setTimeout(() => {
            window.scrollTo({ top: y, behavior: "smooth" });
            if (header) header.classList.remove("header-hidden");
          }, 50);
        }
      }
    })
    .catch(console.error);
}

function updateActiveNavLink() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(a => {
    a.classList.toggle("active", a.getAttribute("href") === path);
  });
}

function initCollectionLoader(buttonSelector, targetSelector) {
  const buttons = document.querySelectorAll(buttonSelector);
  const target = document.querySelector(targetSelector);
  if (!target) return;

  let currentURL = null;        // mikä collection on auki
  let activeBtn = null;        // painike, jolla 'active' on päällä

  /* Palautetaan korkeus-attribuutti automaattiseksi, kun
     siirtymä on päättynyt. */
  target.addEventListener('transitionend', e => {
    if (e.propertyName === 'height' && currentURL) {
      target.style.height = 'auto';
    }
  });

  /* --- PÄÄKÄSITTELIJÄ joka painaa collection-painiketta --- */
  buttons.forEach(btn => btn.addEventListener('click', async e => {
    e.preventDefault();
    const url = btn.href;

    /* === 1) Klikataan jo auki olevaa samaa painiketta (TOGGLE) === */
    if (currentURL === url) {
      const isOpen = target.getBoundingClientRect().height > 0;

      if (isOpen) {                           /* → SULJETAAN */
        const startH = target.getBoundingClientRect().height;
        target.style.height = `${startH}px`;
        target.getBoundingClientRect();       // force reflow
        toggleHeight(0);                      // animaatio 0-px
        currentURL = null;

        /* Poista aktiivisuus */
        btn.classList.remove('active');
        activeBtn = null;
      } else {                                /* → AVATAAN UUDELLEEN */
        toggleHeight(target.scrollHeight);
        currentURL = url;

        /* Aktivoi painike */
        btn.classList.add('active');
        activeBtn = btn;
      }
      return;
    }

    /* === 2) Klikataan ERI painiketta === */
    const oldH = target.getBoundingClientRect().height;
    target.style.height = `${oldH}px`;
    target.getBoundingClientRect();           // force reflow

    /* 2b -- Ladataan uusi sisältö */
    let html = '';
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.statusText);
      html = await res.text();
    } catch (err) {
      console.error(err);
      target.innerHTML = '<p>Sorry, could not load content.</p>';
    }

    if (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const main = doc.querySelector('main');
      target.innerHTML = main
        ? main.innerHTML
        : '<p>Error: no &lt;main&gt; found</p>';
    }

    /* 2c -- Animoidaan uuteen kokoon */
    await new Promise(requestAnimationFrame);
    target.style.height = 'auto';
    const newH = target.scrollHeight;
    target.style.height = `${oldH}px`;
    toggleHeight(newH);

    /* Päivitä tilamuuttujat ja aktivoi oikea painike */
    currentURL = url;
    if (activeBtn) activeBtn.classList.remove('active');
    btn.classList.add('active');
    activeBtn = btn;
  }));

  /* Yhteinen animaattori */
  function toggleHeight(toPx) {
    target.getBoundingClientRect();           // flush
    requestAnimationFrame(() => {
      target.style.height = `${toPx}px`;
    });
  }
}

/* ==== (ei muutoksia) ==== */
function toggleHeight(toPx) { /* ... alkuperäinen sisällä initissä ... */ }



let _lockedScrollPos = 0;
let _scrollLockDepth = 0;        // montako komponenttia on lukinnut scrollin

function lockScrollPreservePosition() {
  /* tallenna sijainti vain jos tämä on ensimmäinen lukitus */
  if (_scrollLockDepth === 0) {
    _lockedScrollPos = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.top = `-${_lockedScrollPos}px`;
    document.body.classList.add("no-scroll");
  }
  _scrollLockDepth++;            // syvennetään “pinottuna” lukituksena
}

/* Korvaa koko vanha funktio tällä */
function unlockScrollRestorePosition() {
  if (_scrollLockDepth === 0) return;      // turva
  _scrollLockDepth--;

  if (_scrollLockDepth === 0) {
    const restorePos = _lockedScrollPos;   // talteen ennen asettelua
    document.body.classList.remove("no-scroll");
    document.body.style.top = "";

    /* Odota yksi frame, että tyylit ehtivät päivittyä,
       sitten palauta scroll-sijainti. */
    requestAnimationFrame(() => {
      window.scrollTo(0, restorePos);
    });
  }
}

/* ==========================================================
   Korvaa VANHA initHeaderToiminnot kokonaan tällä versiolla
   ========================================================== */
function initHeaderToiminnot() {
  const header = document.querySelector('.header');
  if (!header) return;

  /* 1 — Headerin automaattinen piilotus scrollissa */
  let viimeisinScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    if (disableHeaderAutoHide) {
      header.classList.remove('header-hidden');
      viimeisinScrollY = window.scrollY;
      return;
    }
    const nyt = window.scrollY;
    if (nyt > viimeisinScrollY && nyt > 1) header.classList.add('header-hidden');
    if (nyt < viimeisinScrollY)            header.classList.remove('header-hidden');
    viimeisinScrollY = nyt;
  });

  /* 2 — DOM-viittaukset */
  const hamburger = header.querySelector('.hamburger');
  const navLinks  = header.querySelector('.nav-links');
  const dropdowns = header.querySelectorAll('.dropdown');

  /* 3 — Hamburger-painike */
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('active');
      syncScrollLockWithHamburger();                 // ← lukon synkkaus
    });
  }

  /* 4 — Dropdown-painikkeet (ei scroll-lukkoa) */
  dropdowns.forEach(dd => {
    const btn = dd.querySelector('.dropdown-toggle');
    if (!btn) return;
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      dd.classList.toggle('open');
    });
  });

  /* 5 — Klikkaus muualle: sulje dropdownit + navi */
  document.addEventListener('click', e => {
    /* dropdownit */
    dropdowns.forEach(dd => {
      if (dd.classList.contains('open') && !dd.contains(e.target)) {
        dd.classList.remove('open');
      }
    });

    /* navi */
    if (
      navLinks.classList.contains('active') &&
      !navLinks.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      navLinks.classList.remove('active');
      hamburger.classList.remove('open');
      syncScrollLockWithHamburger();                 // ← vapauttaa rullan
      setTimeout(() => header.classList.remove('header-hidden'), 0);
    }
  });

  /* 6 — Linkin klikkaus navissa / dropdownissa */
  header.querySelectorAll('.nav-links a, .dropdown a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      hamburger.classList.remove('open');
      dropdowns.forEach(dd => dd.classList.remove('open'));
      syncScrollLockWithHamburger();
      header.classList.remove('header-hidden');
    });
  });

  /* 7 — Logo: scrollaa ylös etusivulla */
  const logo = header.querySelector('.logo');
  if (logo) {
    logo.addEventListener('click', e => {
      const path = window.location.pathname;
      if (path === '/' || path.endsWith('index.html')) {
        e.preventDefault();
        disableHeaderHideUntilScrollEnd();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        header.classList.remove('header-hidden');
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
    if (document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
      document.activeElement.blur();
    }
    disableHeaderHideUntilScrollEnd();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}


// ===== 7) Dynaaminen URL-hashin päivitys rullauksen mukaan =====
function initDynamicHash() {
  const header = document.querySelector(".header");
  if (!header) return;

  const sections = document.querySelectorAll("section[id]:not([id='hero'])");
  if (sections.length === 0) return;

  let viimeisinHash = window.location.hash;

  const observerOptions = {
    root: null,
    rootMargin: `-${header.offsetHeight}px 0px -50% 0px`,
    threshold: 0,
  };

  const observerCallback = (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const uusiHash = `#${entry.target.id}`;
        if (viimeisinHash !== uusiHash) {
          history.replaceState(null, "", uusiHash);
          viimeisinHash = uusiHash;
        }
      }
    });
  };

  const observer = new IntersectionObserver(observerCallback, observerOptions);
  sections.forEach((section) => {
    observer.observe(section);
  });

  window.addEventListener("scroll", function () {
    const currentScroll = window.scrollY;
    if (currentScroll <= header.offsetHeight) {
      if (window.location.hash) {
        history.replaceState(null, "", location.pathname + location.search);
        viimeisinHash = "";
      }
    }
  });
}
