require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const categories = ["Food", "Transport", "Bills", "Entertainment", "Other"];

function isValidDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parts = date.split("-").map(Number);
  const value = new Date(date + "T00:00:00Z");

  return value.getUTCFullYear() === parts[0] &&
    value.getUTCMonth() + 1 === parts[1] &&
    value.getUTCDate() === parts[2];
}

function validateExpense(data) {
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const amount = Number(data.amount);

  if (title === "") {
    return { error: "Title is required" };
  }

  if (title.length > 100) {
    return { error: "Title must be 100 characters or less" };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be greater than 0" };
  }

  if (!categories.includes(data.category)) {
    return { error: "Please choose a valid category" };
  }

  if (!isValidDate(data.date)) {
    return { error: "Please enter a valid date" };
  }

  return {
    expense: {
      title: title,
      amount: amount,
      category: data.category,
      date: data.date
    }
  };
}

function getId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

app.get("/api/expenses", async function (req, res) {
  try {
    const result = await pool.query(`
      SELECT id, title, amount::float8 AS amount, category,
             to_char(date, 'YYYY-MM-DD') AS date
      FROM expenses
      ORDER BY id
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.get("/api/expenses/:id", async function (req, res) {
  const id = getId(req.params.id);

  if (id === null) {
    return res.status(404).json({ message: "Expense not found" });
  }

  try {
    const result = await pool.query(`
      SELECT id, title, amount::float8 AS amount, category,
             to_char(date, 'YYYY-MM-DD') AS date
      FROM expenses
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.post("/api/expenses", async function (req, res) {
  const validation = validateExpense(req.body);

  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const expense = validation.expense;

  try {
    const result = await pool.query(`
      INSERT INTO expenses (title, amount, category, date)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, amount::float8 AS amount, category,
                to_char(date, 'YYYY-MM-DD') AS date
    `, [expense.title, expense.amount, expense.category, expense.date]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.put("/api/expenses/:id", async function (req, res) {
  const id = getId(req.params.id);

  if (id === null) {
    return res.status(404).json({ message: "Expense not found" });
  }

  const validation = validateExpense(req.body);

  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const expense = validation.expense;

  try {
    const result = await pool.query(`
      UPDATE expenses
      SET title = $1, amount = $2, category = $3, date = $4
      WHERE id = $5
      RETURNING id, title, amount::float8 AS amount, category,
                to_char(date, 'YYYY-MM-DD') AS date
    `, [expense.title, expense.amount, expense.category, expense.date, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.delete("/api/expenses/:id", async function (req, res) {
  const id = getId(req.params.id);

  if (id === null) {
    return res.status(404).json({ message: "Expense not found" });
  }

  try {
    const result = await pool.query(`
      DELETE FROM expenses
      WHERE id = $1
      RETURNING id, title, amount::float8 AS amount, category,
                to_char(date, 'YYYY-MM-DD') AS date
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.listen(port);
