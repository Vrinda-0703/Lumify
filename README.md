# Lumify — Bring light to your finances.

Lumify is a modern, production-ready fintech personal finance platform designed for clarity, intelligence, and control. It brings together multi-account tracking, dynamic category budgeting, automated bill and subscription management, receipt OCR, natural voice logging, shared budgets, a financial health scoring engine, and an honest purchase decision assistant.

---

## Key Features

1. **Production-Grade Authentication**: Secure JWT handling, bcrypt password hashing, input validation, auto-logout on session expiration, protected routes.
2. **Dynamic Dashboard**:
   - Total balance with accounts and transaction adjustments
   - Monthly income, expenses, and savings rate
   - Budget utilization percentage
   - Cash flow dynamics (6-month interactive trend chart)
   - Spending mix by category
   - Quick glance cards for wallets, upcoming bills, active goals, and subscriptions
   - Dedicated, custom-crafted Light Mode & Dark Mode visual states
   - Resilient against missing data with empty states and retry buttons
3. **Transactions & 1-Row Desktop Filter Bar**:
   - Income, Expense, and Transfer transactions
   - Compact 1-row desktop horizontal filter bar: `Search | Type | Category | Account | Sort | Today | This Week | This Month | From | To | Clear`
   - Responsive layout adapting smoothly to tablets and mobile screens
   - Double-submission prevention
4. **Internal Transfers**: Accurate account transfers between wallets without polluting net income/expense calculations.
5. **Accounts & Wallets**: Cash, Bank, UPI, Wallet, Credit Card, and Other accounts with live balance computation from opening balances and transaction ledger.
6. **Budgets**: Category and overall monthly limits, progress tracking, 80% caution warnings, 100% exceeded alerts, and duplicate prevention.
7. **Bills & Obligations**: Due date tracking, overdue alerts, due-today reminders, paid status toggle, and recurring bill date advancement.
8. **Subscriptions**: Active/paused states, monthly and yearly burn projections, renewal reminders, and subscription burden analysis.
9. **Savings Goals**: Target tracking, contribution history with timestamps & notes, and recommended monthly savings calculations.
10. **Financial Calendar**: Interactive schedule plotting transactions, bill due dates, subscription renewals, and goal deadlines.
11. **Shared Budgets**: Collaborative budget pools with email invitations, accept/decline responses, member contributions, and shared transaction history.
12. **Receipt OCR Scanner**: Built-in Tesseract OCR extracting merchant, amount, date, and category. Requires user review & confirmation before saving.
13. **Voice Logging**: Web Speech recognition with natural language parsing (type, amount, category, date, account). Requires user confirmation before saving.
14. **Lumify Intelligence (Financial Copilot)**:
    - Honest **Financial Health Score** (0–100) calculated from savings rate, budget limits, overdue bills, and subscription burden
    - Spending analysis, savings opportunities, and budget alerts
    - Transparent rule-based intelligence without fake AI claims
15. **Purchase Decision Assistant**: Evaluates prospective purchases against available funds, upcoming obligations, goals, and a safety buffer, providing BUY, WAIT, or NOT RECOMMENDED verdicts with clear explanations.
16. **Financial Analytics**: Month-over-month comparisons, category breakdown, budget vs actual variance tables, and CSV export.
17. **Semantic Theme System**: True semantic design system supporting Dark, Light, and System modes with refresh persistence in localStorage (`lumify_theme`).
18. **Mobile & PWA Ready**: Installable Progressive Web App (`manifest.json`), mobile navigation drawer, and bottom navigation bar.

---

## Technology Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Lucide React, Recharts, Axios
- **Backend**: Node.js, Express 5, Mongoose 8, JWT, Bcrypt, Multer, Tesseract.js
- **Database**: MongoDB / MongoDB Atlas
- **Deployment**: Vercel Serverless Functions (`api/index.js` + `vercel.json`) & Vite static output

---

## Local Development Setup

### 1. Prerequisites
- Node.js (v18 or newer recommended)
- MongoDB running locally or a MongoDB Atlas connection string

### 2. Quick Setup from Root

Install all dependencies for both client and server:
```bash
npm run install:all
```

### 3. Server Configuration

Create `server/.env` based on `server/.env.example`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/lumify
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CLIENT_URL=http://localhost:5173
```

Start the backend server:
```bash
npm run dev:server
# or
cd server && npm start
```
The API will run at `http://localhost:5000`.

### 4. Client Configuration

Create `client/.env` based on `client/.env.example`:
```env
VITE_API_URL=http://localhost:5000/api
```

Start the Vite development server:
```bash
npm run dev:client
# or
cd client && npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Vercel Deployment

The project is preconfigured for Vercel deployment with serverless API functions and SPA routing.

### Step 1: Connect Repository to Vercel
1. Push this project to your GitHub repository.
2. In the Vercel Dashboard, click **Add New Project** and import the repository.
3. Leave the **Root Directory** as `./`.

### Step 2: Environment Variables
Add the following in your Vercel Project Settings under **Environment Variables**:
- `MONGO_URI`: Your MongoDB Atlas connection string (e.g., `mongodb+srv://<user>:<password>@cluster.mongodb.net/lumify?retryWrites=true&w=majority`)
- `JWT_SECRET`: A long, secure random string for signing tokens
- `VITE_API_URL`: `/api` (this routes API calls through Vercel's serverless handler)

### Step 3: Deploy
Click **Deploy**. Vercel will:
1. Run `cd client && npm install && npm run build`
2. Output static files to `client/dist`
3. Route `/api/*` to the serverless entrypoint `api/index.js`
4. Route all client paths to `/index.html` via `vercel.json`

---

## MongoDB Atlas Setup

1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) so Vercel serverless functions can connect.
3. Under **Database Access**, create a user with read/write permissions.
4. Obtain your connection URI:
   `mongodb+srv://<username>:<password>@cluster.mongodb.net/lumify?retryWrites=true&w=majority`
5. Set this URI as `MONGO_URI` in your `.env` or Vercel environment variables.

---

## Code Verification & Quality Checks

Run lint checks across the frontend:
```bash
npm run lint
```

Build the production client bundle:
```bash
npm run build
```
The optimized bundle utilizes route-level code splitting and manual chunking (separating vendor, recharts, and lucide-react), keeping all chunks lightweight and performant.

---

## License

ISC License. Built for Lumify.
