// script.js

document.addEventListener("DOMContentLoaded", function () {
  // 1) Ladataan header ja footer vain kerran sivulatauksen yhteydessä
  loadHeaderFooter();

  // 2) Alustetaan PJAX-navigaatio ja hash/link-toiminnallisuudet
  initPjaxNavigation();
});

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
      // Lisätään ladattu header DOM:iin <body>-alkuun
      document.body.insertAdjacentHTML("afterbegin", html);
      // Kun header on lisätty, alustetaan headerin toiminnot
      initHeaderToiminnot();
      // Alusta hash-logiikka vasta sen jälkeen, kun header on olemassa
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
      // MUUTOS: jos hash on '#hero', jätetään se huomiotta
      if (href === "#hero") {
        e.preventDefault();
        // Halutaan vain estää #hero-näyttämisen, mutta emme scrollaa mihinkään
        return;
      }

      e.preventDefault();
      const targetId = href.slice(1);
      const section = document.getElementById(targetId);
      if (section) {
        // Jos osio löytyy nykyiseltä sivulta, rullataan sinne
        const header = document.querySelector(".header");
        const headerHeight = header ? header.offsetHeight : 0;
        const y =
          section.getBoundingClientRect().top + window.scrollY - headerHeight;
        window.scrollTo({ top: y, behavior: "smooth" });
        // Päivitetään URL-hashi ilman reloadia
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
      const currentPage = location.pathname.split("/").pop() || "index.html";
      if (href === currentPage) {
        // Jos klikattiin samaan sivuun, scrollataan ylös
        window.scrollTo({ top: 0, behavior: "smooth" });
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
      const currentWrapper =
        document.querySelector("#content") || document.querySelector("main");
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

      // Jos halutaan asettaa hash loppuun URL:iin
      const finalUrl =
        options.scrollToHash !== undefined
          ? url + options.scrollToHash
          : url;

      if (!options.replaceState) {
        history.pushState({}, "", finalUrl);
      } else {
        history.replaceState({}, "", finalUrl);
      }

      // Scrollataan ylös välittömästi (täysin uusi sivu) tai odotetaan hash-selausta
      if (!options.scrollToHash) {
        window.scrollTo({ top: 0, behavior: "instant" });
      }

      // Päivitä navin aktiivinen linkki
      updateActiveNavLink();

      // Alusta hash-logiikka uudelleen, sillä on uudet section[id]
      initDynamicHash();

      // Jos halutaan scrollata tiettyyn hash-osioon sisällön korvauksen jälkeen
      if (options.scrollToHash) {
        // MUUTOS: jos scrollToHash on '#hero', skipataan scrollaaminen
        if (options.scrollToHash === "#hero") {
          return;
        }

        const targetId = options.scrollToHash.slice(1);
        const section = document.getElementById(targetId);
        if (section) {
          const header = document.querySelector(".header");
          const headerHeight = header ? header.offsetHeight : 0;
          const y =
            section.getBoundingClientRect().top + window.scrollY - headerHeight;
          // Viive, jotta uusi sisältö on varmasti renderöity
          setTimeout(() => {
            window.scrollTo({ top: y, behavior: "smooth" });
          }, 50);
        }
      }

      // HUOM: Mahdolliset sivukohtaiset init-kutsut (esim. lomakkeet) voidaan
      // kutsua tässä kohdassa tarpeen mukaan.
    })
    .catch((error) => {
      console.error(error);
    });
}

function updateActiveNavLink() {
  // Korostetaan navin linkkejä, jotka vastaavat nykyistä polkua
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
  // Aseta bodylle inline-tyyli top, niin sisältö pysyy ruudulla paikallaan
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
    const nykyinenScroll = window.scrollY;
    if (nykyinenScroll > viimeisinScrollY && nykyinenScroll > 100) {
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
        // Menu aukeaa → lukitse scroll
        lockScrollPreservePosition();
      } else {
        // Menu sulkeutuu → palauta scroll (vain jos ei muita valikkoja auki)
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
        // Dropdown aukeaa → lukitse scroll
        lockScrollPreservePosition();
      } else {
        // Dropdown sulkeutuu → PALAA vain jos hamburger‐menu ei ole auki
        // eli jos navLinks ei sisällä .active-luokkaa
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
    // 4.1) Dropdownien käsittely
    dropdowns.forEach((dropdown) => {
      if (
        dropdown.classList.contains("open") &&
        !dropdown.contains(e.target)
      ) {
        dropdown.classList.remove("open");
        // Sulje dropdown → lukituksen palautus vain, jos EI ole mobiilimenua auki
        if (!(navLinks && navLinks.classList.contains("active"))) {
          unlockScrollRestorePosition();
          setTimeout(() => {
            header.classList.remove("header-hidden");
          }, 0);
        }
      }
    });

    // 4.2) Hamburger-menu (mobiili) suljetaan, jos klikataan muualla
    if (hamburger && navLinks) {
      const isMenuAuki = navLinks.classList.contains("active");
      if (
        isMenuAuki &&
        !hamburger.contains(e.target) &&
        !navLinks.contains(e.target)
      ) {
        navLinks.classList.remove("active");
        hamburger.classList.remove("open");
        // Menu sulkeutuu → palauta scroll
        unlockScrollRestorePosition();
        setTimeout(() => {
          header.classList.remove("header-hidden");
        }, 0);
      }
    }
  });

  // ===== 5) Logo-klikki: etusivulla scrollaa ylös, muilla PJAX-navigoi =====
  const logoLink = document.querySelector(".logo");
  if (logoLink) {
    logoLink.addEventListener("click", function (e) {
      const href = window.location.href.toLowerCase();
      const path = window.location.pathname;
      if (href.endsWith("index.html") || path === "/") {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      // Muutoin PJAX hoitaa navigoinnin
    });
  }
}


function initFooterToiminnot() {
  // Jos haluat lisätä footerille jotain JS-toiminnallisuutta, toteuta täällä.
}

// ===== 6) Dynaaminen URL-hashin päivitys rullauksen mukaan =====
function initDynamicHash() {
  const header = document.querySelector(".header");
  if (!header) return;

  // Haetaan kaikki section-elementit, joilla on id-atribuutti (POIS LUKIEN #hero)
  const sections = document.querySelectorAll("section[id]:not([id='hero'])"); // MUUTOS: suodatetaan pois id="hero"
  if (sections.length === 0) return;

  let viimeisinHash = window.location.hash;

  // Käytetään IntersectionObserveria, jotta hash päivittyy, kun sektion keskikohta tulee näytölle
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

  // Lisätään skrolli-event, jotta poistetaan hash, kun ollaan sivun ylälaidassa
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
