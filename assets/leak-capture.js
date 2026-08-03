/* Free Audit of the Auto Loan Retention
   Captures the leak calculator on the book site, sends the request to the CRM,
   and hands the reader off to the Carscu audit. Progressive enhancement: if any
   of this fails the page keeps working exactly as it did before. */
(function () {
  "use strict";

  var tag = document.querySelector("script[data-leak-capture]");
  if (!tag) return;

  var CFG = {
    webhook: tag.getAttribute("data-webhook") || "",
    auditUrl: tag.getAttribute("data-audit-url") || "",
    productUrl: tag.getAttribute("data-product-url") || "",
    trigger: tag.getAttribute("data-trigger") || "Free Audit of the Auto Loan Retention"
  };

  var FRAME_NAME = "leak_audit_sink";

  function byId(id) {
    return document.getElementById(id);
  }

  function readValue(id) {
    var el = byId(id);
    if (!el) return "";
    var v = el.value;
    if (v === undefined || v === null || v === "") v = el.textContent || "";
    return String(v).trim();
  }

  function param(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || "";
    } catch (e) {
      return "";
    }
  }

  function track(name, params) {
    try {
      if (typeof window.gtag === "function") window.gtag("event", name, params || {});
    } catch (e) {}
  }

  /* Same transport the other two forms on this page already use: a hidden
     iframe target, so a static page can post to the CRM without CORS. */
  function sink() {
    var frame = document.getElementById(FRAME_NAME);
    if (frame) return frame;
    frame = document.createElement("iframe");
    frame.id = FRAME_NAME;
    frame.name = FRAME_NAME;
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("tabindex", "-1");
    frame.style.position = "absolute";
    frame.style.left = "-9999px";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.border = "0";
    document.body.appendChild(frame);
    return frame;
  }

  function post(fields) {
    if (!CFG.webhook) return false;
    sink();
    var form = document.createElement("form");
    form.method = "POST";
    form.action = CFG.webhook;
    form.target = FRAME_NAME;
    form.style.display = "none";
    Object.keys(fields).forEach(function (key) {
      var input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = fields[key] == null ? "" : String(fields[key]);
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    window.setTimeout(function () {
      if (form.parentNode) form.parentNode.removeChild(form);
    }, 5000);
    return true;
  }

  var MARKUP = [
    '<h3 style="margin:1.6rem 0 .4rem">Get this number from your own call report</h3>',
    '<p class="calc__note">The figures above are your estimates. Ask for the audit and you get the same arithmetic built from your NCUA 5300 filing \u2014 your auto balances against your membership and your peer group. It is free, and it does not require a meeting.</p>',
    '<form class="capture-form" data-leak-form novalidate>',
    '<div class="form__row">',
    '<label>Name<input type="text" name="name" autocomplete="name" required></label>',
    '<label>Credit union<input type="text" name="organization" autocomplete="organization" required></label>',
    '</div>',
    '<div class="form__row">',
    '<label>Work email<input type="email" name="email" autocomplete="email" required></label>',
    '<label>NCUA charter number (optional)<input type="text" name="charter_number" inputmode="numeric" autocomplete="off"></label>',
    '</div>',
    '<div style="position:absolute;left:-9999px" aria-hidden="true"><input type="text" name="company_website" tabindex="-1" autocomplete="off"></div>',
    '<button class="btn" type="submit">Send me the free audit<span class="btn__arrow">\u2192</span></button>',
    '<p class="form__msg" role="status" aria-live="polite"></p>',
    '</form>'
  ].join("");

  function mount() {
    var anchor = byId("leakDollars");
    if (!anchor || !CFG.webhook) return;
    var host = (anchor.closest && anchor.closest(".calc")) || anchor.parentNode;
    if (!host || host.querySelector("[data-leak-form]")) return;

    var block = document.createElement("div");
    block.className = "capture";
    block.innerHTML = MARKUP;
    host.appendChild(block);

    var form = block.querySelector("form");
    var msg = block.querySelector(".form__msg");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (form.getAttribute("data-sent") === "1") return;

      var name = form.elements.name.value.trim();
      var org = form.elements.organization.value.trim();
      var email = form.elements.email.value.trim();

      if (!name || !org || email.indexOf("@") < 1) {
        msg.textContent = "Name, credit union, and a work email. Then it goes out.";
        return;
      }
      if (form.elements.company_website.value) return;

      var sent = post({
        form_name: CFG.trigger,
        subject: CFG.trigger + " \u2014 request from the Pre-Approved book site",
        trigger: CFG.trigger,
        name: name,
        organization: org,
        email: email,
        charter_number: form.elements.charter_number.value.trim(),
        applications_per_year: readValue("apps"),
        approval_rate_pct: readValue("appr"),
        funded_rate_pct: readValue("fund"),
        income_per_funded_loan: readValue("income"),
        approved_loans: readValue("outAppr"),
        funded_loans: readValue("outFund"),
        lost_loans: readValue("outLost"),
        lost_income_estimate: readValue("leakDollars"),
        source_site: window.location.hostname,
        source_page: window.location.pathname,
        referrer: document.referrer || "",
        utm_source: param("utm_source"),
        utm_medium: param("utm_medium"),
        utm_campaign: param("utm_campaign"),
        utm_term: param("utm_term"),
        utm_content: param("utm_content")
      });

      if (!sent) {
        msg.textContent = "Something is off on our end. Use the contact form below and we will run it by hand.";
        return;
      }

      form.setAttribute("data-sent", "1");
      track("free_audit_request", { form_name: CFG.trigger, organization: org });

      var done = document.createElement("div");
      var parts = ['<p class="calc__note"><strong>Sent.</strong> The audit comes back within two business days, built from your own filing.</p>'];
      if (CFG.auditUrl) {
        parts.push('<p><a class="btn btn--ghost" data-audit-handoff href="' + CFG.auditUrl + '">Or run it yourself now<span class="btn__arrow">\u2192</span></a></p>');
      }
      done.innerHTML = parts.join("");
      form.parentNode.replaceChild(done, form);
    });
  }

  /* One funnel: the book site points at the product, not just at itself. */
  function makeLink(href, label, cls) {
    var a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    if (cls) a.className = cls;
    return a;
  }

  function wire() {
    var nav = document.querySelector(".nav__links");
    if (nav && CFG.auditUrl && !nav.querySelector("[data-carscu-nav]")) {
      var navLink = makeLink(CFG.auditUrl, "Free audit");
      navLink.setAttribute("data-carscu-nav", "");
      navLink.addEventListener("click", function () {
        track("audit_handoff", { placement: "nav" });
      });
      nav.appendChild(navLink);
    }

    var foot = document.querySelector(".footer__links");
    if (foot && !foot.querySelector("[data-carscu-foot]")) {
      if (CFG.auditUrl) {
        var footAudit = makeLink(CFG.auditUrl, "Free auto loan retention audit");
        footAudit.setAttribute("data-carscu-foot", "");
        foot.appendChild(footAudit);
      }
      if (CFG.productUrl) {
        var footProduct = makeLink(CFG.productUrl, "Carscu");
        footProduct.setAttribute("data-carscu-foot", "");
        foot.appendChild(footProduct);
      }
    }

    document.addEventListener("click", function (event) {
      var el = event.target && event.target.closest ? event.target.closest("[data-audit-handoff]") : null;
      if (el) track("audit_handoff", { placement: "calculator" });
    });
  }

  function init() {
    mount();
    wire();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
