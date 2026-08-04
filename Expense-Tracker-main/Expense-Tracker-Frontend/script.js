// ===== Elements =====
const balance = document.getElementById("balance");
const income = document.getElementById("income");
const expense = document.getElementById("expense");
const list = document.getElementById("list");
const text = document.getElementById("text");
const amount = document.getElementById("amount");
const category = document.getElementById("category");
const transactionDate = document.getElementById("transactionDate");
const logoutBtn = document.getElementById("logoutBtn");
const addTransaction = document.getElementById("add-transaction");

const budgetInput = document.getElementById("budgetInput");
const setBudgetBtn = document.getElementById("setBudgetBtn");
const budgetDisplay = document.getElementById("budgetDisplay");
const budgetRemaining = document.getElementById("budgetRemaining");
const budgetAlert = document.getElementById("budgetAlert");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortSelect = document.getElementById("sortSelect");
const dateFrom = document.getElementById("dateFrom");
const dateTo = document.getElementById("dateTo");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

const recentList = document.getElementById("recentList");

// Phase 6
const avatarPreview = document.getElementById("avatarPreview");
const avatarUrlInput = document.getElementById("avatarUrlInput");
const currencySelect = document.getElementById("currencySelect");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const darkModeToggle = document.getElementById("darkModeToggle");

// Phase 7
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportExcelBtn = document.getElementById("exportExcelBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

// Phase 8
const recurringCheckbox = document.getElementById("recurringCheckbox");
const recurrenceInterval = document.getElementById("recurrenceInterval");
const goalsList = document.getElementById("goalsList");
const goalName = document.getElementById("goalName");
const goalTarget = document.getElementById("goalTarget");
const addGoalBtn = document.getElementById("addGoalBtn");

// ===== Auth =====
const username = localStorage.getItem("user");
const token = localStorage.getItem("token");
if (!username || !token) {
  window.location.href = "login.html";
}

function authHeaders(extra = {}) {
  return {
    "Authorization": `Bearer ${token}`,
    ...extra,
  };
}

function handleAuthFailure(res) {
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    alert("Your session has expired or is invalid. Please log in again.");
    window.location.href = "login.html";
    return true;
  }
  return false;
}

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

// ===== State =====
let transactions = [];
let goals = [];
let monthlyBudget = 0;
let currencySymbol = "$";
let pieChartInstance, barChartInstance, lineChartInstance;

const CURRENCY_SYMBOLS = { USD: "$", INR: "₹", EUR: "€", GBP: "£" };

function fmt(n) {
  const value = Number(n);
  return `${currencySymbol}${(isNaN(value) ? 0 : value).toFixed(2)}`;
}

// ===== Date helpers =====
function isSameMonth(dateStr, refDate) {
  const d = new Date(dateStr);
  return d.getFullYear() === refDate.getFullYear() && d.getMonth() === refDate.getMonth();
}

function isSameYear(dateStr, refDate) {
  const d = new Date(dateStr);
  return d.getFullYear() === refDate.getFullYear();
}

function isWithinLastNDays(dateStr, n, refDate) {
  const d = new Date(dateStr);
  const diffDays = (refDate - d) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays < n;
}

