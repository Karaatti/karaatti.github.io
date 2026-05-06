function showLoader() {
  let loader = document.getElementById("loader");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "loader";
    loader.textContent = "";
  }
  if (!document.body.contains(loader)) {
    document.body.appendChild(loader);
  }
  document.body.classList.add("no-scroll");
  document.documentElement.classList.add("no-scroll", "ajax-loading");
  loader.style.transition = "opacity 0.15s ease-out";
  if (
    getComputedStyle(loader).opacity === "" ||
    getComputedStyle(loader).opacity === "1"
  ) {
    loader.style.opacity = "0";
  }
  requestAnimationFrame(() => {
    loader.style.opacity = "1";
  });
}
function hideLoader() {
  const loader = document.getElementById("loader");
  if (!loader) {
    return;
  }
  loader.style.transition = "opacity 0.15s ease-out";
  loader.style.opacity = "0";
  setTimeout(() => {
    loader.remove();
    document.body.classList.remove("no-scroll");
    document.documentElement.classList.remove("no-scroll", "ajax-loading");
  }, 150);
}
function watchLogo(img) {
  const done = () => waitHeroBg(hideLoader);
  if (img.decode) {
    img.decode().then(done, done);
  } else if (img.complete) {
    done();
  } else {
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  }
}
function waitHeroBg(callback) {
  const hero = document.getElementById("hero");
  if (!hero) {
    return callback();
  }
  const match = getComputedStyle(hero).backgroundImage.match(
    /url\(["']?(.*?)["']?\)/,
  );
  if (!match) {
    return callback();
  }
  const img = new Image();
  img.src = match[1];
  if (img.complete) {
    return callback();
  }
  img.addEventListener("load", callback, { once: true });
  img.addEventListener("error", callback, { once: true });
}
function resolveToAbsolute(rel, base) {
  try {
    return new URL(rel, base).href;
  } catch (_) {
    return rel;
  }
}
document.documentElement.classList.add("js");

const PREVIEW_BASE_URL = (() => {
  const scriptSrc =
    document.currentScript?.src ||
    Array.from(document.scripts || [])
      .map((script) => script?.src || "")
      .find((src) =>
        /\/api\/webtool\/preview\/[^/]+\/script\.js(?:\?|$)/.test(src),
      ) ||
    "";
  const match = scriptSrc.match(
    /^(https?:\/\/[^/]+\/api\/webtool\/preview\/[^/]+\/)/,
  );
  return match ? match[1] : "";
})();
function resolveSiteUrl(rawUrl) {
  try {
    const url = new URL(rawUrl, window.location.href);
    if (
      PREVIEW_BASE_URL &&
      url.origin === window.location.origin &&
      !url.href.startsWith(PREVIEW_BASE_URL)
    ) {
      return new URL(
        `${url.pathname.replace(/^\/+/, "")}${url.search}${url.hash}`,
        PREVIEW_BASE_URL,
      ).toString();
    }
    return url.toString();
  } catch (_) {
    if (PREVIEW_BASE_URL && typeof rawUrl === "string") {
      if (rawUrl.startsWith("/")) {
        return new URL(rawUrl.replace(/^\/+/, ""), PREVIEW_BASE_URL).toString();
      }
      if (!/^[a-z]+:/i.test(rawUrl)) {
        return new URL(rawUrl, PREVIEW_BASE_URL).toString();
      }
    }
    return rawUrl;
  }
}
function rewritePreviewFragmentHtml(markup) {
  let html = String(markup ?? "");
  if (!PREVIEW_BASE_URL || !html) {
    return html;
  }
  const rewriteCssValue = (value) =>
    String(value ?? "").replace(
      /url\(\s*(["']?)(\/[^)"'\s]+)["']?\s*\)/gi,
      (_, quote, urlPath) => `url(${quote || ""}${resolveSiteUrl(urlPath)}${quote || ""})`,
    );
  html = html.replace(
    /\b(srcset)\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (_, attrName, wrappedValue, doubleQuotedValue, singleQuotedValue) => {
      const quote = wrappedValue[0] === "'" ? "'" : '"';
      const current =
        typeof doubleQuotedValue === "string"
          ? doubleQuotedValue
          : singleQuotedValue;
      const next = String(current ?? "")
        .split(",")
        .map((chunk) => {
          const token = String(chunk ?? "").trim();
          if (!token) {
            return token;
          }
          const pieces = token.split(/\s+/);
          const rewritten = resolveSiteUrl(pieces[0]);
          return pieces.length > 1
            ? [rewritten, ...pieces.slice(1)].join(" ")
            : rewritten;
        })
        .join(", ");
      return `${attrName}=${quote}${next}${quote}`;
    },
  );
  html = html.replace(
    /\b(src|href|poster|action|data-submenu|data-href|data-src|data-url|data-path)\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (_, attrName, wrappedValue, doubleQuotedValue, singleQuotedValue) => {
      const quote = wrappedValue[0] === "'" ? "'" : '"';
      const current =
        typeof doubleQuotedValue === "string"
          ? doubleQuotedValue
          : singleQuotedValue;
      const next = resolveSiteUrl(current);
      return `${attrName}=${quote}${next}${quote}`;
    },
  );
  html = html.replace(
    /\bstyle\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (_, wrappedValue, doubleQuotedValue, singleQuotedValue) => {
      const quote = wrappedValue[0] === "'" ? "'" : '"';
      const current =
        typeof doubleQuotedValue === "string"
          ? doubleQuotedValue
          : singleQuotedValue;
      return `style=${quote}${rewriteCssValue(current)}${quote}`;
    },
  );
  return html;
}
function toNavigableUrl(rawUrl) {
  try {
    const url = new URL(resolveSiteUrl(rawUrl), window.location.href);
    if (url.pathname === "/index.html") {
      url.pathname = "/";
    } else if (/\/index\.html$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/index\.html$/i, "/");
    } else if (/\.html$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\.html$/i, "");
    }
    return url.toString();
  } catch (_) {
    return rawUrl;
  }
}
function hasExplicitFileExtension(pathname) {
  return /\.[a-z0-9]+$/i.test(String(pathname || ""));
}
function isNavigableSitePath(pathname) {
  const text = String(pathname || "");
  if (!text || text === "/") {
    return true;
  }
  if (text.endsWith("/") || text.endsWith(".html")) {
    return true;
  }
  return !hasExplicitFileExtension(text);
}
function buildPageFetchCandidates(rawUrl) {
  const candidates = [];
  const pushCandidate = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized || candidates.includes(normalized)) {
      return;
    }
    candidates.push(normalized);
  };
  try {
    const url = new URL(resolveSiteUrl(rawUrl), window.location.href);
    pushCandidate(url.toString());
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      const indexClone = new URL(url.toString());
      indexClone.pathname = `${indexClone.pathname}index.html`;
      pushCandidate(indexClone.toString());
      return candidates;
    }
    if (!hasExplicitFileExtension(url.pathname)) {
      const htmlClone = new URL(url.toString());
      htmlClone.pathname = `${htmlClone.pathname}.html`;
      pushCandidate(htmlClone.toString());
      const dirClone = new URL(url.toString());
      dirClone.pathname = `${dirClone.pathname}/index.html`;
      pushCandidate(dirClone.toString());
    }
  } catch (_) {
    pushCandidate(rawUrl);
  }
  return candidates;
}
function toMenuDirectoryUrl(rawUrl) {
  const resolved = resolveSiteUrl(rawUrl);
  try {
    const url = new URL(resolved, window.location.href);
    url.pathname = url.pathname.replace(/\/index\.html$/i, "/");
    return url.toString();
  } catch (_) {
    return String(resolved || rawUrl || "").replace(/\/index\.html(?=([?#]|$))/i, "/");
  }
}
function toMenuItemsUrl(rawUrl) {
  const resolved = resolveSiteUrl(rawUrl);
  try {
    const url = new URL(resolved, window.location.href);
    if (/\/index\.html$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/index\.html$/i, "/items.json");
      return url.toString();
    }
    if (/\.html$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\.html$/i, ".items.json");
      return url.toString();
    }
    if (url.pathname.endsWith("/")) {
      url.pathname = `${url.pathname}items.json`;
      return url.toString();
    }
    url.pathname = `${url.pathname}.items.json`;
    return url.toString();
  } catch (_) {
    const value = String(resolved || rawUrl || "");
    if (/\/index\.html(?=([?#]|$))/i.test(value)) {
      return value.replace(/\/index\.html(?=([?#]|$))/i, "/items.json");
    }
    if (/\.html(?=([?#]|$))/i.test(value)) {
      return value.replace(/\.html(?=([?#]|$))/i, ".items.json");
    }
    return value.endsWith("/") ? `${value}items.json` : `${value}.items.json`;
  }
}
function slugifyTransitionKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function getFamilyPageContext(rawUrl) {
  try {
    const url = new URL(resolveSiteUrl(rawUrl), window.location.href);
    const normalizedPath = url.pathname
      .replace(/\/index\.html$/i, "/")
      .replace(/\.html$/i, "")
      .replace(/\/+$/, "");
    const segments = normalizedPath.split("/").filter(Boolean);
    if (segments[0] !== "products" || segments.length < 3) {
      return null;
    }
    return {
      pathname: normalizedPath || "/",
      familyBase: `/${segments.slice(0, 3).join("/")}/`,
    };
  } catch (_) {
    return null;
  }
}
function getFamilyTransitionBlockKey(prefix, block, index) {
  const heading = Array.from(block.children || []).find((child) =>
    /^H[1-6]$/.test(child?.tagName || ""),
  );
  const label = slugifyTransitionKey(heading?.textContent || "");
  return `${prefix}:${label || "section"}:${index}`;
}
function isEligibleFamilyTransitionKey(key) {
  return [
    "sidebar:choose-variant:0",
    "sidebar:key-details:1",
    "main:technical-specifications:0",
    "main:specifications:1",
    "main:attributes:2",
  ].includes(String(key || ""));
}
function collectFamilyTransitionElements(root = document) {
  const page = root.querySelector(".family-product-page");
  if (!page) {
    return [];
  }
  const scope =
    Array.from(page.children || []).find((child) => child.tagName === "ARTICLE") ||
    page;
  const elements = [];
  Array.from(scope.children || []).forEach((child) => {
    if (!(child instanceof HTMLElement)) {
      return;
    }
    if (!child.classList.contains("family-product-layout")) {
      return;
    }
    let sidebarIndex = 0;
    let mainIndex = 0;
    let layoutIndex = 0;
    Array.from(child.children || []).forEach((layoutChild) => {
      if (!(layoutChild instanceof HTMLElement)) {
        return;
      }
      if (layoutChild.classList.contains("family-product-sidebar")) {
        Array.from(layoutChild.children || []).forEach((block) => {
          if (
            block instanceof HTMLElement &&
            block.classList.contains("family-product-block")
          ) {
            elements.push({
              key: getFamilyTransitionBlockKey("sidebar", block, sidebarIndex++),
              element: block,
            });
          }
        });
        return;
      }
      if (layoutChild.classList.contains("family-product-main")) {
        Array.from(layoutChild.children || []).forEach((block) => {
          if (
            block instanceof HTMLElement &&
            block.classList.contains("family-product-block")
          ) {
            elements.push({
              key: getFamilyTransitionBlockKey("main", block, mainIndex++),
              element: block,
            });
          }
        });
        return;
      }
      if (layoutChild.classList.contains("family-product-block")) {
        elements.push({
          key: getFamilyTransitionBlockKey("layout", layoutChild, layoutIndex++),
          element: layoutChild,
        });
      }
    });
  });
  return elements;
}
function captureFamilyPageTransitionSnapshot(targetUrl) {
  const currentContext = getFamilyPageContext(window.location.href);
  const targetContext = getFamilyPageContext(targetUrl);
  if (
    !currentContext ||
    !targetContext ||
    currentContext.familyBase !== targetContext.familyBase ||
    !document.querySelector(".family-product-page")
  ) {
    return null;
  }
  const rects = new Map();
  collectFamilyTransitionElements(document).forEach(({ key, element }) => {
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      return;
    }
    rects.set(key, {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  });
  if (!rects.size) {
    return null;
  }
  return {
    familyBase: currentContext.familyBase,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    rects,
  };
}
function restorePjaxScrollPosition(snapshot) {
  if (!snapshot) {
    return;
  }
  window.scrollTo(snapshot.scrollX, snapshot.scrollY);
}
function readCssTimeMs(variableName, fallbackMs) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
  const match = raw.match(/^([\d.]+)(ms|s)$/i);
  if (!match) {
    return fallbackMs;
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return fallbackMs;
  }
  return match[2].toLowerCase() === "s" ? value * 1000 : value;
}
function maintainPjaxScrollPosition(snapshot, durationMs) {
  if (!snapshot || !Number.isFinite(durationMs) || durationMs <= 0) {
    return;
  }
  const endAt = performance.now() + durationMs;
  const tick = () => {
    restorePjaxScrollPosition(snapshot);
    if (performance.now() < endAt) {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}
function animateFamilyPageTransition(snapshot) {
  if (!snapshot?.rects?.size) {
    return false;
  }
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    restorePjaxScrollPosition(snapshot);
    return false;
  }
  const candidates = [];
  collectFamilyTransitionElements(document).forEach(({ key, element }) => {
    if (!isEligibleFamilyTransitionKey(key)) {
      return;
    }
    const previous = snapshot.rects.get(key);
    if (!previous) {
      return;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      return;
    }
    const heightDelta = previous.height - rect.height;
    if (Math.abs(heightDelta) <= 1) {
      return;
    }
    candidates.push({
      element,
      fromHeight: previous.height,
      toHeight: rect.height,
    });
  });
  const animated = [];
  candidates.forEach(({ element, fromHeight, toHeight }) => {
    element.style.transition = "none";
    element.style.willChange = "height";
    element.style.overflow = "hidden";
    element.style.height = `${fromHeight}px`;
    animated.push({ element, toHeight });
  });
  if (!animated.length) {
    return false;
  }
  const delayMs = readCssTimeMs("--family-nav-transition-delay", 200);
  const durationMs = readCssTimeMs("--family-nav-transition-duration", 420);
  const totalMs = delayMs + durationMs;
  const cleanup = () => {
    animated.forEach(({ element }) => {
      element.style.transition = "";
      element.style.willChange = "";
      element.style.overflow = "";
      element.style.height = "";
    });
  };
  restorePjaxScrollPosition(snapshot);
  animated.forEach(({ element }) => {
    void element.offsetHeight;
  });
  requestAnimationFrame(() => {
    restorePjaxScrollPosition(snapshot);
    maintainPjaxScrollPosition(snapshot, totalMs + 68);
    animated.forEach(({ element, toHeight }) => {
      element.style.transition =
        "height var(--family-nav-transition-duration) var(--family-nav-transition-ease) var(--family-nav-transition-delay)";
      element.style.height = `${toHeight}px`;
    });
    window.setTimeout(cleanup, totalMs + 34);
  });
  return true;
}
function isMenuDirItem(item) {
  return item?.type === "dir";
}
function isMenuFileItem(item) {
  if (item?.type === "file") {
    return true;
  }
  const href = String(item?.href || "");
  if (!href || item?.type === "dir") {
    return false;
  }
  return /\.html$/i.test(href) || /\/[^/.?#]+(?:[?#].*)?$/i.test(href);
}
function hasNavigableMenuItems(items) {
  return Array.isArray(items) && items.some((item) => isMenuDirItem(item) || isMenuFileItem(item));
}
function getMenuItemLabel(item) {
  const preferred = String(item?.title || item?.label || item?.name || "").trim();
  if (preferred) {
    return preferred.replace(/[-_]+/g, " ").trim();
  }
  return humanizeSearchSegment(item?.href || "");
}
function hasPublishedInjectedShell() {
  const header = document.getElementById("site-header");
  const footer = document.getElementById("site-footer");
  return Boolean(
    header &&
      footer &&
      typeof hasInjectedShellContent === "function" &&
      hasInjectedShellContent(header) &&
      hasInjectedShellContent(footer),
  );
}
function initLogoLoader() {
  if (hasPublishedInjectedShell()) {
    return;
  }
  showLoader();
  const logoImg = document.querySelector(".logo img");
  if (logoImg) {
    watchLogo(logoImg);
  } else {
    const observer = new MutationObserver((records, obs) => {
      const img = document.querySelector(".logo img");
      if (img) {
        watchLogo(img);
        obs.disconnect();
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    setTimeout(hideLoader, 5000);
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLogoLoader);
} else {
  initLogoLoader();
}
let menuNavInProgress = false;
document.addEventListener("DOMContentLoaded", () => {
  const shouldHideWhileHydratingShell = !hasPublishedInjectedShell();
  if (shouldHideWhileHydratingShell) {
    document.documentElement.classList.add("ajax-loading");
  }
  loadHeaderFooter()
    .then(() => {
      initCollectionLoader(".collection-btn", "#collection-content");
      initSolutionLoader(".solution-btn", "#solution-content");
      initRemoteFragmentLoaders(document);
      initRetailerDirectories(document);
      initPjaxNavigation();
      const hash = window.location.hash;
      if (hash && hash !== "#") {
        requestAnimationFrame(() => {
          scrollToSection(hash);
        });
      }
    })
    .catch((err) => console.error("[INIT] Header/Footer load failed:", err))
    .finally(() => {
      if (shouldHideWhileHydratingShell) {
        document.documentElement.classList.remove("ajax-loading");
      }
    });
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
let _scrollLocked = false;
let _savedScrollPos = 0;
function applyScrollLock(shouldLock) {
  if (shouldLock && !_scrollLocked) {
    _savedScrollPos = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.top = `-${_savedScrollPos}px`;
    document.body.classList.add("no-scroll");
    _scrollLocked = true;
  } else if (!shouldLock && _scrollLocked) {
    document.body.classList.remove("no-scroll");
    document.body.style.top = "";
    window.scrollTo(0, _savedScrollPos);
    _scrollLocked = false;
  }
}
let headerMenuScrollLocked = false;
function syncScrollLockWithHamburger() {
  const header = document.querySelector(".header");
  const shouldLock = Boolean(header?.classList.contains("mobile-nav-open"));
  document.documentElement.classList.toggle("header-menu-open", shouldLock);
  if (shouldLock && !headerMenuScrollLocked) {
    lockScrollPreservePosition();
    headerMenuScrollLocked = true;
  } else if (!shouldLock && headerMenuScrollLocked) {
    unlockScrollRestorePosition();
    headerMenuScrollLocked = false;
  }
}
function syncScrollLockWithNav() {
  const navLinks = document.querySelector(".nav-links");
  if (!navLinks) {
    return;
  }
  if (navLinks.classList.contains("active")) {
    lockScrollPreservePosition();
  } else {
    unlockScrollRestorePosition();
  }
}
let _lockedScrollPos = 0;
let _scrollLockDepth = 0;
function lockScrollPreservePosition() {
  if (_scrollLockDepth === 0) {
    _lockedScrollPos = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.top = `-${_lockedScrollPos}px`;
    document.body.classList.add("no-scroll");
    document.documentElement.classList.add("no-scroll");
  }
  _scrollLockDepth += 1;
}
function unlockScrollRestorePosition() {
  if (_scrollLockDepth === 0) {
    return;
  }
  _scrollLockDepth -= 1;
  if (_scrollLockDepth === 0) {
    document.body.classList.remove("no-scroll");
    document.documentElement.classList.remove("no-scroll");
    document.body.style.top = "";
    requestAnimationFrame(() => {
      window.scrollTo(0, _lockedScrollPos);
    });
  }
}
const headerMobileMenuMedia = window.matchMedia("(max-width: 767px)");
let headerOverflowResizeObserver = null;
let headerOverflowResizeHandler = null;
let headerOverflowFontReady = null;
function isMobileHeaderNavigation() {
  return headerMobileMenuMedia.matches;
}
function getHeaderNavigationElements(header) {
  if (!header) {
    return {};
  }
  return {
    container: header.querySelector(".header-container"),
    nav: header.querySelector(".nav"),
    navLinks: header.querySelector(".nav-links"),
    overflowLinks: header.querySelector(".nav-overflow-links"),
    overflowPanel: header.querySelector(".nav-overflow"),
    hamburger: header.querySelector(".hamburger"),
  };
}
function setHiddenPanelFocusable(panel, enabled) {
  if (!panel) return;
  panel.querySelectorAll("a[href], button, input, select, textarea, summary, [tabindex]").forEach((element) => {
    if (enabled) {
      if (element.dataset.previousTabindex !== undefined) {
        const previous = element.dataset.previousTabindex;
        if (previous === "") element.removeAttribute("tabindex");
        else element.setAttribute("tabindex", previous);
        delete element.dataset.previousTabindex;
      } else if (element.getAttribute("tabindex") === "-1") {
        element.removeAttribute("tabindex");
      }
      element.removeAttribute("aria-hidden");
      return;
    }
    if (element.dataset.previousTabindex === undefined) {
      element.dataset.previousTabindex = element.getAttribute("tabindex") || "";
    }
    element.setAttribute("tabindex", "-1");
  });
}
function closeHeaderDropdowns(header) {
  header?.querySelectorAll(".dropdown.open").forEach((dd) => dd.classList.remove("open"));
}
function ensureHeaderItemOrder(header) {
  const { navLinks, overflowLinks } = getHeaderNavigationElements(header);
  const items = [
    ...Array.from(navLinks?.children || []),
    ...Array.from(overflowLinks?.children || []),
  ];
  items.forEach((item, index) => {
    if (!item.dataset.navOrder) {
      item.dataset.navOrder = String(index);
    }
  });
}
function restoreHeaderNavItems(header) {
  const { navLinks, overflowLinks } = getHeaderNavigationElements(header);
  if (!navLinks || !overflowLinks) {
    return;
  }
  const items = [...Array.from(navLinks.children), ...Array.from(overflowLinks.children)];
  items
    .sort((a, b) => Number(a.dataset.navOrder || 0) - Number(b.dataset.navOrder || 0))
    .forEach((item) => navLinks.appendChild(item));
  overflowLinks.replaceChildren();
}
function setHeaderMenuState(header, shouldOpen) {
  const { navLinks, overflowLinks, overflowPanel, hamburger } = getHeaderNavigationElements(header);
  if (!header || !navLinks || !hamburger) {
    return;
  }
  const isMobile = isMobileHeaderNavigation();
  if (isMobile && shouldOpen) {
    restoreHeaderNavItems(header);
  }
  const canOpen = isMobile ? true : Boolean(overflowLinks?.children.length);
  const isOpen = Boolean(shouldOpen && canOpen);
  hamburger?.classList.toggle("open", isOpen);
  hamburger?.setAttribute("aria-expanded", String(isOpen));
  navLinks.classList.toggle("active", isMobile && isOpen);
  overflowPanel?.classList.toggle("active", !isMobile && isOpen);
  overflowPanel?.toggleAttribute("inert", !(!isMobile && isOpen));
  setHiddenPanelFocusable(overflowPanel, !isMobile && isOpen);
  header.classList.toggle("mobile-nav-open", isMobile && isOpen);
  header.classList.toggle("desktop-overflow-open", !isMobile && isOpen);
  syncScrollLockWithHamburger();
}
function syncHeaderOverflow(header) {
  const { container, nav, navLinks, overflowLinks, overflowPanel, hamburger } =
    getHeaderNavigationElements(header);
  if (!header || !container || !nav || !navLinks || !overflowLinks || !overflowPanel || !hamburger) {
    return;
  }
  const wasMobileOpen = header.classList.contains("mobile-nav-open");
  const wasDesktopOpen = header.classList.contains("desktop-overflow-open");
  ensureHeaderItemOrder(header);
  closeHeaderDropdowns(header);
  restoreHeaderNavItems(header);
  const isMobile = isMobileHeaderNavigation();
  header.classList.toggle("is-mobile-nav", isMobile);
  header.classList.remove("has-overflow-menu");
  overflowPanel.setAttribute("inert", "");
  setHiddenPanelFocusable(overflowPanel, false);
  hamburger.setAttribute("aria-label", isMobile ? "Toggle menu" : "Toggle overflow menu");
  hamburger.setAttribute(
    "aria-controls",
    isMobile ? "site-header-primary-nav" : "site-header-overflow",
  );
  if (isMobile) {
    hamburger.removeAttribute("aria-hidden");
    hamburger.removeAttribute("tabindex");
    setHeaderMenuState(header, wasMobileOpen);
    header.classList.add("header-layout-ready");
    return;
  }
  const hasHorizontalOverflow = () => {
    const navRect = nav.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const hamburgerRect = hamburger.getBoundingClientRect();
    const hamburgerReserve =
      header.classList.contains("has-overflow-menu") && hamburgerRect.width > 0
        ? hamburgerRect.width + 16
        : 0;
    return (
      navRect.right > containerRect.right - hamburgerReserve + 1 ||
      navLinks.scrollWidth > nav.clientWidth + 1
    );
  };
  if (hasHorizontalOverflow()) {
    header.classList.add("has-overflow-menu");
    while (hasHorizontalOverflow()) {
      const firstPrimaryItem = Array.from(navLinks.children).find(
        (item) => !item.classList.contains("nav-link-utility"),
      );
      if (!firstPrimaryItem) {
        break;
      }
      overflowLinks.appendChild(firstPrimaryItem);
    }
  }
  const hasOverflowMenu = overflowLinks.children.length > 0;
  header.classList.toggle("has-overflow-menu", hasOverflowMenu);
  if (hasOverflowMenu) {
    hamburger.removeAttribute("aria-hidden");
    hamburger.removeAttribute("tabindex");
  } else {
    hamburger.setAttribute("aria-hidden", "true");
    hamburger.setAttribute("tabindex", "-1");
  }
  setHeaderMenuState(header, wasDesktopOpen && hasOverflowMenu);
  header.classList.add("header-layout-ready");
}
function bindHeaderOverflow(header) {
  const { container, nav, navLinks, overflowLinks } = getHeaderNavigationElements(header);
  if (!header || !container || !nav || !navLinks || !overflowLinks) {
    return;
  }
  const scheduleHeaderOverflowSync = () => {
    if (
      header.classList.contains("desktop-overflow-open") ||
      header.classList.contains("mobile-nav-open")
    ) {
      return;
    }
    window.requestAnimationFrame(() => syncHeaderOverflow(header));
  };
  if (headerOverflowResizeObserver) {
    headerOverflowResizeObserver.disconnect();
  }
  if (headerOverflowResizeHandler) {
    window.removeEventListener("resize", headerOverflowResizeHandler);
    headerMobileMenuMedia.removeEventListener("change", headerOverflowResizeHandler);
  }
  headerOverflowResizeHandler = scheduleHeaderOverflowSync;
  if (window.ResizeObserver) {
    headerOverflowResizeObserver = new ResizeObserver(() => {
      scheduleHeaderOverflowSync();
    });
    headerOverflowResizeObserver.observe(container);
    headerOverflowResizeObserver.observe(nav);
    Array.from(navLinks.children).forEach((item) => headerOverflowResizeObserver.observe(item));
    Array.from(overflowLinks.children).forEach((item) => headerOverflowResizeObserver.observe(item));
  }
  headerMobileMenuMedia.addEventListener("change", headerOverflowResizeHandler);
  window.addEventListener("resize", headerOverflowResizeHandler);
  window.requestAnimationFrame(() => syncHeaderOverflow(header));
  if (document.fonts?.ready && headerOverflowFontReady !== document.fonts.ready) {
    headerOverflowFontReady = document.fonts.ready;
    headerOverflowFontReady
      .then(() => {
        window.requestAnimationFrame(() => syncHeaderOverflow(header));
      })
      .catch(() => {});
  }
}
const dropdownOriginalHtml = new Map();
const menuStack = new Map();
function initDropdowns() {
  document.querySelectorAll(".dropdown").forEach((dd) => {
    const toggle = dd.querySelector(".dropdown-toggle");
    const menu = dd.querySelector(".dropdown-menu");
    if (!toggle || !menu) {
      return;
    }
    const originalHtml = menu.innerHTML;
    let stack = [];
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpening = !dd.classList.contains("open");
      if (isOpening) {
        stack = [];
        menu.innerHTML = originalHtml;
        attachMenuHandlers(menu);
        if (!menu.querySelector(".show-all-main")) {
          const rel =
            toggle.getAttribute("data-submenu") || toggle.getAttribute("href");
          let url;
          if (!rel || rel === "null") {
            url = "/products/";
          } else {
            url = resolveSiteUrl(rel);
          }
          const li = document.createElement("li");
          li.classList.add("show-all-main");
          li.innerHTML = `
  <button type="button" class="show-all-btn"
          onclick="window.location.href='${toNavigableUrl(url)}'">
    SHOW ALL
  </button>`;
          menu.appendChild(li);
        }
      }
      dd.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!dd.contains(e.target) && dd.classList.contains("open")) {
        dd.classList.remove("open");
      }
    });
    attachMenuHandlers(menu);
    function attachMenuHandlers(currentMenu) {
      const backBtn = currentMenu.querySelector(".dropdown-back");
      if (backBtn) {
        backBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!stack.length) {
            return;
          }
          const { html } = stack.pop();
          currentMenu.innerHTML = html;
          attachMenuHandlers(currentMenu);
        });
      }
      currentMenu.querySelectorAll("a[data-submenu]").forEach((link) => {
        link.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          stack.push({ html: currentMenu.innerHTML });
          currentMenu.innerHTML = '<li class="loading">Loading…</li>';
          try {
            const rel = link.getAttribute("data-submenu");
            const submenuUrl = toMenuDirectoryUrl(rel);
            const itemsUrl = toMenuItemsUrl(submenuUrl);
            const res = await fetch(itemsUrl);
            if (!res.ok) {
              throw new Error(res.statusText);
            }
            const items = await res.json();
            const title = link.textContent.trim().toUpperCase();
            const backHtml = `
              <li class="back">
                <button type="button" class="dropdown-back">
                  ← Return from ${title}
                </button>
              </li>`;
            const dirItems = items.filter(isMenuDirItem);
            const fileItems = items.filter(isMenuFileItem);
            let html = backHtml;
            const dirHtml = await Promise.all(
              dirItems.map(async (dir) => {
                const dirJson = toMenuItemsUrl(dir.href);
                let childItems = [];
                try {
                  const dres = await fetch(dirJson);
                  if (dres.ok) {
                    childItems = await dres.json();
                  }
                } catch (_) {}
                if (!hasNavigableMenuItems(childItems)) {
                  return "";
                }
                return `<li>
                           <a href="${toNavigableUrl(dir.href)}" data-submenu="${dir.href}">
                             ${getMenuItemLabel(dir)}
                           </a>
                         </li>`;
              }),
            );
            html += dirHtml.filter(Boolean).join("");
            fileItems.forEach((file) => {
              html += `<li>
                         <a href="${resolveSiteUrl(file.href)}">
                           ${getMenuItemLabel(file)}
                         </a>
                       </li>`;
            });
            html += `
              <li class="show-all">
                <button type="button" class="dropdown-back"
                        onclick="window.location.href='${toNavigableUrl(submenuUrl)}'">
                  SHOW ALL
                </button>
              </li>`;
            currentMenu.innerHTML = html;
            attachMenuHandlers(currentMenu);
          } catch (err) {
            console.error("[DROPDOWN JSON] error:", err);
            currentMenu.innerHTML =
              '<li class="error">Error loading products</li>';
          }
        });
      });
    }
  });
}
function attachDropdownHandlers(menu, dd) {
  const freshMenu = menu.cloneNode(true);
  menu.parentNode.replaceChild(freshMenu, menu);
  menu = freshMenu;
  const stack = menuStack.get(menu);
  const backBtn = menu.querySelector(".dropdown-back");
  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (stack.length === 0) {
        return;
      }
      const prevHtml = stack.pop();
      menu.innerHTML = prevHtml;
      attachDropdownHandlers(menu, dd);
    });
  }
  menu.querySelectorAll("a[data-submenu]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      stack.push(menu.innerHTML);
      loadDropdownJson(menu, link.getAttribute("data-submenu"), dd);
    });
  });
}
async function loadDropdownJson(menu, basePath, dd) {
  menu.innerHTML = '<li class="loading">Loading…</li>';
  try {
    const baseUrl = toMenuDirectoryUrl(basePath);
    const itemsUrl = toMenuItemsUrl(baseUrl);
    const res = await fetch(itemsUrl);
    if (!res.ok) {
      throw new Error(res.statusText);
    }
    const items = await res.json();
    const stack = menuStack.get(menu);
    const parentTitle = stack.length
      ? stack[stack.length - 1].match(/← Back to (.+)/)?.[1] || ""
      : "";
    const backHtml = parentTitle
      ? `<li class="back">
           <button type="button" class="dropdown-back">
             ← Back to ${parentTitle}
           </button>
         </li>`
      : "";
    const itemsHtml = items
      .filter((i) => isMenuDirItem(i) || isMenuFileItem(i))
      .map((i) => {
        const attrs = isMenuDirItem(i) ? `data-submenu="${i.href}"` : "";
        return `<li>
                  <a href="${isMenuDirItem(i) ? toNavigableUrl(i.href) : resolveSiteUrl(i.href)}" ${attrs}>
                    ${getMenuItemLabel(i)}
                  </a>
                </li>`;
      })
      .join("");
    menu.innerHTML = backHtml + itemsHtml;
    attachDropdownHandlers(menu, dd);
  } catch (err) {
    console.error("[DROPDOWN JSON] error:", err);
    menu.innerHTML = '<li class="error">Error loading products</li>';
  }
}
function initHeaderFunctions() {
  const header = document.querySelector(".header");
  if (!header) {
    return;
  }
  let lastScrollY = window.scrollY;
  window.addEventListener("scroll", () => {
    if (disableHeaderAutoHide) {
      header.classList.remove("header-hidden");
      lastScrollY = window.scrollY;
      return;
    }
    const now = window.scrollY;
    if (now > lastScrollY && now > 1) {
      header.classList.add("header-hidden");
    }
    if (now < lastScrollY) {
      header.classList.remove("header-hidden");
    }
    lastScrollY = now;
  });
  const hamburger = header.querySelector(".hamburger");
  const navLinks = header.querySelector(".nav-links");
  const overflowPanel = header.querySelector(".nav-overflow");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen =
        header.classList.contains("mobile-nav-open") ||
        header.classList.contains("desktop-overflow-open");
      setHeaderMenuState(header, !isOpen);
    });
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest(".dropdown-menu")) {
      return;
    }
    if (
      header.classList.contains("mobile-nav-open") &&
      !navLinks.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      setHeaderMenuState(header, false);
    }
    if (
      header.classList.contains("desktop-overflow-open") &&
      !overflowPanel?.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      setHeaderMenuState(header, false);
    }
  });
  header.querySelectorAll(".nav-links a, .dropdown a").forEach((link) => {
    link.addEventListener("click", () => {
      if (link.hasAttribute("data-submenu")) {
        return;
      }
      setHeaderMenuState(header, false);
      header
        .querySelectorAll(".dropdown.open")
        .forEach((dd) => dd.classList.remove("open"));
      header.classList.remove("header-hidden");
    });
  });
  header.addEventListener("click", (e) => {
    const link = e.target.closest(".logo a, a.logo");
    if (!link) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    closeAllMenus();
    loadPageViaAjax(link.href, { replaceState: false }).catch((err) => {
      console.error("[HEADER] Logo PJAX error:", err);
    });
  });
  initDropdowns();
  bindHeaderOverflow(header);
  initHeaderScrollHandlers();
}
function getCssVarPx(varName) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!raw) {
    return 0;
  }
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.height = raw;
  document.body.appendChild(div);
  const px = div.getBoundingClientRect().height;
  document.body.removeChild(div);
  return px;
}
function getScrollOffset() {
  const header = document.querySelector(".header");
  const headerHeight = header
    ? header.getBoundingClientRect().height
    : getCssVarPx("--header-height");
  const scrollMargin = getCssVarPx("--scroll-margin");
  return headerHeight + scrollMargin;
}
function scrollToSection(hash) {
  if (!hash || hash === "#") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const id = hash.charAt(0) === "#" ? hash.slice(1) : hash;
  const target = document.getElementById(id);
  if (!target) {
    return;
  }
  const rectTop = target.getBoundingClientRect().top;
  const pageOffset = window.pageYOffset;
  const offset = getScrollOffset();
  const desiredScrollTop = rectTop + pageOffset - offset;
  window.scrollTo({ top: desiredScrollTop, behavior: "smooth" });
}
function initHeaderScrollHandlers() {
  const header = document.querySelector(".header");
  if (!header) {
    return;
  }
  const links = header.querySelectorAll('a[href*="#"]:not([data-submenu])');
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      const hashIndex = href.indexOf("#");
      if (hashIndex === -1) {
        return;
      }
      const hash = href.slice(hashIndex);
      const path = window.location.pathname.replace(/(index\.html)?$/, "");
      const onHome = path === "/" || path === "";
      closeAllMenus();
      disableHeaderHideUntilScrollEnd();
      unlockScrollRestorePosition();
      e.preventDefault();
      e.stopPropagation();
      requestAnimationFrame(() => {
        if (onHome) {
          scrollToSection(hash);
          history.replaceState(null, "", hash);
        } else {
          loadPageViaAjax("/", { replaceState: false, scrollToHash: hash });
        }
      });
    });
  });
}
function initFooterFunctions() {
  const btn = document.getElementById("scroll-btn");
  if (!btn) {
    return;
  }
  if (btn.parentElement !== document.body) {
    document.body.appendChild(btn);
  }
  const syncScrollButtonVisibility = () => {
    btn.style.display = window.pageYOffset > 100 ? "flex" : "none";
  };
  window.addEventListener("scroll", () => {
    syncScrollButtonVisibility();
  });
  syncScrollButtonVisibility();
  btn.addEventListener("click", () => {
    if (
      document.activeElement &&
      ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
    ) {
      document.activeElement.blur();
    }
    disableHeaderHideUntilScrollEnd();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
function closeAllMenus() {
  if (window.menuNavInProgress) {
    return;
  }
  const header = document.querySelector(".header");
  if (!header) {
    return;
  }
  setHeaderMenuState(header, false);
  closeHeaderDropdowns(header);
  setTimeout(() => header.classList.remove("header-hidden"), 0);
}
function computePrefix() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts.map((_) => "../").join("");
}
function hasInjectedShellContent(container) {
  if (!(container instanceof HTMLElement)) {
    return false;
  }
  if (container.children.length > 0) {
    return true;
  }
  return Boolean(String(container.textContent || "").trim());
}
async function hydrateShellContainerFromPartial(container, partialPath) {
  if (!(container instanceof HTMLElement) || !partialPath) {
    return false;
  }
  if (hasInjectedShellContent(container)) {
    return false;
  }
  try {
    const response = await fetch(resolveSiteUrl(partialPath), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`shell partial load failed: ${response.status}`);
    }
    const markup = await response.text();
    if (!String(markup || "").trim()) {
      return false;
    }
    container.innerHTML = markup;
    const replacement =
      container.querySelector(container.tagName.toLowerCase()) ||
      container.firstElementChild;
    if (
      replacement instanceof HTMLElement &&
      replacement.tagName.toLowerCase() === container.tagName.toLowerCase()
    ) {
      container.replaceWith(replacement);
      return true;
    }
    return hasInjectedShellContent(container);
  } catch (error) {
    console.warn("[LAYOUT] Shell partial fallback failed.", {
      partialPath,
      error: error?.message || String(error),
    });
    return false;
  }
}
let lazySearchShellRecoveryAttempted = false;
let lazySearchShellRecoveryPromise = null;
async function recoverShellFromPartialsIfNeeded() {
  if (lazySearchShellRecoveryPromise) {
    return lazySearchShellRecoveryPromise;
  }
  const headerContainer = document.getElementById("site-header");
  const footerContainer = document.getElementById("site-footer");
  const needsHeaderRecovery =
    headerContainer instanceof HTMLElement &&
    !hasInjectedShellContent(headerContainer);
  const needsFooterRecovery =
    footerContainer instanceof HTMLElement &&
    !hasInjectedShellContent(footerContainer);
  if (!needsHeaderRecovery && !needsFooterRecovery) {
    return false;
  }
  lazySearchShellRecoveryPromise = Promise.all([
    needsHeaderRecovery
      ? hydrateShellContainerFromPartial(headerContainer, "/partials/header.html")
      : Promise.resolve(false),
    needsFooterRecovery
      ? hydrateShellContainerFromPartial(footerContainer, "/partials/footer.html")
      : Promise.resolve(false),
  ])
    .then(([headerRecovered, footerRecovered]) => {
      if (headerRecovered && typeof initHeaderFunctions === "function") {
        initHeaderFunctions();
      }
      if (footerRecovered && typeof initFooterFunctions === "function") {
        initFooterFunctions();
      }
      return Boolean(headerRecovered || footerRecovered);
    })
    .finally(() => {
      lazySearchShellRecoveryPromise = null;
    });
  return lazySearchShellRecoveryPromise;
}
async function loadHeaderFooter() {
  const headerContainer = document.getElementById("site-header");
  const footerContainer = document.getElementById("site-footer");
  if (!headerContainer || !footerContainer) {
    console.warn("[LAYOUT] Missing injected header/footer in published HTML.", {
      header: Boolean(headerContainer),
      footer: Boolean(footerContainer),
    });
  }
  const resolvedHeaderContainer = document.getElementById("site-header");
  const resolvedFooterContainer = document.getElementById("site-footer");
  if (resolvedHeaderContainer && typeof initHeaderFunctions === "function") {
    initHeaderFunctions();
  }
  if (resolvedHeaderContainer && typeof initLazySearch === "function") {
    initLazySearch();
  }
  if (typeof initDynamicHash === "function") {
    initDynamicHash();
  }
  if (resolvedFooterContainer && typeof initFooterFunctions === "function") {
    initFooterFunctions();
  }
  return {
    header: resolvedHeaderContainer,
    footer: resolvedFooterContainer,
  };
}

function initPjaxNavigation() {
  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) {
      return;
    }
    const href = link.getAttribute("href");
    if (
      !href ||
      link.origin !== location.origin ||
      href.startsWith("#") ||
      link.hasAttribute("data-submenu")
    ) {
      return;
    }
    const urlObj = new URL(link.href);
    const path = urlObj.pathname;
    if (isNavigableSitePath(path)) {
      const targetUrl = toNavigableUrl(link.href);
      e.preventDefault();
      closeAllMenus();
      loadPageViaAjax(targetUrl, { replaceState: false });
    }
  });
  window.addEventListener("popstate", () => {
    const targetUrl = toNavigableUrl(`${location.pathname}${location.search}`);
    loadPageViaAjax(targetUrl, { replaceState: true });
  });
}
function loadPageViaAjax(url, options = {}) {
  const targetUrl = toNavigableUrl(url);
  const familyTransitionSnapshot = captureFamilyPageTransitionSnapshot(targetUrl);
  return (async () => {
    let htmlText = "";
    let lastError = null;
    for (const candidate of buildPageFetchCandidates(targetUrl)) {
      try {
        const response = await fetch(candidate);
        if (!response.ok) {
          lastError = new Error(`Ajax load: ${response.status}`);
          continue;
        }
        htmlText = await response.text();
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!htmlText) {
      throw lastError || new Error("Ajax load failed");
    }
    return htmlText;
  })()
    .then((htmlText) => {
      const doc = new DOMParser().parseFromString(
        rewritePreviewFragmentHtml(htmlText),
        "text/html",
      );
      const newContent =
        doc.getElementById("content") || doc.querySelector("main");
      if (!newContent) {
        const redirectTarget =
          doc.querySelector('meta[http-equiv="refresh"]')?.getAttribute("content")?.match(/\burl=([^;]+)/i)?.[1] ||
          doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ||
          "";
        if (redirectTarget) {
          window.location.replace(toNavigableUrl(redirectTarget));
          return;
        }
        throw new Error("No content element found in " + targetUrl);
      }
      newContent.id = "content";
      document.getElementById("content").replaceWith(newContent);
      newContent.querySelectorAll("img[src]").forEach((img) => {
        img.src = resolveToAbsolute(img.getAttribute("src"), targetUrl);
      });
      const t = doc.querySelector("title");
      if (t) {
        document.title = t.textContent;
      }
      const hashPart = options.scrollToHash || "";
      const finalUrl = targetUrl + hashPart;
      if (options.replaceState) {
        history.replaceState({}, "", finalUrl);
      } else {
        history.pushState({}, "", finalUrl);
      }
    })
    .then(() => {
      initCollectionLoader(".collection-btn", "#collection-content");
      initSolutionLoader(".solution-btn", "#solution-content");
      initRemoteFragmentLoaders(document);
      initRetailerDirectories(document);
      initDynamicHash();
      initListingFilters(document);
      initSearchPage();
      enhanceFamilyLightboxTargets(document);
    })
    .then(() => {
      document.body.classList.remove("no-scroll");
      document.body.style.top = "";
      const hash = options.scrollToHash || window.location.hash;
      if (hash && hash !== "#") {
        setTimeout(() => scrollToSection(hash), 0);
      } else if (familyTransitionSnapshot) {
        restorePjaxScrollPosition(familyTransitionSnapshot);
        animateFamilyPageTransition(familyTransitionSnapshot);
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    })
    .catch((err) => console.error("[PJAX] error:", err));
}
function updateActiveNavLink() {
  const path = location.pathname.split("/").pop() || "index.html";
  document
    .querySelectorAll(".nav-links a")
    .forEach((a) =>
      a.classList.toggle("active", a.getAttribute("href") === path),
    );
}
let homeSolutionsDataPromise = null;
function loadHomeSolutionsData() {
  if (!homeSolutionsDataPromise) {
    homeSolutionsDataPromise = fetch(resolveSiteUrl("/data/home-solutions.json"))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Home solutions load: ${response.status}`);
        }
        return response.json();
      })
      .catch((error) => {
        homeSolutionsDataPromise = null;
        throw error;
      });
  }
  return homeSolutionsDataPromise;
}
function normalizeHomeSolutionHref(rawHref) {
  return toMenuDirectoryUrl(rawHref || "");
}
function buildHomeSolutionCard(item) {
  const article = document.createElement("article");
  article.className = "variant-card solution-card";
  const link = document.createElement("a");
  link.className = "variant-card__link";
  link.href = resolveSiteUrl(item?.href || "#");
  const figure = document.createElement("figure");
  if (item?.imageUrl) {
    const image = document.createElement("img");
    image.loading = "lazy";
    image.src = resolveSiteUrl(item.imageUrl);
    image.alt = `${item.title || "Solution"} thumbnail`;
    figure.appendChild(image);
  }
  const figcaption = document.createElement("figcaption");
  if (item?.tag) {
    const tag = document.createElement("span");
    tag.className = "solution-card__tag";
    tag.textContent = item.tag;
    figcaption.appendChild(tag);
  }
  const title = document.createElement("span");
  title.className = "variant-name";
  title.textContent = item?.title || "";
  figcaption.appendChild(title);
  if (item?.summary) {
    const summary = document.createElement("small");
    summary.textContent = item.summary;
    figcaption.appendChild(summary);
  }
  figure.appendChild(figcaption);
  link.appendChild(figure);
  article.appendChild(link);
  return article;
}
function buildHomeSolutionSection(section) {
  const container = document.createElement("section");
  container.className = "solution-panel__section";
  const header = document.createElement("div");
  header.className = "solution-panel__section-header";
  const title = document.createElement("h3");
  title.textContent = section?.label || "";
  header.appendChild(title);
  if (section?.description) {
    const description = document.createElement("p");
    description.textContent = section.description;
    header.appendChild(description);
  }
  container.appendChild(header);
  const grid = document.createElement("div");
  grid.className = "category-card-grid";
  grid.dataset.itemCount = String(Array.isArray(section?.items) ? section.items.length : 0);
  for (const item of Array.isArray(section?.items) ? section.items : []) {
    grid.appendChild(buildHomeSolutionCard(item));
  }
  container.appendChild(grid);
  return container;
}
function buildHomeSolutionPanel(solution) {
  const panel = document.createElement("div");
  panel.className = "solution-panel with-texture-2";
  const header = document.createElement("div");
  header.className = "solution-panel__header";
  const intro = document.createElement("div");
  intro.className = "family-summary";
  const description = document.createElement("p");
  description.textContent = solution?.description || "";
  intro.appendChild(description);
  header.appendChild(intro);
  if (solution?.browseHref) {
    const browse = document.createElement("a");
    browse.className = "solution-panel__browse";
    browse.href = resolveSiteUrl(solution.browseHref);
    browse.textContent = `Browse ${solution.label}`;
    header.appendChild(browse);
  }
  panel.appendChild(header);
  for (const section of Array.isArray(solution?.sections) ? solution.sections : []) {
    panel.appendChild(buildHomeSolutionSection(section));
  }
  return panel;
}
function initSolutionLoader(buttonSelector, targetSelector) {
  const buttons = Array.from(document.querySelectorAll(buttonSelector));
  const target = document.querySelector(targetSelector);
  if (!target || !buttons.length) {
    return;
  }
  let currentKey = null;
  let activeBtn = null;
  let pendingScroll = false;
  let scrollFallbackTimeout = null;
  const loadActiveOnInit = target.dataset.loadActiveOnInit === "true";
  const initiallyActiveBtn = buttons.find((btn) => btn.classList.contains("active"));
  if (initiallyActiveBtn && target.innerHTML.trim() && !loadActiveOnInit) {
    activeBtn = initiallyActiveBtn;
    currentKey = String(initiallyActiveBtn.dataset.solutionKey || "").trim();
  }
  function setActiveButton(nextBtn) {
    if (activeBtn && activeBtn !== nextBtn) {
      activeBtn.classList.remove("active");
    }
    if (nextBtn) {
      nextBtn.classList.add("active");
    }
    activeBtn = nextBtn || null;
  }
  function scrollTargetIntoView() {
    pendingScroll = false;
    if (scrollFallbackTimeout) {
      clearTimeout(scrollFallbackTimeout);
      scrollFallbackTimeout = null;
    }
    disableHeaderHideUntilScrollEnd();
    const header = document.querySelector(".header");
    if (header) {
      header.classList.remove("header-hidden");
    }
    const offset = getScrollOffset();
    const scrollTop =
      target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: scrollTop, behavior: "smooth" });
  }
  function scheduleScroll() {
    pendingScroll = true;
    if (scrollFallbackTimeout) {
      clearTimeout(scrollFallbackTimeout);
    }
    scrollFallbackTimeout = setTimeout(() => {
      if (pendingScroll) {
        scrollTargetIntoView();
      }
    }, 450);
  }
  async function loadPanel(key, btn, { animate = true, scroll = true } = {}) {
    const payload = await loadHomeSolutionsData();
    const solution = Array.isArray(payload?.solutions)
      ? payload.solutions.find((entry) => entry?.key === key)
      : null;
    if (!solution) {
      throw new Error(`Unknown home solution: ${key}`);
    }
    const oldH = animate ? target.getBoundingClientRect().height : 0;
    if (animate) {
      target.style.height = `${oldH}px`;
      target.getBoundingClientRect();
    }
    target.setAttribute("aria-busy", "true");
    target.classList.add("is-loading");
    target.replaceChildren(buildHomeSolutionPanel(solution));
    await new Promise(requestAnimationFrame);
    if (animate) {
      target.style.height = "auto";
      const newH = target.scrollHeight;
      target.style.height = `${oldH}px`;
      toggleHeight(newH);
    } else {
      target.style.height = "auto";
    }
    target.classList.remove("is-loading");
    target.removeAttribute("aria-busy");
    currentKey = key;
    setActiveButton(btn);
    if (scroll) {
      scheduleScroll();
    } else {
      pendingScroll = false;
      if (scrollFallbackTimeout) {
        clearTimeout(scrollFallbackTimeout);
        scrollFallbackTimeout = null;
      }
    }
  }
  target.addEventListener("transitionend", (e) => {
    if (e.propertyName === "height" && currentKey) {
      target.style.height = "auto";
      if (pendingScroll) {
        scrollTargetIntoView();
      }
    }
  });
  buttons.forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      const key = String(btn.dataset.solutionKey || "").trim();
      if (!key) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (currentKey === key) {
        const isOpen = target.getBoundingClientRect().height > 0;
        if (isOpen) {
          const startH = target.getBoundingClientRect().height;
          target.style.height = `${startH}px`;
          target.getBoundingClientRect();
          toggleHeight(0);
          currentKey = null;
          btn.classList.remove("active");
          activeBtn = null;
          pendingScroll = false;
          if (scrollFallbackTimeout) {
            clearTimeout(scrollFallbackTimeout);
            scrollFallbackTimeout = null;
          }
        } else {
          toggleHeight(target.scrollHeight);
          currentKey = key;
          btn.classList.add("active");
          activeBtn = btn;
          scheduleScroll();
        }
        return;
      }
      try {
        await loadPanel(key, btn, { animate: true, scroll: true });
      } catch (error) {
        console.error("[SOLUTIONS] Load error:", error);
        window.location.href = resolveSiteUrl(btn.getAttribute("href") || "/");
      }
    }),
  );
  if (initiallyActiveBtn && (loadActiveOnInit || !target.innerHTML.trim())) {
    const key = String(initiallyActiveBtn.dataset.solutionKey || "").trim();
    if (key) {
      loadPanel(key, initiallyActiveBtn, {
        animate: false,
        scroll: false,
      }).catch((err) => console.error("[SOLUTIONS] Initial load failed:", err));
    }
  }
  function toggleHeight(toPx) {
    target.getBoundingClientRect();
    requestAnimationFrame(() => (target.style.height = `${toPx}px`));
  }
}
function initCollectionLoader(buttonSelector, targetSelector) {
  const buttons = Array.from(document.querySelectorAll(buttonSelector));
  const target = document.querySelector(targetSelector);
  if (!target || !buttons.length) {
    return;
  }
  let currentURL = null;
  let activeBtn = null;
  let pendingScroll = false;
  let scrollFallbackTimeout = null;
  const htmlCache = new Map();
  const loadActiveOnInit = target.dataset.loadActiveOnInit === "true";
  const initiallyActiveBtn = buttons.find((btn) =>
    btn.classList.contains("active"),
  );
  if (initiallyActiveBtn && target.innerHTML.trim() && !loadActiveOnInit) {
    activeBtn = initiallyActiveBtn;
    currentURL = resolveSiteUrl(initiallyActiveBtn.href);
  }
  function setActiveButton(nextBtn) {
    if (activeBtn && activeBtn !== nextBtn) {
      activeBtn.classList.remove("active");
    }
    if (nextBtn) {
      nextBtn.classList.add("active");
    }
    activeBtn = nextBtn || null;
  }
  function scrollTargetIntoView() {
    pendingScroll = false;
    if (scrollFallbackTimeout) {
      clearTimeout(scrollFallbackTimeout);
      scrollFallbackTimeout = null;
    }
    disableHeaderHideUntilScrollEnd();
    const header = document.querySelector(".header");
    if (header) {
      header.classList.remove("header-hidden");
    }
    const offset = getScrollOffset();
    const scrollTop =
      target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: scrollTop, behavior: "smooth" });
  }
  function scheduleScroll() {
    pendingScroll = true;
    if (scrollFallbackTimeout) {
      clearTimeout(scrollFallbackTimeout);
    }
    scrollFallbackTimeout = setTimeout(() => {
      if (pendingScroll) {
        scrollTargetIntoView();
      }
    }, 450);
  }
  function buildFetchCandidates(rawUrl) {
    const candidates = [];
    const pushCandidate = (value) => {
      const normalized = String(value || "").trim();
      if (!normalized || candidates.includes(normalized)) {
        return;
      }
      candidates.push(normalized);
    };
    pushCandidate(rawUrl);
    try {
      const url = new URL(rawUrl, window.location.href);
      const hasExtension = /\.[a-z0-9]+$/i.test(url.pathname);
      if (!hasExtension) {
        if (url.pathname.endsWith("/")) {
          const clone = new URL(url.toString());
          clone.pathname = `${clone.pathname}index.html`;
          pushCandidate(clone.toString());
        } else {
          const htmlClone = new URL(url.toString());
          htmlClone.pathname = `${htmlClone.pathname}.html`;
          pushCandidate(htmlClone.toString());
          const dirClone = new URL(url.toString());
          dirClone.pathname = `${dirClone.pathname}/index.html`;
          pushCandidate(dirClone.toString());
        }
      }
    } catch (_) {
      // Ignore malformed URLs and keep the raw candidate only.
    }
    return candidates;
  }
  async function fetchPanelHtml(url) {
    if (!htmlCache.has(url)) {
      htmlCache.set(
        url,
        (async () => {
          try {
            let htmlText = "";
            let loaded = false;
            let lastError = null;
            for (const candidate of buildFetchCandidates(url)) {
              try {
                const res = await fetch(candidate);
                if (!res.ok) {
                  lastError = new Error(res.statusText || `HTTP ${res.status}`);
                  continue;
                }
                htmlText = await res.text();
                loaded = true;
                break;
              } catch (error) {
                lastError = error;
              }
            }
            if (!loaded) {
              throw lastError || new Error("Panel fetch failed");
            }
            const doc = new DOMParser().parseFromString(
              rewritePreviewFragmentHtml(htmlText),
              "text/html",
            );
            const main = doc.querySelector("main");
            return main ? main.innerHTML : "<p>Error: no <main> found</p>";
          } catch (err) {
            htmlCache.delete(url);
            console.error("[COLLECTION] Fetch error:", err);
            return "<p>Sorry, could not load content.</p>";
          }
        })(),
      );
    }
    return await htmlCache.get(url);
  }
  async function loadPanel(url, btn, { animate = true, scroll = true } = {}) {
    const oldH = animate ? target.getBoundingClientRect().height : 0;
    if (animate) {
      target.style.height = `${oldH}px`;
      target.getBoundingClientRect();
    }
    target.setAttribute("aria-busy", "true");
    target.classList.add("is-loading");
    target.innerHTML = await fetchPanelHtml(url);
    await new Promise(requestAnimationFrame);
    if (animate) {
      target.style.height = "auto";
      const newH = target.scrollHeight;
      target.style.height = `${oldH}px`;
      toggleHeight(newH);
    } else {
      target.style.height = "auto";
    }
    target.classList.remove("is-loading");
    target.removeAttribute("aria-busy");
    currentURL = url;
    setActiveButton(btn);
    initListingFilters(target, { sourceUrl: url });
    if (scroll) {
      scheduleScroll();
    } else {
      pendingScroll = false;
      if (scrollFallbackTimeout) {
        clearTimeout(scrollFallbackTimeout);
        scrollFallbackTimeout = null;
      }
    }
  }
  target.addEventListener("transitionend", (e) => {
    if (e.propertyName === "height" && currentURL) {
      target.style.height = "auto";
      if (pendingScroll) {
        scrollTargetIntoView();
      }
    }
  });
  buttons.forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const url = resolveSiteUrl(btn.href);
      if (currentURL === url) {
        const isOpen = target.getBoundingClientRect().height > 0;
        if (isOpen) {
          const startH = target.getBoundingClientRect().height;
          target.style.height = `${startH}px`;
          target.getBoundingClientRect();
          toggleHeight(0);
          currentURL = null;
          btn.classList.remove("active");
          activeBtn = null;
          pendingScroll = false;
          if (scrollFallbackTimeout) {
            clearTimeout(scrollFallbackTimeout);
            scrollFallbackTimeout = null;
          }
        } else {
          toggleHeight(target.scrollHeight);
          currentURL = url;
          btn.classList.add("active");
          activeBtn = btn;
          scheduleScroll();
        }
          return;
        }
      await loadPanel(url, btn, { animate: true, scroll: true });
    }),
  );
  if (initiallyActiveBtn && (loadActiveOnInit || !target.innerHTML.trim())) {
    loadPanel(resolveSiteUrl(initiallyActiveBtn.href), initiallyActiveBtn, {
      animate: false,
      scroll: false,
    }).catch((err) => console.error("[COLLECTION] Initial load failed:", err));
  }
  function toggleHeight(toPx) {
    target.getBoundingClientRect();
    requestAnimationFrame(() => (target.style.height = `${toPx}px`));
  }
}
const remoteFragmentCache = new Map();
async function fetchRemoteFragmentMarkup(url, selector) {
  const resolvedUrl = resolveSiteUrl(url);
  const cacheKey = `${resolvedUrl}::${selector}`;
  if (!remoteFragmentCache.has(cacheKey)) {
    remoteFragmentCache.set(
      cacheKey,
      (async () => {
        let htmlText = "";
        let lastError = null;
        for (const candidate of buildPageFetchCandidates(resolvedUrl)) {
          try {
            const response = await fetch(candidate);
            if (!response.ok) {
              lastError = new Error(`Remote fragment load failed: ${response.status}`);
              continue;
            }
            htmlText = await response.text();
            break;
          } catch (error) {
            lastError = error;
          }
        }
        if (!htmlText) {
          throw lastError || new Error("Remote fragment load failed");
        }
        const doc = new DOMParser().parseFromString(
          rewritePreviewFragmentHtml(htmlText),
          "text/html",
        );
        const fragment = selector ? doc.querySelector(selector) : doc.querySelector("main");
        if (!fragment) {
          throw new Error(`Remote fragment selector not found: ${selector}`);
        }
        return selector ? fragment.outerHTML : fragment.innerHTML;
      })(),
    );
  }
  try {
    return await remoteFragmentCache.get(cacheKey);
  } catch (error) {
    remoteFragmentCache.delete(cacheKey);
    throw error;
  }
}
async function loadRemoteFragmentIntoTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const url = String(target.dataset.remoteFragmentUrl || "").trim();
  const selector = String(target.dataset.remoteFragmentSelector || "").trim() || "main";
  if (!url) {
    return;
  }
  const oldHeight = target.getBoundingClientRect().height;
  if (oldHeight > 0) {
    target.style.height = `${oldHeight}px`;
    target.getBoundingClientRect();
  }
  target.setAttribute("aria-busy", "true");
  target.classList.add("is-loading");
  try {
    target.innerHTML = await fetchRemoteFragmentMarkup(url, selector);
    await new Promise(requestAnimationFrame);
    const nextHeight = target.scrollHeight;
    if (oldHeight > 0) {
      target.style.height = `${oldHeight}px`;
      requestAnimationFrame(() => {
        target.style.height = `${nextHeight}px`;
      });
      const onTransitionEnd = (event) => {
        if (event.propertyName !== "height") {
          return;
        }
        target.style.height = "auto";
        target.removeEventListener("transitionend", onTransitionEnd);
      };
      target.addEventListener("transitionend", onTransitionEnd);
    } else {
      target.style.height = "auto";
    }
    initRetailerDirectories(target);
  } catch (error) {
    console.error("[REMOTE_FRAGMENT] Load error:", error);
    target.innerHTML =
      '<p class="remote-fragment-error">Sorry, the retailer directory could not be loaded right now.</p>';
    target.style.height = "auto";
  } finally {
    target.classList.remove("is-loading");
    target.removeAttribute("aria-busy");
  }
}
function initRemoteFragmentLoaders(root = document) {
  root.querySelectorAll("[data-remote-fragment-url]").forEach((target) => {
    if (!(target instanceof HTMLElement) || target.dataset.remoteFragmentBound === "true") {
      return;
    }
    target.dataset.remoteFragmentBound = "true";
    const shouldLoad = target.dataset.loadOnInit !== "false";
    if (shouldLoad) {
      loadRemoteFragmentIntoTarget(target).catch((error) => {
        console.error("[REMOTE_FRAGMENT] Initial load failed:", error);
      });
    }
  });
}
let maplibreAssetPromise = null;
const MAPLIBRE_VERSION = "5.23.0";
const MAPLIBRE_CSS_PATH = "/assets/vendor/maplibre-retailer.css";
const RETAILER_MAP_STYLE_PATH = "/data/maps/retailer-map-style.json";
function ensureMapLibreAssets() {
  if (window.maplibregl) {
    return Promise.resolve(window.maplibregl);
  }
  if (!maplibreAssetPromise) {
    maplibreAssetPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-retailer-maplibre-css="true"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = resolveSiteUrl(MAPLIBRE_CSS_PATH);
        link.setAttribute("data-retailer-maplibre-css", "true");
        document.head.appendChild(link);
      }
      const existingScript = document.querySelector('script[data-retailer-maplibre-script="true"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.maplibregl), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("MapLibre load failed")), {
          once: true
        });
        return;
      }
      const script = document.createElement("script");
      script.src = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
      script.defer = true;
      script.setAttribute("data-retailer-maplibre-script", "true");
      script.addEventListener("load", () => resolve(window.maplibregl), { once: true });
      script.addEventListener("error", () => reject(new Error("MapLibre load failed")), {
        once: true
      });
      document.head.appendChild(script);
    }).catch((error) => {
      maplibreAssetPromise = null;
      throw error;
    });
  }
  return maplibreAssetPromise;
}
function parseRetailerNumber(value) {
  const number = Number(String(value || "").trim());
  return Number.isFinite(number) ? number : null;
}
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}
function focusRetailerCard(item, { openPopup = false } = {}) {
  if (!item?.element) {
    return;
  }
  item.element.classList.add("is-highlighted");
  window.setTimeout(() => {
    item.element.classList.remove("is-highlighted");
  }, 1600);
  item.element.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (openPopup && item.marker?.togglePopup) {
    const popup = item.marker.getPopup?.();
    if (popup && !popup.isOpen()) {
      item.marker.togglePopup();
    }
  }
}
function buildRetailerPopupHtml(item) {
  const routeUrl = item.routeUrl
    ? `<a href="${item.routeUrl}" target="_blank" rel="noopener">Route</a>`
    : "";
  const detailUrl = item.detailUrl
    ? `<a href="${item.detailUrl}" target="_blank" rel="noopener">Masku details</a>`
    : "";
  const actions = [routeUrl, detailUrl].filter(Boolean).join(" · ");
  return `<div class="retailer-map-popup">
    <strong>${item.name}</strong>
    <div>${item.address}</div>
    ${actions ? `<div>${actions}</div>` : ""}
  </div>`;
}
function normalizeRetailerAddressQuery(query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) {
    return "";
  }
  if (/\b(finland|suomi)\b/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}, Finland`;
}
async function geocodeRetailerAddress(query) {
  const normalizedQuery = normalizeRetailerAddressQuery(query);
  if (!normalizedQuery) {
    return null;
  }
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", normalizedQuery);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "fi");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("dedupe", "1");
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Nominatim search failed (${response.status})`);
  }
  const results = await response.json();
  const match = Array.isArray(results) ? results[0] : null;
  const lat = Number.parseFloat(match?.lat);
  const lng = Number.parseFloat(match?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return {
    lat,
    lng,
    label: String(match.display_name || normalizedQuery).trim()
  };
}
function collectRetailerDirectoryTargetIds(directory) {
  const ids = new Set();
  let current = directory instanceof Element ? directory : null;
  while (current instanceof Element) {
    const id = String(current.id || "").trim();
    if (id) {
      ids.add(id);
    }
    current = current.parentElement;
  }
  return ids;
}
function shouldEagerLoadRetailerMap(directory) {
  const hashTarget = String(window.location.hash || "").replace(/^#/, "").trim();
  if (!hashTarget) {
    return false;
  }
  return collectRetailerDirectoryTargetIds(directory).has(hashTarget);
}
function collectRetailerItems(directory) {
  return Array.from(directory.querySelectorAll("[data-retailer-card]")).map((element, index) => ({
    element,
    index,
    slug: String(element.dataset.retailerSlug || "").trim(),
    name: String(element.dataset.retailerName || "").trim(),
    city: String(element.dataset.retailerCity || "").trim(),
    kind: String(element.dataset.retailerKind || "").trim(),
    searchText: String(element.dataset.searchText || "").trim().toLowerCase(),
    lat: parseRetailerNumber(element.dataset.lat),
    lng: parseRetailerNumber(element.dataset.lng),
    address: Array.from(element.querySelectorAll(".retailer-card__address"))
      .map((node) => String(node.textContent || "").trim())
      .filter(Boolean)
      .join(", "),
    routeUrl: element.querySelector('a[href*="google.com/maps/search"]')?.href || "",
    detailUrl:
      element.querySelector('.retailer-card__action--strong')?.href ||
      element.querySelector('a[target="_blank"]')?.href ||
      "",
    distanceElement: element.querySelector("[data-retailer-distance]"),
    marker: null
  }));
}
function initRetailerDirectory(directory) {
  if (!(directory instanceof HTMLElement) || directory.dataset.retailerDirectoryBound === "true") {
    return;
  }
  directory.dataset.retailerDirectoryBound = "true";
  const isHomeRetailerEmbed = Boolean(directory.closest("#retailers"));
  const retailerSelect = directory.querySelector("[data-retailer-select]");
  const addressInput = directory.querySelector("[data-retailer-address-input]");
  const addressSearchButton = directory.querySelector("[data-retailer-address-search]");
  const geolocateButton = directory.querySelector("[data-retailer-geolocate]");
  const summary = directory.querySelector("[data-retailer-summary]");
  const feedback = directory.querySelector("[data-retailer-feedback]");
  const results = directory.querySelector("[data-retailer-results]");
  const mapElement = directory.querySelector("[data-retailer-map]");
  const layout = directory.querySelector(".retailer-directory__layout");
  const controls = directory.querySelector(".retailer-directory__controls");
  const items = collectRetailerItems(directory);
  const state = {
    selectedSlug: "",
    items,
    map: null,
    mapReady: false,
    selectedPopup: null,
    selectedMarker: null,
    userMarker: null,
    userLocation: null,
    geolocating: false,
    addressSearching: false
  };
  let mapInitRequested = false;
  let mapObserver = null;
  let retailerLayoutSyncFrame = 0;
  state.selectedSlug = isHomeRetailerEmbed
    ? ""
    : String(retailerSelect?.value || items[0]?.slug || "").trim();
  const geolocateDefaultLabel = String(geolocateButton?.textContent || "Show nearest").trim();
  const addressSearchDefaultLabel = String(addressSearchButton?.textContent || "Find nearest").trim();
  function ensureRetailerPlaceholderOption() {
    if (!isHomeRetailerEmbed || !(retailerSelect instanceof HTMLSelectElement)) {
      return;
    }
    if (retailerSelect.querySelector('option[data-retailer-placeholder="true"]')) {
      retailerSelect.value = "";
      return;
    }
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select retailer";
    placeholder.disabled = false;
    placeholder.selected = true;
    placeholder.setAttribute("data-retailer-placeholder", "true");
    retailerSelect.insertBefore(placeholder, retailerSelect.firstChild);
    retailerSelect.value = "";
  }
  function syncRetailerEmbedLayoutHeight({ animate = false } = {}) {
    if (!isHomeRetailerEmbed || !(layout instanceof HTMLElement)) {
      return;
    }
    if (!directory.classList.contains("is-active")) {
      layout.style.height = "0px";
      return;
    }
    const currentHeight = layout.getBoundingClientRect().height;
    layout.style.height = "auto";
    const nextHeight = layout.scrollHeight;
    if (!animate || !Number.isFinite(currentHeight) || currentHeight <= 0) {
      layout.style.height = "auto";
      return;
    }
    if (Math.abs(nextHeight - currentHeight) < 1) {
      layout.style.height = "auto";
      return;
    }
    layout.style.height = `${currentHeight}px`;
    layout.getBoundingClientRect();
    requestAnimationFrame(() => {
      if (!directory.classList.contains("is-active")) {
        layout.style.height = "0px";
        return;
      }
      layout.style.height = `${nextHeight}px`;
    });
  }
  function requestRetailerEmbedLayoutHeightSync(options = {}) {
    if (!isHomeRetailerEmbed || !(layout instanceof HTMLElement)) {
      return;
    }
    if (retailerLayoutSyncFrame) {
      window.cancelAnimationFrame(retailerLayoutSyncFrame);
    }
    retailerLayoutSyncFrame = window.requestAnimationFrame(() => {
      retailerLayoutSyncFrame = 0;
      syncRetailerEmbedLayoutHeight(options);
    });
  }
  function setRetailerLayoutExpanded(isExpanded, { animate = true } = {}) {
    if (!isHomeRetailerEmbed || !(layout instanceof HTMLElement)) {
      return;
    }
    directory.classList.toggle("retailer-directory--home-embed", true);
    directory.classList.toggle("is-inactive", !isExpanded);
    directory.classList.toggle("is-active", isExpanded);
    layout.toggleAttribute("inert", !isExpanded);
    if (!animate) {
      layout.style.height = isExpanded ? "auto" : "0px";
      return;
    }
    if (isExpanded) {
      requestRetailerEmbedLayoutHeightSync({ animate: true });
      return;
    }
    const startHeight = layout.getBoundingClientRect().height || layout.scrollHeight;
    layout.style.height = `${startHeight}px`;
    layout.getBoundingClientRect();
    requestAnimationFrame(() => {
      layout.style.height = "0px";
    });
  }
  function syncHomeRetailerActivation(isActivated, options = {}) {
    if (!isHomeRetailerEmbed) {
      return;
    }
    setRetailerLayoutExpanded(isActivated, options);
    if (isActivated) {
      initRetailerMap();
    }
  }
  function clearRetailerSelectionState() {
    state.items.forEach((item) => {
      item.element.hidden = true;
      if (item.distanceElement) {
        item.distanceElement.hidden = true;
        item.distanceElement.textContent = "";
      }
    });
  }
  function disableRetailerMapAutoFocus() {
    const canvas = state.map?.getCanvas?.();
    if (canvas instanceof HTMLElement) {
      canvas.tabIndex = -1;
    }
  }
  function setFeedback(message = "") {
    if (feedback) {
      feedback.textContent = message;
    }
  }
  function setGeolocateBusy(isBusy) {
    state.geolocating = isBusy;
    if (geolocateButton) {
      geolocateButton.disabled = isBusy;
      geolocateButton.textContent = isBusy ? "Locating…" : geolocateDefaultLabel;
    }
  }
  function setAddressSearchBusy(isBusy) {
    state.addressSearching = isBusy;
    if (addressSearchButton) {
      addressSearchButton.disabled = isBusy;
      addressSearchButton.textContent = isBusy ? "Searching…" : addressSearchDefaultLabel;
    }
  }
  function findSelectedItem() {
    if (!state.selectedSlug) {
      return isHomeRetailerEmbed ? null : state.items[0] || null;
    }
    return state.items.find((item) => item.slug === state.selectedSlug) || null;
  }
  function findNearestItem() {
    if (!state.userLocation) {
      return null;
    }
    return state.items.reduce((closest, item) => {
      if (item.lat == null || item.lng == null) {
        return closest;
      }
      const distance = haversineDistanceKm(
        state.userLocation.lat,
        state.userLocation.lng,
        item.lat,
        item.lng,
      );
      if (!closest || distance < closest.distance) {
        return { item, distance };
      }
      return closest;
    }, null)?.item || null;
  }
  function createRetailerMarkerElement() {
    const markerElement = document.createElement("button");
    markerElement.type = "button";
    markerElement.className = "retailer-map-marker";
    markerElement.setAttribute("aria-label", "Retailer location");
    markerElement.innerHTML = `<svg class="retailer-map-marker__svg" viewBox="0 0 28 36" aria-hidden="true">
      <path
        class="retailer-map-marker__drop"
        d="M14 1.5C7.37 1.5 2 6.87 2 13.5c0 8.13 8.24 16.83 11.09 19.61a1.31 1.31 0 0 0 1.82 0C17.76 30.33 26 21.63 26 13.5 26 6.87 20.63 1.5 14 1.5Z"
      />
      <circle class="retailer-map-marker__core" cx="14" cy="13.5" r="4.35" />
    </svg>`;
    return markerElement;
  }
  function createUserLocationMarkerElement() {
    const markerElement = document.createElement("span");
    markerElement.className = "retailer-user-marker";
    markerElement.setAttribute("aria-hidden", "true");
    return markerElement;
  }
  function renderMap(selectedItem) {
    if (!state.map || !state.mapReady) {
      return;
    }
    const maplibre = window.maplibregl;
    const bounds = [];
    state.selectedPopup?.remove();
    state.selectedPopup = null;
    state.selectedMarker?.remove();
    state.selectedMarker = null;
    state.userMarker?.remove();
    state.userMarker = null;
    state.items.forEach((item) => {
      item.marker = null;
    });
    if (selectedItem?.lat != null && selectedItem?.lng != null) {
      const popup = new maplibre.Popup({
        offset: 38,
        closeButton: true,
        maxWidth: "19rem"
      }).setHTML(buildRetailerPopupHtml(selectedItem));
      const marker = new maplibre.Marker({
        element: createRetailerMarkerElement(),
        anchor: "bottom"
      })
        .setLngLat([selectedItem.lng, selectedItem.lat])
        .setPopup(popup)
        .addTo(state.map);
      marker.getElement().addEventListener("click", () => focusRetailerCard(selectedItem));
      state.selectedMarker = marker;
      state.selectedPopup = popup;
      selectedItem.marker = marker;
      bounds.push([selectedItem.lng, selectedItem.lat]);
    }
    if (state.userLocation) {
      state.userMarker = new maplibre.Marker({
        element: createUserLocationMarkerElement(),
        anchor: "center"
      });
      state.userMarker
        .setLngLat([state.userLocation.lng, state.userLocation.lat])
        .setPopup(new maplibre.Popup({ offset: 16, maxWidth: "12rem" }).setText("Your location"))
        .addTo(state.map);
      bounds.push([state.userLocation.lng, state.userLocation.lat]);
    }
    if (bounds.length) {
      const fitBounds = bounds.reduce(
        (accumulator, [lng, lat]) => accumulator.extend([lng, lat]),
        new maplibre.LngLatBounds(bounds[0], bounds[0])
      );
      state.map.fitBounds(fitBounds, {
        padding: 28,
        maxZoom: 12,
        duration: 650
      });
      if (selectedItem?.marker && !state.userLocation) {
        window.setTimeout(() => {
          const popup = selectedItem.marker?.getPopup?.();
          if (popup && !popup.isOpen()) {
            selectedItem.marker?.togglePopup?.();
          }
        }, 120);
      }
    } else {
      state.map.easeTo({
        center: [26, 64.5],
        zoom: 5,
        duration: 500
      });
    }
    window.setTimeout(() => {
      state.map?.resize?.();
    }, 120);
  }
  function render() {
    const selectedItem = findSelectedItem();
    if (!selectedItem) {
      clearRetailerSelectionState();
      if (summary) {
        summary.textContent = isHomeRetailerEmbed
          ? "Select a retailer or find the nearest location to open the map and details."
          : "No retailer locations are available right now.";
      }
      if (!state.geolocating && !state.addressSearching && !feedback?.textContent) {
        setFeedback("");
      }
      requestRetailerEmbedLayoutHeightSync({ animate: false });
      return;
    }
    state.selectedSlug = selectedItem.slug;
    if (retailerSelect && retailerSelect.value !== selectedItem.slug) {
      retailerSelect.value = selectedItem.slug;
    }
    if (results) {
      const fragment = document.createDocumentFragment();
      fragment.appendChild(selectedItem.element);
      state.items.forEach((item) => {
        const isSelected = item === selectedItem;
        item.element.hidden = !isSelected;
        if (item.distanceElement) {
          if (
            isSelected &&
            state.userLocation &&
            item.lat != null &&
            item.lng != null
          ) {
            const distanceKm = haversineDistanceKm(
              state.userLocation.lat,
              state.userLocation.lng,
              item.lat,
              item.lng,
            );
            item.distanceElement.hidden = false;
            item.distanceElement.textContent = `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km away`;
          } else {
            item.distanceElement.hidden = true;
            item.distanceElement.textContent = "";
          }
        }
        if (!isSelected) {
          fragment.appendChild(item.element);
        }
      });
      results.replaceChildren(fragment);
    }
    if (summary) {
      summary.textContent = `Showing ${selectedItem.name}`;
    }
    if (!state.geolocating && !feedback?.textContent) {
      setFeedback("");
    }
    renderMap(selectedItem);
    requestRetailerEmbedLayoutHeightSync({ animate: true });
  }
  function initRetailerMap() {
    if (!(mapElement instanceof HTMLElement) || state.map || mapInitRequested) {
      return;
    }
    mapInitRequested = true;
    mapElement.classList.add("is-loading");
    mapElement.classList.remove("is-ready", "retailer-directory__map--fallback");
    ensureMapLibreAssets()
      .then((maplibre) => {
        if (!mapElement.isConnected || state.map) {
          return;
        }
        state.map = new maplibre.Map({
          container: mapElement,
          style: resolveSiteUrl(RETAILER_MAP_STYLE_PATH),
          center: [26, 64.5],
          zoom: 5,
          scrollZoom: false,
          keyboard: false,
          cooperativeGestures: true,
          attributionControl: false
        });
        disableRetailerMapAutoFocus();
        state.map.addControl(
          new maplibre.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: false
          }),
          "top-left"
        );
        state.map.on("load", () => {
          state.mapReady = true;
          render();
          disableRetailerMapAutoFocus();
          requestRetailerEmbedLayoutHeightSync({ animate: false });
          window.requestAnimationFrame(() => {
            mapElement.classList.remove("is-loading");
            mapElement.classList.add("is-ready");
          });
        });
        state.map.on("error", (event) => {
          const message = String(event?.error?.message || "");
          if (!message) {
            return;
          }
          console.warn("[RETAILERS] MapLibre map error:", event.error);
        });
      })
      .catch((error) => {
        console.warn("[RETAILERS] MapLibre load failed:", error);
        mapElement.classList.remove("is-loading", "is-ready");
        mapElement.classList.add("retailer-directory__map--fallback");
        mapElement.textContent = "Map view is temporarily unavailable.";
      });
  }
  function scheduleRetailerMapInit() {
    if (!(mapElement instanceof HTMLElement) || state.map || mapInitRequested) {
      return;
    }
    if (shouldEagerLoadRetailerMap(directory) || !("IntersectionObserver" in window)) {
      initRetailerMap();
      return;
    }
    const observeTarget =
      directory.closest("#retailers") ||
      directory.closest("section") ||
      mapElement;
    mapObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
          return;
        }
        mapObserver?.disconnect();
        mapObserver = null;
        initRetailerMap();
      },
      {
        rootMargin: window.matchMedia("(max-width: 768px)").matches
          ? "480px 0px"
          : "900px 0px",
        threshold: 0.01
      }
    );
    mapObserver.observe(observeTarget);
  }
  if (layout instanceof HTMLElement && isHomeRetailerEmbed) {
    layout.addEventListener("transitionend", (event) => {
      if (event.propertyName !== "height") {
        return;
      }
      layout.style.height = directory.classList.contains("is-active") ? "auto" : "0px";
      if (directory.classList.contains("is-active")) {
        state.map?.resize?.();
        requestRetailerEmbedLayoutHeightSync({ animate: false });
      }
    });
  }
  if (isHomeRetailerEmbed && "ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(() => {
      requestRetailerEmbedLayoutHeightSync({ animate: false });
    });
    [controls, results, mapElement].forEach((target) => {
      if (target instanceof HTMLElement) {
        resizeObserver.observe(target);
      }
    });
  }
  ensureRetailerPlaceholderOption();
  if (isHomeRetailerEmbed) {
    setRetailerLayoutExpanded(false, { animate: false });
  } else {
    scheduleRetailerMapInit();
  }
  retailerSelect?.addEventListener("change", () => {
    state.selectedSlug = String(retailerSelect.value || "").trim();
    setFeedback("");
    syncHomeRetailerActivation(Boolean(state.selectedSlug), { animate: true });
    render();
  });
  async function handleAddressSearch() {
    const query = String(addressInput?.value || "").trim();
    if (!query) {
      setFeedback("Enter an address or postcode to find the nearest retailer.");
      addressInput?.focus();
      return;
    }
    if (state.addressSearching || state.geolocating) {
      return;
    }
    setAddressSearchBusy(true);
    setFeedback("Searching for that address…");
    try {
      const location = await geocodeRetailerAddress(query);
      if (!location) {
        setFeedback("That address could not be matched in Finland.");
        return;
      }
      state.userLocation = {
        lat: location.lat,
        lng: location.lng
      };
      const nearestItem = findNearestItem();
      if (nearestItem) {
        state.selectedSlug = nearestItem.slug;
        if (retailerSelect) {
          retailerSelect.value = nearestItem.slug;
        }
        syncHomeRetailerActivation(true, { animate: true });
        setFeedback(`Showing the nearest location to ${query}: ${nearestItem.name}.`);
      } else {
        setFeedback("The address was found, but no mapped retailer could be matched.");
      }
      render();
    } catch (error) {
      console.warn("[RETAILERS] Address lookup failed:", error);
      setFeedback("Address lookup is temporarily unavailable. You can still choose a retailer manually.");
    } finally {
      setAddressSearchBusy(false);
    }
  }
  addressSearchButton?.addEventListener("click", () => {
    handleAddressSearch();
  });
  addressInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    handleAddressSearch();
  });
  geolocateButton?.addEventListener("click", () => {
    if (!navigator.geolocation || state.geolocating) {
      if (!navigator.geolocation) {
        setFeedback("Geolocation is not available in this browser.");
      }
      return;
    }
    setGeolocateBusy(true);
    setFeedback("Looking up your location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        const nearestItem = findNearestItem();
        if (nearestItem) {
          state.selectedSlug = nearestItem.slug;
          if (retailerSelect) {
            retailerSelect.value = nearestItem.slug;
          }
          syncHomeRetailerActivation(true, { animate: true });
          setFeedback(`Showing the nearest location: ${nearestItem.name}.`);
        } else {
          setFeedback("Your location was found, but no mapped retailer could be matched.");
        }
        setGeolocateBusy(false);
        render();
      },
      () => {
        setGeolocateBusy(false);
        setFeedback("Location access was unavailable. You can still choose a retailer manually.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 300_000
      },
    );
  });
  results?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-retailer-card]");
    if (!card || event.target.closest("a,button,summary")) {
      return;
    }
    const item = state.items.find((entry) => entry.element === card);
    if (!item) {
      return;
    }
    focusRetailerCard(item, { openPopup: true });
    if (state.map && item.lat != null && item.lng != null) {
      state.map.panTo([item.lng, item.lat], { animate: true });
    }
  });
  results?.addEventListener(
    "toggle",
    (event) => {
      if (!(event.target instanceof HTMLDetailsElement)) {
        return;
      }
      requestRetailerEmbedLayoutHeightSync({ animate: true });
    },
    true,
  );
  render();
}
function initRetailerDirectories(root = document) {
  root.querySelectorAll("[data-retailer-directory]").forEach((directory) => {
    initRetailerDirectory(directory);
  });
}
function normalizeListingComparableHref(value) {
  const href = String(value || "").split("#")[0].split("?")[0].trim();
  if (!href) {
    return "";
  }
  try {
    const url = new URL(resolveSiteUrl(href), window.location.href);
    const pathname = url.pathname
      .replace(/\/index\.html$/i, "/")
      .replace(/\.html$/i, "")
      .replace(/\/+$/, "");
    return pathname || "/";
  } catch (_) {
    return href
      .replace(/\/index\.html$/i, "/")
      .replace(/\.html$/i, "")
      .replace(/\/+$/, "") || "/";
  }
}
function resolveListingItemsUrl(rawUrl) {
  try {
    const url = new URL(resolveSiteUrl(rawUrl || window.location.href), window.location.href);
    if (/\/index\.html$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/index\.html$/i, "/items.json");
    } else if (/\.html$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\.html$/i, ".items.json");
    } else if (url.pathname.endsWith("/")) {
      url.pathname = `${url.pathname}items.json`;
    } else {
      url.pathname = `${url.pathname}/items.json`;
    }
    return url.toString();
  } catch (_) {
    return "";
  }
}
function getListingCardLink(card) {
  if (!(card instanceof HTMLElement)) {
    return null;
  }
  if (card.matches("a[href]")) {
    return card;
  }
  return card.querySelector("a[href]");
}
function findListingContext(root = document) {
  const resolveWithin = (selector) => {
    if (root instanceof Element && root.matches(selector)) {
      return root;
    }
    return root.querySelector(selector);
  };
  const familyGrid = resolveWithin(".family-product-page .family-variant-card-grid");
  if (familyGrid) {
    return {
      kind: "family-variants",
      container: familyGrid,
      cards: Array.from(familyGrid.querySelectorAll(":scope > .family-variant-card")),
      host: familyGrid.closest(".family-product-block") || familyGrid.parentElement,
    };
  }
  const productFamilyGrid = resolveWithin(".product-family-page .product-family-grid");
  if (productFamilyGrid) {
    return {
      kind: "product-families",
      container: productFamilyGrid,
      cards: Array.from(productFamilyGrid.querySelectorAll(":scope > .product-family-card")),
      host: productFamilyGrid.closest(".family-product-block") || productFamilyGrid.parentElement,
    };
  }
  const categoryList = resolveWithin("#category-list");
  if (categoryList) {
    return {
      kind: categoryList.classList.contains("product-root-list") ? "product-root" : "category-list",
      container: categoryList,
      cards: Array.from(categoryList.querySelectorAll(".variant-card")),
      host:
        categoryList.querySelector(":scope > .family-summary") ||
        categoryList.querySelector(":scope > h1") ||
        categoryList,
    };
  }
  return null;
}
function buildListingFacetSections(rows) {
  const sectionMap = new Map();
  const ensureSection = (id, label, order, kind, subtitle = "") => {
    if (!sectionMap.has(id)) {
      sectionMap.set(id, {
        id,
        label,
        order,
        kind,
        subtitle,
        options: new Map(),
      });
    }
    return sectionMap.get(id);
  };
  const register = (sectionId, sectionLabel, optionId, optionLabel, row, order, kind, subtitle = "") => {
    const section = ensureSection(sectionId, sectionLabel, order, kind, subtitle);
    if (!section.options.has(optionId)) {
      section.options.set(optionId, {
        id: optionId,
        label: optionLabel,
        rows: new Set(),
      });
    }
    section.options.get(optionId).rows.add(row);
    if (!row.facets.has(sectionId)) {
      row.facets.set(sectionId, new Set());
    }
    row.facets.get(sectionId).add(optionId);
  };
  rows.forEach((row) => {
    const filterData = row.item?.filterData || {};
    (filterData.collections || []).forEach((entry) => register("collections", "Collections", entry.key, entry.label, row, 10, "flat"));
    (filterData.categories || []).forEach((entry) => register("categories", "Product types", entry.key, entry.label, row, 20, "flat"));
    (filterData.productFamilies || []).forEach((entry) => register("families", "Families", entry.key, entry.label, row, 30, "flat"));
    (filterData.colors || []).forEach((entry) => register("colors", "Colors", entry.key, entry.label, row, 40, "flat"));
    (filterData.specifications || []).forEach((entry) => register(
      `specifications:${entry.groupKey}`,
      entry.groupLabel || "Specifications",
      entry.key,
      entry.label,
      row,
      60,
      "grouped",
      "Specifications",
    ));
    (filterData.attributes || []).forEach((entry) => register(
      `attributes:${entry.groupKey}:${entry.key}`,
      entry.label,
      entry.valueKey,
      entry.valueLabel,
      row,
      70,
      "grouped",
      entry.groupLabel || "Attributes",
    ));
  });
  return Array.from(sectionMap.values())
    .map((section) => ({
      ...section,
      options: Array.from(section.options.values()).sort((left, right) =>
        left.label.localeCompare(right.label, "en", { sensitivity: "base", numeric: true }),
      ),
    }))
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }
      const subtitleDiff = String(left.subtitle || "").localeCompare(String(right.subtitle || ""), "en", { sensitivity: "base" });
      if (subtitleDiff) {
        return subtitleDiff;
      }
      return String(left.label || "").localeCompare(String(right.label || ""), "en", { sensitivity: "base" });
    });
}
function compareListingRows(left, right, sortMode) {
  const leftSort = left.item?.sortData || {};
  const rightSort = right.item?.sortData || {};
  const leftVariantCount = Number(left.item?.variantCount ?? leftSort.variantCount ?? 0);
  const rightVariantCount = Number(right.item?.variantCount ?? rightSort.variantCount ?? 0);
  if (sortMode === "title-asc") {
    return String(leftSort.title || left.item?.title || "").localeCompare(String(rightSort.title || right.item?.title || ""), "en", { sensitivity: "base", numeric: true });
  }
  if (sortMode === "title-desc") {
    return String(rightSort.title || right.item?.title || "").localeCompare(String(leftSort.title || left.item?.title || ""), "en", { sensitivity: "base", numeric: true });
  }
  if (sortMode === "variants-desc") {
    const diff = rightVariantCount - leftVariantCount;
    return diff || left.index - right.index;
  }
  if (sortMode === "variants-asc") {
    const diff = leftVariantCount - rightVariantCount;
    return diff || left.index - right.index;
  }
  return left.index - right.index;
}
function normalizeListingSearchValue(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokenizeListingSearch(value) {
  const normalized = normalizeListingSearchValue(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}
function scoreListingRowSearch(row, tokens, phrase) {
  if (!tokens.length) {
    return 0;
  }
  const title = row.searchTitle || "";
  const summary = row.searchSummary || "";
  const corpus = row.searchCorpus || "";
  let score = tokens.reduce((sum, token) => (corpus.includes(token) ? sum + 1 : sum), 0);
  if (phrase && corpus.includes(phrase)) {
    score += 3;
  }
  if (phrase && title.includes(phrase)) {
    score += 6;
  } else if (tokens.every((token) => title.includes(token))) {
    score += 4;
  }
  if (phrase && summary.includes(phrase)) {
    score += 2;
  }
  return score;
}
function initListingFilters(root = document, { sourceUrl = "" } = {}) {
  const context = findListingContext(root);
  if (!context || !context.cards.length) {
    return;
  }
  const itemsUrl = resolveListingItemsUrl(sourceUrl || window.location.href);
  if (!itemsUrl || context.container.dataset.listingFiltersBound === itemsUrl) {
    return;
  }
  fetch(itemsUrl)
    .then((response) => (response.ok ? response.json() : null))
    .then((itemsPayload) => {
      if (!Array.isArray(itemsPayload) || !itemsPayload.length) {
        return;
      }
      const itemByHref = new Map(
        itemsPayload
          .map((item) => [normalizeListingComparableHref(item?.href || ""), item])
          .filter(([href]) => href),
      );
      const rows = context.cards
        .map((card, index) => {
          const link = getListingCardLink(card);
          const href = normalizeListingComparableHref(link?.getAttribute("href") || link?.href || "");
          const item = itemByHref.get(href);
          if (!href || !item?.filterData) {
            return null;
          }
          const isProductRoot = context.kind === "product-root";
          const searchFragments = isProductRoot
            ? [
                item?.sortData?.title || item?.title || link?.textContent || "",
                item?.sortData?.summary || item?.summary || "",
                item?.label || "",
                item?.collection || "",
                item?.sortData?.categoryLabel || "",
                item?.sortData?.collectionLabel || "",
                item?.href || href || "",
              ]
            : [
                item?.filterData?.searchText || "",
                item?.sortData?.title || item?.title || "",
                item?.sortData?.summary || item?.summary || "",
                item?.href || href || "",
              ];
          return {
            index,
            card,
            link,
            href,
            item,
            searchTitle: normalizeListingSearchValue(item?.sortData?.title || item?.title || link?.textContent || ""),
            searchSummary: normalizeListingSearchValue(item?.sortData?.summary || item?.summary || ""),
            searchCorpus: normalizeListingSearchValue(searchFragments.join(" ")),
            grid: card.parentElement,
            section:
              card.closest(".product-collection-panel") ||
              card.closest(".family-product-block") ||
              null,
          };
        })
        .filter(Boolean);
      if (!rows.length) {
        return;
      }
      if (rows.length < 2) {
        return;
      }
      context.container.dataset.listingFiltersBound = itemsUrl;
      context.container.querySelectorAll(".listing-filters-empty").forEach((node) => node.remove());
      const existingPanel = context.container.parentElement?.querySelector(":scope > .listing-filters");
      if (existingPanel) {
        existingPanel.remove();
      }
      const panel = document.createElement("section");
      panel.className = "listing-filters with-texture-2";
      panel.innerHTML = `
        <div class="listing-filters__toolbar">
          <label class="listing-filters__search">
            <span>Search</span>
            <input type="search" class="listing-filters__search-input" placeholder="Search products, colors, materials, and attributes" />
          </label>
          <label class="listing-filters__sort">
            <span>Sort</span>
            <select class="listing-filters__sort-select">
              <option value="default">Default order</option>
              <option value="title-asc">Name A-Z</option>
              <option value="title-desc">Name Z-A</option>
              <option value="variants-desc">Most options first</option>
              <option value="variants-asc">Fewest options first</option>
            </select>
          </label>
          <button type="button" class="listing-filters__clear">Clear filters</button>
        </div>
        <div class="listing-filters__status">
          <strong class="listing-filters__summary"></strong>
        </div>
      `;
      const searchInput = panel.querySelector(".listing-filters__search-input");
      const sortSelect = panel.querySelector(".listing-filters__sort-select");
      const clearButton = panel.querySelector(".listing-filters__clear");
      const summaryNode = panel.querySelector(".listing-filters__summary");
      const emptyState = document.createElement("p");
      emptyState.className = "listing-filters-empty family-product-muted";
      emptyState.textContent = "No products match the active filters.";
      context.host.insertAdjacentElement("afterend", panel);
      const state = {
        query: "",
        sort: "default",
      };
      function rowMatches(row) {
        const queryTokens = tokenizeListingSearch(state.query);
        if (!queryTokens.length) {
          return true;
        }
        const corpus = row.searchCorpus || "";
        if (!queryTokens.every((token) => corpus.includes(token))) {
          return false;
        }
        return true;
      }
      function reorderRows() {
        const byGrid = new Map();
        rows.forEach((row) => {
          if (!byGrid.has(row.grid)) {
            byGrid.set(row.grid, []);
          }
          byGrid.get(row.grid).push(row);
        });
        byGrid.forEach((gridRows, grid) => {
          gridRows
            .slice()
            .sort((left, right) => {
              const queryTokens = tokenizeListingSearch(state.query);
              const phrase = normalizeListingSearchValue(state.query);
              if (queryTokens.length) {
                const scoreDiff = scoreListingRowSearch(right, queryTokens, phrase) - scoreListingRowSearch(left, queryTokens, phrase);
                if (scoreDiff) {
                  return scoreDiff;
                }
              }
              return compareListingRows(left, right, state.sort);
            })
            .forEach((row) => {
              grid.appendChild(row.card);
            });
        });
      }
      function applyState() {
        state.query = String(searchInput.value || "").trim().toLowerCase();
        state.sort = String(sortSelect.value || "default");
        let visibleCount = 0;
        rows.forEach((row) => {
          const visible = rowMatches(row);
          row.card.hidden = !visible;
          if (visible) {
            visibleCount += 1;
          }
        });
        const sectionCounts = new Map();
        rows.forEach((row) => {
          if (!row.section) {
            return;
          }
          if (!sectionCounts.has(row.section)) {
            sectionCounts.set(row.section, 0);
          }
          if (!row.card.hidden) {
            sectionCounts.set(row.section, sectionCounts.get(row.section) + 1);
          }
        });
        sectionCounts.forEach((count, section) => {
          section.hidden = count === 0;
        });
        reorderRows();
        summaryNode.textContent = `${visibleCount} of ${rows.length} products shown`;
        if (visibleCount === 0) {
          if (!context.container.parentElement.contains(emptyState)) {
            context.container.insertAdjacentElement("afterend", emptyState);
          }
        } else {
          emptyState.remove();
        }
        clearButton.disabled = !state.query && state.sort === "default";
      }
      searchInput.addEventListener("input", applyState);
      sortSelect.addEventListener("change", applyState);
      clearButton.addEventListener("click", () => {
        searchInput.value = "";
        sortSelect.value = "default";
        applyState();
      });
      applyState();
      if (typeof initDynamicHash === "function") {
        initDynamicHash();
      }
    })
    .catch(() => {});
}
function loadItems() {
}
document.addEventListener("DOMContentLoaded", () => {
  const c = document.getElementById("items-container");
  if (c && window.initialItemsJson) {
    loadItems();
  }
});
document.addEventListener("DOMContentLoaded", () => initListingFilters(document));
let dynamicHashCleanup = null;
function normalizeDynamicHashValue(value) {
  const text = String(value || "").trim();
  if (!text || text === "#") {
    return "";
  }
  return text.startsWith("#") ? text : `#${text}`;
}
function replaceDynamicHash(nextHash) {
  const normalized = normalizeDynamicHashValue(nextHash);
  const current = normalizeDynamicHashValue(window.location.hash);
  if (normalized === current) {
    return current;
  }
  const nextUrl = `${window.location.pathname}${window.location.search}${normalized}`;
  history.replaceState(null, "", nextUrl);
  return normalized;
}
function isDynamicHashTargetVisible(target) {
  return (
    target instanceof HTMLElement &&
    !target.hidden &&
    !target.closest("[hidden]") &&
    target.getClientRects().length > 0
  );
}
function getDynamicHashTargetTop(target) {
  return target.getBoundingClientRect().top + window.scrollY;
}
function pickDynamicHashByAnchor(targets, anchorY) {
  let activeHash = "";
  for (const target of Array.isArray(targets) ? targets : []) {
    if (!target?.hash || !isDynamicHashTargetVisible(target.element)) {
      continue;
    }
    if (anchorY >= getDynamicHashTargetTop(target.element)) {
      activeHash = target.hash;
    }
  }
  return activeHash;
}
function ensureDynamicHashTargetId(element, fallbackId) {
  if (!(element instanceof HTMLElement)) {
    return null;
  }
  if (!element.id) {
    element.id = fallbackId;
  }
  return element;
}
function findFamilyProductBlockByHeading(root, labels) {
  if (!(root instanceof HTMLElement)) {
    return null;
  }
  const wanted = new Set(
    (Array.isArray(labels) ? labels : []).map((label) =>
      String(label || "").trim().toLowerCase(),
    ),
  );
  const heading = Array.from(root.querySelectorAll(".family-product-block > h2")).find(
    (node) => wanted.has(String(node.textContent || "").trim().toLowerCase()),
  );
  return heading?.parentElement || null;
}
function buildProductDetailDynamicHashStrategy(header) {
  const productPage = document.querySelector(".family-product-page");
  if (
    !(productPage instanceof HTMLElement) ||
    !/^\/products\/.+/i.test(window.location.pathname)
  ) {
    return null;
  }
  const detailsTarget = ensureDynamicHashTargetId(
    findFamilyProductBlockByHeading(productPage, [
      "Key details",
      "Technical details",
      "Technical specifications",
    ]),
    "details",
  );
  const galleryTarget = ensureDynamicHashTargetId(
    findFamilyProductBlockByHeading(productPage, ["Local gallery"]),
    "gallery",
  );
  const contextTarget = ensureDynamicHashTargetId(
    findFamilyProductBlockByHeading(productPage, ["Product context"]),
    "context",
  );
  if (!detailsTarget && !galleryTarget && !contextTarget) {
    return null;
  }
  const computeHash = () => {
    const headerHeight = header.getBoundingClientRect().height || header.offsetHeight || 0;
    const anchorY = window.scrollY + headerHeight + 72;
    const nearBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 24;
    if (contextTarget && nearBottom) {
      return "#context";
    }
    if (galleryTarget && anchorY >= getDynamicHashTargetTop(galleryTarget)) {
      return "#gallery";
    }
    if (detailsTarget && anchorY >= getDynamicHashTargetTop(detailsTarget)) {
      return "#details";
    }
    return "";
  };
  return { computeHash };
}
function buildProductRootDynamicHashStrategy(header) {
  const categoryList = document.querySelector("#category-list.product-root-list");
  if (!(categoryList instanceof HTMLElement)) {
    return null;
  }
  const targets = Array.from(categoryList.querySelectorAll(".product-collection-panel"))
    .map((section) => {
      const heading = section.querySelector("h2[id]");
      if (!(heading instanceof HTMLElement)) {
        return null;
      }
      const cleanId = String(heading.id || "")
        .replace(/^products-/i, "")
        .trim();
      if (!cleanId) {
        return null;
      }
      ensureDynamicHashTargetId(section, cleanId);
      return {
        element: section,
        hash: `#${section.id}`,
      };
    })
    .filter((target) => target.hash !== "#");
  if (!targets.length) {
    return null;
  }
  const computeHash = () => {
    const searchInput = document.querySelector(".listing-filters__search-input");
    if (searchInput instanceof HTMLInputElement && searchInput.value.trim()) {
      return "";
    }
    const headerHeight = header.getBoundingClientRect().height || header.offsetHeight || 0;
    return pickDynamicHashByAnchor(targets, window.scrollY + headerHeight + 32);
  };
  const extraListeners = () => {
    const searchInput = document.querySelector(".listing-filters__search-input");
    return searchInput instanceof HTMLInputElement
      ? [{ target: searchInput, event: "input" }]
      : [];
  };
  return { computeHash, extraListeners };
}
function buildSectionDynamicHashStrategy(header) {
  const targets = Array.from(
    document.querySelectorAll("section[id]:not([id='hero'])"),
  )
    .map((section) => ({
      element: section,
      hash: `#${section.id}`,
    }))
    .filter((target) => target.hash !== "#");
  if (!targets.length) {
    return null;
  }
  const computeHash = () => {
    const headerHeight = header.getBoundingClientRect().height || header.offsetHeight || 0;
    if (window.scrollY <= headerHeight) {
      return "";
    }
    return pickDynamicHashByAnchor(targets, window.scrollY + headerHeight + 24);
  };
  return { computeHash };
}
function initDynamicHash() {
  if (typeof dynamicHashCleanup === "function") {
    dynamicHashCleanup();
    dynamicHashCleanup = null;
  }
  const header = document.querySelector(".header");
  if (!header) {
    return;
  }
  const strategy =
    buildProductDetailDynamicHashStrategy(header) ||
    buildProductRootDynamicHashStrategy(header) ||
    buildSectionDynamicHashStrategy(header);
  if (!strategy || typeof strategy.computeHash !== "function") {
    return;
  }
  let frameId = 0;
  let lastHash = normalizeDynamicHashValue(window.location.hash);
  const updateHash = () => {
    frameId = 0;
    const nextHash = normalizeDynamicHashValue(strategy.computeHash());
    if (nextHash === lastHash) {
      return;
    }
    lastHash = replaceDynamicHash(nextHash);
  };
  const scheduleUpdate = () => {
    if (frameId) {
      return;
    }
    frameId = window.requestAnimationFrame(updateHash);
  };
  const extraListeners = (
    (typeof strategy.extraListeners === "function"
      ? strategy.extraListeners()
      : strategy.extraListeners) || []
  ).map((entry) => ({
    ...entry,
    handler: entry?.handler || scheduleUpdate,
  }));
  const listeners = [
    { target: window, event: "scroll", handler: scheduleUpdate, options: { passive: true } },
    { target: window, event: "resize", handler: scheduleUpdate },
    ...extraListeners,
  ];
  listeners.forEach(({ target, event, handler, options }) => {
    target?.addEventListener?.(event, handler, options);
  });
  if (!normalizeDynamicHashValue(window.location.hash)) {
    scheduleUpdate();
  }
  dynamicHashCleanup = () => {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }
    listeners.forEach(({ target, event, handler, options }) => {
      target?.removeEventListener?.(event, handler, options);
    });
  };
}
function ensureViewportMeta() {
  if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1";
    document.head.prepend(meta);
  }
}
document.addEventListener("DOMContentLoaded", ensureViewportMeta);
async function loadItemsFromSitemap() {
  try {
    const resp = await fetch(resolveSiteUrl("/sitemap.xml"));
    if (!resp.ok) {
      throw "sitemap not found";
    }
    const xmlText = await resp.text();
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    const locEls = doc.getElementsByTagName("loc");
    const skuPaths = [];
    for (let el of locEls) {
      const loc = el.textContent.trim();
      const url = new URL(loc, window.location.origin);
      if (/\/\d+\.html$/.test(url.pathname)) {
        skuPaths.push(url.pathname);
      }
    }
    return loadSearchBundles(skuPaths);
  } catch (err) {
    console.error("[LazySearch] loadItemsFromSitemap error:", err);
    return [];
  }
}
async function loadItemsFromSearchIndex() {
  try {
    const response = await fetch(resolveSiteUrl("/data/search-index.json"));
    if (!response.ok) {
      throw new Error(`search-index not found: ${response.status}`);
    }
    const payload = await response.json();
    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (!items.length) {
      throw new Error("search-index is empty");
    }
    return items;
  } catch (error) {
    console.error("[LazySearch] loadItemsFromSearchIndex error:", error);
    return loadItemsFromSitemap();
  }
}
function normalizeSearchPath(pathname) {
  const value = String(pathname || "").trim();
  if (!value) {
    return "";
  }
  try {
    return new URL(value, window.location.origin).pathname;
  } catch (_) {
    return value.startsWith("/") ? value : `/${value}`;
  }
}
function dirnameFromSearchPath(pathname) {
  return normalizeSearchPath(pathname).replace(/\/[^/]+$/, "") || "/";
}
function searchIndexPathForDir(dir) {
  const clean = normalizeSearchPath(dir).replace(/\/+$/, "");
  return clean ? `${clean}/` : "/";
}
function searchJsonPathForDir(dir, fileName) {
  const clean = normalizeSearchPath(dir).replace(/\/+$/, "");
  return `${clean}/${fileName}`;
}
async function fetchSearchJson(pathname, fallback) {
  try {
    const response = await fetch(resolveSiteUrl(pathname));
    if (!response.ok) {
      return fallback;
    }
    return await response.json();
  } catch (_) {
    return fallback;
  }
}
function humanizeSearchSegment(value) {
  return String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}
function buildSearchBreadcrumb(dir) {
  const segments = normalizeSearchPath(dir).split("/").filter(Boolean);
  return segments.map(humanizeSearchSegment).filter(Boolean);
}
function normalizeSearchHref(rawHref, dir, sku) {
  const fallback = sku ? `${normalizeSearchPath(dir).replace(/\/+$/, "")}/${sku}` : searchIndexPathForDir(dir);
  return normalizeSearchPath(rawHref || fallback);
}
function firstSearchImage(value) {
  if (Array.isArray(value)) {
    return normalizeSearchPath(value.find(Boolean) || "");
  }
  return normalizeSearchPath(value || "");
}
function variantChoiceText(variant, familyTitle) {
  const sku = String(variant?.sku || "").trim();
  const summary = String(variant?.variantSummary || variant?.summaryLine || "").trim();
  if (summary && sku) {
    return `${summary} / SKU ${sku}`;
  }
  if (summary) {
    return summary;
  }
  const title = String(variant?.title || variant?.name || "").trim();
  const normalizedFamily = String(familyTitle || "").trim().toLowerCase();
  const trimmedTitle =
    normalizedFamily && title.toLowerCase().startsWith(normalizedFamily)
      ? title.slice(familyTitle.length).replace(/^\s*[-:,]\s*/, "").trim()
      : title;
  if (trimmedTitle && sku && trimmedTitle !== sku) {
    return `${trimmedTitle} / SKU ${sku}`;
  }
  return sku ? `SKU ${sku}` : trimmedTitle;
}
const SEARCH_SWATCH_AXES = [
  { key: "dimensions", label: "Size" },
  { key: "handedness", label: "Handedness" },
  { key: "comfortType", label: "Comfort type" },
  { key: "color", label: "Color" },
];
const SEARCH_CATEGORY_SINGULARS = {
  "chaise sofas": "Chaise Sofa",
  "corner sofas": "Corner Sofa",
  "three-seater sofas": "3-Seater Sofa",
  "four-seater sofas": "4-Seater Sofa",
  "modular sofas": "Modular Sofa",
  "swivel chairs": "Swivel Chair",
  "armchairs": "Armchair",
  "footstools": "Footstool",
  "bar stools": "Bar Stool",
  "headboards": "Headboard",
  "mattresses": "Mattress",
  "toppers": "Topper",
  "bed frames": "Bed Frame",
  "divan beds": "Divan Bed",
  "continental beds": "Continental Bed",
  "adjustable beds": "Adjustable Bed",
};
function normalizeSearchValue(value) {
  return String(value || "").trim();
}
function formatSearchDisplayCategory(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  const mapped = SEARCH_CATEGORY_SINGULARS[text.toLowerCase()];
  if (mapped) {
    return mapped;
  }
  if (/ies$/i.test(text)) {
    return text.replace(/ies$/i, "y");
  }
  if (/sses$/i.test(text)) {
    return text.replace(/es$/i, "");
  }
  if (/s$/i.test(text) && !/ss$/i.test(text)) {
    return text.replace(/s$/i, "");
  }
  return text;
}
function detectSearchHandedness(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) {
    return "";
  }
  const hasContext = /\b(?:chaise|corner|sectional|divaani|layout|side)\b/.test(text);
  const hasLeft = /\b(?:left(?:[\s-]+side)?|vasen(?:malla|puoleinen)?)\b/.test(text);
  const hasRight = /\b(?:right(?:[\s-]+side)?|oikea(?:lla|puoleinen)?)\b/.test(text);
  if (!(hasContext || hasLeft || hasRight) || (hasLeft && hasRight)) {
    return "";
  }
  if (hasLeft) {
    return "Left";
  }
  if (hasRight) {
    return "Right";
  }
  return "";
}
function getSearchVariantAttributes(variant) {
  const source =
    variant?.selectionAttributes && typeof variant.selectionAttributes === "object"
      ? variant.selectionAttributes
      : {};
  return {
    dimensions: normalizeSearchValue(source.dimensions),
    handedness:
      normalizeSearchValue(source.handedness || source.orientation) ||
      detectSearchHandedness([
        variant?.choiceText,
        variant?.title,
        variant?.variantSummary,
      ].join(" / ")),
    comfortType: normalizeSearchValue(source.comfortType),
    color: normalizeSearchValue(source.color),
    material: normalizeSearchValue(source.material),
  };
}
function collectSearchSwatchAxes(variants) {
  return SEARCH_SWATCH_AXES
    .map((axis) => {
      const values = Array.from(
        new Set(
          (Array.isArray(variants) ? variants : [])
            .map((variant) => getSearchVariantAttributes(variant)[axis.key])
            .filter(Boolean),
        ),
      );
      return {
        ...axis,
        values,
      };
    })
    .filter((axis) => axis.values.length > 1);
}
function findSearchVariantForAxisValue({ variants, currentVariant, axisKey, value }) {
  const rows = Array.isArray(variants) ? variants : [];
  const currentAttributes = getSearchVariantAttributes(currentVariant || rows[0] || {});
  const candidates = rows.filter(
    (variant) => getSearchVariantAttributes(variant)[axisKey] === value,
  );
  if (!candidates.length) {
    return null;
  }
  const otherKeys = SEARCH_SWATCH_AXES.map((axis) => axis.key).filter(
    (key) => key !== axisKey,
  );
  return candidates
    .map((variant) => {
      const attributes = getSearchVariantAttributes(variant);
      const score = otherKeys.reduce((sum, key) => {
        if (!currentAttributes[key]) {
          return sum;
        }
        return sum + (attributes[key] === currentAttributes[key] ? 1 : 0);
      }, 0);
      return { variant, score };
    })
    .sort((left, right) => {
      const scoreDiff = right.score - left.score;
      if (scoreDiff) {
        return scoreDiff;
      }
      return String(left.variant?.sku || "").localeCompare(
        String(right.variant?.sku || ""),
        "en",
        { numeric: true },
      );
    })[0]?.variant || candidates[0];
}
function renderSearchSwatches(item, tokens = []) {
  const sortedVariants = sortSearchVariantsForTokens(item.variants, tokens);
  const currentVariant = sortedVariants[0] || item.variants[0] || null;
  const axes = collectSearchSwatchAxes(item.variants);
  if (!axes.length) {
    return null;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "search-swatch-groups";
  for (const axis of axes.slice(0, 4)) {
    const group = document.createElement("div");
    group.className = "search-swatch-group";
    const label = document.createElement("span");
    label.className = "search-swatch-label";
    label.textContent = axis.label;
    group.appendChild(label);
    const options = document.createElement("div");
    options.className = "search-swatch-options";
    const visibleValues = axis.values.slice(0, 6);
    for (const value of visibleValues) {
      const target = findSearchVariantForAxisValue({
        variants: sortedVariants,
        currentVariant,
        axisKey: axis.key,
        value,
      });
      if (!target) {
        continue;
      }
      const option = document.createElement("a");
      option.href = resolveSiteUrl(target.href || item.href);
      option.className = "search-swatch-chip";
      option.textContent = value;
      option.title = variantChoiceText(target, item.title);
      options.appendChild(option);
    }
    if (axis.values.length > visibleValues.length) {
      const more = document.createElement("a");
      more.href = resolveSiteUrl(item.href);
      more.className = "search-swatch-chip search-swatch-chip--muted";
      more.textContent = `+${axis.values.length - visibleValues.length} more`;
      options.appendChild(more);
    }
    group.appendChild(options);
    wrapper.appendChild(group);
  }
  return wrapper;
}
function renderSearchVariantFallback(item, tokens = []) {
  const variantList = sortSearchVariantsForTokens(item.variants, tokens).slice(0, 6);
  if (!variantList.length) {
    return null;
  }
  const variants = document.createElement("div");
  variants.className = "search-variant-row";
  variants.setAttribute("aria-label", `${item.title} variants`);
  for (const variant of variantList) {
    const variantLink = document.createElement("a");
    variantLink.href = resolveSiteUrl(variant.href);
    variantLink.className = "search-variant-choice";
    variantLink.textContent = variant.choiceText;
    variants.appendChild(variantLink);
  }
  if (item.variants.length > variantList.length) {
    const more = document.createElement("a");
    more.href = resolveSiteUrl(item.href);
    more.className = "search-variant-choice search-variant-choice--muted";
    more.textContent = `View all ${item.variants.length}`;
    variants.appendChild(more);
  }
  return variants;
}
function summarizeSearchFactValues(values, { maxVisible = 2 } = {}) {
  const uniqueValues = Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));
  if (!uniqueValues.length) {
    return "";
  }
  const visibleValues = uniqueValues.slice(0, maxVisible);
  const suffix =
    uniqueValues.length > visibleValues.length
      ? ` +${uniqueValues.length - visibleValues.length}`
      : "";
  return `${visibleValues.join(" / ")}${suffix}`;
}
function renderSearchKeyFacts(item, tokens = []) {
  const variants = sortSearchVariantsForTokens(item.variants, tokens);
  const scopedVariants = variants.length ? variants : Array.isArray(item.variants) ? item.variants : [];
  const axes = collectSearchSwatchAxes(scopedVariants);
  const currentVariant = scopedVariants[0] || item.variants?.[0] || null;
  const currentAttributes = getSearchVariantAttributes(currentVariant || {});
  const factConfigs = [
    { key: "dimensions", label: "Size", maxVisible: 2, interactive: false },
    { key: "handedness", label: "Handedness", maxVisible: 2, interactive: true },
    { key: "color", label: "Color", maxVisible: 3, interactive: true },
    { key: "comfortType", label: "Comfort", maxVisible: 2, interactive: true },
  ];
  const activeFacts = factConfigs.filter((config) => {
    const axis = axes.find((entry) => entry.key === config.key);
    return (axis?.values?.length || 0) > 0 || currentAttributes[config.key];
  });
  if (!activeFacts.length) {
    return null;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "search-result-facts";
  for (const config of activeFacts) {
    const axis = axes.find((entry) => entry.key === config.key);
    const chip = document.createElement("span");
    chip.className = "search-result-fact";
    const label = document.createElement("span");
    label.className = "search-result-fact-label";
    label.textContent = `${config.label}:`;
    chip.appendChild(label);
    if (axis?.values?.length && config.interactive) {
      const values = axis.values.slice(0, config.maxVisible);
      const options = document.createElement("span");
      options.className = "search-result-fact-options";
      values.forEach((value, index) => {
        const target = findSearchVariantForAxisValue({
          variants: scopedVariants,
          currentVariant,
          axisKey: config.key,
          value,
        });
        if (!target) {
          return;
        }
        const option = document.createElement("a");
        option.href = resolveSiteUrl(target.href || item.href);
        option.className = "search-result-fact-option";
        option.textContent = value;
        option.title = variantChoiceText(target, item.title);
        if (currentAttributes[config.key] && currentAttributes[config.key] === value) {
          option.classList.add("is-active");
        }
        options.appendChild(option);
        if (index < values.length - 1) {
          const separator = document.createElement("span");
          separator.className = "search-result-fact-separator";
          separator.textContent = "/";
          options.appendChild(separator);
        }
      });
      chip.appendChild(options);
    } else {
      const text = axis?.values?.length
        ? summarizeSearchFactValues(axis.values, { maxVisible: config.maxVisible })
        : currentAttributes[config.key];
      if (text) {
        chip.append(` ${text}`);
      }
    }
    wrapper.appendChild(chip);
  }
  return wrapper;
}
function renderSearchHeaderLinks(item) {
  const links = [];
  if (item.href) {
    links.push({
      href: item.href,
      label: item.category || "Product type",
      tone: "primary",
    });
  }
  if (item.productFamilyHref) {
    links.push({
      href: item.productFamilyHref,
      label: item.productFamilyName ? `${item.productFamilyName} family` : "Family",
      tone: "secondary",
    });
  }
  if (!links.length) {
    return null;
  }
  const rail = document.createElement("div");
  rail.className = "search-result-rail";
  for (const entry of links) {
    const link = document.createElement("a");
    link.href = resolveSiteUrl(entry.href);
    link.className = `search-result-rail-link search-result-rail-link--${entry.tone}`;
    link.textContent = entry.label;
    rail.appendChild(link);
  }
  return rail;
}
function renderSearchBreadcrumb(item) {
  const familyHref = item.productFamilyHref || item.href;
  const familyDir = familyHref ? dirnameFromSearchPath(familyHref) : "";
  const categoryDir = familyDir ? dirnameFromSearchPath(familyDir) : "";
  const entries = [
    { label: "Products", href: "/products/" },
    item.category && categoryDir
      ? { label: item.category, href: searchIndexPathForDir(categoryDir) }
      : null,
    familyHref
      ? {
          label: item.productFamilyName || item.title,
          href: familyHref,
        }
      : null,
  ].filter(Boolean);
  if (!entries.length) {
    return null;
  }
  const pathDiv = document.createElement("div");
  pathDiv.className = "item-path";
  entries.forEach((entry, index) => {
    const link = document.createElement("a");
    link.href = resolveSiteUrl(entry.href);
    link.className = "item-path-link";
    link.textContent = entry.label;
    pathDiv.appendChild(link);
    if (index < entries.length - 1) {
      const separator = document.createElement("span");
      separator.className = "item-path-separator";
      separator.textContent = "/";
      pathDiv.appendChild(separator);
    }
  });
  return pathDiv;
}
function buildSearchText(parts) {
  return parts
    .flatMap((part) => (Array.isArray(part) ? part : [part]))
    .map((part) => String(part || "").toLowerCase())
    .join(" ");
}
async function loadSearchBundles(skuPaths) {
  const grouped = new Map();
  for (const pathname of skuPaths) {
    const sku = pathname.match(/\/([^/]+)\.html$/)?.[1] || "";
    if (!sku) {
      continue;
    }
    const dir = dirnameFromSearchPath(pathname);
    if (!grouped.has(dir)) {
      grouped.set(dir, []);
    }
    grouped.get(dir).push({ sku, href: pathname });
  }
  const bundles = await Promise.all(
    Array.from(grouped.entries()).map(([dir, fallbackVariants]) =>
      loadSearchBundle(dir, fallbackVariants),
    ),
  );
  return mergeSearchBundles(bundles.filter(Boolean));
}
function buildSearchBundleGroupKey(item) {
  const familyKey = String(item?.productFamilyName || item?.title || item?.id || "")
    .trim()
    .toLowerCase();
  const categoryKey = String(item?.category || "").trim().toLowerCase();
  return `${familyKey}::${categoryKey}`;
}
function choosePreferredSearchBundle(items) {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
    const variantDiff = (right?.variantCount || 0) - (left?.variantCount || 0);
    if (variantDiff) {
      return variantDiff;
    }
    const hrefLengthDiff = String(left?.href || "").length - String(right?.href || "").length;
    if (hrefLengthDiff) {
      return hrefLengthDiff;
    }
    return String(left?.href || "").localeCompare(String(right?.href || ""), "en", {
      numeric: true,
    });
  })[0] || null;
}
function mergeSearchBundles(items) {
  const grouped = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const key = buildSearchBundleGroupKey(item);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(item);
  }
  return Array.from(grouped.values()).map((group) => {
    if (group.length === 1) {
      return group[0];
    }
    const preferred = choosePreferredSearchBundle(group) || group[0];
    const variants = Array.from(
      new Map(
        group
          .flatMap((item) => (Array.isArray(item?.variants) ? item.variants : []))
          .map((variant, index) => [
            String(variant?.href || variant?.sku || `variant-${index}`),
            variant,
          ]),
      ).values(),
    );
    const searchText = buildSearchText([
      preferred.title,
      preferred.summary,
      preferred.category,
      preferred.productFamilyName,
      variants.flatMap((variant) => [
        variant?.sku,
        variant?.title,
        variant?.variantSummary,
        variant?.choiceText,
      ]),
    ]);
    return {
      ...preferred,
      variantCount: Math.max(
        preferred.variantCount || 0,
        ...group.map((item) => item?.variantCount || 0),
        variants.length,
      ),
      variants,
      searchText,
    };
  });
}
async function loadSearchBundle(dir, fallbackVariants) {
  const [listing, rawItems] = await Promise.all([
    fetchSearchJson(searchJsonPathForDir(dir, "listing.json"), null),
    fetchSearchJson(searchJsonPathForDir(dir, "items.json"), null),
  ]);
  const itemRows = Array.isArray(rawItems) && rawItems.length ? rawItems : fallbackVariants;
  const breadcrumb = buildSearchBreadcrumb(dir);
  const title =
    String(listing?.familyTitle || listing?.productFamilyName || "").trim() ||
    humanizeSearchSegment(breadcrumb[breadcrumb.length - 1] || "");
  const variants = itemRows
    .map((row) => {
      const sku = String(row?.sku || row?.name || "").trim();
      if (!sku) {
        return null;
      }
      const href = normalizeSearchHref(row?.href, dir, sku);
      const image =
        firstSearchImage(row?.imageUrl || row?.primaryImageUrl || row?.imageUrls) ||
        normalizeSearchPath(`${dir}/${sku}_1.jpg`);
      const titleText = String(row?.title || row?.displayName || "").trim() || `${title} ${sku}`;
      const variantSummary = String(row?.variantSummary || row?.summaryLine || "").trim();
      return {
        sku,
        title: titleText,
        href,
        image,
        variantSummary,
        selectionAttributes:
          row?.selectionAttributes && typeof row.selectionAttributes === "object"
            ? row.selectionAttributes
            : {},
        choiceText: variantChoiceText({ ...row, title: titleText, variantSummary }, title),
      };
    })
    .filter(Boolean);
  if (!title && !variants.length) {
    return null;
  }
  const primaryImage =
    firstSearchImage(listing?.primaryImageUrl || listing?.imageUrl || listing?.imageUrls) ||
    variants[0]?.image ||
    "";
  const summary = String(listing?.familySummary || listing?.summary || "").trim();
  const category = String(listing?.schemaCategory || "").trim();
  const productFamilyName = String(listing?.productFamilyName || "").trim();
  const productFamilyHref = listing?.productFamilyRelativeDir
    ? normalizeSearchPath(`/${String(listing.productFamilyRelativeDir).replace(/^\/+|\/+$/g, "")}/`)
    : "";
  const href = searchIndexPathForDir(dir);
  const searchText = buildSearchText([
    title,
    summary,
    category,
    productFamilyName,
    breadcrumb,
    variants.flatMap((variant) => [
      variant.sku,
      variant.title,
      variant.variantSummary,
      variant.choiceText,
    ]),
  ]);
  return {
    id: normalizeSearchPath(dir),
    title,
    href,
    image: primaryImage,
    summary,
    category,
    breadcrumb,
    productFamilyName,
    productFamilyHref,
    variantCount: Number(listing?.variantCount) || variants.length,
    variants,
    searchText,
  };
}
function levenshtein(a, b) {
  const m = a.length,
    n = b.length;
  if (!m) {
    return n;
  }
  if (!n) {
    return m;
  }
  const dp = Array(m + 1)
    .fill()
    .map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j += 1) {
    dp[0][j] = j;
  }
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}
function scoreSearchBundle(item, tokens) {
  if (!tokens.length || !tokens.every((token) => item.searchText.includes(token))) {
    return 0;
  }
  const title = String(item.title || "").toLowerCase();
  const category = String(item.category || "").toLowerCase();
  const family = String(item.productFamilyName || "").toLowerCase();
  let score = 10;
  for (const token of tokens) {
    if (title === token) score += 90;
    if (title.startsWith(token)) score += 70;
    if (title.includes(token)) score += 55;
    if (item.variants.some((variant) => String(variant.sku || "").includes(token))) score += 60;
    if (item.variants.some((variant) => String(variant.choiceText || "").toLowerCase().includes(token))) score += 35;
    if (category.includes(token)) score += 25;
    if (family.includes(token)) score += 25;
    if (String(item.summary || "").toLowerCase().includes(token)) score += 10;
  }
  return score + Math.min(item.variantCount || 0, 10);
}
function sortSearchVariantsForTokens(variants, tokens) {
  if (!tokens.length) {
    return variants;
  }
  return [...variants].sort((left, right) => {
    return scoreSearchVariantForTokens(right, tokens) - scoreSearchVariantForTokens(left, tokens);
  });
}
function getSearchVariantTokenMatchInfo(variant, tokens) {
  const sku = String(variant?.sku || "").toLowerCase();
  const title = String(variant?.title || "").toLowerCase();
  const choice = String(variant?.choiceText || "").toLowerCase();
  const summary = String(variant?.variantSummary || "").toLowerCase();
  const attributes = Object.values(getSearchVariantAttributes(variant) || {})
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  let score = 0;
  let exactVariantSignalCount = 0;
  let partialVariantSignalCount = 0;
  for (const token of tokens) {
    if (sku === token) {
      score += 120;
      exactVariantSignalCount += 1;
    }
    if (sku.includes(token)) {
      score += 70;
      partialVariantSignalCount += 1;
    }
    if (choice === token) {
      score += 80;
      exactVariantSignalCount += 1;
    }
    if (choice.includes(token)) {
      score += 45;
      partialVariantSignalCount += 1;
    }
    if (title.includes(token)) score += 35;
    if (summary.includes(token)) score += 25;
    if (attributes.some((value) => value === token)) {
      score += 80;
      exactVariantSignalCount += 1;
    }
    if (attributes.some((value) => value.includes(token))) {
      score += 50;
      partialVariantSignalCount += 1;
    }
  }
  return {
    score,
    exactVariantSignalCount,
    partialVariantSignalCount,
  };
}
function scoreSearchVariantForTokens(variant, tokens) {
  return getSearchVariantTokenMatchInfo(variant, tokens).score;
}
function chooseSearchPreviewVariant(item, tokens) {
  const variants = Array.isArray(item?.variants) ? item.variants : [];
  if (!variants.length || !tokens.length) {
    return null;
  }
  const ranked = [...variants]
    .map((variant, index) => ({
      index,
      variant,
      ...getSearchVariantTokenMatchInfo(variant, tokens),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.exactVariantSignalCount !== left.exactVariantSignalCount) {
        return right.exactVariantSignalCount - left.exactVariantSignalCount;
      }
      if (right.partialVariantSignalCount !== left.partialVariantSignalCount) {
        return right.partialVariantSignalCount - left.partialVariantSignalCount;
      }
      return left.index - right.index;
    });
  const best = ranked[0];
  if (!best || best.score <= 0) {
    return null;
  }
  const topScoreMatches = ranked.filter((entry) => entry.score === best.score);
  if (topScoreMatches.length > 1 && !best.exactVariantSignalCount && !best.partialVariantSignalCount) {
    return null;
  }
  return best.variant;
}
function render(item, tokens = []) {
  const li = document.createElement("li");
  li.className = "search-result-item";
  li.tabIndex = 0;
  li.setAttribute("role", "link");
  li.setAttribute("aria-label", `Open ${item.title}`);
  const previewVariant = chooseSearchPreviewVariant(item, tokens);
  const resultHref = resolveSiteUrl(previewVariant?.href || item.href);
  const requestResultNavigation = (href = resultHref) => {
    const searchWrapper = li.closest(".search-wrapper");
    if (searchWrapper) {
      searchWrapper.dispatchEvent(
        new CustomEvent("search-result-activate", {
          bubbles: true,
          detail: { href },
        }),
      );
      return;
    }
    loadPageViaAjax(href, { replaceState: false }).catch((err) => {
      console.error("[Search] Result card navigation failed:", err);
      window.location.href = href;
    });
  };
  li.addEventListener("click", (event) => {
    const anchor = event.target.closest("a");
    if (anchor) {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        anchor.target === "_blank"
      ) {
        return;
      }
      event.preventDefault();
      requestResultNavigation(anchor.href || resultHref);
      return;
    }
    if (event.target.closest("button, input, textarea, select, label")) {
      return;
    }
    requestResultNavigation();
  });
  li.addEventListener("keydown", (event) => {
    if (event.target !== li || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }
    event.preventDefault();
    requestResultNavigation();
  });
  const displayBreadcrumb = [
    "Products",
    item.category,
    item.productFamilyName || item.title,
  ].filter(Boolean);
  const displayCategory = formatSearchDisplayCategory(item.category);
  const displayTitle = [item.productFamilyName, displayCategory || item.title].filter(Boolean);

  const main = document.createElement("div");
  main.className = "search-result-main";

  const imageLink = document.createElement("a");
  imageLink.className = "search-result-image-link";
  imageLink.href = resultHref;

  const img = document.createElement("img");
  img.className = "item-image";
  img.crossOrigin = "anonymous";
  img.loading = "lazy";
  img.src = resolveSiteUrl(previewVariant?.image || item.image || "/images/logo_small.svg");
  img.alt = displayTitle.join(" ") || item.title;
  img.addEventListener("error", () => {
    img.src = resolveSiteUrl("/images/logo_small.svg");
  }, { once: true });
  imageLink.appendChild(img);
  main.appendChild(imageLink);

  const txt = document.createElement("div");
  txt.className = "item-text";

  const header = document.createElement("div");
  header.className = "search-result-header";

  const headerMain = document.createElement("div");
  headerMain.className = "search-result-header-main";

  const title = document.createElement("a");
  title.href = resultHref;
  title.className = "item-title";
  if (item.productFamilyName) {
    const familySpan = document.createElement("span");
    familySpan.className = "item-title-family";
    familySpan.textContent = item.productFamilyName;
    title.appendChild(familySpan);
  }
  const typeSpan = document.createElement("span");
  typeSpan.className = "item-title-type";
  typeSpan.textContent = displayCategory || item.title;
  title.append(typeSpan);
  headerMain.appendChild(title);

  header.appendChild(headerMain);

  const headerLinks = renderSearchHeaderLinks(item);
  if (headerLinks) {
    header.appendChild(headerLinks);
  }
  txt.appendChild(header);

  const keyFacts = renderSearchKeyFacts(item, tokens);
  if (keyFacts) {
    txt.appendChild(keyFacts);
  }

  if (item.summary) {
    const summary = document.createElement("p");
    summary.className = "search-result-summary";
    summary.textContent = item.summary;
    txt.appendChild(summary);
  }

  const breadcrumb = renderSearchBreadcrumb(item);
  if (breadcrumb) {
    txt.appendChild(breadcrumb);
  }

  main.appendChild(txt);
  li.appendChild(main);

  return li;
}
function doSearch(q, resultsEl, items) {
  const term = q.trim().toLowerCase();
  resultsEl.innerHTML = "";
  if (!term) {
    return {
      term,
      mode: "empty",
      hits: [],
      suggestions: [],
    };
  }
  const tokens = term.split(/\s+/);
  const hits = items
    .map((item) => ({ item, score: scoreSearchBundle(item, tokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((row) => row.item);
  if (hits.length) {
    hits.forEach((i) => resultsEl.appendChild(render(i, tokens)));
    return {
      term,
      mode: "hits",
      hits,
      suggestions: [],
    };
  } else {
    const suggestions = items
      .map((item) => ({
        item,
        score: tokens
          .map((tok) =>
            Math.min(
              levenshtein(tok, String(item.title || "").toLowerCase()),
              levenshtein(tok, String(item.category || "").toLowerCase()),
              levenshtein(tok, item.breadcrumb.join(" ").toLowerCase()),
            ),
          )
          .reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 6)
      .map((x) => x.item);
    if (suggestions.length) {
      const header = document.createElement("li");
      header.textContent = "Suggestions";
      header.className = "search-results-heading";
      resultsEl.appendChild(header);
      suggestions.forEach((i) => resultsEl.appendChild(render(i, tokens)));
      return {
        term,
        mode: "suggestions",
        hits: [],
        suggestions,
      };
    } else {
      const none = document.createElement("li");
      none.textContent = "No results";
      none.className = "no-results";
      resultsEl.appendChild(none);
      return {
        term,
        mode: "none",
        hits: [],
        suggestions: [],
      };
    }
  }
}
function getSearchPageQueryFromLocation() {
  const params = new URLSearchParams(window.location.search);
  return String(
    params.get("q") || params.get("query") || params.get("s") || "",
  ).trim();
}
function replaceSearchPageQuery(query) {
  const normalized = String(query || "").trim().replace(/\s+/g, " ");
  const url = new URL(window.location.href);
  if (normalized) {
    url.searchParams.set("q", normalized);
  } else {
    url.searchParams.delete("q");
  }
  url.searchParams.delete("query");
  url.searchParams.delete("s");
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl !== currentUrl) {
    history.replaceState(null, "", nextUrl);
  }
}
function renderSearchPageStatus(resultsEl, text, className = "no-results") {
  resultsEl.innerHTML = "";
  const row = document.createElement("li");
  row.className = className;
  row.textContent = text;
  resultsEl.appendChild(row);
}
function renderSearchPageIdleState(resultsEl) {
  resultsEl.innerHTML = "";
  const row = document.createElement("li");
  row.className = "search-page-empty-state";
  row.innerHTML = `
    <strong>Search the collection directly.</strong>
    <span>Try a plain-language query such as <a href="/search/?q=sofa+green">sofa green</a>, <a href="/search/?q=memory+foam+topper">memory foam topper</a>, or <a href="/search/?q=beige+dining+chair">beige dining chair</a>.</span>
  `;
  resultsEl.appendChild(row);
}
function updateSearchPageSummary(summaryNode, query, state) {
  if (!(summaryNode instanceof HTMLElement)) {
    return;
  }
  const cleanedQuery = String(query || "").trim();
  if (!cleanedQuery) {
    summaryNode.textContent =
      "Search across product families, SKU variants, colors, materials, sizes, and key product attributes.";
    return;
  }
  if (state?.mode === "hits") {
    summaryNode.textContent = `Showing ${state.hits.length} top matches for "${cleanedQuery}".`;
    return;
  }
  if (state?.mode === "suggestions") {
    summaryNode.textContent = `No direct matches for "${cleanedQuery}". Showing the closest suggestions instead.`;
    return;
  }
  if (state?.mode === "none") {
    summaryNode.textContent = `No matches found for "${cleanedQuery}". Try a broader product type, color, material, or size term.`;
    return;
  }
  summaryNode.textContent =
    "Search across product families, SKU variants, colors, materials, sizes, and key product attributes.";
}
function initSearchPage() {
  const page = document.querySelector(".search-page");
  if (!(page instanceof HTMLElement)) {
    return;
  }
  const form = page.querySelector("[data-search-page-form]");
  const input = page.querySelector("[data-search-page-input]");
  const results = page.querySelector("[data-search-page-results]");
  const summary = page.querySelector("[data-search-page-summary]");
  if (!(input instanceof HTMLInputElement) || !(results instanceof HTMLElement)) {
    return;
  }
  if (page.dataset.searchPageBound === "true") {
    const nextQuery = getSearchPageQueryFromLocation();
    input.value = nextQuery;
    return;
  }
  page.dataset.searchPageBound = "true";
  let items = [];
  let itemsLoaded = false;
  let itemsLoadingPromise = null;
  let searchRunId = 0;
  function ensureSearchItemsLoaded() {
    if (itemsLoaded) {
      return Promise.resolve(items);
    }
    if (itemsLoadingPromise) {
      return itemsLoadingPromise;
    }
    itemsLoadingPromise = loadItemsFromSearchIndex()
      .then((data) => {
        items = data;
        itemsLoaded = true;
        return data;
      })
      .finally(() => {
        itemsLoadingPromise = null;
      });
    return itemsLoadingPromise;
  }
  function runSearchPageQuery(rawQuery, options = {}) {
    const { syncUrl = true, updateInputValue = true } = options;
    const inputValue = String(rawQuery || "");
    const query = inputValue.trim().replace(/\s+/g, " ");
    const runId = ++searchRunId;
    if (updateInputValue) {
      input.value = query;
    }
    if (syncUrl) {
      replaceSearchPageQuery(query);
    }
    if (!query) {
      renderSearchPageIdleState(results);
      updateSearchPageSummary(summary, "", null);
      return;
    }
    renderSearchPageStatus(results, "Searching...", "search-results-heading");
    ensureSearchItemsLoaded()
      .then(() => {
        if (runId !== searchRunId) {
          return;
        }
        const state = doSearch(query, results, items);
        updateSearchPageSummary(summary, query, state);
      })
      .catch((error) => {
        console.error("[SearchPage] search load failed:", error);
        if (runId !== searchRunId) {
          return;
        }
        renderSearchPageStatus(
          results,
          "Search is not available right now.",
          "no-results",
        );
        updateSearchPageSummary(summary, query, { mode: "none" });
      });
  }
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    runSearchPageQuery(input.value, { updateInputValue: true });
  });
  input.addEventListener("focus", () => {
    ensureSearchItemsLoaded().catch(() => {});
  });
  input.addEventListener("input", () => {
    clearTimeout(input._searchPageTimer);
    input._searchPageTimer = setTimeout(() => {
      runSearchPageQuery(input.value, { updateInputValue: false });
    }, 180);
  });
  runSearchPageQuery(getSearchPageQueryFromLocation());
}
let familyLightboxState = null;
function getFamilyLightbox() {
  let root = document.getElementById("family-lightbox");
  if (root) {
    return root;
  }
  root = document.createElement("div");
  root.id = "family-lightbox";
  root.className = "family-lightbox";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <div class="family-lightbox__topbar">
      <div class="family-lightbox__counter" data-family-lightbox-counter></div>
      <button type="button" class="family-lightbox__button family-lightbox__button--close" data-family-lightbox-close aria-label="Close image viewer">Close</button>
    </div>
    <div class="family-lightbox__viewport">
      <button type="button" class="family-lightbox__button family-lightbox__nav family-lightbox__nav--prev" data-family-lightbox-prev aria-label="Previous image">Prev</button>
      <img class="family-lightbox__image" alt="" data-family-lightbox-image />
      <button type="button" class="family-lightbox__button family-lightbox__nav family-lightbox__nav--next" data-family-lightbox-next aria-label="Next image">Next</button>
    </div>
    <div class="family-lightbox__footer">
      <p class="family-lightbox__caption" data-family-lightbox-caption></p>
    </div>
  `;
  document.body.appendChild(root);
  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-family-lightbox-close]")) {
      event.preventDefault();
      event.stopPropagation();
      closeFamilyLightbox();
      return;
    }
    if (event.target === root || !event.target.closest(".family-lightbox__topbar, .family-lightbox__viewport, .family-lightbox__footer")) {
      closeFamilyLightbox();
    }
  });
  root
    .querySelector("[data-family-lightbox-close]")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeFamilyLightbox();
    });
  root
    .querySelector("[data-family-lightbox-prev]")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      stepFamilyLightbox(-1);
    });
  root
    .querySelector("[data-family-lightbox-next]")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      stepFamilyLightbox(1);
    });
  return root;
}
function getFamilyLightboxCaption(figure) {
  const caption = figure?.querySelector("figcaption");
  return caption ? caption.textContent.trim() : "";
}
function collectFamilyLightboxItems(seedFigure) {
  const pageRoot =
    seedFigure?.closest(".family-product-page") ||
    document.querySelector(".family-product-page");
  if (!pageRoot) {
    return [];
  }
  const figures = Array.from(
    pageRoot.querySelectorAll(
      ".family-product-media-figure, .family-gallery-item",
    ),
  );
  const seen = new Set();
  const items = [];
  for (const figure of figures) {
    const img = figure.querySelector("img");
    if (!img) {
      continue;
    }
    const src = resolveSiteUrl(img.getAttribute("src") || img.src || "");
    if (!src || seen.has(src)) {
      continue;
    }
    seen.add(src);
    items.push({
      src,
      alt: img.getAttribute("alt") || "",
      caption: getFamilyLightboxCaption(figure),
      mirrored: img.classList.contains("family-image--mirrored-handedness"),
    });
  }
  return items;
}
function renderFamilyLightbox() {
  if (!familyLightboxState?.items?.length) {
    return;
  }
  const root = getFamilyLightbox();
  const image = root.querySelector("[data-family-lightbox-image]");
  const caption = root.querySelector("[data-family-lightbox-caption]");
  const counter = root.querySelector("[data-family-lightbox-counter]");
  const prev = root.querySelector("[data-family-lightbox-prev]");
  const next = root.querySelector("[data-family-lightbox-next]");
  const index = Math.max(
    0,
    Math.min(familyLightboxState.index, familyLightboxState.items.length - 1),
  );
  familyLightboxState.index = index;
  const current = familyLightboxState.items[index];
  image.src = current.src;
  image.alt = current.alt || current.caption || "Product image";
  image.classList.toggle("family-image--mirrored-handedness", Boolean(current.mirrored));
  caption.textContent = current.caption || current.alt || "";
  counter.textContent = `${index + 1} / ${familyLightboxState.items.length}`;
  const isSingle = familyLightboxState.items.length < 2;
  prev.hidden = isSingle;
  next.hidden = isSingle;
}
function openFamilyLightbox(items, index = 0) {
  if (!Array.isArray(items) || !items.length) {
    return;
  }
  const root = getFamilyLightbox();
  familyLightboxState = {
    items,
    index: Math.max(0, Math.min(index, items.length - 1)),
  };
  renderFamilyLightbox();
  root.classList.add("is-open");
  root.setAttribute("aria-hidden", "false");
  lockScrollPreservePosition();
}
function closeFamilyLightbox() {
  const root = document.getElementById("family-lightbox");
  if (!root || !root.classList.contains("is-open")) {
    familyLightboxState = null;
    return;
  }
  root.classList.remove("is-open");
  root.setAttribute("aria-hidden", "true");
  familyLightboxState = null;
  unlockScrollRestorePosition();
}
function stepFamilyLightbox(direction) {
  if (!familyLightboxState?.items?.length) {
    return;
  }
  const length = familyLightboxState.items.length;
  familyLightboxState.index =
    (familyLightboxState.index + direction + length) % length;
  renderFamilyLightbox();
}
function enhanceFamilyLightboxTargets(root = document) {
  const figures = root.querySelectorAll(
    ".family-product-media-figure, .family-gallery-item",
  );
  figures.forEach((figure) => {
    figure.classList.add("family-lightbox-trigger");
    figure.setAttribute("role", "button");
    figure.setAttribute("tabindex", "0");
    if (!figure.getAttribute("aria-label")) {
      const label =
        getFamilyLightboxCaption(figure) ||
        figure.querySelector("img")?.getAttribute("alt") ||
        "Open image viewer";
      figure.setAttribute("aria-label", label);
    }
  });
}
function parseHandednessMirrorMeta(rawSrc) {
  const src = String(rawSrc || "");
  const fileName = src.split("/").pop() || "";
  const match = fileName.match(/_(left|right)_(\d+)\.[a-z0-9]+$/i);
  if (!match) {
    return null;
  }
  return {
    sourceSide: match[1].toLowerCase(),
    imageIndex: Number(match[2]) || 0,
  };
}
function detectPageHandedness(root = document) {
  const scope = root?.closest?.(".family-product-page") || root || document;
  const swatchGroups = Array.from(scope.querySelectorAll(".family-variant-swatch-group"));
  for (const group of swatchGroups) {
    const label = group.querySelector(".family-variant-swatch-label")?.textContent || "";
    if (!/handedness/i.test(label)) {
      continue;
    }
    const active = group.querySelector(".family-variant-swatch.is-active span, .family-variant-swatch[aria-current='page'] span");
    const value = detectSearchHandedness(active?.textContent || "");
    if (value) {
      return value.toLowerCase();
    }
  }
  const summaryText = [
    scope.querySelector(".family-product-summary")?.textContent,
    scope.querySelector("meta[name='description']")?.getAttribute("content"),
    scope.querySelector("h1")?.textContent,
  ].filter(Boolean).join(" ");
  return detectSearchHandedness(summaryText).toLowerCase();
}
function rewriteMirroredHandednessAltText(text, targetSide, sourceSide) {
  const altText = String(text || "").trim();
  if (!altText) {
    return `${targetSide === "left" ? "Left" : "Right"}-hand layout image`;
  }
  const replaceLeft = /\bleft(?:[\s-]+side|[\s-]+hand(?:ed)?)?\b/gi;
  const replaceRight = /\bright(?:[\s-]+side|[\s-]+hand(?:ed)?)?\b/gi;
  if (sourceSide === "left" && targetSide === "right" && replaceLeft.test(altText)) {
    return altText.replace(/\bleft(?:[\s-]+side|[\s-]+hand(?:ed)?)?\b/gi, (match) =>
      match.charAt(0) === match.charAt(0).toUpperCase() ? "Right" : "right",
    );
  }
  if (sourceSide === "right" && targetSide === "left" && replaceRight.test(altText)) {
    return altText.replace(/\bright(?:[\s-]+side|[\s-]+hand(?:ed)?)?\b/gi, (match) =>
      match.charAt(0) === match.charAt(0).toUpperCase() ? "Left" : "left",
    );
  }
  return `${altText}, mirrored to show ${targetSide}-hand layout`;
}
function applyHandednessMirror(root = document) {
  const figures = Array.from(
    root.querySelectorAll(
      ".family-product-media-figure img, .family-gallery-item img",
    ),
  );
  figures.forEach((img) => {
    const meta = parseHandednessMirrorMeta(img.getAttribute("src") || img.src || "");
    const scope = img.closest(".family-product-page") || document;
    const currentHandedness = detectPageHandedness(scope);
    if (!meta || !currentHandedness || currentHandedness === meta.sourceSide) {
      if (img.dataset.originalAlt) {
        img.alt = img.dataset.originalAlt;
      }
      img.classList.remove("family-image--mirrored-handedness");
      img.removeAttribute("data-handedness-mirrored");
      return;
    }
    if (!img.dataset.originalAlt) {
      img.dataset.originalAlt = img.getAttribute("alt") || "";
    }
    img.classList.add("family-image--mirrored-handedness");
    img.setAttribute("data-handedness-mirrored", "true");
    img.alt = rewriteMirroredHandednessAltText(
      img.dataset.originalAlt,
      currentHandedness,
      meta.sourceSide,
    );
  });
}
function scheduleHandednessMirrorRefresh() {
  if (scheduleHandednessMirrorRefresh.frame) {
    cancelAnimationFrame(scheduleHandednessMirrorRefresh.frame);
  }
  scheduleHandednessMirrorRefresh.frame = requestAnimationFrame(() => {
    applyHandednessMirror(document);
  });
}
function initHandednessMirrorSupport() {
  scheduleHandednessMirrorRefresh();
  if (initHandednessMirrorSupport.initialized) {
    return;
  }
  initHandednessMirrorSupport.initialized = true;
  const observer = new MutationObserver(() => {
    scheduleHandednessMirrorRefresh();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "alt", "class", "aria-current"],
  });
}
function initFamilyLightbox() {
  enhanceFamilyLightboxTargets(document);
  document.body.addEventListener("click", (event) => {
    const figure = event.target.closest(
      ".family-product-media-figure, .family-gallery-item",
    );
    if (!figure) {
      return;
    }
    const items = collectFamilyLightboxItems(figure);
    const currentImage = figure.querySelector("img");
    const currentSrc = resolveSiteUrl(
      currentImage?.getAttribute("src") || currentImage?.src || "",
    );
    const index = Math.max(
      0,
      items.findIndex((item) => item.src === currentSrc),
    );
    openFamilyLightbox(items, index);
  });
  document.body.addEventListener("keydown", (event) => {
    const figure = event.target.closest?.(
      ".family-product-media-figure, .family-gallery-item",
    );
    if (!figure || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }
    event.preventDefault();
    const items = collectFamilyLightboxItems(figure);
    const currentImage = figure.querySelector("img");
    const currentSrc = resolveSiteUrl(
      currentImage?.getAttribute("src") || currentImage?.src || "",
    );
    const index = Math.max(
      0,
      items.findIndex((item) => item.src === currentSrc),
    );
    openFamilyLightbox(items, index);
  });
  document.addEventListener("keydown", (event) => {
    const isOpen = document
      .getElementById("family-lightbox")
      ?.classList.contains("is-open");
    if (!isOpen) {
      return;
    }
    if (event.key === "Escape") {
      closeFamilyLightbox();
    } else if (event.key === "ArrowLeft") {
      stepFamilyLightbox(-1);
    } else if (event.key === "ArrowRight") {
      stepFamilyLightbox(1);
    }
  });
  initHandednessMirrorSupport();
}
function ensureLazySearchHost() {
  const hasControls = (wrapper) =>
    wrapper instanceof HTMLElement &&
    Boolean(
      wrapper.querySelector(".search-form") &&
        wrapper.querySelector(".search-button") &&
        wrapper.querySelector(".search-input") &&
        wrapper.querySelector(".search-results") &&
        wrapper.querySelector(".search-panel"),
    );
  const existingHosts = Array.from(document.querySelectorAll("[data-lazy-search-host]"));
  const prioritizedHosts = [
    ...existingHosts.filter((node) => node.closest("#site-header")),
    ...existingHosts.filter((node) => !node.closest("#site-header")),
  ];
  let host =
    prioritizedHosts.find((node) => hasControls(node.querySelector(".search-wrapper"))) ||
    prioritizedHosts[0] ||
    null;
  const existingWrappers = Array.from(document.querySelectorAll(".search-wrapper"));
  const validWrapper = existingWrappers.find((node) => hasControls(node)) || null;
  let wrapper =
    (host && hasControls(host.querySelector(".search-wrapper")) && host.querySelector(".search-wrapper")) ||
    validWrapper ||
    null;
  existingWrappers.forEach((node) => {
    if (node !== wrapper) {
      node.remove();
    }
  });
  if (!host) {
    return { host: null, wrapper: wrapper || null };
  }
  if (wrapper && !host.contains(wrapper)) {
    host.replaceChildren(wrapper);
  }
  existingHosts.forEach((node) => {
    if (node !== host) {
      node.remove();
    }
  });
  const hostWrapper = host?.querySelector(".search-wrapper") || null;
  return {
    host,
    wrapper: hasControls(hostWrapper) ? hostWrapper : wrapper,
  };
}
let lazySearchRetryTimer = null;
let lazySearchRetryObserver = null;
let lazySearchRetryAttempts = 0;
function clearLazySearchRetry() {
  if (lazySearchRetryTimer) {
    window.clearTimeout(lazySearchRetryTimer);
    lazySearchRetryTimer = null;
  }
  if (lazySearchRetryObserver) {
    lazySearchRetryObserver.disconnect();
    lazySearchRetryObserver = null;
  }
  lazySearchRetryAttempts = 0;
  lazySearchShellRecoveryAttempted = false;
}
function tryInitLazySearchOnce() {
  const { host, wrapper } = ensureLazySearchHost();
  if (wrapper) {
    clearLazySearchRetry();
    try {
      bindLazySearchWrapper(wrapper);
    } catch (err) {
      console.error("[LazySearch] init error:", err);
    }
    return true;
  }
  return { host: Boolean(host), wrapper: Boolean(wrapper) };
}
function scheduleLazySearchRetry() {
  if (lazySearchRetryTimer || lazySearchRetryObserver) {
    return;
  }
  const retry = () => {
    const result = tryInitLazySearchOnce();
    if (result === true) {
      return;
    }
    lazySearchRetryAttempts += 1;
    if (
      !lazySearchShellRecoveryAttempted &&
      lazySearchRetryAttempts >= 4 &&
      document.getElementById("site-header")
    ) {
      lazySearchShellRecoveryAttempted = true;
      recoverShellFromPartialsIfNeeded()
        .then((recovered) => {
          if (recovered) {
            tryInitLazySearchOnce();
          }
        })
        .catch(() => {});
    }
    if (lazySearchRetryAttempts >= 20) {
      const state = ensureLazySearchHost();
      clearLazySearchRetry();
      console.warn("[LazySearch] Search wrapper missing from injected header HTML.", {
        header: Boolean(document.getElementById("site-header")),
        host: Boolean(state.host),
        wrapper: Boolean(state.wrapper),
      });
      return;
    }
    lazySearchRetryTimer = window.setTimeout(() => {
      lazySearchRetryTimer = null;
      retry();
    }, 250);
  };
  lazySearchRetryObserver = new MutationObserver(() => {
    tryInitLazySearchOnce();
  });
  lazySearchRetryObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  retry();
}
function bindLazySearchWrapper(wrapper) {
  if (!wrapper || wrapper.dataset.lazySearchBound === "true") {
    return;
  }
  wrapper.dataset.lazySearchBound = "true";
  let items = [];
  let itemsLoaded = false;
  let itemsLoadingPromise = null;
  let pendingSearchTerm = "";
  let resultsDismissed = false;
  const form = wrapper.querySelector(".search-form");
  const btn = wrapper.querySelector(".search-button");
  const input = wrapper.querySelector(".search-input");
  const results = wrapper.querySelector(".search-results");
  const panel = wrapper.querySelector(".search-panel");
  const resultsCloseBtn = wrapper.querySelector(".search-results-close");
  if (!form || !btn || !input || !results || !panel) {
    throw new Error("search controls missing from injected header");
  }
  const hasQuery = () => input.value.trim().length > 0;
  function syncSearchAccessibility() {
    const isOpen = wrapper.classList.contains("open");
    const queryPresent = hasQuery();
    wrapper.classList.toggle("has-query", queryPresent);
    btn.setAttribute("aria-expanded", String(isOpen));
    btn.setAttribute(
      "aria-label",
      queryPresent ? "Clear search" : "Search products",
    );
    btn.setAttribute(
      "title",
      queryPresent ? "Clear search" : "Search products",
    );
    input.setAttribute("aria-expanded", String(isOpen));
    panel.toggleAttribute("inert", !isOpen);
    setHiddenPanelFocusable(panel, isOpen);
    if (resultsCloseBtn) {
      resultsCloseBtn.tabIndex = isOpen ? 0 : -1;
      resultsCloseBtn.setAttribute("aria-hidden", String(!isOpen));
    }
  }
  function setSearchOpen(shouldOpen, options = {}) {
    const { focus = false } = options;
    const isOpen = Boolean(shouldOpen && hasQuery());
    wrapper.classList.toggle("open", isOpen);
    syncSearchAccessibility();
    if (focus) {
      focusSearchInputSafely();
    }
  }
  function clearSearchResults() {
    clearTimeout(input._searchTimer);
    results.innerHTML = "";
  }
  function clearSearchInput(options = {}) {
    const { focus = false } = options;
    pendingSearchTerm = "";
    resultsDismissed = false;
    input.value = "";
    clearSearchResults();
    setSearchOpen(false);
    if (focus) {
      focusSearchInputSafely();
    }
  }
  function closeSearchResults(options = {}) {
    const { preserveDismissedState = true } = options;
    if (!preserveDismissedState) {
      resultsDismissed = false;
    }
    setSearchOpen(false);
  }
  function ensureSearchItemsLoaded() {
    if (itemsLoaded) {
      return Promise.resolve(items);
    }
    if (itemsLoadingPromise) {
      return itemsLoadingPromise;
    }
    itemsLoadingPromise = loadItemsFromSearchIndex()
      .then((data) => {
        items = data;
        itemsLoaded = true;
        return data;
      })
      .catch((err) => {
        console.error("[LazySearch] product load failed:", err);
        renderSearchMessage("Search is not available right now.", "no-results");
        throw err;
      })
      .finally(() => {
        itemsLoadingPromise = null;
      });
    return itemsLoadingPromise;
  }
  function updateSearchViewportHeight() {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    if (!viewportHeight) {
      return;
    }
    document.documentElement.style.setProperty(
      "--search-viewport-height",
      `${Math.round(viewportHeight)}px`,
    );
  }
  function runSearch(term, options = {}) {
    const { forceOpen = false } = options;
    const trimmedTerm = term.trim();
    pendingSearchTerm = term;
    syncSearchAccessibility();
    if (!trimmedTerm) {
      clearSearchResults();
      resultsDismissed = false;
      setSearchOpen(false);
      return;
    }
    ensureSearchItemsLoaded()
      .then(() => {
        if (input.value.trim()) {
          doSearch(input.value, results, items);
          if (!resultsDismissed || forceOpen) {
            setSearchOpen(true);
          }
        }
      })
      .catch(() => {});
  }
  updateSearchViewportHeight();
  window.addEventListener("resize", updateSearchViewportHeight);
  window.visualViewport?.addEventListener("resize", updateSearchViewportHeight);
  syncSearchAccessibility();
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasQuery()) {
      clearSearchInput({ focus: true });
      return;
    }
    resultsDismissed = false;
    focusSearchInputSafely();
    ensureSearchItemsLoaded().catch(() => {});
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    resultsDismissed = false;
    runSearch(input.value, { forceOpen: true });
  });
  document.addEventListener("click", (e) => {
    if (wrapper.classList.contains("open") && !wrapper.contains(e.target)) {
      closeSearchResults({ preserveDismissedState: false });
    }
  });
  resultsCloseBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    resultsDismissed = true;
    closeSearchResults();
  });
  wrapper.addEventListener("search-result-activate", (event) => {
    const href = event.detail?.href;
    clearSearchInput();
    input.blur();
    if (!href) {
      return;
    }
    window.setTimeout(() => {
      loadPageViaAjax(href, { replaceState: false }).catch((err) => {
        console.error("[Search] Result card navigation failed:", err);
        window.location.href = href;
      });
    }, 180);
  });
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      (wrapper.classList.contains("open") || document.activeElement === input)
    ) {
      resultsDismissed = true;
      closeSearchResults();
      input.blur();
    }
  });
  input.addEventListener("focus", () => {
    ensureSearchItemsLoaded().catch(() => {});
    if (hasQuery()) {
      resultsDismissed = false;
      runSearch(input.value, { forceOpen: true });
    }
  });
  input.addEventListener("input", () => {
    const searchTerm = input.value;
    pendingSearchTerm = searchTerm;
    resultsDismissed = false;
    syncSearchAccessibility();
    if (!searchTerm.trim()) {
      clearSearchResults();
      setSearchOpen(false);
      return;
    }
    clearTimeout(input._searchTimer);
    input._searchTimer = setTimeout(() => {
      runSearch(searchTerm, { forceOpen: true });
    }, 200);
  });
  function collectAccessibleScrollTargets() {
    const targets = [];
    let currentWindow = window;
    while (currentWindow) {
      try {
        targets.push({
          targetWindow: currentWindow,
          scrollLeft: currentWindow.scrollX || currentWindow.pageXOffset || 0,
          scrollTop: currentWindow.scrollY || currentWindow.pageYOffset || 0,
        });
        if (currentWindow === currentWindow.parent) {
          break;
        }
        currentWindow = currentWindow.parent;
      } catch {
        break;
      }
    }
    return targets;
  }
  function restoreScrollTargets(targets) {
    for (const target of targets) {
      try {
        target.targetWindow.scrollTo(target.scrollLeft, target.scrollTop);
      } catch {
        // Cross-origin preview shells cannot be restored from inside the iframe.
      }
    }
  }
  function focusSearchInputSafely() {
    const scrollTargets = collectAccessibleScrollTargets();
    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
    requestAnimationFrame(() => {
      restoreScrollTargets(scrollTargets);
      requestAnimationFrame(() => restoreScrollTargets(scrollTargets));
    });
    setTimeout(() => restoreScrollTargets(scrollTargets), 120);
  }
  function renderSearchMessage(text, className) {
    results.innerHTML = "";
    const row = document.createElement("li");
    row.textContent = text;
    row.className = className;
    results.appendChild(row);
  }
}
function initLazySearch() {
  const result = tryInitLazySearchOnce();
  if (result !== true) {
    scheduleLazySearchRetry();
  }
}
function initApplicationForms() {
  const forms = Array.from(document.querySelectorAll("[data-application-form]"));
  if (!forms.length) {
    return;
  }
  const isoDate = new Date().toISOString().slice(0, 10);
  for (const form of forms) {
    for (const dateField of form.querySelectorAll("[data-today-field]")) {
      if (!dateField.value) {
        dateField.value = isoDate;
      }
    }

    const imageInput = form.querySelector("[data-image-input]");
    const imagePreview = form.querySelector("[data-image-preview]");
    const renderImagePreview = (file) => {
      if (!imagePreview) {
        return;
      }
      if (!file || !String(file.type || "").startsWith("image/")) {
        imagePreview.innerHTML = "<p>No image selected.</p>";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        imagePreview.innerHTML = "";
        const img = document.createElement("img");
        img.src = String(reader.result || "");
        img.alt = file.name || "Selected application image";
        imagePreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    };

    imageInput?.addEventListener("change", () => {
      renderImagePreview(imageInput.files?.[0] || null);
    });

    form.addEventListener("reset", () => {
      window.setTimeout(() => {
        for (const dateField of form.querySelectorAll("[data-today-field]")) {
          dateField.value = isoDate;
        }
        renderImagePreview(null);
      }, 0);
    });
  }

  for (const button of document.querySelectorAll("[data-application-print]")) {
    button.addEventListener("click", () => {
      const originalTitle = document.title;
      const printTitle = button.getAttribute("data-pdf-title");
      if (printTitle) {
        document.title = printTitle;
      }
      const restoreTitle = () => {
        document.title = originalTitle;
        window.removeEventListener("afterprint", restoreTitle);
      };
      window.addEventListener("afterprint", restoreTitle);
      window.print();
      window.setTimeout(restoreTitle, 800);
    });
  }

  for (const button of document.querySelectorAll("[data-application-reset]")) {
    button.addEventListener("click", () => {
      button.closest(".application-page-main")?.querySelector("[data-application-form]")?.reset();
    });
  }
}
document.addEventListener("DOMContentLoaded", initLazySearch);
document.addEventListener("DOMContentLoaded", initSearchPage);
document.addEventListener("DOMContentLoaded", initFamilyLightbox);
document.addEventListener("DOMContentLoaded", initApplicationForms);

function sendMail() {
  var msg = encodeURIComponent(document.getElementById("message").value);
  var from = encodeURIComponent(document.getElementById("email").value);
  var subject = encodeURIComponent("Support Request");
  var body = msg + "\n\nFrom: " + from;
  window.location.href =
    "mailto:support@nestliving.dk" + "?subject=" + subject + "&body=" + body;
}
