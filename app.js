const STORAGE_KEY = "expense_tracker_data";

const CATEGORY_COLORS = {
  Food: "#f59e0b",
  Transport: "#3b82f6",
  Housing: "#8b5cf6",
  Utilities: "#6366f1",
  Entertainment: "#ec4899",
  Shopping: "#10b981",
  Health: "#ef4444",
  Education: "#06b6d4",
  Other: "#6b7280",
};

function loadExpenses() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatCurrency(amount) {
  return "R" + Number(amount).toFixed(2);
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

// DOM elements
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
const exportBtn = document.getElementById("export-btn");
const categoryBreakdown = document.getElementById("category-breakdown");

// Set default date to today
dateInput.value = getToday();

// State
let expenses = loadExpenses();
let activeMonth = getMonthKey(getToday());

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
    .map(
      (m) =>
        `<option value="${m}" ${m === activeMonth ? "selected" : ""}>${getMonthLabel(m)}</option>`
    )
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
    </div>
  `
    )
    .join("");
}

function renderExpenses() {
  const filtered = expenses
    .filter((e) => getMonthKey(e.date) === activeMonth)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  if (filtered.length === 0) {
    expensesBody.innerHTML = "";
    noExpenses.style.display = "block";
    return;
  }

  noExpenses.style.display = "none";
  expensesBody.innerHTML = filtered
    .map(
      (e) => `
    <tr>
      <td class="expense-date">${formatDate(e.date)}</td>
      <td>${escapeHtml(e.description)}</td>
      <td><span class="category-tag" style="background: ${CATEGORY_COLORS[e.category] || "#6b7280"}20; color: ${CATEGORY_COLORS[e.category] || "#6b7280"}">${e.category}</span></td>
      <td class="expense-amount">${formatCurrency(e.amount)}</td>
      <td><button class="btn-delete" data-id="${e.id}" title="Delete">&times;</button></td>
    </tr>
  `
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function refresh() {
  saveExpenses(expenses);
  updateSummary();
  updateMonthFilter();
  updateCategoryBreakdown();
  renderExpenses();
}

// Add expense
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const expense = {
    id: generateId(),
    description: descInput.value.trim(),
    amount: parseFloat(amountInput.value),
    category: categoryInput.value,
    date: dateInput.value,
  };

  expenses.push(expense);
  activeMonth = getMonthKey(expense.date);
  refresh();

  descInput.value = "";
  amountInput.value = "";
  dateInput.value = getToday();
  descInput.focus();
});

// Delete expense
expensesBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-delete");
  if (!btn) return;

  const id = btn.dataset.id;
  expenses = expenses.filter((exp) => exp.id !== id);
  refresh();
});

// Filter by month
filterMonth.addEventListener("change", () => {
  activeMonth = filterMonth.value;
  updateCategoryBreakdown();
  renderExpenses();
});

// Export CSV
exportBtn.addEventListener("click", () => {
  const filtered = expenses
    .filter((e) => getMonthKey(e.date) === activeMonth)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (filtered.length === 0) return;

  const header = "Date,Description,Category,Amount";
  const rows = filtered.map(
    (e) =>
      `${e.date},"${e.description.replace(/"/g, '""')}",${e.category},${e.amount.toFixed(2)}`
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expenses-${activeMonth}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── CSV Import ──────────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  Food: [
    "spar", "checkers", "pick n pay", "pick 'n pay", "woolworths", "food",
    "shoprite", "kfc", "mcdonalds", "mcdonald", "steers", "nandos", "nando's",
    "debonairs", "pizza", "burger", "chicken", "restaurant", "cafe", "bakery",
    "uber eats", "mr delivery", "takealot food", "fruit", "veg", "meat",
    "grocery", "groceries", "wimpy", "ocean basket", "spur", "rocomamas",
    "fishaways", "galito", "romans pizza", "hungry lion", "eat"
  ],
  Transport: [
    "uber", "bolt", "fuel", "petrol", "diesel", "engen", "shell", "caltex",
    "sasol", "total", "bp ", "garage", "parking", "e-toll", "toll", "gautrain",
    "myciti", "taxi", "car wash", "carwash", "tyre", "tire", "vehicle",
    "licence renewal", "traffic fine", "avis", "hertz", "drive"
  ],
  Housing: [
    "rent", "bond", "mortgage", "levy", "levies", "estate agent", "property",
    "maintenance", "home", "lease", "tenant", "landlord", "strata"
  ],
  Utilities: [
    "electricity", "water", "eskom", "city of", "municipal", "prepaid elec",
    "telkom", "fibre", "internet", "wifi", "wi-fi", "vodacom", "mtn", "cell c",
    "rain", "dstv", "multichoice", "showmax", "netflix", "spotify",
    "apple music", "youtube", "airtime", "data bundle", "cellphone"
  ],
  Entertainment: [
    "ster-kinekor", "nu metro", "cinema", "movie", "concert", "show",
    "tickets", "computicket", "webtickets", "bar ", "pub ", "club ",
    "tavern", "lounge", "game", "steam", "playstation", "xbox", "nintendo",
    "subscription", "twitch"
  ],
  Shopping: [
    "takealot", "amazon", "shein", "temu", "mr price", "ackermans", "pep",
    "jet ", "edgars", "foschini", "cotton on", "h&m", "zara", "truworths",
    "clothing", "shoes", "fashion", "mall", "store", "shop", "clicks",
    "dischem", "dis-chem", "makro", "game ", "builder", "cashbuild",
    "leroy merlin"
  ],
  Health: [
    "pharmacy", "doctor", "dr ", "medical", "hospital", "clinic", "dental",
    "dentist", "optom", "physio", "pathology", "ampath", "lancet",
    "discovery health", "medihelp", "gems", "bonitas", "momentum health",
    "dispens"
  ],
  Education: [
    "school", "university", "unisa", "college", "tuition", "fees",
    "textbook", "stationery", "udemy", "coursera", "skillshare", "course",
    "training", "student", "bursary"
  ],
};

