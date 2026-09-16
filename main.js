/* =====================================================
   Mr. Mimo Gebäudereinigung — main.js (v1)
   ===================================================== */

/* GHL-Inbound-Webhook des Workflows „Website-Formular (Webhook) → Bestätigung".
   NACH SNAPSHOT-IMPORT HIER EINTRAGEN — solange leer, sendet kein Formular. */
/* FormSubmit-AJAX-Endpoint: sendet jede Anfrage als E-Mail an das Postfach.
   Wichtig: Das Postfach muss den FormSubmit-Aktivierungslink einmalig
   bestätigen, vorher werden keine Mails zugestellt. */
var FORM_WEBHOOK_URL = "https://formsubmit.co/ajax/mimo.elkakoni@gmail.com";

var TELEFON_ANZEIGE = "0176 30547196";
var TELEFON_LINK = "+4917630547196";

if ("scrollRestoration" in history) { history.scrollRestoration = "manual"; }
window.addEventListener("pageshow", function () { window.scrollTo(0, 0); });

/* ---------- Sticky-Bar-Ziel korrigieren ----------
   Seiten ohne Hero-Formular (#anfrage) haben kein Sprungziel. Dann auf das erste
   Formular der Seite umbiegen, sonst auf die Kontaktseite. */
(function () {
  document.querySelectorAll('.aktionsleiste a[href^="#"], .header__cta[href^="#"]').forEach(function (link) {
    var ziel = link.getAttribute("href").slice(1);
    if (ziel && document.getElementById(ziel)) return;
    var karte = document.querySelector(".formular-karte[id]");
    link.setAttribute("href", karte ? "#" + karte.id : "/kontakt/#anfrage");
  });
})();

/* ---------- Mobile Navigation ---------- */
(function () {
  var burger = document.querySelector(".nav-burger");
  var nav = document.querySelector(".nav");
  if (!burger || !nav) return;
  burger.addEventListener("click", function () {
    nav.classList.toggle("nav--offen");
    burger.setAttribute("aria-expanded", nav.classList.contains("nav--offen") ? "true" : "false");
  });
  document.querySelectorAll(".nav__toggle").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var punkt = btn.closest(".nav__punkt");
      document.querySelectorAll(".nav__punkt--offen").forEach(function (p) {
        if (p !== punkt) p.classList.remove("nav__punkt--offen");
      });
      punkt.classList.toggle("nav__punkt--offen");
    });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".nav") && !e.target.closest(".nav-burger")) {
      document.querySelectorAll(".nav__punkt--offen").forEach(function (p) { p.classList.remove("nav__punkt--offen"); });
    }
  });
})();

/* ---------- Anfrage-Formulare → GHL-Webhook ---------- */
(function () {
  document.querySelectorAll("form.anfrage-formular").forEach(function (form) {
    form.setAttribute("novalidate", "");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var status = form.querySelector(".formular-status");
      var knopf = form.querySelector("button[type=submit]");

      /* Honeypot: bei Befüllung stiller Abbruch */
      var honig = form.querySelector("input[name=firma_webseite]");
      if (honig && honig.value !== "") {
        if (status) { status.className = "formular-status formular-status--ok"; status.textContent = "Vielen Dank! Ihre Anfrage ist bei uns eingegangen."; }
        form.reset();
        return;
      }

      if (!FORM_WEBHOOK_URL) {
        if (status) {
          status.className = "formular-status formular-status--fehler";
          status.innerHTML = "Die Online-Übermittlung ist noch nicht freigeschaltet. Rufen Sie uns direkt an: <a href=\"tel:" + TELEFON_LINK + "\"><strong>" + TELEFON_ANZEIGE + "</strong></a>";
        }
        return;
      }

      var daten = {};
      new FormData(form).forEach(function (wert, name) {
        if (name === "firma_webseite") return;
        daten[name] = wert;
      });
      daten.datenschutz = "ja";
      daten.seite = location.href;
      daten.zeitpunkt = new Date().toISOString();

      /* Steuerfelder für FormSubmit: Betreff, Tabellen-Layout, kein Captcha,
         Antworten gehen direkt an die Adresse des Anfragenden. */
      daten._subject = "Neue Anfrage: " + (daten.leistung || "Reinigung") + (daten.ort ? " in " + daten.ort : "");
      daten._template = "table";
      daten._captcha = "false";
      if (daten.email) daten._replyto = daten.email;

      var knopfText = knopf ? knopf.textContent : "";
      if (knopf) { knopf.disabled = true; knopf.textContent = "Wird gesendet …"; }
      if (status) { status.className = "formular-status"; status.textContent = ""; }

      fetch(FORM_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(daten)
      }).then(function (antwort) {
        if (!antwort.ok) throw new Error("HTTP " + antwort.status);
        return antwort.json();
      }).then(function (ergebnis) {
        /* FormSubmit meldet auch mit HTTP 200 einen Fehler im Body —
           z. B. solange das Postfach den Aktivierungslink nicht geklickt hat. */
        if (ergebnis && String(ergebnis.success) === "false") throw new Error(ergebnis.message || "FormSubmit-Fehler");
        if (status) {
          status.className = "formular-status formular-status--ok";
          status.textContent = "Vielen Dank! Ihre Anfrage ist bei uns eingegangen — wir melden uns schnellstmöglich.";
        }
        form.reset();
      }).catch(function () {
        if (status) {
          status.className = "formular-status formular-status--fehler";
          status.innerHTML = "Das hat leider nicht geklappt. Rufen Sie uns direkt an: <a href=\"tel:" + TELEFON_LINK + "\"><strong>" + TELEFON_ANZEIGE + "</strong></a>";
        }
      }).finally(function () {
        if (knopf) { knopf.disabled = false; knopf.textContent = knopfText; }
      });
    });
  });
})();

