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

// Initial render
refresh();
