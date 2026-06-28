const STORAGE_KEY = "expense_tracker_data";
const INCOME_KEY = "expense_tracker_income";
const PROFILE_KEY = "expense_tracker_profile";

const CATEGORY_COLORS = {
  Food: "#f59e0b",
  Transport: "#3b82f6",
  Housing: "#8b5cf6",
  Utilities: "#6366f1",
  Entertainment: "#ec4899",
  Shopping: "#10b981",
  Health: "#ef4444",
  Education: "#06b6d4",
  Insurance: "#f97316",
  Fees: "#94a3b8",
  Other: "#6b7280",
};

// ── Crypto Utilities ────────────────────────────────────────

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "expense_tracker_salt_v1");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Profile Management ──────────────────────────────────────

function getProfile() {
  const data = localStorage.getItem(PROFILE_KEY);
  return data ? JSON.parse(data) : null;
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// ── Data Helpers ────────────────────────────────────────────

function loadExpenses() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveExpenses(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadIncome() {
  const data = localStorage.getItem(INCOME_KEY);
  return data ? JSON.parse(data) : [];
}

function saveIncome(data) {
  localStorage.setItem(INCOME_KEY, JSON.stringify(data));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const CURRENCIES = [
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "BWP", symbol: "P", name: "Botswana Pula" },
  { code: "NAD", symbol: "N$", name: "Namibian Dollar" },
  { code: "MZN", symbol: "MT", name: "Mozambican Metical" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
];

let activeCurrency = CURRENCIES[0];

function getCurrencySymbol() {
  return activeCurrency.symbol;
}

function formatCurrency(amount) {
  return getCurrencySymbol() + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getMonthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function getMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  const date = new Date(year, month - 1);
  return date.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ── Access Gate ─────────────────────────────────────────────

const ACCESS_HASH = "cb531952d4e721b4001308f5aa3777bdc37e0b144823ddc77ce73a5b31f970ab";
const ACCESS_KEY = "expense_tracker_access_granted";

async function hashAccess(code) {
  const encoder = new TextEncoder();
  const data = encoder.encode(code + "expense_tracker_access_v1");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const accessScreen = document.getElementById("access-screen");

document.getElementById("access-btn").addEventListener("click", async () => {
  const code = document.getElementById("access-code").value;
  const err = document.getElementById("access-error");
  if (!code) { err.textContent = "Please enter the access code."; return; }
  const hash = await hashAccess(code);
  if (hash !== ACCESS_HASH) { err.textContent = "Invalid access code."; document.getElementById("access-code").value = ""; return; }
  localStorage.setItem(ACCESS_KEY, "true");
  initAuth();
});

document.getElementById("access-code").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("access-btn").click();
});

// ── Login / Setup ───────────────────────────────────────────

const loginScreen = document.getElementById("login-screen");
const setupScreen = document.getElementById("setup-screen");
const appScreen = document.getElementById("app-screen");

function showScreen(screen) {
  accessScreen.style.display = "none";
  loginScreen.style.display = "none";
  setupScreen.style.display = "none";
  appScreen.style.display = "none";
  screen.style.display = screen === appScreen ? "block" : "flex";
}

function initAuth() {
  const profile = getProfile();
  if (!profile) {
    showScreen(setupScreen);
  } else {
    document.getElementById("login-greeting").textContent =
      `Welcome back, ${profile.name}`;
    showScreen(loginScreen);
    document.getElementById("login-pin").focus();
  }
}

(function checkAccess() {
  if (localStorage.getItem(ACCESS_KEY) === "true") {
    initAuth();
  } else {
    showScreen(accessScreen);
    document.getElementById("access-code").focus();
  }
})();

document.getElementById("setup-btn").addEventListener("click", async () => {
  const name = document.getElementById("setup-name").value.trim();
  const surname = document.getElementById("setup-surname").value.trim();
  const pin = document.getElementById("setup-pin").value;
  const pinConfirm = document.getElementById("setup-pin-confirm").value;
  const err = document.getElementById("setup-error");

  if (!name || !surname) { err.textContent = "Please enter your name and surname."; return; }
  if (pin.length < 4) { err.textContent = "PIN must be at least 4 digits."; return; }
  if (pin !== pinConfirm) { err.textContent = "PINs do not match."; return; }

  const pinHash = await hashPin(pin);
  saveProfile({ name, surname, pinHash });
  unlockApp();
});

document.getElementById("login-btn").addEventListener("click", async () => {
  const pin = document.getElementById("login-pin").value;
  const err = document.getElementById("login-error");
  const profile = getProfile();

  if (!pin) { err.textContent = "Please enter your PIN."; return; }

  const pinHash = await hashPin(pin);
  if (pinHash !== profile.pinHash) {
    err.textContent = "Incorrect PIN. Try again.";
    document.getElementById("login-pin").value = "";
    return;
  }

  unlockApp();
});

document.getElementById("login-pin").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("login-btn").click();
});

document.getElementById("lock-btn").addEventListener("click", () => {
  document.getElementById("login-pin").value = "";
  document.getElementById("login-error").textContent = "";
  showScreen(loginScreen);
  document.getElementById("login-pin").focus();
});

function unlockApp() {
  const profile = getProfile();
  document.getElementById("user-greeting").textContent =
    `${profile.name} ${profile.surname}'s expenses`;
  showScreen(appScreen);
  initApp();
}

// ── Main App ────────────────────────────────────────────────

let expenses = [];
let income = [];
let activeMonth = getMonthKey(getToday());
let activeSource = "all";
let appInitialized = false;

const form = document.getElementById("expense-form");
const descInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const filterMonth = document.getElementById("filter-month");
const filterSource = document.getElementById("filter-source");
const incomePeriods = document.getElementById("income-periods");
const expensePeriods = document.getElementById("expense-periods");
const incomeListEl = document.getElementById("income-list");
const expenseListEl = document.getElementById("expense-list");
const noIncome = document.getElementById("no-income");
const noExpenses = document.getElementById("no-expenses");
const categoryBreakdown = document.getElementById("category-breakdown");
const balanceAmount = document.getElementById("balance-amount");
const balanceBar = document.getElementById("balance-bar");
const exportCsvBtn = document.getElementById("export-csv-btn");
const exportDocxBtn = document.getElementById("export-docx-btn");
const insightsSection = document.getElementById("insights-section");
const insightsContent = document.getElementById("insights-content");
const importFileInput = document.getElementById("import-file");

// Tab switching
document.querySelectorAll(".detail-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".detail-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("panel-income").style.display = tab.dataset.tab === "income" ? "" : "none";
    document.getElementById("panel-expenses").style.display = tab.dataset.tab === "expenses" ? "" : "none";
  });
});

function initCurrencySelector() {
  const sel = document.getElementById("currency-select");
  sel.innerHTML = CURRENCIES.map((c) =>
    `<option value="${c.code}" ${c.code === activeCurrency.code ? "selected" : ""}>${c.symbol} ${c.code}</option>`
  ).join("");
  sel.addEventListener("change", () => {
    activeCurrency = CURRENCIES.find((c) => c.code === sel.value) || CURRENCIES[0];
    const profile = getProfile();
    if (profile) { profile.currency = activeCurrency.code; saveProfile(profile); }
    refresh();
  });
}

function initApp() {
  expenses = loadExpenses();
  income = loadIncome();

  const profile = getProfile();
  if (profile && profile.currency) {
    activeCurrency = CURRENCIES.find((c) => c.code === profile.currency) || CURRENCIES[0];
  }

  if (!appInitialized) {
    appInitialized = true;
    initCurrencySelector();
  }

  dateInput.value = getToday();
  document.getElementById("income-date").value = getToday();
  refresh();
}

// ── Period Helpers ──────────────────────────────────────────

function getMonthsAgo(n) {
  const months = [];
  const [y, m] = activeMonth.split("-").map(Number);
  for (let i = 0; i < n; i++) {
    const d = new Date(y, m - 1 - i, 1);
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    months.push(key);
  }
  return months;
}

function sumForPeriod(items, months) {
  const monthSet = new Set(months);
  return items
    .filter((e) => monthSet.has(getMonthKey(e.date)))
    .reduce((s, e) => s + e.amount, 0);
}

// ── Update Functions ───────────────────────────────────────

function updateMonthFilter() {
  const allMonths = new Set([
    ...expenses.map((e) => getMonthKey(e.date)),
    ...income.map((e) => getMonthKey(e.date)),
  ]);

  const months = [...allMonths].sort().reverse();

  if (!months.includes(activeMonth) && months.length > 0) {
    activeMonth = months[0];
  }

  const currentMonth = getMonthKey(getToday());
  if (!months.includes(currentMonth)) {
    months.unshift(currentMonth);
  }

  filterMonth.innerHTML = months
    .map((m) => `<option value="${m}" ${m === activeMonth ? "selected" : ""}>${getMonthLabel(m)}</option>`)
    .join("");
}

function updateSourceFilter() {
  const sources = [...new Set(expenses.map((e) => e.source || "Added manually"))];
  const opts = ['<option value="all">All sources</option>'];
  sources.sort().forEach((s) => {
    opts.push(`<option value="${s}" ${s === activeSource ? "selected" : ""}>${getSourceLabel(s)}</option>`);
  });
  filterSource.innerHTML = opts.join("");
}

