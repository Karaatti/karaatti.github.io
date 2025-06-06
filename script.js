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

    // ****************************************
    // 3) Dropdown‐valikon toggle (Categories)
    // ****************************************
    const dropdowns = document.querySelectorAll(".dropdown");

    // ****************************************
    // Valmistelemme no-scroll -logiikan
    // ****************************************
    const body = document.body;
    function updateNoScroll() {
      const isNavOpen = navLinks && navLinks.classList.contains("active");
      const isAnyDropdownOpen = Array.from(dropdowns).some((d) =>
        d.classList.contains("open")
      );
      if (isNavOpen || isAnyDropdownOpen) {
        body.classList.add("no-scroll");
      } else {
        body.classList.remove("no-scroll");
      }
    }

    if (hamburger && navLinks) {
      hamburger.addEventListener("click", function (e) {
        e.stopPropagation(); // estetään tämän klikkauksen kuuluminen dokumentin muuhun kuuntelijaan
        this.classList.toggle("open");
        navLinks.classList.toggle("active");
        updateNoScroll();
      });
    }

    dropdowns.forEach((dropdown) => {
      const toggleBtn = dropdown.querySelector(".dropdown-toggle");
      if (!toggleBtn) return;
      toggleBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        dropdown.classList.toggle("open");
        updateNoScroll();
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

      // Päivitetään no-scroll-staatia klikkauksen jälkeen
      updateNoScroll();
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

    // ****************************************
    // 6) Dynaaminen URL-hashin päivitys rullauksen mukaan (ylänurkan jälkeen)
    // ****************************************
    const sections = Array.from(document.querySelectorAll("section[id]"));
    if (sections.length > 0) {
      let viimeisinHash = window.location.hash;
      const headerHeight = header.offsetHeight;

      function updateHash() {
        let activeSection = null;
        // Käydään läpi kaikki sectionit ja valitaan viimeinen, jonka top ≤ headerin alaosa
        sections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          if (rect.top <= headerHeight) {
            activeSection = section;
          }
        });

        let uusiHash = "";
        if (activeSection && activeSection.id !== "hero") {
          uusiHash = `#${activeSection.id}`;
        }
        // Jos activeSection on hero tai ei löydy yhtään, uusiHash pysyy tyhjänä

        if (viimeisinHash !== uusiHash) {
          if (uusiHash === "") {
            history.replaceState(null, "", window.location.pathname);
          } else {
            history.replaceState(null, "", uusiHash);
          }
          viimeisinHash = uusiHash;
        }
      }

      // Lisää scroll‐kuuntelija hashin päivittämiseksi
      window.addEventListener("scroll", updateHash);
      // Kutsu kerran sivun latauduttua, jos asiakas on suoraan johonkin alempaan kohtaan
      updateHash();
    }
  }
});
