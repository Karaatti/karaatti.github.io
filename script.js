document.addEventListener("DOMContentLoaded", function () {
  // Haetaan header.html samasta hakemistosta
  fetch("/header.html")
    .then((response) => {
      if (!response.ok) {
        throw new Error("header.html ei löytynyt: " + response.status);
      }
      return response.text();
    })
    .then((html) => {
      // Luodaan temporaalinen div talteen haetusta HTML:stä
      const temp = document.createElement("div");
      temp.innerHTML = html;

      // Oletetaan, että haetussa fragmentissa on <header>…</header>
      const headerElement = temp.querySelector("header");

      if (headerElement) {
        // Lisätään header koko sivun body-elementin alkuun
        document.body.prepend(headerElement);
        // Lopuksi alustetaan navigaation tapahtumat (hamburger + dropdown)
        initHeaderScripts();
      }
    })
    .catch((err) => {
      console.error("Headerin lataus epäonnistui:", err);
    });
});


function initHeaderScripts() {
  // 1) Hamburger-valikon toggle
  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", function () {
      this.classList.toggle("open");
      navLinks.classList.toggle("active");
    });
  }

  // 2) Dropdown (Categories) toggle
  const dropdowns = document.querySelectorAll(".dropdown");
  dropdowns.forEach((dropdown) => {
    const toggleBtn = dropdown.querySelector(".dropdown-toggle");
    toggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    });
  });

  // 3) Suljetaan kaikki dropdownit, kun klikkaus muualla
  document.addEventListener("click", function (e) {
    dropdowns.forEach((dropdown) => {
      if (dropdown.classList.contains("open") && !dropdown.contains(e.target)) {
        dropdown.classList.remove("open");
      }
    });
  });
}
