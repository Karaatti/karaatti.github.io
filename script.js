// script.js

document.addEventListener("DOMContentLoaded", function () {
  // 1) Ladataan header ja footer vain kerran sivulatauksen yhteydessä
  loadHeaderFooter();

  // 2) Alustetaan PJAX-navigaatio ja hash/link-toiminnallisuudet
  initPjaxNavigation();
});

// Globaalimuuttuja, jolla estetään headerin piilottaminen automaattirullauksen aikana
let disableHeaderAutoHide = false;

/**
 * Apufunktio: estää headerin piiloutumisen kunnes scrollaus loppuu.
 * Kuuntelee scroll-eventejä ja poistaa eston, kun scroll-tapahtumia ei tule
 * 100 ms sisään.
 */
function disableHeaderHideUntilScrollEnd() {
  disableHeaderAutoHide = true;
  let scrollEndTimeout;

  function onScroll() {
    clearTimeout(scrollEndTimeout);
    // Odotetaan 100 ms siitä, kun viimeinen scroll-event tuli
    scrollEndTimeout = setTimeout(() => {
      disableHeaderAutoHide = false;
      window.removeEventListener("scroll", onScroll);
    }, 100);
  }

  window.addEventListener("scroll", onScroll);
}



// ======================================
//  Hyödyllinen apufunktio: sulkee avatut mobiili-/dropdown-valikot
// ======================================
function closeAllMenus() {
  const header = document.querySelector(".header");
  if (!header) return;

  const hamburger = header.querySelector(".hamburger");
  const navLinks = header.querySelector(".nav-links");
  const dropdowns = header.querySelectorAll(".dropdown");

  // Sulje mobiili-nav (hamburger) jos auki
  if (navLinks && navLinks.classList.contains("active")) {
    navLinks.classList.remove("active");
    if (hamburger) hamburger.classList.remove("open");
    unlockScrollRestorePosition();
    setTimeout(() => {
      header.classList.remove("header-hidden");
    }, 0);
  }

  // Sulje kaikki avoimet dropdown-valikot
  dropdowns.forEach((dropdown) => {
    if (dropdown.classList.contains("open")) {
      dropdown.classList.remove("open");
      if (!(navLinks && navLinks.classList.contains("active"))) {
        unlockScrollRestorePosition();
        setTimeout(() => {
          header.classList.remove("header-hidden");
        }, 0);
      }
    }
  });
}

function loadHeaderFooter() {
  // ===== HEADER =====
  fetch("header.html")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Headeriä ei voitu ladata: " + response.status);
      }
      return response.text();
    })
    .then((html) => {
      document.body.insertAdjacentHTML("afterbegin", html);
      initHeaderToiminnot();
      initDynamicHash();
    })
    .catch((error) => {
      console.error(error);
    });

  // ===== FOOTER =====
  fetch("footer.html")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Footeriä ei voitu ladata: " + response.status);
      }
      return response.text();
    })
    .then((html) => {
      document.body.insertAdjacentHTML("beforeend", html);
      initFooterToiminnot();
    })
    .catch((error) => {
      console.error(error);
    });

    
}

function initPjaxNavigation() {
  document.body.addEventListener("click", function (e) {
    const link = e.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href");

    // 1) Hash-linkki (esim. "#about")
    if (href && href.startsWith("#")) {
      if (href === "#hero") {
        // Jos hash on '#hero', jätetään huomiotta
        e.preventDefault();
        return;
      }

      e.preventDefault();
      const targetId = href.slice(1);
      const section = document.getElementById(targetId);

      // Ensin suljetaan mahdollisesti auki olevat valikot
      closeAllMenus();

      if (section) {
        // Jos osio löytyy nykyiseltä sivulta, rullataan sinne automaattisesti
        const header = document.querySelector(".header");
        const headerHeight = header ? header.offsetHeight : 0;
        const y = section.getBoundingClientRect().top + window.scrollY - headerHeight;

        disableHeaderHideUntilScrollEnd();
        window.scrollTo({ top: y, behavior: "smooth" });
        if (header) {
          header.classList.remove("header-hidden");
        }
        history.replaceState(null, "", href);
      } else {
        // Jos osio ei ole tässä sivussa, ladataan etusivu ja scrollataan sinne
        loadPageViaAjax("index.html", { scrollToHash: href });
      }
      return;
    }

    // 2) .html-linkki (esim. "about.html" tai "adjustable-beds.html")
    if (href && href.endsWith(".html") && link.origin === location.origin) {
      e.preventDefault();

      closeAllMenus();

      const currentPage = location.pathname.split("/").pop() || "index.html";
      if (href === currentPage) {
        // Sama sivu: scrollataan ylös ilman vaihtoa
        const header = document.querySelector(".header");
        disableHeaderHideUntilScrollEnd();
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (header) {
          header.classList.remove("header-hidden");
        }
      } else {
        loadPageViaAjax(href);
      }
    }
  });

  // Käsitellään back/forward -painikkeet
  window.addEventListener("popstate", function () {
    const path = location.pathname.split("/").pop() || "index.html";
    const hash = window.location.hash;
    loadPageViaAjax(path, { replaceState: true, scrollToHash: hash });
  });
}