function categorizeDescription(description) {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return "Other";
}

function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseDate(raw) {
  const cleaned = raw.replace(/['"]/g, "").trim();

  // yyyy-mm-dd or yyyy/mm/dd
  let m = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  // dd-mm-yyyy or dd/mm/yyyy
  m = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;

  // dd Mon yyyy or dd-Mon-yyyy (e.g. 15 Jun 2025, 15-Jun-2025)
  m = cleaned.match(/^(\d{1,2})[\s-](\w{3,9})[\s-](\d{4})$/);
  if (m) {
    const months = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
      january:1, february:2, march:3, april:4, june:6, july:7, august:8, september:9, october:10, november:11, december:12 };
    const mon = months[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }

  return null;
}

function detectColumns(headers, firstRow) {
  const h = headers.map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""));

  let dateCol = -1, descCol = -1, amountCol = -1, debitCol = -1, creditCol = -1;

  h.forEach((col, i) => {
    if (dateCol === -1 && (col.includes("date") || col.includes("transactiondate") || col.includes("posteddate"))) dateCol = i;
    if (descCol === -1 && (col.includes("description") || col.includes("desc") || col.includes("narrative") || col.includes("detail") || col.includes("reference"))) descCol = i;
    if (col === "amount" || col === "transactionamount") amountCol = i;
    if (col.includes("debit")) debitCol = i;
    if (col.includes("credit")) creditCol = i;
  });

  // Fallback: try to detect from data if headers didn't match
  if (dateCol === -1 || descCol === -1) {
    firstRow.forEach((val, i) => {
      if (dateCol === -1 && parseDate(val)) dateCol = i;
    });
    if (descCol === -1) {
      firstRow.forEach((val, i) => {
        if (i !== dateCol && i !== amountCol && i !== debitCol && i !== creditCol && val.length > 3 && !parseDate(val) && isNaN(parseFloat(val.replace(/[^0-9.-]/g, "")))) {
          descCol = i;
        }
      });
    }
  }

  return { dateCol, descCol, amountCol, debitCol, creditCol };
}

