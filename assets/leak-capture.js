/*!
 * leak-capture.js - Pre-Approved
 * Turns the leak calculator from a toy into a captured lead, and hands the
 * visitor off to the real audit on Carscu. Progressive enhancement: if the
 * calculator is not on the page, this file does nothing.
 */
(function () {
  "use strict";

  var tag = document.currentScript || document.querySelector("script[data-leak-capture]");

  function conf(name, fallback) {
    var v = tag && tag.getAttribute(name);
    return v && v.length ? v : fallback;
  }

  var ENDPOINT = conf("data-endpoint", "https://www.carscu.com/api/leak-audit");
  var AUDIT_URL = conf("data-audit-url", "https://www.carscu.com/audit");
  var PRODUCT_URL = conf("data-product-url", "https://www.carscu.com/");

  function byId(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function track(name, params) {
    try {
      if (typeof window.gtag === "function") window.gtag("event", name, params || {});
    } catch (e) { /* analytics must never break the page */ }
  }

  function num(id) {
    var el = byId(id);
    var n = el ? parseFloat(el.value) : NaN;
    return isFinite(n) ? n : null;
  }

  /* ------------------------------------------------------------- capture */

  function mountCapture() {
    var result = byId("leakDollars");
    if (!result) return;

    var host = result.closest(".calc") || result.parentNode;
    if (!host || host.querySelector(".leak-capture")) return;

    var box = document.createElement("div");
    box.className = "leak-capture reveal";
    box.innerHTML =
      '<p class="calc__note"><strong>That is your assumption, not your data.</strong> ' +
      "Every credit union files new- and used-auto balances, member count and peer " +
      "group with the NCUA every quarter, and those filings are public. We will pull " +
      "yours, show the arithmetic, and send back a one-page audit you can hand to your CFO." +
      "</p>" +
      '<form id="leakCaptureForm" class="form" novalidate>' +
        '<div class="form__row">' +
          '<label for="lc-org">Credit union</label>' +
          '<input id="lc-org" name="org" type="text" autocomplete="organization" required>' +
        "</div>" +
        '<div class="form__row">' +
          '<label for="lc-email">Work email</label>' +
          '<input id="lc-email" name="email" type="email" autocomplete="email" required>' +
        "</div>" +
        '<button class="btn" type="submit">Send me the audit<span class="btn__arrow">&rarr;</span></button>' +
        '<p id="lc-msg" class="form__msg" role="status" aria-live="polite"></p>' +
        '<p class="calc__hint">One report, sent once. No spam, unsubscribe anytime.</p>' +
      "</form>" +
      '<p class="calc__note"><a class="btn btn--ghost" href="' + AUDIT_URL + '">' +
      'Or run it yourself on Carscu<span class="btn__arrow">&rarr;</span></a></p>';

    host.appendChild(box);

    var form = byId("leakCaptureForm");
    var msg = byId("lc-msg");
    var sent = false;

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (sent) return;

      var org = (byId("lc-org").value || "").trim();
      var email = (byId("lc-email").value || "").trim();

      if (!org || email.indexOf("@") < 1) {
        msg.textContent = "Add your credit union and a work email and we will run it.";
        return;
      }

      sent = true;
      msg.textContent = "Running the numbers...";

      var payload = {
        source: "preapprovedmethod.com/leak-calculator",
        organization: org,
        email: email,
        assumptions: {
          applications: num("apps"),
          approvalRatePct: num("appr"),
          fundedOfApprovedPct: num("fund"),
          lifetimeIncomePerLoan: num("income")
        },
        estimate: {
          leakDollars: (byId("leakDollars") || {}).textContent || null,
          loansLost: (byId("outLost") || {}).textContent || null
        }
      };

      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          return r;
        })
        .then(function () {
          form.innerHTML =
            '<p class="calc__big">On its way.</p>' +
            '<p class="calc__sub">We will send the 5300-sourced audit for ' + esc(org) +
            " within one business day.</p>" +
            '<p class="calc__note"><a class="btn" href="' + AUDIT_URL +
            '">See the live version now<span class="btn__arrow">&rarr;</span></a></p>';
          track("leak_audit_requested", { organization: org });
        })
        .catch(function () {
          sent = false;
          msg.textContent = "That did not send. Use the contact form below and we will run it by hand.";
          track("leak_audit_failed", {});
        });
    });

    track("leak_capture_shown", {});
  }

  /* ----------------------------------------------------- product handoff */

  function link(href, text) {
    var a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    a.setAttribute("data-carscu", "");
    a.addEventListener("click", function () { track("carscu_outbound", { from: text }); });
    return a;
  }

  function mountProductLinks() {
    var nav = document.querySelector(".nav__links");
    if (nav && !nav.querySelector("[data-carscu]")) {
      nav.insertBefore(link(PRODUCT_URL, "Carscu"), nav.lastElementChild);
    }

    var footer = document.querySelector(".footer__links");
    if (footer && !footer.querySelector("[data-carscu]")) {
      footer.appendChild(link(PRODUCT_URL, "Carscu"));
    }
  }

  function init() {
    mountCapture();
    mountProductLinks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
