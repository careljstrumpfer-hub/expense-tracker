# Expense Tracker

A personal, browser-based expense tracker for managing daily and monthly spending. PIN-protected, works on desktop and mobile — no backend required.

## Features

- **PIN Login** — set up a profile with your name and a PIN to keep your data private
- **Add expenses** with description, amount (ZAR), category, and date
- **Import bank statements** — CSV (Capitec, FNB, Nedbank, ABSA) and PDF (Standard Bank)
- **Auto-categorization** — transactions sorted by keywords (Shoprite → Food, Uber → Transport, etc.)
- **Daily and monthly summaries** with visual category breakdown
- **Export to Word (.doc)** — professional report with your name, category breakdown, and full transaction table
- **Export to CSV** for spreadsheet use
- **Mobile-friendly** — responsive design, installable as a home screen app on Samsung/Android

## Usage

Open `index.html` in any modern browser. On first use, enter your name and create a PIN. On mobile, use your browser's "Add to Home Screen" for an app-like experience.

## Categories

Food, Transport, Housing, Utilities, Entertainment, Shopping, Health, Education, Insurance, Fees, Other.

## Supported Bank Formats

| Bank | Format | Notes |
|------|--------|-------|
| Capitec | CSV | Money In/Out/Fee columns, bank categories used |
| Standard Bank | PDF | 3-month statement, text-parsed |
| FNB / Nedbank / ABSA | CSV | Auto-detected column layout |

## Data Storage

All data is stored locally in your browser using `localStorage` and protected by your PIN. Nothing is sent to any server.