function loadPageViaAjax(url, options = {}) {
  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Sivua ei voitu ladata: " + response.status);
      }
      return response.text();
    })
    .then((htmlText) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      // Etsitään uusi sisältö: ensin #content, jos ei löydy niin <main>
      let newContent = doc.querySelector("#content");
      if (!newContent) {
        newContent = doc.querySelector("main");
      }
      if (!newContent) {
        console.error("Uutta sisältöä ei löytynyt sivusta: ", url);
        return;
      }

      // Korvataan nykyinen sisältö uudella
      const currentWrapper = document.querySelector("#content") || document.querySelector("main");
      if (!currentWrapper) {
        console.error("Paikallista #content tai <main> ei löytynyt");
        return;
      }
      currentWrapper.replaceWith(newContent);

      // Päivitetään <title> vastaamaan uutta sivua
      const newTitle = doc.querySelector("title");
      if (newTitle) {
        document.title = newTitle.textContent;
      }

      const finalUrl = options.scrollToHash !== undefined
        ? url + options.scrollToHash
        : url;

      if (!options.replaceState) {
        history.pushState({}, "", finalUrl);
      } else {
        history.replaceState({}, "", finalUrl);
      }

      // Jos ei ole scrollToHashia, rullataan ylös (uusi sivu)
      if (!options.scrollToHash) {
        const header = document.querySelector(".header");
        disableHeaderHideUntilScrollEnd();
        window.scrollTo({ top: 0, behavior: "instant" });
        if (header) {
          header.classList.remove("header-hidden");
        }
      }

      updateActiveNavLink();
      initDynamicHash();

      // Jos halutaan scrollata tiettyyn hash-osioon sisällön korvauksen jälkeen
      if (options.scrollToHash) {
        if (options.scrollToHash === "#hero") {
          return;
        }

        const targetId = options.scrollToHash.slice(1);
        const section = document.getElementById(targetId);
        if (section) {
          const header = document.querySelector(".header");
          const headerHeight = header ? header.offsetHeight : 0;
          const y = section.getBoundingClientRect().top + window.scrollY - headerHeight;

          disableHeaderHideUntilScrollEnd();
          // Viive, jotta uusi sisältö on varmasti renderöity
          setTimeout(() => {
            window.scrollTo({ top: y, behavior: "smooth" });
            if (header) {
              header.classList.remove("header-hidden");
            }
          }, 50);
        }
      }
    })
    .catch((error) => {
      console.error(error);
    });
}

function updateActiveNavLink() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((a) => {
    if (a.getAttribute("href") === path) {
      a.classList.add("active");
    } else {
      a.classList.remove("active");
    }
  });
}

let _lockedScrollPos = 0;

/**
 * Lukitsee taustasivun rullauksen siten, että nykyinen kohtaus säilyy.
 * Lisätään bodylle top: -scrollPos ja .no-scroll.
 */
function lockScrollPreservePosition() {
  _lockedScrollPos = window.pageYOffset || document.documentElement.scrollTop;
  document.body.style.top = `-${_lockedScrollPos}px`;
  document.body.classList.add("no-scroll");
}

/**
 * Palauttaa scrollauksen: poistetaan .no-scroll ja top-tyyli,
 * ja rullataan takaisin lukittuun kohtaan.
 */
function unlockScrollRestorePosition() {
  document.body.classList.remove("no-scroll");
  document.body.style.top = "";
  window.scrollTo(0, _lockedScrollPos);
}