function addInterval(dateStr, interval) {
  const d = new Date(dateStr);
  if (interval === "WEEKLY") {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().split("T")[0];
}

function computeSummary(txns) {
  const inc = txns.filter((t) => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  const exp = txns.filter((t) => t.amount < 0).reduce((acc, t) => acc + t.amount, 0) * -1;
  return { income: inc, expense: exp, net: inc - exp };
}

// ===== Overview balance/income/expense (always all-time) =====
function updateValues() {
  const s = computeSummary(transactions);
  balance.textContent = fmt(s.net);
  income.textContent = fmt(s.income);
  expense.textContent = fmt(s.expense);
}

// ===== PHASE 3: Period summaries =====
function renderPeriodSummaries() {
  const now = new Date();

  const weekly = computeSummary(transactions.filter((t) => isWithinLastNDays(t.date, 7, now)));
  const monthly = computeSummary(transactions.filter((t) => isSameMonth(t.date, now)));
  const yearly = computeSummary(transactions.filter((t) => isSameYear(t.date, now)));
  const totalSavings = computeSummary(transactions).net;

  document.getElementById("weeklyIncome").textContent = fmt(weekly.income);
  document.getElementById("weeklyExpense").textContent = fmt(weekly.expense);
  document.getElementById("weeklyNet").textContent = fmt(weekly.net);

  document.getElementById("monthlyIncome").textContent = fmt(monthly.income);
  document.getElementById("monthlyExpense").textContent = fmt(monthly.expense);
  document.getElementById("monthlyNet").textContent = fmt(monthly.net);

  document.getElementById("yearlyIncome").textContent = fmt(yearly.income);
  document.getElementById("yearlyExpense").textContent = fmt(yearly.expense);
  document.getElementById("yearlyNet").textContent = fmt(yearly.net);

  document.getElementById("totalSavings").textContent = fmt(totalSavings);
}

// ===== PHASE 3: Recent transactions (last 5) =====
function renderRecentTransactions() {
  recentList.innerHTML = "";
  const sorted = [...transactions].sort((a, b) => {
    const diff = new Date(b.date) - new Date(a.date);
    return diff !== 0 ? diff : b.id - a.id;
  });
  sorted.slice(0, 5).forEach((t) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${t.date} — ${t.text} (${t.category ?? "Other"})</span>
      <span class="amount ${t.amount < 0 ? "expense" : ""}">${fmt(t.amount)}</span>
    `;
    recentList.appendChild(li);
  });
  if (sorted.length === 0) {
    recentList.innerHTML = `<li>No transactions yet.</li>`;
  }
}

// ===== PHASE 3: Charts =====
function renderCharts() {
  renderPieChart();
  renderBarChart();
  renderLineChart();
}

function renderPieChart() {
  const categoryTotals = {};
  transactions.filter((t) => t.amount < 0).forEach((t) => {
    const cat = t.category || "Other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);
  const ctx = document.getElementById("pieChart");

  if (pieChartInstance) pieChartInstance.destroy();
  pieChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels.length ? labels : ["No expenses yet"],
      datasets: [{
        data: data.length ? data : [1],
        backgroundColor: ["#825CFF", "#f44336", "#4caf50", "#2196f3", "#ff9800", "#9c27b0", "#00bcd4", "#795548", "#607d8b"],
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 10 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${fmt(ctx.raw)}`,
          },
        },
      },
    },
  });
}

function getLastSixMonthsLabels() {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
    });
  }
  return months;
}

function renderBarChart() {
  const months = getLastSixMonthsLabels();
  const incomeData = months.map(() => 0);
  const expenseData = months.map(() => 0);

  transactions.forEach((t) => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const idx = months.findIndex((m) => m.key === key);
    if (idx !== -1) {
      if (t.amount > 0) incomeData[idx] += t.amount;
      else expenseData[idx] += Math.abs(t.amount);
    }
  });

  const ctx = document.getElementById("barChart");
  if (barChartInstance) barChartInstance.destroy();
  barChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: months.map((m) => m.label),
      datasets: [
        { label: "Income", data: incomeData, backgroundColor: "#4caf50" },
        { label: "Expense", data: expenseData, backgroundColor: "#f44336" },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 10 } } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.raw)}` } },
      },
      scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } },
    },
  });
}

function renderLineChart() {
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  const labels = [];
  const data = [];
  sorted.forEach((t) => {
    running += t.amount;
    labels.push(t.date);
    data.push(running.toFixed(2));
  });

  const ctx = document.getElementById("lineChart");
  if (lineChartInstance) lineChartInstance.destroy();
  lineChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels.length ? labels : ["No data"],
      datasets: [{
        label: "Balance",
        data: data.length ? data : [0],
        borderColor: "#825CFF",
        backgroundColor: "rgba(130,92,255,0.2)",
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `Balance: ${fmt(ctx.raw)}` } },
      },
      scales: { x: { ticks: { font: { size: 8 } } }, y: { ticks: { font: { size: 9 } } } },
    },
  });
}

// ===== PHASE 5: Budget =====
function fetchBudget() {
  fetch(`http://localhost:8080/ExpTrack/budget/${username}`, { headers: authHeaders() })
    .then((res) => {
      if (handleAuthFailure(res)) return null;
      return res.json();
    })
    .then((data) => {
      if (!data) return;
      monthlyBudget = data.monthlyBudget || 0;
      budgetInput.value = monthlyBudget || "";
      updateBudgetDisplay();
    })
    .catch((err) => console.error("Budget fetch failed", err));
}