/* ---------- Cookie-Consent (Opt-in) ---------- */
(function () {
  var SPEICHER = "mimo-consent-v1";
  var banner = document.querySelector(".cookie-banner");
  var dialog = document.querySelector(".cookie-dialog");

  function lesen() {
    try { return JSON.parse(localStorage.getItem(SPEICHER)); } catch (e) { return null; }
  }
  function speichern(consent) {
    consent.zeitpunkt = new Date().toISOString();
    try { localStorage.setItem(SPEICHER, JSON.stringify(consent)); } catch (e) {}
    anwenden(consent);
    if (banner) banner.classList.remove("cookie-banner--sichtbar");
    if (dialog && dialog.open) dialog.close();
  }

  /* Consent-Templates aktivieren: Inhalt klonen, Script-Tags neu erzeugen */
  var aktiviert = {};
  function anwenden(consent) {
    if (!consent) return;
    ["funktional", "statistik", "marketing"].forEach(function (kat) {
      if (!consent[kat] || aktiviert[kat]) return;
      var templates = document.querySelectorAll("template[data-consent-kategorie=" + kat + "]");
      if (!templates.length) return;
      aktiviert[kat] = true;
      templates.forEach(function (tpl) {
        var inhalt = tpl.content.cloneNode(true);
        /* Scripts müssen neu erzeugt werden, sonst führt der Browser sie nicht aus */
        var scripts = [];
        inhalt.querySelectorAll("script").forEach(function (s) { scripts.push(s); s.remove(); });
        var platzhalter = tpl.parentElement.querySelector(".embed-platzhalter");
        if (platzhalter) platzhalter.remove();
        var ziel = document.createElement("div");
        ziel.className = "embed-eingebettet";
        ziel.appendChild(inhalt);
        tpl.parentElement.insertBefore(ziel, tpl);
        scripts.forEach(function (alt) {
          var src = alt.getAttribute("src");
          /* form_embed.js nur einmal pro Seite laden */
          if (src && document.querySelector("script[src=\"" + src + "\"]")) return;
          var neu = document.createElement("script");
          for (var i = 0; i < alt.attributes.length; i++) {
            neu.setAttribute(alt.attributes[i].name, alt.attributes[i].value);
          }
          neu.textContent = alt.textContent;
          document.body.appendChild(neu);
        });
      });
    });
  }

  function dialogOeffnen() {
    if (!dialog) return;
    var consent = lesen() || {};
    dialog.querySelectorAll("input[data-kategorie]").forEach(function (box) {
      box.checked = !!consent[box.getAttribute("data-kategorie")];
    });
    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  var vorhanden = lesen();
  if (vorhanden) {
    anwenden(vorhanden);
  } else if (banner) {
    banner.classList.add("cookie-banner--sichtbar");
  }

  document.querySelectorAll("[data-cookie-aktion]").forEach(function (el) {
    el.addEventListener("click", function () {
      var aktion = el.getAttribute("data-cookie-aktion");
      if (aktion === "alle") speichern({ notwendig: true, funktional: true, statistik: true, marketing: true });
      if (aktion === "keine") speichern({ notwendig: true, funktional: false, statistik: false, marketing: false });
      if (aktion === "einstellungen") dialogOeffnen();
      if (aktion === "auswahl" && dialog) {
        var consent = { notwendig: true };
        dialog.querySelectorAll("input[data-kategorie]").forEach(function (box) {
          consent[box.getAttribute("data-kategorie")] = box.checked;
        });
        speichern(consent);
      }
    });
  });
})();