function initHeaderToiminnot() {
  const header = document.querySelector(".header");
  if (!header) return;

  // ===== 1) Scroll-piilotus ja näyttö ylös scrollattaessa =====
  let viimeisinScrollY = window.scrollY;
  window.addEventListener("scroll", function () {
    // Jos estolippu päällä, varmistetaan, ettei header-piilotus aktivoidu
    if (disableHeaderAutoHide) {
      header.classList.remove("header-hidden");
      viimeisinScrollY = window.scrollY;
      return;
    }

    const nykyinenScroll = window.scrollY;
    if (nykyinenScroll > viimeisinScrollY && nykyinenScroll > 1) {
      header.classList.add("header-hidden");
    } else if (nykyinenScroll < viimeisinScrollY) {
      header.classList.remove("header-hidden");
    }
    viimeisinScrollY = nykyinenScroll;
  });

  // ===== 2) Hamburger-ikonin toggle mobiilissa =====
  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      this.classList.toggle("open");
      navLinks.classList.toggle("active");

      if (navLinks.classList.contains("active")) {
        lockScrollPreservePosition();
      } else {
        unlockScrollRestorePosition();
        setTimeout(() => {
          header.classList.remove("header-hidden");
        }, 0);
      }
    });
  }

  // ===== 3) Dropdown-valikon toggle (Categories) =====
  const dropdowns = document.querySelectorAll(".dropdown");
  dropdowns.forEach((dropdown) => {
    const toggleBtn = dropdown.querySelector(".dropdown-toggle");
    if (!toggleBtn) return;

    toggleBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const wasOpen = dropdown.classList.toggle("open");

      if (wasOpen) {
        lockScrollPreservePosition();
      } else {
        if (!(navLinks && navLinks.classList.contains("active"))) {
          unlockScrollRestorePosition();
          setTimeout(() => {
            header.classList.remove("header-hidden");
          }, 0);
        }
      }
    });
  });

  // ===== 4) Suljetaan avoimet dropdownit ja hamburger-menu klikkauksen muualle =====
  document.addEventListener("click", function (e) {
    dropdowns.forEach((dropdown) => {
      if (
        dropdown.classList.contains("open") &&
        !dropdown.contains(e.target)
      ) {
        dropdown.classList.remove("open");
        if (!(navLinks && navLinks.classList.contains("active"))) {
          unlockScrollRestorePosition();
          setTimeout(() => {
            header.classList.remove("header-hidden");
          }, 0);
        }
      }
    });

    if (hamburger && navLinks) {
      const isMenuAuki = navLinks.classList.contains("active");
      if (
        isMenuAuki &&
        !hamburger.contains(e.target) &&
        !navLinks.contains(e.target)
      ) {
        navLinks.classList.remove("active");
        hamburger.classList.remove("open");
        unlockScrollRestorePosition();
        setTimeout(() => {
          header.classList.remove("header-hidden");
        }, 0);
      }
    }
  });

  // ===== 5) Suljetaan valikot, kun painetaan linkkiä navissa =====
  const navAndDropdownLinks = header.querySelectorAll(
    ".nav-links a, .dropdown a"
  );
  navAndDropdownLinks.forEach((link) => {
    link.addEventListener("click", function () {
      closeAllMenus();
      header.classList.remove("header-hidden");
    });
  });

  // ===== 6) Logo-klikki: etusivulla scrollaa ylös, muilla PJAX-navigoi =====
  const logoLink = document.querySelector(".logo");
  if (logoLink) {
    logoLink.addEventListener("click", function (e) {
      const href = window.location.href.toLowerCase();
      const path = window.location.pathname;
      if (href.endsWith("index.html") || path === "/") {
        e.preventDefault();
        disableHeaderHideUntilScrollEnd();
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (header) {
          header.classList.remove("header-hidden");
        }
      }
      // Muutoin PJAX hoitaa navigoinnin
    });
  }
}

function initFooterToiminnot() {
  const btn = document.getElementById('scroll-btn');

  if (!btn) return; // tarkistus, että nappi varmasti löytyy

  // Näytä/piilota nappi, kun sivulla rullataan
  window.addEventListener('scroll', function() {
    if (window.pageYOffset > 200) {
      btn.style.display = 'block';
    } else {
      btn.style.display = 'none';
    }
  });

  // Nappia painettaessa toiminnallisuus
  btn.addEventListener('click', function() {
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
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
