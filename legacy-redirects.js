(function () {
  function normalizeLegacyPath(value) {
    var path = String(value || "/").split("#")[0].split("?")[0] || "/";
    try {
      path = decodeURI(path);
    } catch (error) {
      path = String(value || "/");
    }
    path = path.replace(/\/+/g, "/");
    if (path.charAt(0) !== "/") path = "/" + path;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return path || "/";
  }

  function withCurrentSuffix(target) {
    var suffix = window.location.search || "";
    suffix += window.location.hash || "";
    return target + suffix;
  }

  window.resolveNestLegacyRedirect = async function resolveNestLegacyRedirect(pathname) {
    var currentPath = normalizeLegacyPath(pathname || window.location.pathname);
    var candidates = [currentPath];
    if (/\.html$/i.test(currentPath)) {
      candidates.push(currentPath.replace(/\.html$/i, ""));
    } else {
      candidates.push(currentPath + ".html");
    }
    try {
      var response = await fetch("/data/legacy-redirects.json", { cache: "force-cache" });
      if (!response.ok) return "";
      var payload = await response.json();
      var redirects = payload && payload.redirects && typeof payload.redirects === "object"
        ? payload.redirects
        : {};
      for (var i = 0; i < candidates.length; i += 1) {
        var target = redirects[normalizeLegacyPath(candidates[i])];
        if (target && normalizeLegacyPath(target) !== currentPath && target.charAt(0) === "/") {
          return withCurrentSuffix(normalizeLegacyPath(target));
        }
      }
    } catch (error) {
      return "";
    }
    return "";
  };

  window.applyNestLegacyRedirect = async function applyNestLegacyRedirect() {
    var target = await window.resolveNestLegacyRedirect(window.location.pathname);
    if (target) {
      window.location.replace(target);
      return true;
    }
    return false;
  };
}());