function updatePeriodSummaries() {
  const periods = [
    { label: "Monthly", months: 1 },
    { label: "3 Months", months: 3 },
    { label: "6 Months", months: 6 },
    { label: "Yearly", months: 12 },
  ];

  incomePeriods.innerHTML = periods
    .map((p) => {
      const keys = getMonthsAgo(p.months);
      const total = sumForPeriod(income, keys);
      return `<div class="period-card">
        <span class="period-label">${p.label}</span>
        <span class="period-amount inc">+${formatCurrency(total)}</span>
      </div>`;
    })
    .join("");

  expensePeriods.innerHTML = periods
    .map((p) => {
      const keys = getMonthsAgo(p.months);
      const total = sumForPeriod(expenses, keys);
      return `<div class="period-card">
        <span class="period-label">${p.label}</span>
        <span class="period-amount exp">-${formatCurrency(total)}</span>
      </div>`;
    })
    .join("");
}

function updateCategoryBreakdown() {
  const monthExpenses = expenses.filter((e) => getMonthKey(e.date) === activeMonth);

  if (monthExpenses.length === 0) {
    categoryBreakdown.innerHTML = '<p class="empty-msg">No expenses this month</p>';
    return;
  }

  const totals = {};
  monthExpenses.forEach((e) => {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  });

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = sorted[0][1];

  categoryBreakdown.innerHTML = sorted
    .map(
      ([cat, amount]) => `
    <div class="cat-row">
      <span class="cat-name">${cat}</span>
      <div class="cat-bar-wrap">
        <div class="cat-bar" style="width: ${(amount / max) * 100}%; background: ${CATEGORY_COLORS[cat] || "#6b7280"}"></div>
      </div>
      <span class="cat-val">${formatCurrency(amount)}</span>
    </div>`
    )
    .join("");
}

function updateBalance() {
  const monthInc = income
    .filter((e) => getMonthKey(e.date) === activeMonth)
    .reduce((s, e) => s + e.amount, 0);
  const monthExp = expenses
    .filter((e) => getMonthKey(e.date) === activeMonth)
    .reduce((s, e) => s + e.amount, 0);
  const balance = monthInc - monthExp;

  const sign = balance >= 0 ? "+" : "-";
  balanceAmount.textContent = sign + formatCurrency(Math.abs(balance));
  balanceAmount.className = "bal-amount " + (balance >= 0 ? "bal-positive" : "bal-negative");
  balanceBar.className = "balance-bar " + (balance >= 0 ? "bal-positive" : "bal-negative");
}

// ── Source Helpers ──────────────────────────────────────────

function getSourceLabel(source) {
  if (!source) return "Manual";
  if (source === "Added manually") return "Manual";
  return source;
}

// ── Filtered Lists ─────────────────────────────────────────

function getFilteredExpenses() {
  return expenses
    .filter((e) => getMonthKey(e.date) === activeMonth)
    .filter((e) => activeSource === "all" || (e.source || "Added manually") === activeSource)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function getFilteredIncome() {
  return income
    .filter((e) => getMonthKey(e.date) === activeMonth)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

// ── Render Transactions ────────────────────────────────────

function renderTxItem(e, type) {
  const isExp = type === "expense";
  const amtClass = isExp ? "exp" : "inc";
  const amtPrefix = isExp ? "-" : "+";
  const shortDate = formatDate(e.date).slice(0, 5);
  const fullDate = formatDate(e.date);
  const color = CATEGORY_COLORS[e.category] || "#6b7280";

  let actionsHtml = "";
  if (isExp) {
    actionsHtml = `
      <button class="tx-action-btn move" data-id="${e.id}" data-action="to-income">Move to Income</button>
      <button class="tx-action-btn danger" data-id="${e.id}" data-action="del-all">Delete All Like This</button>
      <button class="tx-action-btn danger" data-id="${e.id}" data-action="delete">Delete</button>`;
  } else {
    actionsHtml = `
      <button class="tx-action-btn move" data-id="${e.id}" data-action="to-expense">Move to Expenses</button>
      <button class="tx-action-btn danger" data-id="${e.id}" data-action="del-all-inc">Delete All Like This</button>
      <button class="tx-action-btn danger" data-id="${e.id}" data-action="delete-inc">Delete</button>`;
  }

  const categoryRow = isExp
    ? `<div class="tx-detail-row"><span class="tx-detail-label">Category</span><span class="tx-detail-value"><span class="cat-tag" style="background:${color}20;color:${color}">${e.category}</span></span></div>`
    : "";

  return `<div class="tx-item" data-id="${e.id}">
  <div class="tx-compact">
    <span class="tx-date">${shortDate}</span>
    <span class="tx-desc">${escapeHtml(e.description)}</span>
    <span class="tx-amt ${amtClass}">${amtPrefix}${formatCurrency(e.amount)}</span>
    <span class="tx-expand">▾</span>
  </div>
  <div class="tx-details">
    <div class="tx-detail-row"><span class="tx-detail-label">Description</span><span class="tx-detail-value">${escapeHtml(e.description)}</span></div>
    ${categoryRow}
    <div class="tx-detail-row"><span class="tx-detail-label">Date</span><span class="tx-detail-value">${fullDate}</span></div>
    <div class="tx-detail-row"><span class="tx-detail-label">Amount</span><span class="tx-detail-value">${amtPrefix}${formatCurrency(e.amount)}</span></div>
    <div class="tx-detail-row"><span class="tx-detail-label">Source</span><span class="tx-detail-value">${getSourceLabel(e.source)}</span></div>
    <div class="tx-actions">
      ${actionsHtml}
    </div>
  </div>
</div>`;
}

function renderExpenses() {
  const filtered = getFilteredExpenses();

  if (filtered.length === 0) {
    expenseListEl.innerHTML = "";
    noExpenses.style.display = "block";
    return;
  }

  noExpenses.style.display = "none";
  expenseListEl.innerHTML = filtered.map((e) => renderTxItem(e, "expense")).join("");
}

function renderIncome() {
  const filtered = getFilteredIncome();

  if (filtered.length === 0) {
    incomeListEl.innerHTML = "";
    noIncome.style.display = "block";
    return;
  }

  noIncome.style.display = "none";
  incomeListEl.innerHTML = filtered.map((e) => renderTxItem(e, "income")).join("");
}

// ── Refresh ────────────────────────────────────────────────

function refresh() {
  saveExpenses(expenses);
  saveIncome(income);
  updateMonthFilter();
  updateSourceFilter();
  updatePeriodSummaries();
  updateCategoryBreakdown();
  updateBalance();
  generateInsights();
  renderExpenses();
  renderIncome();
}

// ── Expense Form ───────────────────────────────────────────

form.addEventListener("submit", (e) => {
  e.preventDefault();
  expenses.push({
    id: generateId(),
    description: descInput.value.trim(),
    amount: parseFloat(amountInput.value),
    category: categoryInput.value,
    date: dateInput.value,
    source: "Added manually",
  });
  activeMonth = getMonthKey(dateInput.value);
  refresh();
  descInput.value = "";
  amountInput.value = "";
  dateInput.value = getToday();
  descInput.focus();
});

// ── Income Form ─────────────────────────────────────────────

document.getElementById("income-btn").addEventListener("click", () => {
  const desc = document.getElementById("income-desc").value.trim();
  const amt = parseFloat(document.getElementById("income-amount").value);
  const date = document.getElementById("income-date").value;

  if (!desc || !amt || !date) return;

  income.push({ id: generateId(), description: desc, amount: amt, date });
  activeMonth = getMonthKey(date);
  refresh();

  document.getElementById("income-desc").value = "";
  document.getElementById("income-amount").value = "";
  document.getElementById("income-date").value = getToday();
});

// ── Expandable Transaction Click Handlers ──────────────────

function handleTxToggle(e) {
  if (e.target.closest(".tx-action-btn")) return;
  if (e.target.closest(".tx-details")) return;
  const item = e.target.closest(".tx-item");
  if (!item) return;
  item.classList.toggle("expanded");
}

function handleExpenseAction(e) {
  const btn = e.target.closest(".tx-action-btn");
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === "delete") {
    expenses = expenses.filter((x) => x.id !== id);
    refresh();
    return;
  }

  if (action === "to-income") {
    const exp = expenses.find((x) => x.id === id);
    if (!exp) return;
    income.push({ id: generateId(), description: exp.description, amount: exp.amount, date: exp.date, source: exp.source });
    expenses = expenses.filter((x) => x.id !== id);
    refresh();
    return;
  }

  if (action === "del-all") {
    const exp = expenses.find((x) => x.id === id);
    if (!exp) return;
    const key = exp.description.slice(0, 30).toLowerCase();
    const matches = expenses.filter((x) => x.description.slice(0, 30).toLowerCase() === key);
    if (!confirm(`Delete all ${matches.length} "${exp.description.slice(0, 30)}..." entries across all months?`)) return;
    const matchIds = new Set(matches.map((x) => x.id));
    expenses = expenses.filter((x) => !matchIds.has(x.id));
    refresh();
    return;
  }
}

function handleIncomeAction(e) {
  const btn = e.target.closest(".tx-action-btn");
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === "delete-inc") {
    income = income.filter((x) => x.id !== id);
    refresh();
    return;
  }

  if (action === "to-expense") {
    const inc = income.find((x) => x.id === id);
    if (!inc) return;
    expenses.push({ id: generateId(), description: inc.description, amount: inc.amount, date: inc.date, source: inc.source, category: categorizeDescription(inc.description) });
    income = income.filter((x) => x.id !== id);
    refresh();
    return;
  }

  if (action === "del-all-inc") {
    const inc = income.find((x) => x.id === id);
    if (!inc) return;
    const key = inc.description.slice(0, 30).toLowerCase();
    const matches = income.filter((x) => x.description.slice(0, 30).toLowerCase() === key);
    if (!confirm(`Delete all ${matches.length} "${inc.description.slice(0, 30)}..." income entries across all months?`)) return;
    const matchIds = new Set(matches.map((x) => x.id));
    income = income.filter((x) => !matchIds.has(x.id));
    refresh();
    return;
  }
}

