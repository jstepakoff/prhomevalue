const API_BASE = "https://api.prhomevalue.com";

const DATA_URL = "data/households.json";

// Extra letter recipients (not farm properties): their records live here
// instead of households.json so their QR codes resolve.
const EXTRA_HOUSEHOLDS = {
  "AUulS0bu51": {
    "token": "AUulS0bu51",
    "address": "19155 Doral Place",
    "city": "Porter Ranch",
    "zip": "91326",
    "apn": "EXTRA-0001",
    "beds": 3,
    "baths": 2,
    "sqft": 1894,
    "comps": [
      {
        "address": "19343 Pauma Valley",
        "beds": 3,
        "baths": 2,
        "sqft": 1857,
        "sold_price": 1150000,
        "sold_date": "2026-06-22",
        "price_per_sqft": 619
      },
      {
        "address": "11355 Pala Mesa",
        "beds": 3,
        "baths": 2,
        "sqft": 1857,
        "sold_price": 1175000,
        "sold_date": "2026-02-27",
        "price_per_sqft": 633
      },
      {
        "address": "11431 Porter Valley",
        "beds": 3,
        "baths": 2,
        "sqft": 1961,
        "sold_price": 1436000,
        "sold_date": "2026-03-27",
        "price_per_sqft": 732
      }
    ],
    "value_low": 1110000,
    "value_high": 1255000,
    "value_point": 1183458
  },
  "3g5eo8SPe9": {
    "token": "3g5eo8SPe9",
    "address": "19155 Doral Place",
    "city": "Porter Ranch",
    "zip": "91326",
    "apn": "EXTRA-0002",
    "beds": 3,
    "baths": 2,
    "sqft": 1894,
    "comps": [
      {
        "address": "19343 Pauma Valley",
        "beds": 3,
        "baths": 2,
        "sqft": 1857,
        "sold_price": 1150000,
        "sold_date": "2026-06-22",
        "price_per_sqft": 619
      },
      {
        "address": "11355 Pala Mesa",
        "beds": 3,
        "baths": 2,
        "sqft": 1857,
        "sold_price": 1175000,
        "sold_date": "2026-02-27",
        "price_per_sqft": 633
      },
      {
        "address": "11431 Porter Valley",
        "beds": 3,
        "baths": 2,
        "sqft": 1961,
        "sold_price": 1436000,
        "sold_date": "2026-03-27",
        "price_per_sqft": 732
      }
    ],
    "value_low": 1110000,
    "value_high": 1255000,
    "value_point": 1183458
  }
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const els = {
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  welcome: document.getElementById("welcome"),
  content: document.getElementById("content"),
  address: document.getElementById("property-address"),
  stats: document.getElementById("property-stats"),
  range: document.getElementById("value-range"),
  point: document.getElementById("value-point"),
  compsBody: document.getElementById("comps-body"),
  form: document.getElementById("lead-form"),
  submitBtn: document.getElementById("submit-btn"),
  formError: document.getElementById("form-error"),
  formSuccess: document.getElementById("form-success"),
  successHeading: document.getElementById("success-heading"),
  name: document.getElementById("name"),
  phone: document.getElementById("phone"),
  email: document.getElementById("email"),
  nameError: document.getElementById("name-error"),
  phoneError: document.getElementById("phone-error"),
  emailError: document.getElementById("email-error"),
  wForm: document.getElementById("welcome-form"),
  wSubmitBtn: document.getElementById("w-submit-btn"),
  wFormError: document.getElementById("w-form-error"),
  wFormSuccess: document.getElementById("w-form-success"),
  wSuccessHeading: document.getElementById("w-success-heading"),
  wName: document.getElementById("w-name"),
  wAddress: document.getElementById("w-address"),
  wPhone: document.getElementById("w-phone"),
  wEmail: document.getElementById("w-email"),
  wNameError: document.getElementById("w-name-error"),
  wAddressError: document.getElementById("w-address-error"),
  wPhoneError: document.getElementById("w-phone-error"),
  wEmailError: document.getElementById("w-email-error"),
};

// Fixed token for leads that start on the public welcome page (no letter
// token). The worker recognizes it and tags these leads separately.
const HOMEPAGE_TOKEN = "HOME000000";

let household = null;
let token = "";

function money(n) {
  return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function compactMoney(n) {
  n = Number(n);
  if (n >= 1000000) {
    const m = n / 1000000;
    return "$" + (Number.isInteger(m) ? m.toFixed(0) : m.toFixed(2)) + "M";
  }
  return "$" + Math.round(n / 1000) + "K";
}

function formatDate(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
}

function showError() {
  els.loading.hidden = true;
  els.welcome.hidden = true;
  els.content.hidden = true;
  els.error.hidden = false;
}

function showWelcome() {
  els.loading.hidden = true;
  els.error.hidden = true;
  els.content.hidden = true;
  els.welcome.hidden = false;
  els.wForm.addEventListener("submit", submitWelcomeLead);
}

function validateWelcome() {
  let ok = true;
  const name = els.wName.value.trim();
  const address = els.wAddress.value.trim();
  const phone = els.wPhone.value.trim();
  const email = els.wEmail.value.trim();

  if (!name) {
    fieldError(els.wName, els.wNameError, "Please enter your full name.");
    ok = false;
  } else {
    fieldError(els.wName, els.wNameError, "");
  }

  if (!address) {
    fieldError(els.wAddress, els.wAddressError, "Please enter your property address.");
    ok = false;
  } else {
    fieldError(els.wAddress, els.wAddressError, "");
  }

  const digits = phone.replace(/\D/g, "");
  if (!phone) {
    fieldError(els.wPhone, els.wPhoneError, "Please enter your phone number.");
    ok = false;
  } else if (digits.length < 10) {
    fieldError(els.wPhone, els.wPhoneError, "Please enter a valid 10-digit phone number.");
    ok = false;
  } else {
    fieldError(els.wPhone, els.wPhoneError, "");
  }

  if (!email) {
    fieldError(els.wEmail, els.wEmailError, "Please enter your email address.");
    ok = false;
  } else if (!EMAIL_RE.test(email)) {
    fieldError(els.wEmail, els.wEmailError, "Please enter a valid email address.");
    ok = false;
  } else {
    fieldError(els.wEmail, els.wEmailError, "");
  }

  return ok;
}

async function submitWelcomeLead(e) {
  e.preventDefault();
  els.wFormError.hidden = true;
  if (!validateWelcome()) return;

  els.wSubmitBtn.disabled = true;
  els.wSubmitBtn.textContent = "Sending...";

  const payload = {
    token: HOMEPAGE_TOKEN,
    name: els.wName.value.trim(),
    phone: els.wPhone.value.trim(),
    email: els.wEmail.value.trim(),
    property_address: els.wAddress.value.trim(),
  };

  try {
    const res = await fetch(API_BASE + "/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("bad status");
    const firstName = payload.name.split(/\s+/)[0];
    els.wSuccessHeading.textContent = "Thanks, " + firstName + ".";
    els.wForm.hidden = true;
    els.wFormSuccess.hidden = false;
  } catch (err) {
    els.wFormError.textContent = "Something went wrong sending your request. Please try again, or call 818-723-7848.";
    els.wFormError.hidden = false;
    els.wSubmitBtn.disabled = false;
    els.wSubmitBtn.textContent = "Send me my valuation";
  }
}

function render(rec) {
  els.address.textContent = rec.address || "";
  els.stats.textContent = rec.beds + " bd / " + rec.baths + " ba / " + Number(rec.sqft).toLocaleString("en-US") + " sqft";

  els.range.textContent = compactMoney(rec.value_low) + " to " + compactMoney(rec.value_high);
  els.point.textContent = "Estimated value: " + money(rec.value_point);

  els.compsBody.innerHTML = "";
  (rec.comps || []).slice(0, 3).forEach(function (c) {
    const tr = document.createElement("tr");

    const left = document.createElement("td");
    const addr = document.createElement("span");
    addr.className = "comp-address";
    addr.textContent = c.address || "";
    const stats = document.createElement("span");
    stats.className = "comp-stats";
    stats.textContent = c.beds + " bd / " + c.baths + " ba / " + Number(c.sqft).toLocaleString("en-US") + " sqft";
    const sold = document.createElement("span");
    sold.className = "comp-sold";
    sold.textContent = "Sold " + formatDate(c.sold_date);
    left.appendChild(addr);
    left.appendChild(stats);
    left.appendChild(sold);

    const right = document.createElement("td");
    right.className = "comp-price";
    right.textContent = money(c.sold_price);

    tr.appendChild(left);
    tr.appendChild(right);
    els.compsBody.appendChild(tr);
  });

  els.loading.hidden = true;
  els.content.hidden = false;
}

function fieldError(inputEl, errorEl, message) {
  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  } else {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }
}

function validate() {
  let ok = true;
  const name = els.name.value.trim();
  const phone = els.phone.value.trim();
  const email = els.email.value.trim();

  if (!name) {
    fieldError(els.name, els.nameError, "Please enter your full name.");
    ok = false;
  } else {
    fieldError(els.name, els.nameError, "");
  }

  const digits = phone.replace(/\D/g, "");
  if (!phone) {
    fieldError(els.phone, els.phoneError, "Please enter your phone number.");
    ok = false;
  } else if (digits.length < 10) {
    fieldError(els.phone, els.phoneError, "Please enter a valid 10-digit phone number.");
    ok = false;
  } else {
    fieldError(els.phone, els.phoneError, "");
  }

  if (!email) {
    fieldError(els.email, els.emailError, "Please enter your email address.");
    ok = false;
  } else if (!EMAIL_RE.test(email)) {
    fieldError(els.email, els.emailError, "Please enter a valid email address.");
    ok = false;
  } else {
    fieldError(els.email, els.emailError, "");
  }

  return ok;
}

async function submitLead(e) {
  e.preventDefault();
  els.formError.hidden = true;
  if (!validate()) return;

  els.submitBtn.disabled = true;
  els.submitBtn.textContent = "Sending...";

  const payload = {
    token: token,
    name: els.name.value.trim(),
    phone: els.phone.value.trim(),
    email: els.email.value.trim(),
    property_address: household.address + ", Porter Ranch, CA 91326",
  };

  try {
    const res = await fetch(API_BASE + "/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("bad status");
    const firstName = payload.name.split(/\s+/)[0];
    els.successHeading.textContent = "Thanks, " + firstName + ".";
    els.form.hidden = true;
    els.formSuccess.hidden = false;
  } catch (err) {
    els.formError.textContent = "Something went wrong sending your request. Please try again, or call 818-723-7848.";
    els.formError.hidden = false;
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = "Send me my report";
  }
}

async function init() {
  token = new URLSearchParams(window.location.search).get("h") || "";
  if (!token) {
    showWelcome();
    return;
  }
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    const rec = (data && data[token]) || EXTRA_HOUSEHOLDS[token];
    if (!rec || !rec.address || rec.value_low == null || rec.value_high == null || rec.value_point == null) {
      showError();
      return;
    }
    household = rec;
    render(rec);
    els.form.addEventListener("submit", submitLead);
  } catch (err) {
    showError();
  }
}

init();