function parseAmount(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function processCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Skip leading info lines that some banks add before the actual CSV headers
  let headerIndex = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length >= 3) {
      const lower = fields.map((f) => f.toLowerCase()).join(" ");
      if (lower.includes("date") || lower.includes("description") || lower.includes("amount") || lower.includes("debit") || lower.includes("narrative")) {
        headerIndex = i;
        break;
      }
    }
  }

  const headers = parseCSVLine(lines[headerIndex]);
  const dataLines = lines.slice(headerIndex + 1);
  if (dataLines.length === 0) return [];

  const firstDataRow = parseCSVLine(dataLines[0]);
  const cols = detectColumns(headers, firstDataRow);

  if (cols.dateCol === -1 || cols.descCol === -1) return [];
  if (cols.amountCol === -1 && cols.debitCol === -1) return [];

  const results = [];
  for (const line of dataLines) {
    const fields = parseCSVLine(line);
    if (fields.length < 3) continue;

    const date = parseDate(fields[cols.dateCol] || "");
    if (!date) continue;

    const description = fields[cols.descCol] || "";
    if (!description.trim()) continue;

    let amount = null;
    if (cols.amountCol !== -1) {
      amount = parseAmount(fields[cols.amountCol]);
      if (amount !== null) amount = Math.abs(amount);
    }
    if ((amount === null || amount === 0) && cols.debitCol !== -1) {
      amount = parseAmount(fields[cols.debitCol]);
      if (amount !== null) amount = Math.abs(amount);
    }
    // Skip credit-only rows (money coming in, not expenses)
    if (amount === null || amount === 0) continue;

    results.push({
      date,
      description: description.trim(),
      amount,
      category: categorizeDescription(description),
      selected: true,
    });
  }

  return results;
}

// Import DOM elements
const importToggle = document.getElementById("import-toggle");
const importBody = document.getElementById("import-body");
const toggleArrow = document.getElementById("toggle-arrow");
const csvFileInput = document.getElementById("csv-file");
const importPreview = document.getElementById("import-preview");
const importStats = document.getElementById("import-stats");
const importBodyTable = document.getElementById("import-body-table");
const importConfirm = document.getElementById("import-confirm");
const importCancel = document.getElementById("import-cancel");
const selectAll = document.getElementById("select-all");

let importedRows = [];

importToggle.addEventListener("click", () => {
  const visible = importBody.style.display !== "none";
  importBody.style.display = visible ? "none" : "block";
  toggleArrow.classList.toggle("open", !visible);
});

csvFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    importedRows = processCSV(ev.target.result);
    if (importedRows.length === 0) {
      importStats.innerHTML = '<span style="color:#ef4444">Could not parse any expenses from this file. Make sure it has date, description, and amount columns.</span>';
      importPreview.style.display = "block";
      importBodyTable.innerHTML = "";
      importConfirm.style.display = "none";
      return;
    }
    importConfirm.style.display = "";
    renderImportPreview();
  };
  reader.readAsText(file);
});

function renderImportPreview() {
  importPreview.style.display = "block";
  selectAll.checked = importedRows.every((r) => r.selected);

  const selectedCount = importedRows.filter((r) => r.selected).length;
  const totalAmount = importedRows.filter((r) => r.selected).reduce((s, r) => s + r.amount, 0);
  const categories = [...new Set(importedRows.map((r) => r.category))];

  importStats.innerHTML = `
    <span><span class="import-stat">${importedRows.length}</span> transactions found</span>
    <span><span class="import-stat">${selectedCount}</span> selected</span>
    <span>Total: <span class="import-stat">${formatCurrency(totalAmount)}</span></span>
    <span><span class="import-stat">${categories.length}</span> categories</span>
  `;

  const categoryOptions = Object.keys(CATEGORY_COLORS)
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");

  importBodyTable.innerHTML = importedRows
    .map(
      (r, i) => `
    <tr>
      <td><input type="checkbox" class="row-check" data-idx="${i}" ${r.selected ? "checked" : ""}></td>
      <td class="expense-date">${formatDate(r.date)}</td>
      <td class="desc-cell" title="${escapeHtml(r.description)}">${escapeHtml(r.description)}</td>
      <td><select class="row-category" data-idx="${i}">${categoryOptions.replace(`value="${r.category}"`, `value="${r.category}" selected`)}
      </select>${r.category !== "Other" ? '<span class="import-badge">auto</span>' : ""}</td>
      <td class="amount-col">${formatCurrency(r.amount)}</td>
    </tr>
  `
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
    });
  });

  activeMonth = getMonthKey(toImport[0].date);
  refresh();

  importedRows = [];
  csvFileInput.value = "";
  importPreview.style.display = "none";
  importStats.innerHTML = `<span style="color:#10b981;font-weight:600">Successfully imported ${toImport.length} expenses!</span>`;
  setTimeout(() => { importStats.innerHTML = ""; }, 3000);
});

importCancel.addEventListener("click", () => {
  importedRows = [];
  csvFileInput.value = "";
  importPreview.style.display = "none";
  importStats.innerHTML = "";
});

// Initial render
refresh();