expenseListEl.addEventListener("click", (e) => {
  handleTxToggle(e);
  handleExpenseAction(e);
});

incomeListEl.addEventListener("click", (e) => {
  handleTxToggle(e);
  handleIncomeAction(e);
});

// ── Filter Event Listeners ─────────────────────────────────

filterMonth.addEventListener("change", () => {
  activeMonth = filterMonth.value;
  updatePeriodSummaries();
  updateCategoryBreakdown();
  updateBalance();
  generateInsights();
  renderExpenses();
  renderIncome();
});

filterSource.addEventListener("change", () => {
  activeSource = filterSource.value;
  renderExpenses();
});

// ── Receipt Scanner ─────────────────────────────────────────

const scanBtn = document.getElementById("scan-btn");
const receiptInput = document.getElementById("receipt-input");
const scanStatus = document.getElementById("scan-status");

scanBtn.addEventListener("click", () => receiptInput.click());

function preprocessImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxDim = 2000;
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      // Convert to grayscale and boost contrast
      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        let gray = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
        // Increase contrast
        gray = ((gray - 128) * 1.8) + 128;
        gray = Math.max(0, Math.min(255, gray));
        // Threshold to black/white for cleaner OCR
        gray = gray > 140 ? 255 : 0;
        d[i] = d[i+1] = d[i+2] = gray;
      }
      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => resolve(blob), "image/png");
    };
    img.src = URL.createObjectURL(file);
  });
}

receiptInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  scanBtn.disabled = true;
  scanStatus.style.display = "block";
  scanStatus.className = "scan-status scan-progress";
  scanStatus.innerHTML = 'Enhancing image...<div class="scan-progress-bar"><div class="scan-progress-fill" id="scan-fill" style="width:5%"></div></div>';

  try {
    const processed = await preprocessImage(file);

    const fill = document.getElementById("scan-fill");
    if (fill) fill.style.width = "15%";
    scanStatus.innerHTML = 'Reading text...<div class="scan-progress-bar"><div class="scan-progress-fill" id="scan-fill" style="width:15%"></div></div>';

    const result = await Tesseract.recognize(processed, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text" && fill) {
          fill.style.width = (15 + Math.round(m.progress * 80)) + "%";
        }
      },
    });

    const text = result.data.text;
    const parsed = parseReceipt(text);

    if (parsed.amount) amountInput.value = parsed.amount.toFixed(2);
    if (parsed.description) descInput.value = parsed.description;
    if (parsed.date) dateInput.value = parsed.date;
    if (parsed.category) categoryInput.value = parsed.category;

    const found = [];
    if (parsed.description) found.push("store");
    if (parsed.amount) found.push("R" + parsed.amount.toFixed(2));
    if (parsed.date) found.push("date");

    if (found.length > 0) {
      scanStatus.className = "scan-status scan-success";
      scanStatus.innerHTML = `Found: ${found.join(", ")} — review and tap Add Expense.` +
        `<br><a href="#" class="scan-raw-link" id="show-raw">Show scanned text</a>` +
        `<pre class="scan-raw" id="raw-text" style="display:none">${escapeHtml(text)}</pre>`;
      document.getElementById("show-raw").addEventListener("click", (ev) => {
        ev.preventDefault();
        const raw = document.getElementById("raw-text");
        raw.style.display = raw.style.display === "none" ? "block" : "none";
      });
    } else {
      scanStatus.className = "scan-status scan-error";
      scanStatus.innerHTML = `Couldn't read clearly. Try better lighting or a flatter angle.` +
        `<br><a href="#" class="scan-raw-link" id="show-raw">Show scanned text</a>` +
        `<pre class="scan-raw" id="raw-text" style="display:none">${escapeHtml(text)}</pre>`;
      document.getElementById("show-raw").addEventListener("click", (ev) => {
        ev.preventDefault();
        const raw = document.getElementById("raw-text");
        raw.style.display = raw.style.display === "none" ? "block" : "none";
      });
    }
  } catch (err) {
    scanStatus.className = "scan-status scan-error";
    scanStatus.textContent = "Failed to scan: " + err.message;
  }

  scanBtn.disabled = false;
  receiptInput.value = "";
});

const KNOWN_STORES = [
  "spar", "shoprite", "checkers", "pick n pay", "woolworths", "pnp",
  "kfc", "mcdonalds", "steers", "nandos", "wimpy", "ocean basket",
  "debonairs", "roman", "hungry lion", "fishaways", "galito", "burger king",
  "engen", "shell", "caltex", "sasol", "bp",
  "clicks", "dischem", "dis-chem",
  "takealot", "mr price", "ackermans", "pep", "jet", "edgars",
  "foschini", "truworths", "cotton on",
  "game", "makro", "builders", "cashbuild",
  "netflix", "dstv", "vodacom", "mtn", "telkom",
  "panarottis", "spur", "rocomamas", "vida e caffe", "vida",
  "total", "ok foods", "ok express",
];

