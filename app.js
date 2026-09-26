const API_BASE = "https://api.prhomevalue.com";

const DATA_URL = "data/households.json";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const els = {
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
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
};

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
  els.content.hidden = true;
  els.error.hidden = false;
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
    showError();
    return;
  }
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    const rec = data && data[token];
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
