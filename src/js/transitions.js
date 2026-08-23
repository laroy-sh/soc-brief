// Cross-document view transitions. The CSS opts the site in; this decides what
// kind of transition each navigation is, and pairs the two elements that should
// morph rather than crossfade.
//
// Firefox has no cross-document view transitions: none of this runs there, and
// navigation stays exactly as it was.

const BRIEF = /^\/briefs\/(\d{4}-\d{2}-\d{2})/;

const type = (fromUrl, toUrl, el) => {
  if (el && el.closest(".calendar")) return "open-week";
  if (el && el.classList.contains("brief-nav__link")) {
    return el.classList.contains("brief-nav__link--next") ? "week-next" : "week-prev";
  }
  const from = BRIEF.exec(new URL(fromUrl).pathname);
  const to = BRIEF.exec(new URL(toUrl).pathname);
  if (from && to) return to[1] > from[1] ? "week-next" : "week-prev";
  return "cross";
};

// The link that started this navigation, if a click did. Recorded on the way
// down so `pageswap` can tell a calendar cell from a footer link.
let clicked = null;
document.addEventListener("click", (e) => {
  clicked = e.target.closest && e.target.closest("a[href]");
}, true);

const name = (el, value) => {
  if (!el) return;
  el.style.viewTransitionName = value;
};

const typed = (vt, kind) => vt.types && vt.types.add(kind);

window.addEventListener("pageswap", (e) => {
  if (!e.viewTransition) return;
  const to = e.activation.entry.url;
  const kind = type(location.href, to, clicked);
  typed(e.viewTransition, kind);
  // A calendar cell grows into the issue it opens. The name has to come off
  // again if this page returns from the back/forward cache, or a second click
  // on a different week would leave two elements claiming it.
  if (kind === "open-week" && clicked) {
    const cell = clicked;
    name(cell, "issue-open");
    addEventListener("pageshow", () => name(cell, ""), { once: true });
  }
});

window.addEventListener("pagereveal", (e) => {
  if (!e.viewTransition || typeof navigation === "undefined") return;
  const from = navigation.activation && navigation.activation.from && navigation.activation.from.url;
  if (!from) return;
  const kind = type(from, location.href, null);
  const cell = BRIEF.exec(new URL(from).pathname)
    ? null
    : document.querySelector(`.calendar a[href="${location.pathname}"]`);
  // Arriving from a page whose calendar held this week: the title is the other
  // half of that morph. Otherwise it is a directional week change.
  const opening = !BRIEF.test(new URL(from).pathname) && BRIEF.test(location.pathname);
  typed(e.viewTransition, opening ? "open-week" : kind);
  if (opening) name(document.querySelector(".brief__title"), "issue-open");
  // The name must not outlive the transition, or the next one inherits it.
  e.viewTransition.finished.finally(() => {
    name(document.querySelector(".brief__title"), "");
    name(cell, "");
  });
});
