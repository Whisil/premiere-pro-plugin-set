(function () {
  function hostFrom(arg) {
    if (arg && arg.node && arg.node.nodeType === 1) return arg.node;
    if (arg && arg.nodeType === 1) return arg;
    return document.body;
  }

  function ensureRoot(host) {
    var root = document.getElementById("root");
    if (!root) {
      root = document.createElement("div");
      root.id = "root";
    }
    if (host && host !== root && root.parentNode !== host) {
      host.appendChild(root);
    }
    return root;
  }

  function mount(arg) {
    var root = ensureRoot(hostFrom(arg));
    window.__moneymovesPanelRoot = root;
    if (typeof window.__moneymovesMount === "function") {
      window.__moneymovesMount(root);
    }
  }

  try {
    require("uxp").entrypoints.setup({
      panels: {
        moneymovesPanel: {
          create: mount,
          show: mount,
        },
      },
    });
  } catch (err) {
    // Browser preview: UXP is intentionally unavailable.
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      mount();
    });
  } else {
    mount();
  }
})();
