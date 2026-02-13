// Offline Budget Tracker (localStorage)
// Data stays on the device. Export CSV for backup.

const STORAGE_KEY = "offline_budget_expenses_v1";
const BUDGET_KEY = "offline_budget_monthly_budget_v1";
const CATEGORIES_KEY = "offline_budget_categories_v1";

const defaultCategories = [
  "Food", "Groceries", "Bills", "Transport", "Load/Data",
  "School", "Health", "Shopping", "Savings", "Emergency", "Others"
];

const peso = (n) => {
  const num = Number(n || 0);
  return "₱" + num.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const startOfWeek = (d) => {
  // Monday as week start
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun ... 6 Sat
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
};

const startOfMonth = (d) => {
  const date = new Date(d);
  date.setDate(1);
  date.setHours(0,0,0,0);
  return date;
};

const loadJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const saveJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

let expenses = loadJSON(STORAGE_KEY, []);
let categories = loadJSON(CATEGORIES_KEY, defaultCategories);
let monthlyBudget = Number(localStorage.getItem(BUDGET_KEY) || 0);

// Elements
const installBtn = document.getElementById("installBtn");
const form = document.getElementById("expenseForm");
const dateEl = document.getElementById("date");
const amountEl = document.getElementById("amount");
const categoryEl = document.getElementById("category");
const typeEl = document.getElementById("type");
const notesEl = document.getElementById("notes");
const resetBtn = document.getElementById("resetBtn");

const searchEl = document.getElementById("search");
const filterTypeEl = document.getElementById("filterType");
const filterCategoryEl = document.getElementById("filterCategory");

const rowsEl = document.getElementById("rows");

const todayTotalEl = document.getElementById("todayTotal");
const weekTotalEl = document.getElementById("weekTotal");
const monthTotalEl = document.getElementById("monthTotal");

const monthlyBudgetEl = document.getElementById("monthlyBudget");
const remainingEl = document.getElementById("remaining");

const exportBtn = document.getElementById("exportBtn");
const wipeBtn = document.getElementById("wipeBtn");

// Init date
dateEl.value = todayISO();

// Populate categories
function renderCategoryOptions() {
  categoryEl.innerHTML = "";
  filterCategoryEl.innerHTML = `<option value="">All Categories</option>`;
  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categoryEl.appendChild(opt);

    const opt2 = document.createElement("option");
    opt2.value = c;
    opt2.textContent = c;
    filterCategoryEl.appendChild(opt2);
  });
}
renderCategoryOptions();

// Budget field
monthlyBudgetEl.value = monthlyBudget > 0 ? String(monthlyBudget) : "";
monthlyBudgetEl.addEventListener("input", () => {
  monthlyBudget = Number(monthlyBudgetEl.value || 0);
  localStorage.setItem(BUDGET_KEY, String(monthlyBudget));
  renderDashboard();
});

// Save expense
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const item = {
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + "_" + Math.random().toString(16).slice(2),
    date: dateEl.value,
    category: categoryEl.value,
    type: typeEl.value,
    amount: Number(amountEl.value || 0),
    notes: (notesEl.value || "").trim()
  };

  if (!item.date || !item.category || !item.type || !(item.amount > 0)) return;

  expenses.unshift(item);
  saveJSON(STORAGE_KEY, expenses);

  // Quick reset
  amountEl.value = "";
  notesEl.value = "";
  typeEl.value = "Needs";
  dateEl.value = todayISO();
  categoryEl.value = categories[0] || "Others";

  renderAll();
});

resetBtn.addEventListener("click", () => {
  amountEl.value = "";
  notesEl.value = "";
  typeEl.value = "Needs";
  categoryEl.value = categories[0] || "Others";
  dateEl.value = todayISO();
});

function filteredExpenses() {
  const q = (searchEl.value || "").toLowerCase();
  const t = filterTypeEl.value;
  const c = filterCategoryEl.value;

  return expenses.filter((x) => {
    const matchesQ = !q || (x.notes || "").toLowerCase().includes(q) || (x.category || "").toLowerCase().includes(q);
    const matchesT = !t || x.type === t;
    const matchesC = !c || x.category === c;
    return matchesQ && matchesT && matchesC;
  });
}

function renderRows() {
  const list = filteredExpenses();

  rowsEl.innerHTML = "";
  if (list.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6"><small>No expenses yet. Add your first one above.</small></td>`;
    rowsEl.appendChild(tr);
    return;
  }

  list.forEach((x) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${x.date}</td>
      <td>${x.category}</td>
      <td>${x.type}</td>
      <td class="right">${peso(x.amount)}</td>
      <td>${x.notes ? x.notes : "<small>—</small>"}</td>
      <td class="right"><button class="iconBtn" data-del="${x.id}" title="Delete">Delete</button></td>
    `;
    rowsEl.appendChild(tr);
  });

  rowsEl.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      expenses = expenses.filter((x) => x.id !== id);
      saveJSON(STORAGE_KEY, expenses);
      renderAll();
    });
  });
}

function sumBetween(start, endExclusive) {
  const s = start.getTime();
  const e = endExclusive.getTime();
  return expenses.reduce((acc, x) => {
    const t = new Date(x.date + "T00:00:00").getTime();
    if (t >= s && t < e) return acc + x.amount;
    return acc;
  }, 0);
}

function renderDashboard() {
  const now = new Date();
  const t0 = new Date(todayISO() + "T00:00:00");
  const t1 = new Date(t0); t1.setDate(t1.getDate() + 1);

  const w0 = startOfWeek(now);
  const w1 = new Date(w0); w1.setDate(w1.getDate() + 7);

  const m0 = startOfMonth(now);
  const m1 = new Date(m0); m1.setMonth(m1.getMonth() + 1);

  const todayTotal = sumBetween(t0, t1);
  const weekTotal = sumBetween(w0, w1);
  const monthTotal = sumBetween(m0, m1);

  todayTotalEl.textContent = peso(todayTotal);
  weekTotalEl.textContent = peso(weekTotal);
  monthTotalEl.textContent = peso(monthTotal);

  if (monthlyBudget > 0) {
    remainingEl.textContent = peso(Math.max(0, monthlyBudget - monthTotal));
  } else {
    remainingEl.textContent = "₱0";
  }
}

function renderAll() {
  renderDashboard();
  renderRows();
}

searchEl.addEventListener("input", renderRows);
filterTypeEl.addEventListener("change", renderRows);
filterCategoryEl.addEventListener("change", renderRows);

// Export CSV
exportBtn.addEventListener("click", () => {
  const header = ["Date","Category","Type","Amount","Notes"];
  const lines = [header.join(",")];

  expenses
    .slice()
    .reverse()
    .forEach((x) => {
      const row = [
        x.date,
        `"${String(x.category).replaceAll('"','""')}"`,
        x.type,
        x.amount,
        `"${String(x.notes || "").replaceAll('"','""')}"`
      ];
      lines.push(row.join(","));
    });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "budget-expenses.csv";
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// Wipe data
wipeBtn.addEventListener("click", () => {
  const ok = confirm("Delete ALL saved expenses on this device?");
  if (!ok) return;
  expenses = [];
  saveJSON(STORAGE_KEY, expenses);
  renderAll();
});

renderAll();

// Service Worker register
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try { await navigator.serviceWorker.register("./sw.js"); } catch {}
  });
}

// Install button (Android/Chrome)
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});
