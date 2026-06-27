const STORAGE_KEY = "expense_tracker_data";
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

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatCurrency(amount) {
  return "R" + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

// ── Login / Setup ───────────────────────────────────────────

const loginScreen = document.getElementById("login-screen");
const setupScreen = document.getElementById("setup-screen");
const appScreen = document.getElementById("app-screen");

function showScreen(screen) {
  loginScreen.style.display = "none";
  setupScreen.style.display = "none";
  appScreen.style.display = "none";
  screen.style.display = screen === appScreen ? "block" : "flex";
}

(function initAuth() {
  const profile = getProfile();
  if (!profile) {
    showScreen(setupScreen);
  } else {
    document.getElementById("login-greeting").textContent =
      `Welcome back, ${profile.name}`;
    showScreen(loginScreen);
    document.getElementById("login-pin").focus();
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
let activeMonth = getMonthKey(getToday());
let appInitialized = false;

function initApp() {
  if (appInitialized) return;
  appInitialized = true;

  expenses = loadExpenses();
  dateInput.value = getToday();
  refresh();
}

const form = document.getElementById("expense-form");
const descInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const todayTotal = document.getElementById("today-total");
const monthTotal = document.getElementById("month-total");
const entryCount = document.getElementById("entry-count");
const expensesBody = document.getElementById("expenses-body");
const noExpenses = document.getElementById("no-expenses");
const filterMonth = document.getElementById("filter-month");
const exportCsvBtn = document.getElementById("export-csv-btn");
const exportDocxBtn = document.getElementById("export-docx-btn");
const categoryBreakdown = document.getElementById("category-breakdown");
const filterSource = document.getElementById("filter-source");
const listActions = document.getElementById("list-actions");
const selectedInfo = document.getElementById("selected-info");
const deleteSelectedBtn = document.getElementById("delete-selected-btn");
const selectAllExpenses = document.getElementById("select-all-expenses");
const insightsSection = document.getElementById("insights-section");
const insightsContent = document.getElementById("insights-content");
let activeSource = "all";
let selectedIds = new Set();

function updateSummary() {
  const today = getToday();
  const currentMonth = getMonthKey(today);

  const todaySum = expenses
    .filter((e) => e.date === today)
    .reduce((sum, e) => sum + e.amount, 0);

  const monthSum = expenses
    .filter((e) => getMonthKey(e.date) === currentMonth)
    .reduce((sum, e) => sum + e.amount, 0);

  todayTotal.textContent = formatCurrency(todaySum);
  monthTotal.textContent = formatCurrency(monthSum);
  entryCount.textContent = expenses.length;
}

function updateMonthFilter() {
  const months = [...new Set(expenses.map((e) => getMonthKey(e.date)))].sort().reverse();

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

function updateCategoryBreakdown() {
  const monthExpenses = expenses.filter((e) => getMonthKey(e.date) === activeMonth);

  if (monthExpenses.length === 0) {
    categoryBreakdown.innerHTML = '<p class="no-breakdown">No expenses this month</p>';
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
    <div class="category-row">
      <span class="category-name">${cat}</span>
      <div class="category-bar-wrapper">
        <div class="category-bar" style="width: ${(amount / max) * 100}%; background: ${CATEGORY_COLORS[cat] || "#6b7280"}"></div>
      </div>
      <span class="category-value">${formatCurrency(amount)}</span>
    </div>`
    )
    .join("");
}

function getSourceClass(source) {
  if (!source || source === "Added manually") return "source-manual";
  const s = source.toLowerCase();
  if (s.includes("capitec")) return "source-capitec";
  if (s.includes("standard")) return "source-standardbank";
  return "source-other";
}

function getSourceLabel(source) {
  if (!source) return "Manual";
  if (source === "Added manually") return "Manual";
  return source;
}

function updateSourceFilter() {
  const sources = [...new Set(expenses.map((e) => e.source || "Added manually"))];
  const opts = ['<option value="all">All sources</option>'];
  sources.sort().forEach((s) => {
    opts.push(`<option value="${s}" ${s === activeSource ? "selected" : ""}>${getSourceLabel(s)}</option>`);
  });
  filterSource.innerHTML = opts.join("");
}

function getFilteredExpenses() {
  return expenses
    .filter((e) => getMonthKey(e.date) === activeMonth)
    .filter((e) => activeSource === "all" || (e.source || "Added manually") === activeSource)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function updateSelectionInfo() {
  const filtered = getFilteredExpenses();
  const selCount = filtered.filter((e) => selectedIds.has(e.id)).length;
  const total = filtered.reduce((s, e) => s + e.amount, 0);

  if (selCount > 0) {
    const selTotal = filtered.filter((e) => selectedIds.has(e.id)).reduce((s, e) => s + e.amount, 0);
    selectedInfo.textContent = `${selCount} of ${filtered.length} selected (${formatCurrency(selTotal)})`;
    deleteSelectedBtn.style.display = "";
    deleteSelectedBtn.textContent = `Delete ${selCount} selected`;
  } else {
    selectedInfo.textContent = `${filtered.length} expenses — ${formatCurrency(total)}`;
    deleteSelectedBtn.style.display = "none";
  }

  selectAllExpenses.checked = filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));
}

function renderExpenses() {
  const filtered = getFilteredExpenses();

  if (filtered.length === 0) {
    expensesBody.innerHTML = "";
    noExpenses.style.display = "block";
    listActions.style.display = "none";
    return;
  }

  noExpenses.style.display = "none";
  listActions.style.display = "flex";

  expensesBody.innerHTML = filtered
    .map(
      (e) => `
    <tr class="${selectedIds.has(e.id) ? "row-selected" : ""}">
      <td><input type="checkbox" class="expense-check" data-id="${e.id}" ${selectedIds.has(e.id) ? "checked" : ""}></td>
      <td class="expense-date">${formatDate(e.date)}</td>
      <td>${escapeHtml(e.description)}</td>
      <td><span class="category-tag" style="background: ${CATEGORY_COLORS[e.category] || "#6b7280"}20; color: ${CATEGORY_COLORS[e.category] || "#6b7280"}">${e.category}</span></td>
      <td><span class="source-tag ${getSourceClass(e.source)}">${getSourceLabel(e.source)}</span></td>
      <td class="expense-amount">${formatCurrency(e.amount)}</td>
      <td><button class="btn-delete" data-id="${e.id}" title="Delete">&times;</button></td>
    </tr>`
    )
    .join("");

  updateSelectionInfo();
}

function refresh() {
  saveExpenses(expenses);
  selectedIds.clear();
  updateSummary();
  updateMonthFilter();
  updateSourceFilter();
  updateCategoryBreakdown();
  generateInsights();
  renderExpenses();
}

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

// ── Receipt Scanner ─────────────────────────────────────────

const scanBtn = document.getElementById("scan-btn");
const receiptInput = document.getElementById("receipt-input");
const scanStatus = document.getElementById("scan-status");

scanBtn.addEventListener("click", () => receiptInput.click());

receiptInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  scanBtn.disabled = true;
  scanStatus.style.display = "block";
  scanStatus.className = "scan-status scan-progress";
  scanStatus.innerHTML = 'Reading receipt...<div class="scan-progress-bar"><div class="scan-progress-fill" id="scan-fill" style="width:10%"></div></div>';

  try {
    const result = await Tesseract.recognize(file, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          const fill = document.getElementById("scan-fill");
          if (fill) fill.style.width = Math.round(m.progress * 100) + "%";
        }
      },
    });

    const text = result.data.text;
    const parsed = parseReceipt(text);

    if (parsed.amount) {
      amountInput.value = parsed.amount.toFixed(2);
    }
    if (parsed.description) {
      descInput.value = parsed.description;
    }
    if (parsed.date) {
      dateInput.value = parsed.date;
    }
    if (parsed.category) {
      categoryInput.value = parsed.category;
    }

    const found = [];
    if (parsed.description) found.push("store");
    if (parsed.amount) found.push("amount");
    if (parsed.date) found.push("date");

    if (found.length > 0) {
      scanStatus.className = "scan-status scan-success";
      scanStatus.textContent = `Found ${found.join(", ")} — review and tap Add Expense.`;
    } else {
      scanStatus.className = "scan-status scan-error";
      scanStatus.textContent = "Couldn't read the receipt clearly. Try a clearer photo or enter manually.";
    }
  } catch (err) {
    scanStatus.className = "scan-status scan-error";
    scanStatus.textContent = "Failed to scan: " + err.message;
  }

  scanBtn.disabled = false;
  receiptInput.value = "";
  setTimeout(() => { scanStatus.style.display = "none"; }, 8000);
});

function parseReceipt(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const result = { description: null, amount: null, date: null, category: null };

  // Find store name — usually one of the first non-empty lines with letters
  for (const line of lines.slice(0, 8)) {
    const cleaned = line.replace(/[^a-zA-Z\s]/g, "").trim();
    if (cleaned.length >= 3 && cleaned.length <= 40 && /[a-zA-Z]{3,}/.test(cleaned)) {
      result.description = cleaned.split(/\s+/).map((w) =>
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join(" ");
      break;
    }
  }

  // Find total amount — look for "total" keyword near a number
  const totalPatterns = [
    /(?:total|totaal|amount\s*due|balance\s*due|nett|grand\s*total|te\s*betaal)[:\s]*R?\s*(\d[\d\s,]*\.\d{2})/i,
    /R?\s*(\d[\d\s,]*\.\d{2})\s*(?:total|totaal)/i,
  ];

  for (const pat of totalPatterns) {
    const m = text.match(pat);
    if (m) {
      result.amount = parseFloat(m[1].replace(/[\s,]/g, ""));
      break;
    }
  }

  // Fallback: find the largest amount on the receipt
  if (!result.amount) {
    const amtRegex = /R?\s*(\d[\d\s,]*\.\d{2})/g;
    let maxAmt = 0;
    let match;
    while ((match = amtRegex.exec(text)) !== null) {
      const val = parseFloat(match[1].replace(/[\s,]/g, ""));
      if (val > maxAmt && val < 100000) maxAmt = val;
    }
    if (maxAmt > 0) result.amount = maxAmt;
  }

  // Find date
  const datePatterns = [
    /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,   // DD/MM/YYYY
    /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,   // YYYY/MM/DD
    /(\d{2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s(\d{4})/i,
  ];

  for (const pat of datePatterns) {
    const m = text.match(pat);
    if (m) {
      result.date = parseDate(m[0]);
      break;
    }
  }

  // Auto-categorize from store name
  if (result.description) {
    result.category = categorizeDescription(result.description);
  }

  return result;
}

expensesBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-delete");
  if (btn) {
    expenses = expenses.filter((exp) => exp.id !== btn.dataset.id);
    selectedIds.delete(btn.dataset.id);
    refresh();
    return;
  }

  const chk = e.target.closest(".expense-check");
  if (chk) {
    const id = chk.dataset.id;
    if (chk.checked) selectedIds.add(id);
    else selectedIds.delete(id);
    chk.closest("tr").classList.toggle("row-selected", chk.checked);
    updateSelectionInfo();
  }
});

selectAllExpenses.addEventListener("change", () => {
  const filtered = getFilteredExpenses();
  if (selectAllExpenses.checked) {
    filtered.forEach((e) => selectedIds.add(e.id));
  } else {
    filtered.forEach((e) => selectedIds.delete(e.id));
  }
  renderExpenses();
});

deleteSelectedBtn.addEventListener("click", () => {
  if (selectedIds.size === 0) return;
  if (!confirm(`Delete ${selectedIds.size} selected expenses?`)) return;
  expenses = expenses.filter((e) => !selectedIds.has(e.id));
  refresh();
});

filterMonth.addEventListener("change", () => {
  activeMonth = filterMonth.value;
  selectedIds.clear();
  updateCategoryBreakdown();
  generateInsights();
  renderExpenses();
});

filterSource.addEventListener("change", () => {
  activeSource = filterSource.value;
  selectedIds.clear();
  renderExpenses();
});

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

    let amount = 0;
    if (cols.moneyOutCol !== -1) {
      const out = parseAmount(fields[cols.moneyOutCol]);
      if (out) amount += Math.abs(out);
    }
    if (cols.feeCol !== -1) {
      const fee = parseAmount(fields[cols.feeCol]);
      if (fee) amount += Math.abs(fee);
    }
    if (amount === 0 && cols.amountCol !== -1) {
      const amt = parseAmount(fields[cols.amountCol]);
      if (amt) amount = Math.abs(amt);
    }
    if (amount === 0 && cols.debitCol !== -1) {
      const deb = parseAmount(fields[cols.debitCol]);
      if (deb) amount = Math.abs(deb);
    }
    if (amount === 0) continue;

    let category = null;
    if (cols.categoryCol !== -1) category = mapBankCategory(fields[cols.categoryCol]);
    if (!category && cols.parentCategoryCol !== -1) category = mapBankCategory(fields[cols.parentCategoryCol]);
    if (!category) category = categorizeDescription(description);

    // Skip transfers (not real expenses)
    if (cols.categoryCol !== -1 || cols.parentCategoryCol !== -1) {
      const bankCat = (fields[cols.categoryCol] || fields[cols.parentCategoryCol] || "").toLowerCase();
      if (bankCat === "transfer" || bankCat === "other income") continue;
    }

    results.push({ date, description, amount, category, selected: true });
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

    // Skip transfers, interest, income
    if (category && skipCategories.includes(category.toLowerCase())) continue;

    let description, amountsStr;
    if (catIndex !== -1) {
      description = afterDate.slice(0, catIndex).trim();
      amountsStr = afterDate.slice(catIndex + category.length);
    } else {
      // No known category found — try to extract amounts from the end
      description = afterDate;
      amountsStr = afterDate;
    }

    // Extract all amounts (handling space-separated thousands)
    const amounts = [...amountsStr.matchAll(amtRegex)].map((m) =>
      parseFloat(m[0].replace(/\s/g, ""))
    );

    // Find Money Out and Fee amounts (negative values)
    let totalExpense = 0;
    amounts.forEach((a) => { if (a < 0) totalExpense += Math.abs(a); });

    if (totalExpense === 0) continue;

    // Clean up description
    description = description
      .replace(/\s*\(Card \d+\)$/, "")
      .replace(/\s*\(\d+\):\s*/, ": ")
      .trim();

    if (!description) continue;

    // Map Capitec category to our categories
    const mappedCat = mapBankCategory(category) || categorizeDescription(description);

    transactions.push({
      date,
      description,
      amount: totalExpense,
      category: mappedCat,
      selected: true,
    });
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

    if (txAmount > 0) continue;

    const descLower = description.toLowerCase();
    if (descLower.includes("ib transfer to") || descLower.includes("ib transfer from") ||
        descLower.includes("payshap payment from") || descLower.includes("electronic banking payment fr") ||
        descLower.includes("payment of insurance claims") || descLower.includes("credit transfer") ||
        descLower.includes("electronic trf-credit")) continue;

    const absAmount = Math.abs(txAmount);
    if (absAmount === 0) continue;

    transactions.push({
      date,
      description,
      amount: absAmount,
      category: categorizeDescription(description),
      selected: true,
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
    });
  }

  return results;
}

// ── Import UI ───────────────────────────────────────────────

const importToggle = document.getElementById("import-toggle");
const importBodyEl = document.getElementById("import-body");
const toggleArrow = document.getElementById("toggle-arrow");
const importFileInput = document.getElementById("import-file");
const importPreview = document.getElementById("import-preview");
const importStats = document.getElementById("import-stats");
const importBodyTable = document.getElementById("import-body-table");
const importConfirm = document.getElementById("import-confirm");
const importCancel = document.getElementById("import-cancel");
const selectAll = document.getElementById("select-all");

let importedRows = [];

importToggle.addEventListener("click", () => {
  const visible = importBodyEl.style.display !== "none";
  importBodyEl.style.display = visible ? "none" : "block";
  toggleArrow.classList.toggle("open", !visible);
});

let importSourceName = "";

importFileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const isPdf = file.name.toLowerCase().endsWith(".pdf");
  const fname = file.name.toLowerCase();
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

  // Mark duplicates — match on date + amount + description start
  const existingKeys = new Set(
    expenses.map((e) => `${e.date}|${e.amount.toFixed(2)}|${e.description.slice(0, 30).toLowerCase()}`)
  );
  let dupCount = 0;
  importedRows.forEach((r) => {
    const key = `${r.date}|${r.amount.toFixed(2)}|${r.description.slice(0, 30).toLowerCase()}`;
    if (existingKeys.has(key)) {
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

function renderImportPreview(dupCount) {
  importPreview.style.display = "block";
  selectAll.checked = importedRows.every((r) => r.selected);

  const selectedCount = importedRows.filter((r) => r.selected).length;
  const totalAmount = importedRows.filter((r) => r.selected).reduce((s, r) => s + r.amount, 0);

  const dupInfo = dupCount > 0
    ? `<span style="color:#f59e0b"><span class="import-stat">${dupCount}</span> duplicates (deselected)</span>`
    : "";

  importStats.innerHTML = `
    <span><span class="import-stat">${importedRows.length}</span> transactions</span>
    <span><span class="import-stat">${selectedCount}</span> selected</span>
    <span>Total: <span class="import-stat">${formatCurrency(totalAmount)}</span></span>
    ${dupInfo}
  `;

  const categoryOptions = Object.keys(CATEGORY_COLORS)
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");

  importBodyTable.innerHTML = importedRows
    .map(
      (r, i) => `
    <tr class="${r.duplicate ? "row-duplicate" : ""}">
      <td><input type="checkbox" class="row-check" data-idx="${i}" ${r.selected ? "checked" : ""}></td>
      <td class="expense-date">${formatDate(r.date)}</td>
      <td class="desc-cell" title="${escapeHtml(r.description)}">${escapeHtml(r.description)}${r.duplicate ? ' <span class="dup-badge">duplicate</span>' : ""}</td>
      <td><select class="row-category" data-idx="${i}">${categoryOptions.replace(`value="${r.category}"`, `value="${r.category}" selected`)}</select>${!r.duplicate && r.category !== "Other" ? '<span class="import-badge">auto</span>' : ""}</td>
      <td class="amount-col">${formatCurrency(r.amount)}</td>
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

  toImport.forEach((r) => {
    expenses.push({
      id: generateId(),
      description: r.description,
      amount: r.amount,
      category: r.category,
      date: r.date,
      source: importSourceName,
    });
  });

  activeMonth = getMonthKey(toImport[0].date);
  refresh();

  importedRows = [];
  importFileInput.value = "";
  importPreview.style.display = "none";
  importStats.innerHTML = `<span style="color:#10b981;font-weight:600">Imported ${toImport.length} expenses!</span>`;
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
  const filtered = expenses
    .filter((e) => getMonthKey(e.date) === activeMonth)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (filtered.length === 0) return;

  const profile = getProfile();
  const header = "Date,Description,Category,Amount";
  const rows = filtered.map(
    (e) => `${e.date},"${e.description.replace(/"/g, '""')}",${e.category},${e.amount.toFixed(2)}`
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const filename = `${profile.name}_${profile.surname}_Expenses_${activeMonth}.csv`;
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
    Total Expenses: <strong>R${total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</strong>
    &nbsp;&nbsp;|&nbsp;&nbsp; ${filtered.length} transactions
  </div>

  <h2>Category Breakdown</h2>
  <table>
    <tr><th>Category</th><th class="amount">Amount</th><th class="amount">% of Total</th></tr>
    ${sortedCats.map(([cat, amt]) => `
    <tr class="cat-row">
      <td>${cat}</td>
      <td class="amount">R${amt.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
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
      <td class="amount">R${e.amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
    </tr>`).join("")}
    <tr style="border-top: 2px solid #0f3460; font-weight: bold;">
      <td colspan="3" style="text-align: right;">Total</td>
      <td class="amount">R${total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
    </tr>
  </table>

  <p class="footer">Generated on ${new Date().toLocaleDateString("en-ZA")} &mdash; Expense Tracker</p>
</body>
</html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-word;charset=utf-8" });
  const filename = `${profile.name}_${profile.surname}_Expenses_${activeMonth}.doc`;
  saveAs(blob, filename);
});
