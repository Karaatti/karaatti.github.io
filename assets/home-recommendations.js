(() => {
  const section = document.getElementById("recommendations");
  if (!section) return;
  const feed = section.querySelector("[data-recommendation-feed]");
  const lists = Array.from(section.querySelectorAll("template[data-recommendation-list]"));
  const button = section.querySelector(".home-recommendations__more");
  const status = section.querySelector('[role="status"]');
  if (!feed || !button || !lists.length) return;
  // Shuffle complete, pre-rendered lists; no product fetch or browser card builder.
  for (let i = lists.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [lists[i], lists[j]] = [lists[j], lists[i]];
  }
  feed.replaceChildren(lists.shift().content.cloneNode(true));
  button.hidden = lists.length === 0;
  button.addEventListener("click", () => {
    const next = lists.shift();
    if (!next) return;
    const fragment = next.content.cloneNode(true);
    const firstLink = fragment.querySelector("a");
    feed.append(fragment);
    status.textContent = `${feed.children.length} ideas shown`;
    firstLink?.focus({ preventScroll: true });
    firstLink?.scrollIntoView({ block: "nearest", behavior: "instant" });
    if (!lists.length) {
      button.setAttribute("aria-disabled", "true");
      button.textContent = "All ideas shown";
    }
  });
})();