setBudgetBtn.addEventListener("click", () => {
  const value = parseFloat(budgetInput.value);
  if (isNaN(value) || value < 0) {
    alert("Please enter a valid, non-negative budget amount.");
    return;
  }
  fetch(`http://localhost:8080/ExpTrack/budget/${username}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ monthlyBudget: value }),
  })
    .then((res) => {
      if (handleAuthFailure(res)) return null;
      return res.json();
    })
    .then((data) => {
      if (!data) return;
      monthlyBudget = data.monthlyBudget;
      updateBudgetDisplay();
    })
    .catch((err) => console.error("Budget update failed", err));
});

function updateBudgetDisplay() {
  const now = new Date();
  const monthlyExpense = transactions
    .filter((t) => isSameMonth(t.date, now) && t.amount < 0)
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const remaining = monthlyBudget - monthlyExpense;

  budgetDisplay.textContent = fmt(monthlyBudget);
  budgetRemaining.textContent = fmt(remaining);

  if (monthlyBudget <= 0) {
    budgetAlert.textContent = "Set a monthly budget above to start tracking your spending limit.";
    budgetAlert.className = "budget-alert budget-alert-neutral";
  } else if (monthlyExpense >= monthlyBudget) {
    budgetAlert.textContent = "⚠ You have exceeded your monthly budget!";
    budgetAlert.className = "budget-alert budget-alert-danger";
  } else if (monthlyExpense >= monthlyBudget * 0.8) {
    budgetAlert.textContent = "⚠ You're close to your monthly budget limit.";
    budgetAlert.className = "budget-alert budget-alert-warning";
  } else {
    budgetAlert.textContent = "You're within your monthly budget. Nice work!";
    budgetAlert.className = "budget-alert budget-alert-safe";
  }
}

// ===== PHASE 6: Profile (avatar, currency) =====
function fetchProfile() {
  fetch(`http://localhost:8080/ExpTrack/profile/${username}`, { headers: authHeaders() })
    .then((res) => {
      if (handleAuthFailure(res)) return null;
      return res.json();
    })
    .then((data) => {
      if (!data) return;
      currencySymbol = CURRENCY_SYMBOLS[data.currency] || "$";
      currencySelect.value = data.currency || "USD";
      if (data.avatarUrl) {
        avatarUrlInput.value = data.avatarUrl;
        avatarPreview.src = data.avatarUrl;
      }
      refreshDashboard();
    })
    .catch((err) => console.error("Profile fetch failed", err));
}

saveProfileBtn.addEventListener("click", () => {
  const avatarUrl = avatarUrlInput.value.trim();
  const currency = currencySelect.value;

  fetch(`http://localhost:8080/ExpTrack/profile/${username}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ avatarUrl, currency }),
  })
    .then((res) => {
      if (handleAuthFailure(res)) return null;
      return res.json();
    })
    .then((data) => {
      if (!data) return;
      currencySymbol = CURRENCY_SYMBOLS[data.currency] || "$";
      if (data.avatarUrl) avatarPreview.src = data.avatarUrl;
      refreshDashboard();
      alert("Profile saved.");
    })
    .catch((err) => console.error("Profile save failed", err));
});

const avatarFileInput = document.getElementById("avatarFileInput");

avatarFileInput.addEventListener("change", () => {
  const file = avatarFileInput.files[0];
  if (!file) return;

  if (file.size > 1024 * 1024) {
    alert("Please choose an image smaller than 1MB.");
    avatarFileInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    avatarPreview.src = reader.result;
    avatarUrlInput.value = reader.result;
  };
  reader.readAsDataURL(file);
});
// ===== PHASE 6: Dark mode — self-contained, does not depend on styles.css being fresh =====
const darkModeCSS = `
  body.dark-mode { background: #121212 !important; color: #e6e6e6 !important; }
  body.dark-mode .dashboard-container,
  body.dark-mode .card-section,
  body.dark-mode .summary-card,
  body.dark-mode .chart-box,
  body.dark-mode .budget-stats > div,
  body.dark-mode .goal-item,
  body.dark-mode .form,
  body.dark-mode .history,
  body.dark-mode table { background: #1e1e1e !important; color: #e6e6e6 !important; }
  body.dark-mode .balance,
  body.dark-mode .income-expense { background: transparent !important; }
  body.dark-mode .form-control input,
  body.dark-mode .form-control select,
  body.dark-mode .filter-row input,
  body.dark-mode .filter-row select,
  body.dark-mode .budget-set-row input,
  body.dark-mode .profile-fields input,
  body.dark-mode .profile-fields select,
  body.dark-mode .goal-add-row input,
  body.dark-mode select,
  body.dark-mode input[type="date"] { background: #2a2a2a !important; color: #e6e6e6 !important; border-color: #444 !important; }
  body.dark-mode table th { background: #2a2a2a !important; color: #e6e6e6 !important; }
  body.dark-mode table tr:hover { background: #262626 !important; }
  body.dark-mode .mode-toggle-btn { background: #2a2a2a !important; color: #e6e6e6 !important; }
  body.dark-mode .chart-title,
  body.dark-mode .export-note,
  body.dark-mode .no-goals,
  body.dark-mode .label { color: #aaa !important; }
`;

const darkModeStyleTag = document.createElement("style");
darkModeStyleTag.id = "dark-mode-injected-styles";
darkModeStyleTag.textContent = darkModeCSS;
document.head.appendChild(darkModeStyleTag);

function applyDarkModePreference() {
  const isDark = localStorage.getItem("darkMode") === "true";
  document.body.classList.toggle("dark-mode", isDark);
  darkModeToggle.textContent = isDark ? "☀️" : "🌙";
}

darkModeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", isDark ? "true" : "false");
  darkModeToggle.textContent = isDark ? "☀️" : "🌙";
});

// ===== PHASE 4: Search / filter / sort =====
function getFilteredSortedTransactions() {
  let result = [...transactions];

  const term = searchInput.value.trim().toLowerCase();
  if (term) {
    result = result.filter((t) => t.text.toLowerCase().includes(term));
  }

  const cat = categoryFilter.value;
  if (cat && cat !== "All") {
    result = result.filter((t) => (t.category || "Other") === cat);
  }

  if (dateFrom.value) {
    result = result.filter((t) => t.date >= dateFrom.value);
  }
  if (dateTo.value) {
    result = result.filter((t) => t.date <= dateTo.value);
  }

  switch (sortSelect.value) {
    case "date-desc":
      result.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case "date-asc":
      result.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case "amount-desc":
      result.sort((a, b) => b.amount - a.amount);
      break;
    case "amount-asc":
      result.sort((a, b) => a.amount - b.amount);
      break;
  }

  return result;
}

function renderFilteredTable() {
  list.innerHTML = "";
  getFilteredSortedTransactions().forEach(addTransactionDOM);
}

[searchInput, categoryFilter, sortSelect, dateFrom, dateTo].forEach((el) => {
  el.addEventListener("input", renderFilteredTable);
  el.addEventListener("change", renderFilteredTable);
});

clearFiltersBtn.addEventListener("click", () => {
  searchInput.value = "";
  categoryFilter.value = "All";
  sortSelect.value = "date-desc";
  dateFrom.value = "";
  dateTo.value = "";
  renderFilteredTable();
});

// ===== PHASE 8: Recurring — checkbox enables interval dropdown =====
recurringCheckbox.addEventListener("change", () => {
  recurrenceInterval.disabled = !recurringCheckbox.checked;
});

// Creates the next occurrence of a recurring transaction by reusing the normal add-transaction endpoint.
function repeatTransaction(id) {
  const original = transactions.find((t) => t.id === id);
  if (!original) return;

  const nextDate = addInterval(original.date, original.recurrenceInterval || "MONTHLY");
  const newTransaction = {
    text: original.text,
    amount: original.amount,
    category: original.category,
    date: nextDate,
    recurring: true,
    recurrenceInterval: original.recurrenceInterval || "MONTHLY",
  };

  fetch(`http://localhost:8080/ExpTrack/transactions/${username}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(newTransaction),
  })
    .then((res) => {
      if (handleAuthFailure(res)) return null;
      return res.json();
    })
    .then((data) => {
      if (!data) return;
      transactions.push(data);
      refreshDashboard();
    })
    .catch((err) => console.error("Repeat failed", err));
}

// ===== Table row rendering =====
function addTransactionDOM(transaction) {
  const tr = document.createElement("tr");
  const recurringBadge = transaction.recurring ? ` 🔁` : "";
  const repeatButton = transaction.recurring
    ? `<button class="repeat-btn" onclick="repeatTransaction(${transaction.id})" title="Add next occurrence">↻</button>`
    : "";
  tr.innerHTML = `
    <td>${transaction.date}</td>
    <td>${transaction.text}${recurringBadge}</td>
    <td>${transaction.category ?? "Other"}</td>
    <td class="amount ${transaction.amount < 0 ? "expense" : ""}">${fmt(transaction.amount)}</td>
    <td>
      <button onclick="removeTransaction(${transaction.id})">X</button>
      ${repeatButton}
    </td>
  `;
  list.appendChild(tr);
}

// ===== PHASE 8: Savings Goals =====
function fetchGoals() {
  fetch(`http://localhost:8080/ExpTrack/goals/${username}`, { headers: authHeaders() })
    .then((res) => {
      if (handleAuthFailure(res)) return null;
      return res.json();
    })
    .then((data) => {
      if (!data) return;
      goals = data;
      renderGoals();
    })
    .catch((err) => console.error("Goals fetch failed", err));
}

function renderGoals() {
  goalsList.innerHTML = "";
  if (goals.length === 0) {
    goalsList.innerHTML = `<p class="no-goals">No savings goals yet — add one below.</p>`;
    return;
  }
  goals.forEach((g) => {
    const pct = g.targetAmount > 0 ? Math.min(100, (g.savedAmount / g.targetAmount) * 100) : 0;
    const div = document.createElement("div");
    div.className = "goal-item";
    div.innerHTML = `
      <div class="goal-header">
        <span class="goal-name">${g.name}</span>
        <span class="goal-amounts">${fmt(g.savedAmount)} / ${fmt(g.targetAmount)}</span>
      </div>
      <div class="goal-progress-bar">
        <div class="goal-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="goal-actions">
        <button class="btn-secondary btn-small" onclick="contributeToGoal(${g.id})">Add Funds</button>
        <button class="btn-secondary btn-small" onclick="deleteGoal(${g.id})">Delete</button>
      </div>
    `;
    goalsList.appendChild(div);
  });
}

addGoalBtn.addEventListener("click", () => {
  const name = goalName.value.trim();
  const targetAmount = parseFloat(goalTarget.value);

  if (!name || isNaN(targetAmount) || targetAmount <= 0) {
    alert("Please enter a goal name and a target amount greater than zero.");
    return;
  }

  fetch(`http://localhost:8080/ExpTrack/goals/${username}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name, targetAmount }),
  })
    .then((res) => {
      if (handleAuthFailure(res)) return null;
      return res.json();
    })
    .then((data) => {
      if (!data) return;
      goals.push(data);
      renderGoals();
      goalName.value = "";
      goalTarget.value = "";
    })
    .catch((err) => console.error("Add goal failed", err));
});

function contributeToGoal(goalId) {
  const amountStr = prompt("How much would you like to add to this goal?");
  if (amountStr === null) return;
  const amountValue = parseFloat(amountStr);
  if (isNaN(amountValue) || amountValue === 0) {
    alert("Please enter a valid, non-zero amount.");
    return;
  }

  fetch(`http://localhost:8080/ExpTrack/goals/${username}/${goalId}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ amount: amountValue }),
  })
    .then((res) => {
      if (handleAuthFailure(res)) return null;
      return res.json();
    })
    .then((data) => {
      if (!data) return;
      goals = goals.map((g) => (g.id === data.id ? data : g));
      renderGoals();
    })
    .catch((err) => console.error("Contribute failed", err));
}

function deleteGoal(goalId) {
  if (!confirm("Delete this savings goal?")) return;

  fetch(`http://localhost:8080/ExpTrack/goals/${username}/${goalId}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
    .then((res) => {
      if (handleAuthFailure(res)) return;
      goals = goals.filter((g) => g.id !== goalId);
      renderGoals();
    })
    .catch((err) => console.error("Delete goal failed", err));
}

// ===== PHASE 7: Export =====
function getExportRows() {
  return getFilteredSortedTransactions().map((t) => ({
    Date: t.date,
    Description: t.text,
    Category: t.category ?? "Other",
    Amount: t.amount,
  }));
}

exportCsvBtn.addEventListener("click", () => {
  const rows = getExportRows();
  if (rows.length === 0) {
    alert("No transactions to export.");
    return;
  }
  const header = "Date,Description,Category,Amount";
  const body = rows
    .map((r) => [r.Date, `"${r.Description.replace(/"/g, '""')}"`, r.Category, r.Amount].join(","))
    .join("\n");
  const csv = `${header}\n${body}`;

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "transactions.csv";
  link.click();
});

exportExcelBtn.addEventListener("click", () => {
  const rows = getExportRows();
  if (rows.length === 0) {
    alert("No transactions to export.");
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  XLSX.writeFile(workbook, "transactions.xlsx");
});

exportPdfBtn.addEventListener("click", () => {
  const rows = getExportRows();
  if (rows.length === 0) {
    alert("No transactions to export.");
    return;
  }
  const doc = new jspdf.jsPDF();
  doc.setFontSize(14);
  doc.text("FinTrackPro - Transactions", 14, 15);
  doc.autoTable({
    startY: 22,
    head: [["Date", "Description", "Category", "Amount"]],
    body: rows.map((r) => [r.Date, r.Description, r.Category, fmt(r.Amount)]),
  });
  doc.save("transactions.pdf");
});

// ===== Central refresh: called after init / add / delete =====
function refreshDashboard() {
  updateValues();
  renderFilteredTable();
  renderPeriodSummaries();
  renderRecentTransactions();
  renderCharts();
  updateBudgetDisplay();
}

// ===== Delete =====
function removeTransaction(id) {
  fetch(`http://localhost:8080/ExpTrack/transactions/${username}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
    .then((res) => {
      if (handleAuthFailure(res)) return;
      transactions = transactions.filter((t) => t.id !== id);
      refreshDashboard();
    })
    .catch((err) => console.error("Delete failed", err));
}

// ===== Add =====
addTransaction.addEventListener("click", () => {
  const textValue = text.value.trim();
  const amountValue = parseFloat(amount.value);
  const categoryValue = category ? category.value : "Other";
  const isRecurring = recurringCheckbox.checked;
  const interval = recurrenceInterval.value;

  if (!textValue || isNaN(amountValue)) {
    alert("Please enter valid description and amount.");
    return;
  }

  const transaction = {
    text: textValue,
    amount: amountValue,
    category: categoryValue,
    date: transactionDate.value || new Date().toISOString().split("T")[0],
    recurring: isRecurring,
    recurrenceInterval: isRecurring ? interval : null,
  };

  fetch(`http://localhost:8080/ExpTrack/transactions/${username}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(transaction),
  })
    .then((res) => {
      if (handleAuthFailure(res)) return null;
      return res.json();
    })
    .then((data) => {
      if (!data) return;
      transactions.push(data);
      refreshDashboard();
      text.value = "";
      amount.value = "";
      recurringCheckbox.checked = false;
      recurrenceInterval.disabled = true;
    })
    .catch((err) => console.error("Add failed", err));
});

// ===== Init =====
function init() {
  applyDarkModePreference();

  if (transactionDate) {
    transactionDate.value = new Date().toISOString().split("T")[0];
  }

  fetch(`http://localhost:8080/ExpTrack/transactions/${username}`, {
    headers: authHeaders(),
  })
    .then((res) => {
      if (handleAuthFailure(res)) return [];
      return res.json();
    })
    .then((data) => {
      transactions = data || [];
      refreshDashboard();
    })
    .catch((err) => console.error("Fetch failed", err));

  fetchBudget();
  fetchProfile();
  fetchGoals();
}

init();