const API_URL = "http://localhost:3000/api/expenses";

const expenseForm = document.getElementById("expenseForm");
const editForm = document.getElementById("editForm");
const categoryFilter = document.getElementById("categoryFilter");
const expensesTable = document.getElementById("expensesTable");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const editErrorMessage = document.getElementById("editErrorMessage");
const editModalElement = document.getElementById("editModal");
const editModal = new bootstrap.Modal(editModalElement);

let expenses = [];
let editingId = null;

const categoryColors = {
  Food: "text-bg-success",
  Transport: "text-bg-primary",
  Bills: "text-bg-warning",
  Entertainment: "text-bg-info",
  Other: "text-bg-secondary"
};

function showLoading(show) {
  loading.classList.toggle("d-none", !show);
}

function showError(message) {
  const text = message === "Failed to fetch"
    ? "Could not connect to the server. Make sure it is running."
    : message;

  errorMessage.textContent = text;
  errorMessage.classList.remove("d-none");
}

function hideError() {
  errorMessage.classList.add("d-none");
}

async function getExpenses() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Could not load expenses");
  }

  return response.json();
}

async function addExpense(data) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Could not add expense");
  }
}

async function updateExpense(id, data) {
  const response = await fetch(API_URL + "/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Could not update expense");
  }
}

async function deleteExpense(id) {
  const response = await fetch(API_URL + "/" + id, {
    method: "DELETE"
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Could not delete expense");
  }
}

function renderSummary(list) {
  const total = list.reduce(function (sum, expense) {
    return sum + Number(expense.amount);
  }, 0);

  const highest = list.reduce(function (max, expense) {
    return Math.max(max, Number(expense.amount));
  }, 0);

  document.getElementById("totalAmount").textContent = "$" + total.toFixed(2);
  document.getElementById("expenseCount").textContent = list.length;
  document.getElementById("highestExpense").textContent = "$" + highest.toFixed(2);
}

function renderTable(list) {
  expensesTable.innerHTML = "";

  if (list.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "text-center text-muted py-4";
    cell.textContent = "No expenses found";
    row.appendChild(cell);
    expensesTable.appendChild(row);
    return;
  }

  list.forEach(function (expense) {
    const row = document.createElement("tr");

    const titleCell = document.createElement("td");
    titleCell.textContent = expense.title;

    const amountCell = document.createElement("td");
    amountCell.textContent = "$" + Number(expense.amount).toFixed(2);

    const categoryCell = document.createElement("td");
    const categoryBadge = document.createElement("span");
    categoryBadge.className = "badge " + categoryColors[expense.category];
    categoryBadge.textContent = expense.category;
    categoryCell.appendChild(categoryBadge);

    const dateCell = document.createElement("td");
    dateCell.textContent = expense.date;

    const actionsCell = document.createElement("td");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");

    editButton.className = "btn btn-sm btn-warning me-2";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", function () {
      openEditModal(expense);
    });

    deleteButton.className = "btn btn-sm btn-danger";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function () {
      removeExpense(expense.id);
    });

    actionsCell.append(editButton, deleteButton);
    row.append(titleCell, amountCell, categoryCell, dateCell, actionsCell);
    expensesTable.appendChild(row);
  });
}

function applyFilter() {
  const selectedCategory = categoryFilter.value;

  if (selectedCategory === "All") {
    renderTable(expenses);
    return;
  }

  const filteredExpenses = expenses.filter(function (expense) {
    return expense.category === selectedCategory;
  });

  renderTable(filteredExpenses);
}

async function refresh() {
  hideError();
  showLoading(true);

  try {
    expenses = await getExpenses();
    renderSummary(expenses);
    applyFilter();
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

function openEditModal(expense) {
  editingId = expense.id;
  document.getElementById("editTitle").value = expense.title;
  document.getElementById("editAmount").value = expense.amount;
  document.getElementById("editCategory").value = expense.category;
  document.getElementById("editDate").value = expense.date;
  editErrorMessage.classList.add("d-none");
  editModal.show();
}

async function removeExpense(id) {
  if (!confirm("Are you sure you want to delete this expense?")) {
    return;
  }

  hideError();
  showLoading(true);

  try {
    await deleteExpense(id);
    await refresh();
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

expenseForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  hideError();
  showLoading(true);

  const data = {
    title: document.getElementById("title").value.trim(),
    amount: Number(document.getElementById("amount").value),
    category: document.getElementById("category").value,
    date: document.getElementById("date").value
  };

  try {
    await addExpense(data);
    expenseForm.reset();
    await refresh();
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
});

editForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  editErrorMessage.classList.add("d-none");
  showLoading(true);

  const data = {
    title: document.getElementById("editTitle").value.trim(),
    amount: Number(document.getElementById("editAmount").value),
    category: document.getElementById("editCategory").value,
    date: document.getElementById("editDate").value
  };

  try {
    await updateExpense(editingId, data);
    editModal.hide();
    await refresh();
  } catch (error) {
    editErrorMessage.textContent = error.message;
    editErrorMessage.classList.remove("d-none");
  } finally {
    showLoading(false);
  }
});

editModalElement.addEventListener("hidden.bs.modal", function () {
  editingId = null;
  editForm.reset();
});

categoryFilter.addEventListener("change", applyFilter);

refresh();