function parseReceipt(text) {
  const fullText = text.toLowerCase();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const result = { description: null, amount: null, date: null, category: null };

  // 1. Find store name — check known stores first, then fall back to first readable line
  for (const store of KNOWN_STORES) {
    if (fullText.includes(store)) {
      result.description = store.split(/\s+/).map((w) =>
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(" ");
      break;
    }
  }

  if (!result.description) {
    for (const line of lines.slice(0, 10)) {
      const cleaned = line.replace(/[^a-zA-Z\s&'-]/g, "").trim();
      if (cleaned.length >= 3 && cleaned.length <= 50 && /[a-zA-Z]{2,}/.test(cleaned)) {
        // Skip common non-store lines
        if (/^(tax|vat|invoice|receipt|date|time|cashier|tel|phone|cash|change|card|visa|master)/i.test(cleaned)) continue;
        result.description = cleaned.split(/\s+/).map((w) =>
          w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ).join(" ");
        break;
      }
    }
  }

  // 2. Find total amount — many patterns for SA receipts
  // OCR often misreads R as P, 0 as O, etc, so be flexible
  const totalKeywords = [
    "total", "totaal", "amount due", "balance due", "nett total",
    "grand total", "te betaal", "amount payable", "bedrag",
    "tot incl", "total incl", "total due", "totale",
    "rounding", // sometimes the total is near rounding line
  ];

  // Search each line for a total keyword + amount
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    // Skip subtotal/sub-total lines
    if (lineLower.includes("sub") && lineLower.includes("total")) continue;

    for (const kw of totalKeywords) {
      if (!lineLower.includes(kw)) continue;

      // Find amounts on this line (handle R, spaces, commas in amounts)
      const amts = [...line.matchAll(/R?\s*(\d[\d\s,.]*\d)\s*$/g),
                     ...line.matchAll(/R\s*(\d[\d\s,.]*\d)/g),
                     ...line.matchAll(/(\d[\d\s,]*\.\s*\d{2})/g)];

      for (const m of amts) {
        const val = parseFloat(m[1].replace(/[\s,]/g, ""));
        if (val > 0 && val < 100000) {
          result.amount = val;
          break;
        }
      }
      if (result.amount) break;
    }
    if (result.amount) break;
  }

  // 3. If no total keyword found, find amounts on lines with "total"-like context
  if (!result.amount) {
    const allAmounts = [];
    for (const line of lines) {
      const matches = [...line.matchAll(/R?\s*(\d{1,3}[\s,]?\d{0,3}[.,]\s?\d{2})\b/g)];
      for (const m of matches) {
        const val = parseFloat(m[1].replace(/[\s,]/g, "").replace(/,(\d{2})$/, ".$1"));
        if (val > 0 && val < 100000) allAmounts.push(val);
      }
    }

    if (allAmounts.length > 0) {
      // The total is typically the largest amount, or the last large amount
      allAmounts.sort((a, b) => b - a);
      result.amount = allAmounts[0];
    }
  }

  // 4. Find date — flexible patterns
  const datePatterns = [
    /(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/,          // DD/MM/YYYY
    /(\d{4})[\/\-.](\d{2})[\/\-.](\d{2})/,          // YYYY/MM/DD
    /(\d{2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*(\d{4})/i,
    /(\d{2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*(\d{2})\b/i,
  ];

  for (const pat of datePatterns) {
    const m = text.match(pat);
    if (m) {
      const parsed = parseDate(m[0]);
      if (parsed) { result.date = parsed; break; }
    }
  }

  // 5. Auto-categorize
  const catSource = (result.description || "") + " " + text.slice(0, 200);
  result.category = categorizeDescription(catSource);

  return result;
}

// ── Spending Insights ───────────────────────────────────────

function generateInsights() {
  const monthExpenses = expenses.filter((e) => getMonthKey(e.date) === activeMonth);

  if (monthExpenses.length < 3) {
    insightsSection.style.display = "none";
    return;
  }

  const insights = [];
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  // 1. Category totals and percentages
  const catTotals = {};
  monthExpenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  // 2. Flag categories that take more than 30% of spending
  sortedCats.forEach(([cat, amount]) => {
    const pct = (amount / monthTotal) * 100;
    if (pct > 30 && cat !== "Other") {
      insights.push({
        type: "warning",
        title: `${cat} is ${pct.toFixed(0)}% of your spending`,
        text: `You spent ${formatCurrency(amount)} on ${cat} this month. That's a large chunk of your ${formatCurrency(monthTotal)} total.`,
        detail: cat === "Food" ? "Try meal planning and cooking at home more — eating out adds up fast." :
                cat === "Entertainment" ? "Review subscriptions and digital purchases — cancel anything you don't use weekly." :
                cat === "Transport" ? "Consider carpooling, fuel-efficient routes, or filling up at cheaper stations." :
                cat === "Shopping" ? "Try a 24-hour rule — wait a day before non-essential purchases." :
                cat === "Insurance" ? "Shop around for quotes yearly — loyalty doesn't always pay." :
                cat === "Fees" ? "Call your bank about a cheaper account type or fee structure." :
                cat === "Housing" ? "Review your bond rate or rental — refinancing could save thousands." :
                "Look for ways to reduce this — small cuts here make a big difference.",
      });
    }
  });

  // 3. Find repeated small expenses (same description, multiple times)
  const descCounts = {};
  monthExpenses.forEach((e) => {
    const key = e.description.split(" — ")[0].toLowerCase().replace(/\s+5326.*$/, "").trim();
    if (!descCounts[key]) descCounts[key] = { count: 0, total: 0, name: e.description.split(" — ")[0] };
    descCounts[key].count++;
    descCounts[key].total += e.amount;
  });

  Object.values(descCounts)
    .filter((d) => d.count >= 3 && d.total > 50)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .forEach((d) => {
      insights.push({
        type: "info",
        title: `${d.name} — ${d.count} times this month`,
        text: `You spent ${formatCurrency(d.total)} across ${d.count} transactions at this merchant.`,
        detail: "Frequent small purchases can add up. Consider if all of these were necessary.",
      });
    });

  // 4. Find single large expenses (top 3 above R500)
  const bigOnes = [...monthExpenses].sort((a, b) => b.amount - a.amount).slice(0, 3).filter((e) => e.amount >= 500);
  if (bigOnes.length > 0) {
    const list = bigOnes.map((e) => `${e.description.split(" — ")[0]} (${formatCurrency(e.amount)})`).join(", ");
    insights.push({
      type: "warning",
      title: "Biggest expenses this month",
      text: list,
      detail: "Review these — are they recurring or one-off? Can any be reduced or avoided next month?",
    });
  }

  // 5. Compare with previous month
  const [y, m] = activeMonth.split("-").map(Number);
  const prevMonth = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
  const prevExpenses = expenses.filter((e) => getMonthKey(e.date) === prevMonth);
  if (prevExpenses.length > 0) {
    const prevTotal = prevExpenses.reduce((s, e) => s + e.amount, 0);
    const diff = monthTotal - prevTotal;
    const pctChange = ((diff / prevTotal) * 100).toFixed(0);

    if (Math.abs(diff) > 100) {
      const prevCatTotals = {};
      prevExpenses.forEach((e) => {
        prevCatTotals[e.category] = (prevCatTotals[e.category] || 0) + e.amount;
      });

      // Find which categories changed the most
      const catChanges = sortedCats.map(([cat, amount]) => ({
        cat,
        current: amount,
        prev: prevCatTotals[cat] || 0,
        diff: amount - (prevCatTotals[cat] || 0),
      })).filter((c) => c.diff > 200).sort((a, b) => b.diff - a.diff);

      const drivers = catChanges.length > 0
        ? " Biggest increase: " + catChanges.slice(0, 2).map((c) => `${c.cat} (+${formatCurrency(c.diff)})`).join(", ") + "."
        : "";

      insights.push({
        type: diff > 0 ? "warning" : "tip",
        title: diff > 0
          ? `Spending is up ${pctChange}% from last month`
          : `Spending is down ${Math.abs(pctChange)}% from last month`,
        text: diff > 0
          ? `You spent ${formatCurrency(diff)} more than last month (${formatCurrency(prevTotal)}).${drivers}`
          : `You saved ${formatCurrency(Math.abs(diff))} compared to last month (${formatCurrency(prevTotal)}). Keep it up!`,
        detail: diff > 0
          ? "Check if the increase is from once-off items or if a category is trending up."
          : "",
      });
    }
  }

  // 6. Daily average and projection
  const dates = [...new Set(monthExpenses.map((e) => e.date))].sort();
  const daysSpan = dates.length;
  if (daysSpan >= 5) {
    const dailyAvg = monthTotal / daysSpan;
    const daysInMonth = new Date(y, m, 0).getDate();
    const projected = dailyAvg * daysInMonth;
    const today = getToday();
    const isCurrentMonth = activeMonth === getMonthKey(today);

    if (isCurrentMonth && daysSpan < daysInMonth) {
      insights.push({
        type: "info",
        title: `Daily average: ${formatCurrency(dailyAvg)}`,
        text: `At this rate, you'll spend about ${formatCurrency(projected)} by month-end.`,
        detail: `Based on ${daysSpan} days of spending so far. Track daily to stay within budget.`,
      });
    }
  }

  // 7. Savings tips based on categories present
  const cats = new Set(sortedCats.map(([c]) => c));
  if (cats.has("Fees") && catTotals["Fees"] > 50) {
    insights.push({
      type: "tip",
      title: `Bank fees total ${formatCurrency(catTotals["Fees"])}`,
      text: "Consider a bundled bank account or switching to a digital bank with lower fees.",
      detail: "Declined transaction fees and international charges add up — avoid retrying failed payments.",
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: "tip",
      title: "Spending looks balanced",
      text: `Your ${formatCurrency(monthTotal)} is spread across ${sortedCats.length} categories with no single one dominating.`,
      detail: "Keep tracking to spot trends over time.",
    });
  }

  insightsSection.style.display = "";
  insightsContent.innerHTML = insights
    .map((ins) => `
      <div class="insight-card insight-${ins.type}">
        <div class="insight-title">${ins.title}</div>
        <div>${ins.text}</div>
        ${ins.detail ? `<div class="insight-detail">${ins.detail}</div>` : ""}
      </div>`)
    .join("");
}

// ── Category Keywords ───────────────────────────────────────

const CATEGORY_KEYWORDS = {
  Food: [
    "spar", "checkers", "pick n pay", "pick 'n pay", "woolworths", "food",
    "shoprite", "kfc", "mcdonalds", "mcdonald", "steers", "nandos", "nando's",
    "debonairs", "pizza", "burger", "chicken", "restaurant", "cafe", "bakery",
    "uber eats", "mr delivery", "fruit", "veg", "meat", "pnp ", "pnp crp",
    "pnp fam", "grocery", "groceries", "wimpy", "ocean basket", "spur",
    "rocomamas", "fishaways", "galito", "romans pizza", "hungry lion",
    "diemysticpizz", "broken po", "varsitycafe", "sincereasiami",
    "bk mooi", "burger king",
  ],
  Transport: [
    "uber", "bolt", "fuel", "petrol", "diesel", "engen", "shell", "caltex",
    "sasol", "total", "bp ", "garage", "parking", "e-toll", "toll", "gautrain",
    "myciti", "taxi", "car wash", "carwash", "tyre", "tire", "vehicle",
    "potch truck", "boskop vulsta",
  ],
  Housing: [
    "rent", "bond", "mortgage", "levy", "levies", "estate agent", "property",
    "maintenance", "home", "lease", "tenant", "landlord", "plumbers depo",
    "merafong", "sbsa hl",
  ],
  Utilities: [
    "electricity", "water", "eskom", "city of", "municipal", "prepaid elec",
    "telkom", "fibre", "internet", "wifi", "wi-fi", "vodacom", "mtn", "cell c",
    "rain ", "dstv", "multichoice", "showmax", "netflix", "spotify",
    "apple music", "youtube", "airtime", "data bundle", "cellphone",
  ],
  Entertainment: [
    "ster-kinekor", "nu metro", "cinema", "movie", "concert", "show",
    "tickets", "computicket", "webtickets", "bar ", "pub ", "club ",
    "tavern", "lounge", "game", "steam", "playstation", "xbox", "nintendo",
    "tiktok", "google tiktok", "koer afrikaans", "coursiv",
  ],
  Shopping: [
    "takealot", "amazon", "shein", "temu", "mr price", "ackermans", "pep",
    "jet ", "edgars", "foschini", "cotton on", "h&m", "zara", "truworths",
    "clothing", "shoes", "fashion", "clicks", "dischem", "dis-chem",
    "makro", "cutting edge", "bex potch", "impalaslaghui",
    "c*mahems",
  ],
  Health: [
    "pharmacy", "doctor", "dr ", "medical", "hospital", "clinic", "dental",
    "dentist", "optom", "physio", "pathology", "ampath", "lancet",
    "potch medi", "disc prem", "stratum",
  ],
  Education: [
    "school", "university", "unisa", "college", "tuition",
    "textbook", "stationery", "udemy", "coursera", "skillshare", "course",
    "training", "student", "bursary",
  ],
  Insurance: [
    "insurance", "ins prem", "disclife", "safireins", "saffar", "legalex",
  ],
  Fees: [
    "fee", "bank charge", "#international", "honouring", "ucount",
    "admin fee", "excess interest", "debicheck collection",
    "decline fee", "processing fee", "notification fee",
  ],
};

function categorizeDescription(description) {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "Other";
}

// ── CSV Parsing ─────────────────────────────────────────────

function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { fields.push(current.trim()); current = ""; }
      else current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseDate(raw) {
  const cleaned = raw.replace(/['"]/g, "").trim();
  let m = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = cleaned.match(/^(\d{1,2})[\s-](\w{3,9})[\s-](\d{2,4})/);
  if (m) {
    const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const mon = months[m[2].toLowerCase().slice(0, 3)];
    let year = parseInt(m[3]);
    if (year < 100) year += 2000;
    if (mon) return `${year}-${String(mon).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

function parseAmount(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function mapBankCategory(bankCategory) {
  if (!bankCategory) return null;
  const lower = bankCategory.toLowerCase().trim();
  const mapping = {
    "food": "Food", "groceries": "Food", "restaurant": "Food",
    "transport": "Transport", "fuel": "Transport", "parking": "Transport",
    "housing": "Housing", "rent": "Housing", "mortgage": "Housing",
    "utilities": "Utilities", "electricity": "Utilities", "water": "Utilities",
    "internet": "Utilities", "cellphone": "Utilities", "communication": "Utilities",
    "entertainment": "Entertainment", "digital subscriptions": "Entertainment", "online store": "Entertainment",
    "shopping": "Shopping", "clothing": "Shopping",
    "medical": "Health", "medical aid": "Health", "health": "Health",
    "education": "Education",
    "insurance premium": "Insurance",
    "fees": "Fees",
    "legal fees": "Other", "transfer": "Other", "loans": "Other",
    "personal & family": "Other", "interest": "Other",
    "cellphone": "Utilities", "mobile": "Utilities",
    "online store": "Entertainment", "digital payments": "Other",
    "card payments": "Shopping", "prepaid": "Utilities",
    "uncategorised": "Other",
  };
  return mapping[lower] || null;
}

function detectColumns(headers) {
  const h = headers.map((s) => s.toLowerCase().trim());
  let dateCol = -1, descCol = -1, amountCol = -1;
  let moneyOutCol = -1, moneyInCol = -1, feeCol = -1;
  let debitCol = -1, creditCol = -1;
  let categoryCol = -1, parentCategoryCol = -1;

  h.forEach((col, i) => {
    const norm = col.replace(/[^a-z0-9 ]/g, "").trim();
    if (dateCol === -1 && (norm.includes("posting date") || norm.includes("transaction date") || norm === "date")) dateCol = i;
    if (descCol === -1 && (norm === "description" || norm.includes("narrative") || norm.includes("detail"))) descCol = i;
    if (norm === "amount" || norm === "transaction amount") amountCol = i;
    if (norm === "money out") moneyOutCol = i;
    if (norm === "money in") moneyInCol = i;
    if (norm === "fee") feeCol = i;
    if (norm === "debit" || norm === "payments") debitCol = i;
    if (norm === "credit" || norm === "deposits") creditCol = i;
    if (norm === "category") categoryCol = i;
    if (norm === "parent category") parentCategoryCol = i;
  });

  return { dateCol, descCol, amountCol, moneyOutCol, moneyInCol, feeCol, debitCol, creditCol, categoryCol, parentCategoryCol };
}

function processCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  let headerIndex = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length >= 3) {
      const lower = fields.map((f) => f.toLowerCase()).join(" ");
      if (lower.includes("date") || lower.includes("description") || lower.includes("amount") || lower.includes("money") || lower.includes("narrative")) {
        headerIndex = i;
        break;
      }
    }
  }

  const headers = parseCSVLine(lines[headerIndex]);
  const dataLines = lines.slice(headerIndex + 1);
  if (dataLines.length === 0) return [];

  const cols = detectColumns(headers);
  if (cols.dateCol === -1) return [];
  const hasAmounts = cols.amountCol !== -1 || cols.moneyOutCol !== -1 || cols.debitCol !== -1 || cols.feeCol !== -1;
  if (!hasAmounts && cols.descCol === -1) return [];

  const results = [];
  for (const line of dataLines) {
    const fields = parseCSVLine(line);
    if (fields.length < 3) continue;

    const date = parseDate(fields[cols.dateCol] || "");
    if (!date) continue;

    const description = (cols.descCol !== -1 ? fields[cols.descCol] : "").trim();
    if (!description) continue;

    // Gather all amounts from the row — sign determines type
    let moneyOut = 0, moneyIn = 0, fee = 0, singleAmount = null;

    if (cols.moneyOutCol !== -1) { const v = parseAmount(fields[cols.moneyOutCol]); if (v) moneyOut = v; }
    if (cols.moneyInCol !== -1)  { const v = parseAmount(fields[cols.moneyInCol]);  if (v) moneyIn = v; }
    if (cols.feeCol !== -1)      { const v = parseAmount(fields[cols.feeCol]);      if (v) fee = v; }
    if (cols.amountCol !== -1)   { singleAmount = parseAmount(fields[cols.amountCol]); }
    if (cols.debitCol !== -1 && !singleAmount) { singleAmount = parseAmount(fields[cols.debitCol]); }

    const bankCat = cols.categoryCol !== -1 ? (fields[cols.categoryCol] || "").toLowerCase().trim() : "";
    const parentCat = cols.parentCategoryCol !== -1 ? (fields[cols.parentCategoryCol] || "").toLowerCase().trim() : "";

    // Skip transfers between own accounts
    if (bankCat === "transfer" || parentCat === "transfer") continue;

    // Sign rule: negative (-) = expense, positive (+) = income
    // Money Out and Fee are always negative (expenses)
    // Money In is always positive (income)
    // Single Amount column: sign tells us the type

    // Income: positive Money In, or positive single amount
    if (moneyIn > 0 && moneyOut === 0 && fee === 0) {
      results.push({ date, description, amount: Math.abs(moneyIn), category: "Income", selected: true, type: "income" });
      continue;
    }
    if (singleAmount !== null && singleAmount > 0 && moneyOut === 0) {
      results.push({ date, description, amount: Math.abs(singleAmount), category: "Income", selected: true, type: "income" });
      continue;
    }

    // Expense: negative Money Out, Fee, or negative single amount
    let expenseTotal = 0;
    if (moneyOut) expenseTotal += Math.abs(moneyOut);
    if (fee) expenseTotal += Math.abs(fee);
    if (expenseTotal === 0 && singleAmount !== null && singleAmount < 0) expenseTotal = Math.abs(singleAmount);

    if (expenseTotal === 0) continue;

    let category = null;
    if (cols.categoryCol !== -1) category = mapBankCategory(fields[cols.categoryCol]);
    if (!category && cols.parentCategoryCol !== -1) category = mapBankCategory(fields[cols.parentCategoryCol]);
    if (!category) category = categorizeDescription(description);

    results.push({ date, description, amount: expenseTotal, category, selected: true, type: "expense" });
  }

  return results;
}

// ── PDF Parsing (Multi-format) ──────────────────────────────

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    const lineMap = new Map();
    for (const item of content.items) {
      if (!item.str.trim() && !item.hasEOL) continue;
      const y = Math.round(item.transform[5] / 2) * 2;
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({
        text: item.str,
        x: item.transform[4],
        width: item.width || 0,
      });
    }

    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);

    for (const y of sortedYs) {
      const items = lineMap.get(y).sort((a, b) => a.x - b.x);
      let line = "";
      let prevEnd = 0;
      for (const item of items) {
        const gap = item.x - prevEnd;
        if (line && gap > 4) line += " ";
        line += item.text;
        prevEnd = item.x + item.width;
      }
      const trimmed = line.trim();
      if (trimmed) fullText += trimmed + "\n";
    }
  }

  return fullText;
}

function processPdfText(text) {
  // Auto-detect format and try parsers in order
  let results = [];

  if (text.includes("Money In") && text.includes("Money Out")) {
    results = processCapitecPdf(text);
  }

  if (results.length === 0 && (text.includes("STANDARD BANK") || text.includes("CHEQUE CARD"))) {
    results = processStandardBankPdf(text);
  }

  // Generic fallback for FNB, Nedbank, ABSA, or any other bank
  if (results.length === 0) {
    results = processGenericPdf(text);
  }

  return results;
}

// ── Capitec PDF ─────────────────────────────────────────────

const CAPITEC_CATS = [
  "Medical Aid", "Legal Fees", "Online Store", "Other Income", "Card Payments",
  "Digital Payments", "Cellphone", "Transfer", "Interest", "Fees",
  "Uncategorised", "Prepaid", "Groceries", "Food", "Transport",
  "Shopping", "Entertainment", "Health", "Education", "Insurance",
];

function processCapitecPdf(text) {
  const lines = text.split("\n");
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})\s/;
  // Amounts with spaces as thousands separators: -1 018.00 or 7 200.00
  const amtRegex = /-?\d[\d ]*\.\d{2}/g;

  const skipLines = [
    "Capitec Bank", "Client Care", "Unique Document", "Page ", "* Includes VAT",
    "Main Account Statement", "Tax Invoice", "Statement Information",
    "Interest, Rewards", "Money In Summary", "Money Out Summary",
    "Live Better Benefits", "Spending Summary", "Scheduled Payments",
    "Debit Orders", "Card Subscriptions", "24hr Client Care",
    "From Date:", "To Date:", "Print Date:", "Account ",
  ];

  const skipCategories = ["transfer", "interest", "other income"];

  const transactions = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatch = line.match(dateRegex);
    if (!dateMatch) continue;
    if (skipLines.some((p) => line.includes(p))) continue;

    const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    const afterDate = line.slice(dateMatch[0].length);

    // Find the category in the line
    let category = "";
    let catIndex = -1;
    for (const cat of CAPITEC_CATS) {
      const idx = afterDate.lastIndexOf(cat);
      if (idx !== -1 && (catIndex === -1 || idx > catIndex)) {
        category = cat;
        catIndex = idx;
      }
    }

    // Skip transfers between own accounts
    const catLower = category.toLowerCase();
    if (catLower === "transfer") continue;

    let description, amountsStr;
    if (catIndex !== -1) {
      description = afterDate.slice(0, catIndex).trim();
      amountsStr = afterDate.slice(catIndex + category.length);
    } else {
      description = afterDate;
      amountsStr = afterDate;
    }

    // Sign rule: negative (-) = expense, positive (+) = income
    const amounts = [...amountsStr.matchAll(amtRegex)].map((m) =>
      parseFloat(m[0].replace(/\s/g, ""))
    );

    // Sum negatives as expenses, positives (except last which is balance) as income
    let negTotal = 0, posTotal = 0;
    amounts.forEach((a, idx) => {
      if (idx === amounts.length - 1) return; // last is balance
      if (a < 0) negTotal += Math.abs(a);
      else if (a > 0) posTotal += a;
    });

    description = description
      .replace(/\s*\(Card \d+\)$/, "")
      .replace(/\s*\(\d+\):\s*/, ": ")
      .trim();

    if (!description) continue;

    // Positive = income
    if (posTotal > 0 && negTotal === 0) {
      transactions.push({ date, description, amount: posTotal, category: "Income", selected: true, type: "income" });
      continue;
    }

    // Negative = expense
    if (negTotal === 0) continue;

    const mappedCat = mapBankCategory(category) || categorizeDescription(description);
    transactions.push({ date, description, amount: negTotal, category: mappedCat, selected: true, type: "expense" });
  }

  return transactions;
}

// ── Standard Bank PDF ───────────────────────────────────────

function processStandardBankPdf(text) {
  const lines = text.split("\n");
  const dateRegex = /^(\d{2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{2})\s/i;
  const amountRegex = /-?\d[\d,]*\.\d{2}/g;
  const monthMap = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

  const skipPatterns = [
    "STATEMENT OPENING", "STATEMENT CLOSING", "Statement Summary",
    "Payments -R", "Deposits R", "Please verify",
  ];

  const headerPatterns = [
    "Standard Bank", "Reg. No.", "Code of Banking", "Customer Care",
    "Website:", "Transaction details", "Account number", "Date Description",
    "Account holder", "Product name", "Available Balance", "MOOIRIVIER",
    "POTCHEFSTROOM",
  ];

  const transactions = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const dateMatch = line.match(dateRegex);

    if (!dateMatch) { i++; continue; }
    if (skipPatterns.some((p) => line.includes(p))) { i++; continue; }

    const day = dateMatch[1];
    const mon = monthMap[dateMatch[2].toLowerCase()];
    const year = 2000 + parseInt(dateMatch[3]);
    const date = `${year}-${String(mon).padStart(2, "0")}-${day}`;

    const afterDate = line.slice(dateMatch[0].length);
    const amounts = [...afterDate.matchAll(amountRegex)].map((m) => ({
      value: parseFloat(m[0].replace(/,/g, "")),
      index: m.index,
    }));

    if (amounts.length < 1) { i++; continue; }

    let txAmount, descEnd;
    if (amounts.length >= 2) {
      txAmount = amounts[amounts.length - 2].value;
      descEnd = amounts[amounts.length - 2].index;
    } else {
      txAmount = amounts[0].value;
      descEnd = amounts[0].index;
    }

    let description = afterDate.slice(0, descEnd).trim();
    description = description.replace(/\s*5326\*\d+(\s+\d{2}\s\w{3})?$/, "").trim();
    description = description.replace(/\s*5326\d+$/, "").trim();

    const continuations = [];
    i++;
    while (i < lines.length) {
      const cl = lines[i].trim();
      if (!cl || lines[i].match(dateRegex)) break;
      if (headerPatterns.some((p) => cl.includes(p))) { i++; continue; }
      if (cl.match(/^Pg \d+ of/) || cl.match(/^\d{6}$/) || cl.match(/^From:/) ||
          cl.match(/^To:/) || cl.match(/^\d{2} \w{3} \d{4}$/) || cl === "ZA" ||
          cl.match(/^\d{4}$/) || cl.includes("debits have not yet")) { i++; continue; }
      continuations.push(cl);
      i++;
    }

    if (continuations.length > 0) {
      description = description + " — " + continuations.join(" ");
    }

    const descLower = description.toLowerCase();

    // Skip transfers between own accounts
    if (descLower.includes("ib transfer to") || descLower.includes("ib transfer from") ||
        descLower.includes("electronic trf-credit")) continue;

    const absAmount = Math.abs(txAmount);
    if (absAmount === 0) continue;

    // Sign rule: + is income, - is expense
    if (txAmount > 0) {
      transactions.push({
        date, description, amount: absAmount,
        category: "Income", selected: true, type: "income",
      });
      continue;
    }

    transactions.push({
      date, description, amount: absAmount,
      category: categorizeDescription(description),
      selected: true, type: "expense",
    });
  }

  return transactions;
}

// ── Generic PDF fallback ────────────────────────────────────
// For unknown bank PDFs: try to find lines with dates and amounts

function processGenericPdf(text) {
  const lines = text.split("\n");
  const datePatterns = [
    /^(\d{2})\/(\d{2})\/(\d{4})/,                    // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})/,                      // YYYY-MM-DD
    /^(\d{2})-(\d{2})-(\d{4})/,                      // DD-MM-YYYY
    /^(\d{2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})/i, // DD Mon YY(YY)
  ];
  const amtRegex = /-?\d[\d, ]*\.\d{2}/g;

  const results = [];
  for (const line of lines) {
    let date = null;
    let afterDate = "";

    for (const pat of datePatterns) {
      const m = line.match(pat);
      if (m) {
        date = parseDate(m[0]);
        afterDate = line.slice(m[0].length).trim();
        break;
      }
    }
    if (!date || !afterDate) continue;

    const amounts = [...afterDate.matchAll(amtRegex)].map((m) => ({
      value: parseFloat(m[0].replace(/[, ]/g, "")),
      index: m.index,
    }));

    if (amounts.length < 1) continue;

    const negAmounts = amounts.filter((a) => a.value < 0);
    if (negAmounts.length === 0) continue;

    const txAmount = amounts.length >= 2 ? amounts[amounts.length - 2].value : amounts[0].value;
    if (txAmount >= 0) continue;

    const descEnd = amounts.length >= 2 ? amounts[amounts.length - 2].index : amounts[0].index;
    const description = afterDate.slice(0, descEnd).trim();
    if (!description || description.length < 3) continue;

    results.push({
      date,
      description,
      amount: Math.abs(txAmount),
      category: categorizeDescription(description),
      selected: true,
      type: "expense",
    });
  }

  return results;
}

// ── Import UI ───────────────────────────────────────────────

const importPreview = document.getElementById("import-preview");
const importStats = document.getElementById("import-stats");
const importBodyTable = document.getElementById("import-body-table");
const importConfirm = document.getElementById("import-confirm");
const importCancel = document.getElementById("import-cancel");
const selectAll = document.getElementById("select-all");

let importedRows = [];
let importSourceName = "";

importFileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const fname = file.name.toLowerCase();
  const isPdf = fname.endsWith(".pdf");
  const isJson = fname.endsWith(".json");

  // If it's a backup file, trigger the restore flow instead
  if (isJson) {
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (data.format === "expense-tracker-backup") {
        document.getElementById("restore-file").files = e.target.files;
        document.getElementById("restore-file").dispatchEvent(new Event("change"));
        importFileInput.value = "";
        return;
      }
    } catch (_) {}
  }

  if (fname.includes("sbsa") || fname.includes("standard")) importSourceName = "Standard Bank";
  else if (fname.includes("capitec")) importSourceName = "Capitec";
  else if (fname.includes("fnb") || fname.includes("first national")) importSourceName = "FNB";
  else if (fname.includes("nedbank")) importSourceName = "Nedbank";
  else if (fname.includes("absa")) importSourceName = "ABSA";
  else importSourceName = isPdf ? "PDF import" : "CSV import";

  if (isPdf) {
    importStats.innerHTML = '<span class="loading-msg">Reading PDF...</span>';
    importPreview.style.display = "block";
    importBodyTable.innerHTML = "";
    importConfirm.style.display = "none";

    try {
      const text = await extractPdfText(file);
      importedRows = processPdfText(text);
    } catch (err) {
      importStats.innerHTML = `<span style="color:#ef4444">Failed to read PDF: ${err.message}</span>`;
      return;
    }
  } else {
    const text = await file.text();
    importedRows = processCSV(text);
  }

  if (importedRows.length === 0) {
    importStats.innerHTML = '<span style="color:#ef4444">Could not parse any expenses from this file.</span>';
    importPreview.style.display = "block";
    importBodyTable.innerHTML = "";
    importConfirm.style.display = "none";
    return;
  }

  // Mark duplicates by date + description (not amount — same item can change value)
  const expenseKeys = new Set(
    expenses.map((e) => `${e.date}|${e.description.slice(0, 40).toLowerCase()}`)
  );
  const incomeKeys = new Set(
    income.map((e) => `${e.date}|${e.description.slice(0, 40).toLowerCase()}`)
  );
  // Only check against previously imported data — never within the same file
  // (a single statement can have identical-looking transactions that are separate)
  let dupCount = 0;
  importedRows.forEach((r) => {
    const descKey = `${r.date}|${r.description.slice(0, 40).toLowerCase()}`;
    const existingSet = (r.type === "income") ? incomeKeys : expenseKeys;
    if (existingSet.has(descKey)) {
      r.duplicate = true;
      r.selected = false;
      dupCount++;
    } else {
      r.duplicate = false;
    }
  });

  importConfirm.style.display = "";
  renderImportPreview(dupCount);
});

function renderImportPreview() {
  importPreview.style.display = "block";
  selectAll.checked = importedRows.every((r) => r.selected);

  const dupCount = importedRows.filter((r) => r.duplicate).length;
  const selected = importedRows.filter((r) => r.selected);
  const selectedCount = selected.length;
  const selExpenses = selected.filter((r) => r.type !== "income");
  const selIncome = selected.filter((r) => r.type === "income");
  const incomeCount = importedRows.filter((r) => r.type === "income").length;

  const dupInfo = dupCount > 0
    ? `<span style="color:#f59e0b"><span class="import-stat">${dupCount}</span> duplicates</span>`
    : "";
  const incInfo = incomeCount > 0
    ? `<span style="color:#10b981"><span class="import-stat">${incomeCount}</span> income</span>`
    : "";

  importStats.innerHTML = `
    <span><span class="import-stat">${importedRows.length}</span> transactions</span>
    <span><span class="import-stat">${selectedCount}</span> selected</span>
    ${incInfo}
    ${dupInfo}
  `;

  const categoryOptions = Object.keys(CATEGORY_COLORS)
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");

  importBodyTable.innerHTML = importedRows
    .map(
      (r, i) => `
    <tr class="${r.duplicate ? "row-duplicate" : ""} ${r.type === "income" ? "row-income" : ""}">
      <td><input type="checkbox" class="row-check" data-idx="${i}" ${r.selected ? "checked" : ""}></td>
      <td class="expense-date">${formatDate(r.date)}</td>
      <td class="desc-cell" title="${escapeHtml(r.description)}">${escapeHtml(r.description)}${r.duplicate ? ' <span class="dup-badge">duplicate</span>' : ""}${r.type === "income" ? ' <span class="income-badge">income</span>' : ""}</td>
      <td>${r.type === "income" ? '<span class="category-tag" style="background:#d1fae520;color:#10b981">Income</span>' : `<select class="row-category" data-idx="${i}">${categoryOptions.replace(`value="${r.category}"`, `value="${r.category}" selected`)}</select>${!r.duplicate && r.category !== "Other" ? '<span class="import-badge">auto</span>' : ""}`}</td>
      <td class="amount-col" style="color:${r.type === "income" ? "#10b981" : "#ef4444"}">${r.type === "income" ? "+" : "-"}${formatCurrency(r.amount)}</td>
    </tr>`
    )
    .join("");
}

selectAll.addEventListener("change", () => {
  importedRows.forEach((r) => (r.selected = selectAll.checked));
  renderImportPreview();
});

importBodyTable.addEventListener("change", (e) => {
  const idx = parseInt(e.target.dataset.idx);
  if (isNaN(idx)) return;
  if (e.target.classList.contains("row-check")) {
    importedRows[idx].selected = e.target.checked;
    renderImportPreview();
  }
  if (e.target.classList.contains("row-category")) {
    importedRows[idx].category = e.target.value;
  }
});

importConfirm.addEventListener("click", () => {
  const toImport = importedRows.filter((r) => r.selected);
  if (toImport.length === 0) return;

  let expCount = 0, incCount = 0;
  toImport.forEach((r) => {
    if (r.type === "income") {
      income.push({
        id: generateId(),
        description: r.description,
        amount: r.amount,
        date: r.date,
        source: importSourceName,
      });
      incCount++;
    } else {
      expenses.push({
        id: generateId(),
        description: r.description,
        amount: r.amount,
        category: r.category,
        date: r.date,
        source: importSourceName,
      });
      expCount++;
    }
  });

  activeMonth = getMonthKey(toImport[0].date);
  refresh();

  importedRows = [];
  importFileInput.value = "";
  importPreview.style.display = "none";

  const parts = [];
  if (expCount > 0) parts.push(`${expCount} expenses`);
  if (incCount > 0) parts.push(`${incCount} income`);
  importStats.innerHTML = `<span style="color:#10b981;font-weight:600">Imported ${parts.join(" and ")}!</span>`;
  setTimeout(() => { importStats.innerHTML = ""; }, 3000);
});

importCancel.addEventListener("click", () => {
  importedRows = [];
  importFileInput.value = "";
  importPreview.style.display = "none";
  importStats.innerHTML = "";
});

// ── CSV Export ───────────────────────────────────────────────

exportCsvBtn.addEventListener("click", () => {
  const profile = getProfile();
  const sym = getCurrencySymbol();

  const expFiltered = expenses
    .filter((e) => getMonthKey(e.date) === activeMonth)
    .sort((a, b) => a.date.localeCompare(b.date));

  const incFiltered = income
    .filter((e) => getMonthKey(e.date) === activeMonth)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (expFiltered.length === 0 && incFiltered.length === 0) return;

  const header = "Date,Description,Type,Category,Amount";
  const expRows = expFiltered.map(
    (e) => `${e.date},"${e.description.replace(/"/g, '""')}",Expense,${e.category},-${e.amount.toFixed(2)}`
  );
  const incRows = incFiltered.map(
    (e) => `${e.date},"${e.description.replace(/"/g, '""')}",Income,,+${e.amount.toFixed(2)}`
  );

  const csv = [header, ...incRows, ...expRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const filename = `${profile.name}_${profile.surname}_Finances_${activeMonth}.csv`;
  saveAs(blob, filename);
});

// ── DOCX Export ─────────────────────────────────────────────

exportDocxBtn.addEventListener("click", () => {
  const filtered = expenses
    .filter((e) => getMonthKey(e.date) === activeMonth)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (filtered.length === 0) return;

  const profile = getProfile();
  const monthLabel = getMonthLabel(activeMonth);
  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const catTotals = {};
  filtered.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  // Build HTML-based Word document
  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Calibri, sans-serif; font-size: 11pt; color: #333; margin: 40px; }
    h1 { font-size: 18pt; color: #0f3460; margin-bottom: 4px; }
    h2 { font-size: 14pt; color: #16213e; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #0f3460; padding-bottom: 4px; }
    .meta { color: #666; font-size: 10pt; margin-bottom: 20px; }
    .summary-box { background: #f0f2f5; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px; }
    .summary-box strong { color: #0f3460; font-size: 14pt; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #0f3460; color: white; padding: 8px 10px; text-align: left; font-size: 10pt; }
    th.amount { text-align: right; }
    td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; font-size: 10pt; }
    td.amount { text-align: right; font-weight: bold; }
    tr:nth-child(even) { background: #f9fafb; }
    .cat-row td { font-weight: bold; }
    .footer { margin-top: 30px; color: #999; font-size: 9pt; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
  </style>
</head>
<body>
  <h1>Expense Report</h1>
  <p class="meta">${profile.name} ${profile.surname} &mdash; ${monthLabel}</p>

  <div class="summary-box">
    Total Expenses: <strong>${formatCurrency(total)}</strong>
    &nbsp;&nbsp;|&nbsp;&nbsp; ${filtered.length} transactions
  </div>

  <h2>Category Breakdown</h2>
  <table>
    <tr><th>Category</th><th class="amount">Amount</th><th class="amount">% of Total</th></tr>
    ${sortedCats.map(([cat, amt]) => `
    <tr class="cat-row">
      <td>${cat}</td>
      <td class="amount">${formatCurrency(amt)}</td>
      <td class="amount">${(amt / total * 100).toFixed(1)}%</td>
    </tr>`).join("")}
  </table>

  <h2>Transaction Details</h2>
  <table>
    <tr><th>Date</th><th>Description</th><th>Category</th><th class="amount">Amount</th></tr>
    ${filtered.map((e) => `
    <tr>
      <td>${formatDate(e.date)}</td>
      <td>${escapeHtml(e.description)}</td>
      <td>${e.category}</td>
      <td class="amount">-${formatCurrency(e.amount)}</td>
    </tr>`).join("")}
    <tr style="border-top: 2px solid #0f3460; font-weight: bold;">
      <td colspan="3" style="text-align: right;">Total</td>
      <td class="amount">${formatCurrency(total)}</td>
    </tr>
  </table>

  <p class="footer">Generated on ${new Date().toLocaleDateString("en-ZA")} &mdash; Expense Tracker</p>
</body>
</html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-word;charset=utf-8" });
  const filename = `${profile.name}_${profile.surname}_Expenses_${activeMonth}.doc`;
  saveAs(blob, filename);
});

// ── Backup / Restore ──────────────────────────────────────

const backupStatus = document.getElementById("backup-status");
const backupToggle = document.getElementById("backup-toggle");
const backupBody = document.getElementById("backup-body");
const backupArrow = document.getElementById("backup-arrow");
const exportFrom = document.getElementById("export-from");
const exportTo = document.getElementById("export-to");
const exportCustom = document.getElementById("export-custom");
const exportSummary = document.getElementById("export-summary");

backupToggle.addEventListener("click", () => {
  const open = backupBody.style.display !== "none";
  backupBody.style.display = open ? "none" : "block";
  backupArrow.classList.toggle("open", !open);
  if (!open) updateExportOptions();
});

function getAllMonthKeys() {
  const months = new Set();
  expenses.forEach((e) => months.add(getMonthKey(e.date)));
  income.forEach((e) => months.add(getMonthKey(e.date)));
  return [...months].sort();
}

function updateExportOptions() {
  const months = getAllMonthKeys();
  if (months.length === 0) {
    exportSummary.textContent = "No data to export.";
    return;
  }
  const opts = months.map((m) => `<option value="${m}">${getMonthLabel(m)}</option>`).join("");
  exportFrom.innerHTML = opts;
  exportTo.innerHTML = opts;
  exportFrom.value = months[0];
  exportTo.value = months[months.length - 1];
  updateExportSummary();
}

function getExportRange() {
  const selected = document.querySelector('input[name="export-range"]:checked').value;
  if (selected === "all") return null;
  if (selected === "current") return { from: activeMonth, to: activeMonth };
  return { from: exportFrom.value, to: exportTo.value };
}

function updateExportSummary() {
  const range = getExportRange();
  let filteredExp, filteredInc;

  if (!range) {
    filteredExp = expenses;
    filteredInc = income;
  } else {
    filteredExp = expenses.filter((e) => { const m = getMonthKey(e.date); return m >= range.from && m <= range.to; });
    filteredInc = income.filter((e) => { const m = getMonthKey(e.date); return m >= range.from && m <= range.to; });
  }

  const expTotal = filteredExp.reduce((s, e) => s + e.amount, 0);
  const incTotal = filteredInc.reduce((s, e) => s + e.amount, 0);
  const label = !range ? "All data" : range.from === range.to ? getMonthLabel(range.from) : `${getMonthLabel(range.from)} to ${getMonthLabel(range.to)}`;

  exportSummary.innerHTML = `<strong>${label}</strong> — ${filteredExp.length} expenses (-${formatCurrency(expTotal)}), ${filteredInc.length} income (+${formatCurrency(incTotal)})`;
}

document.querySelectorAll('input[name="export-range"]').forEach((r) => {
  r.addEventListener("change", () => {
    exportCustom.style.display = r.value === "custom" ? "block" : "none";
    updateExportSummary();
  });
});

exportFrom.addEventListener("change", updateExportSummary);
exportTo.addEventListener("change", updateExportSummary);

document.getElementById("backup-btn").addEventListener("click", () => {
  const profile = getProfile();
  const range = getExportRange();

  let filteredExp, filteredInc, rangeLabel;
  if (!range) {
    filteredExp = expenses;
    filteredInc = income;
    rangeLabel = "All";
  } else {
    filteredExp = expenses.filter((e) => { const m = getMonthKey(e.date); return m >= range.from && m <= range.to; });
    filteredInc = income.filter((e) => { const m = getMonthKey(e.date); return m >= range.from && m <= range.to; });
    rangeLabel = range.from === range.to ? range.from : `${range.from}_to_${range.to}`;
  }

  if (filteredExp.length === 0 && filteredInc.length === 0) {
    backupStatus.style.display = "block";
    backupStatus.className = "backup-status scan-error";
    backupStatus.textContent = "No data in the selected range.";
    setTimeout(() => { backupStatus.style.display = "none"; }, 4000);
    return;
  }

  const backup = {
    format: "expense-tracker-backup",
    version: 2,
    exportDate: new Date().toISOString(),
    exportRange: range || "all",
    profile: { name: profile.name, surname: profile.surname, currency: profile.currency || "ZAR" },
    expenses: filteredExp,
    income: filteredInc,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const filename = `${profile.name}_${profile.surname}_Backup_${rangeLabel}.json`;
  saveAs(blob, filename);

  backupStatus.style.display = "block";
  backupStatus.className = "backup-status scan-success";
  backupStatus.textContent = `Exported ${filteredExp.length} expenses, ${filteredInc.length} income.`;
  setTimeout(() => { backupStatus.style.display = "none"; }, 5000);
});

document.getElementById("restore-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  backupStatus.style.display = "block";
  backupStatus.className = "backup-status scan-progress";
  backupStatus.textContent = "Reading backup file...";

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.format || data.format !== "expense-tracker-backup") {
      backupStatus.className = "backup-status scan-error";
      backupStatus.textContent = "This is not a valid backup file.";
      return;
    }

    if (!Array.isArray(data.expenses) || !Array.isArray(data.income)) {
      backupStatus.className = "backup-status scan-error";
      backupStatus.textContent = "Backup file is corrupted — missing expense or income data.";
      return;
    }

    const expCount = data.expenses.length;
    const incCount = data.income.length;

    const mergeOrReplace = expenses.length > 0 || income.length > 0
      ? confirm(`You have existing data (${expenses.length} expenses, ${income.length} income).\n\nOK = Merge (add new entries, skip duplicates)\nCancel = Replace (erase current data and restore backup)`)
      : false;

    if (mergeOrReplace) {
      // Merge: add only entries that don't already exist (by date + description)
      const existingExpKeys = new Set(expenses.map((x) => `${x.date}|${x.description.slice(0, 40).toLowerCase()}`));
      const existingIncKeys = new Set(income.map((x) => `${x.date}|${x.description.slice(0, 40).toLowerCase()}`));

      let addedExp = 0, addedInc = 0, skipped = 0;

      data.expenses.forEach((x) => {
        const key = `${x.date}|${(x.description || "").slice(0, 40).toLowerCase()}`;
        if (!existingExpKeys.has(key)) {
          if (!x.id) x.id = generateId();
          expenses.push(x);
          existingExpKeys.add(key);
          addedExp++;
        } else { skipped++; }
      });

      data.income.forEach((x) => {
        const key = `${x.date}|${(x.description || "").slice(0, 40).toLowerCase()}`;
        if (!existingIncKeys.has(key)) {
          if (!x.id) x.id = generateId();
          income.push(x);
          existingIncKeys.add(key);
          addedInc++;
        } else { skipped++; }
      });

      refresh();
      backupStatus.className = "backup-status scan-success";
      backupStatus.textContent = `Merged: ${addedExp} expenses, ${addedInc} income added. ${skipped} duplicates skipped.`;
    } else {
      // Replace: overwrite everything
      expenses = data.expenses.map((x) => ({ ...x, id: x.id || generateId() }));
      income = data.income.map((x) => ({ ...x, id: x.id || generateId() }));

      if (data.profile) {
        const profile = getProfile();
        if (data.profile.currency) {
          profile.currency = data.profile.currency;
          activeCurrency = CURRENCIES.find((c) => c.code === data.profile.currency) || CURRENCIES[0];
          initCurrencySelector();
        }
        saveProfile(profile);
      }

      refresh();
      backupStatus.className = "backup-status scan-success";
      backupStatus.textContent = `Restored: ${expCount} expenses, ${incCount} income entries.`;
    }
  } catch (err) {
    backupStatus.className = "backup-status scan-error";
    backupStatus.textContent = "Failed to read backup: " + err.message;
  }

  document.getElementById("restore-file").value = "";
  setTimeout(() => { backupStatus.style.display = "none"; }, 6000);
});
