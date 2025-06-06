document.addEventListener("DOMContentLoaded", function () {
  // ****************************************
  // Ladataan header ulkoisesta tiedostosta (header.html)
  // ****************************************
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
      // Alustetaan headerin toiminnot vasta sen jälkeen, kun header on olemassa
      initHeaderToiminnot();
    })
    .catch((error) => {
      console.error(error);
    });

  function initHeaderToiminnot() {
    // ****************************************
    // 1) Haetaan header, asetetaan scroll‐kuuntelija
    // ****************************************
    const header = document.querySelector(".header");
    if (!header) return;

    let viimeisinScrollY = window.scrollY;

    window.addEventListener("scroll", function () {
      const nykyinenScroll = window.scrollY;

      // Jos rullataan alas (nykyinenScroll > viimeisinScrollY) ja olemme yli 100px,
      // piilotetaan header (lisätään .header-hidden)
      if (nykyinenScroll > viimeisinScrollY && nykyinenScroll > 100) {
        header.classList.add("header-hidden");
      }
      // Jos rullataan ylöspäin, poistetaan piilottava luokka
      else if (nykyinenScroll < viimeisinScrollY) {
        header.classList.remove("header-hidden");
      }

      viimeisinScrollY = nykyinenScroll;
    });

    // ****************************************
    // 2) Hamburger‐ikonin toggle mobiilissa
    // ****************************************
    const hamburger = document.querySelector(".hamburger");
    const navLinks = document.querySelector(".nav-links");
    if (hamburger && navLinks) {
      hamburger.addEventListener("click", function (e) {
        e.stopPropagation(); // estetään tämän klikkauksen kuuluminen dokumentin muuhun kuuntelijaan
        this.classList.toggle("open");
        navLinks.classList.toggle("active");
      });
    }

    // ****************************************
    // 3) Dropdown‐valikon toggle (Categories)
    // ****************************************
    const dropdowns = document.querySelectorAll(".dropdown");
    dropdowns.forEach((dropdown) => {
      const toggleBtn = dropdown.querySelector(".dropdown-toggle");
      if (!toggleBtn) return;
      toggleBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        dropdown.classList.toggle("open");
      });
    });

    // ****************************************
    // 4) Suljetaan avoimet dropdownit ja hamburger-menu, kun klikkaus muualle
    // ****************************************
    document.addEventListener("click", function (e) {
      // --- Suljetaan dropdownit kuten aiemmin ---
      dropdowns.forEach((dropdown) => {
        if (
          dropdown.classList.contains("open") &&
          !dropdown.contains(e.target)
        ) {
          dropdown.classList.remove("open");
        }
      });

      // --- Suljetaan hamburger‐menu, jos klikkaus muualle ---
      if (hamburger && navLinks) {
        const isMenuAuki = navLinks.classList.contains("active");
        // Jos menu on auki ja klikattu kohde ei ole hamburger eikä itse navLinks-valikko
        if (
          isMenuAuki &&
          !hamburger.contains(e.target) &&
          !navLinks.contains(e.target)
        ) {
          // Poistetaan avatut luokat
          navLinks.classList.remove("active");
          hamburger.classList.remove("open");
        }
      }
    });

    // ****************************************
    // 5) Logo‐klikki: etusivulla rullaa ylös, muilla sivuilla navigoi etusivulle
    // ****************************************
    const logoLink = document.querySelector(".logo");
    if (logoLink) {
      logoLink.addEventListener("click", function (e) {
        const href = window.location.href.toLowerCase();
        const path = window.location.pathname;
        // Tarkistetaan, ollaanko etusivulla:
        //   - jos URL päättyy "index.html" (eli esim. https://domain.com/index.html)
        //   - tai jos path on "/" (palvelimella juuripolku)
        if (href.endsWith("index.html") || path === "/") {
          e.preventDefault();
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }
        // Muutoin ei kutsuta preventDefault(), jolloin <a href="index.html"> vie normaalisti etusivulle.
      });
    }
  }

  // ****************************************
  // 6) Dynaaminen URL-hashin päivitys rullauksen mukaan
  // ****************************************
  // Haetaan kaikki section-elementit, joilla on id-atribuutti
  const sections = document.querySelectorAll("section[id]");
  if (sections.length > 0) {
    let viimeisinHash = window.location.hash;

    const observerOptions = {
      root: null,
      rootMargin: "-50% 0px -50% 0px",
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
  }
});
