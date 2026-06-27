# Expense Tracker

A simple, browser-based expense tracker for managing daily and monthly spending. No backend required — all data is stored in your browser's localStorage.

## Features

- Add expenses with description, amount, category, and date
- Daily and monthly spending summaries
- Visual category breakdown with bar chart
- Filter expenses by month
- Export monthly expenses to CSV
- Fully responsive — works on mobile and desktop

## Usage

Open `index.html` in any modern browser. That's it — no build step, no dependencies.

## Categories

Food, Transport, Housing, Utilities, Entertainment, Shopping, Health, Education, Other.

## Data Storage

All data is stored locally in your browser using `localStorage`. Nothing is sent to any server. To clear your data, open your browser's developer tools and run `localStorage.removeItem("expense_tracker_data")`.
