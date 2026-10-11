# InvenIQ — Intelligent Enterprise Inventory Management System

> **A high-performance enterprise inventory platform combining a unified Python FastAPI backend with SQLAlchemy SQLite transactional persistence, STOMP real-time WebSockets, Scikit-Learn/Pandas predictive analytics, and a modern React 18 SaaS dashboard.**

---

## 1. Quick Start Guide (Run with 2 Commands)

You only need **Python 3.11+** and **Node.js 18+** installed. No JDK or external database installation is required!

Open two terminal tabs in VS Code inside your project folder (`d:\Inventory management`):

```
┌──────────────────────────────────────────────┐        ┌──────────────────────────────────────────────┐
│  Terminal 1: Unified Python Backend          │        │  Terminal 2: React Web Frontend              │
│  (REST API + WebSockets + ML Analytics)      │        │  (Vite + Tailwind CSS + Lucide + Recharts)   │
│  Port: 8080                                  │        │  Port: 5173                                  │
└──────────────────────────────────────────────┘        └──────────────────────────────────────────────┘
```

### Terminal 1: Backend (Python FastAPI + SQLite)
```powershell
cd "d:\Inventory management\backend-python"
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```
* **Base URL**: `http://localhost:8080`
* **Interactive Swagger UI**: `http://localhost:8080/docs`
* **Alternative Redoc API Docs**: `http://localhost:8080/redoc`
* **Health Check**: `http://localhost:8080/health`
* **Database**: Zero-setup local SQLite file (`backend-python/inveniq.db`), automatically seeded with 42 products, 3 users, 6 categories, 5 suppliers, and 90 days of historical sales!
* **STOMP / SockJS WebSocket**: `ws://localhost:8080/ws`
* **Test Suite Verification**: `python -m unittest test_full_backend.py test_modules.py`

---

### Terminal 2: Frontend (React + Vite + Tailwind CSS)
```powershell
cd "d:\Inventory management\frontend"
npm run dev
```
* **Application URL**: `http://localhost:5173`
* Opens the InvenIQ Web Application in your browser.

---

## 2. Demo Login Credentials

The database automatically seeds with three demo accounts covering all Role-Based Access Control (RBAC) tiers. You can also click the demo chips on the login screen:

| Role | Username | Password | Permissions & Access |
|---|---|---|---|
| **ADMIN** | `admin` | `admin123` | Full superuser access: Catalog, Scanning, Analytics, Purchasing, User Management, Reports, Settings. |
| **MANAGER** | `manager` | `manager123` | Full inventory operations, PO creation/approvals, Analytics, Reports, Supplier management (no user management). |
| **STAFF** | `staff` | `staff123` | Operational access: Barcode scan & update, stock in/out adjustments, and view catalog. |

---

## 3. Complete Feature Checklist

- [x] **Landing Page**: Animated hero presentation, stats counter, feature highlights, and direct login CTAs.
- [x] **Authentication & RBAC**: Stateless JWT auth, BCrypt password hashing, route guards, and role-based action gating.
- [x] **Theme Support**: Seamless Light / Dark mode toggle persisted in `localStorage`.
- [x] **Interactive Dashboard**:
  - [x] 5 real-time KPI metric cards (Total Products, Cost Valuation, Selling Valuation, Low Stock Count, Out-of-Stock Count, Pending POs).
  - [x] Recharts 14-day Stock Movement line chart (Stock IN vs Stock OUT).
  - [x] Category distribution donut chart.
  - [x] Top velocity movers ranking.
  - [x] Live WebSocket activity stream and critical low-stock alert feed.
- [x] **Product Catalog**:
  - [x] Full CRUD operations (SKU, Name, Category, Supplier, Cost Price, Selling Price, Quantity, Reorder Level, Unit, Image).
  - [x] Search, category filter, supplier filter, low-stock only toggle, sorting, and pagination.
  - [x] Auto-generated Code128 barcodes and QR codes with printable label preview (`window.print`).
  - [x] CSV data export and CSV multipart import with parsing and validation.
- [x] **Scan & Update Terminal**:
  - [x] Always-focused scanner input for USB / Bluetooth handheld barcode scanner guns.
  - [x] Integrated webcam barcode and QR scanner using `html5-qrcode` with manual entry fallback.
  - [x] Quick `+1` / `-1` one-click adjustment buttons.
  - [x] Movement tabs for Stock IN, Stock OUT, and Audit Adjustments with reasons and reference numbers.
  - [x] Negative stock prevention and version-based optimistic locking protection.
- [x] **Product Intelligence (Python Analytics)**:
  - [x] Pareto ABC analysis based on 90-day cumulative inventory consumption value.
  - [x] Fast / Slow / Dead Stock classification with monetary calculation of tied dormant capital.
  - [x] Annualized Stock Turnover Ratios and profit margin rankings.
  - [x] Days-of-stock-left depletion forecasting.
- [x] **What-If Scenario Simulator (Python Analytics)**:
  - [x] Multi-variable sliders: Demand Shift %, Supplier Delay Days, Price Shift %, Reorder Level %.
  - [x] Projected 30-day Revenue, Profit, Holding Cost, and Stockout Risk counts (Before vs After).
  - [x] 30-day comparative trajectory line chart.
  - [x] Depletion schedule identifying exact calendar dates when vulnerable SKUs will run out.
- [x] **Smart Inventory & Forecasting (Python Analytics)**:
  - [x] Exponential smoothing demand forecasting over daily sales vectors.
  - [x] Statistical Safety Stock ($SS$) calculated at 95% service level ($Z = 1.645$).
  - [x] Recommended Reorder Points ($ROP$).
  - [x] Wilson Economic Order Quantity (EOQ) formula minimizing total procurement & holding expenses.
  - [x] One-click "Create PO" button that pre-fills purchase orders directly from suggestions.
- [x] **Purchase Orders**:
  - [x] Lifecycle management: `DRAFT` &rarr; `PENDING` &rarr; `APPROVED` &rarr; `RECEIVED` &rarr; `CANCELLED`.
  - [x] Supplier selection, expected delivery date, multi-item line table, automated 8% tax calculation.
  - [x] Receiving a PO automatically adds stock to catalog, updates version, logs audit entry, and broadcasts live.
- [x] **Inventory Activity Audit Log**:
  - [x] Immutable ledger for all movements (IN, OUT, ADJUSTMENT, PO_RECEIVE).
  - [x] Filter by transaction type, product, user, and start/end dates.
  - [x] Timestamps formatted in user's local timezone (stored as UTC).
  - [x] CSV export for compliance auditing.
- [x] **Enterprise Reports**:
  - [x] Stock valuation breakdown, low-stock deficit analysis, movement history, supplier performance.
  - [x] Instant CSV export downloads.
  - [x] Formatted PDF report generation with ReportLab tables, styling, and gross margins.
- [x] **Extra Management Modules**:
  - [x] Suppliers CRUD with lead-time tracking.
  - [x] Category management CRUD.
  - [x] User administration (create, update, toggle active status, delete) restricted to Admin.
  - [x] Global search in top navbar.
  - [x] Real-time Toast notifications for operational events.

---

## 4. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             REACT FRONTEND (Port 5173)                           │
│  React 18 • Vite • Tailwind CSS • React Router • Recharts • Lucide • STOMP SockJS│
└─────────────────────────────────┬────────────────────────────────────────────────┘
                                  │ HTTP REST (/api/*) & WebSockets (/ws)
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   UNIFIED PYTHON FASTAPI BACKEND (Port 8080)                     │
│                                                                                  │
│  ┌─────────────────────────┐  ┌────────────────────────┐  ┌───────────────────┐  │
│  │   Core REST Routers     │  │  SockJS/STOMP Manager  │  │ ML & Analytics    │  │
│  │  Auth, Products, Stock, │  │  Live broadcast to:    │  │ ABC Pareto, EOQ,  │  │
│  │  POs, Users, Reports    │  │  /topic/stock-updates  │  │ What-If Simulator,│  │
│  │  (JWT + BCrypt)         │  │  /topic/activity       │  │ Demand Forecast   │  │
│  │                         │  │  /topic/alerts         │  │ (Pandas/Sklearn)  │  │
│  └────────────┬────────────┘  └───────────┬────────────┘  └─────────┬─────────┘  │
│               │                           │                         │            │
│               └───────────────────────────┼─────────────────────────┘            │
│                                           ▼                                      │
│                             SQLAlchemy ORM + SQLite                              │
│                           (File Database: inveniq.db)                            │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. College Viva / Presentation Defense Guide

### Architecture Explanation
1. **Why FastAPI for the Backend?**
   - High-throughput asynchronous Python framework powered by Starlette and Pydantic.
   - Native integration with Python's data science ecosystem (Pandas, NumPy, Scikit-learn), eliminating inter-service serialization latency.
   - Built-in automatic OpenAPI (Swagger) documentation.

2. **Why SQLite for Persistence?**
   - Zero-configuration, serverless, file-based SQL database built directly into Python.
   - Perfect for portable evaluations and college project demonstrations — no MySQL/Postgres server installation or credentials required.
   - Managed via SQLAlchemy 2.0 ORM with full relational schema integrity, foreign keys, and indexes.

3. **Concurrency Control & Optimistic Locking**:
   - Each product maintains an integer `version` field.
   - Stock adjustments validate the product state atomically and reject requests that would drive inventory negative.
   - Every mutation immediately writes an immutable record to the `StockTransaction` audit ledger.

4. **Key Mathematical Algorithms Implemented**:
   - **Pareto ABC Analysis**:
     $$\text{Annual Consumption Value} = \text{Annual Units Sold} \times \text{Unit Cost}$$
     Ranked cumulatively: Top 70% value &rarr; Class A (tight control), Next 20% &rarr; Class B, Bottom 10% &rarr; Class C.
   - **Wilson Economic Order Quantity (EOQ)**:
     $$EOQ = \sqrt{\frac{2 \times D \times S}{H}}$$
     Where $D = \text{Annual Demand}$, $S = \text{Fixed Order Cost } (\$50)$, $H = \text{Unit Annual Holding Cost } (20\% \times \text{Cost Price})$.
   - **Statistical Safety Stock ($SS$) & Reorder Point ($ROP$)**:
     $$SS = Z \times \sigma_d \times \sqrt{L}$$
     $$ROP = (\bar{d} \times L) + SS$$
     Where $Z = 1.645$ (95% service confidence), $\sigma_d = \text{Standard deviation of daily demand}$, $\bar{d} = \text{Mean daily demand}$, $L = \text{Supplier lead time in days}$.

---

## 6. Common Issues & Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| Port 8080 already in use | Another process (e.g. earlier server) is running on 8080 | Run `Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess \| Stop-Process -Force` in PowerShell. |
| Node packages missing | Node dependencies not yet installed | Run `cd frontend && npm install` |
| Python packages missing | Missing dependencies in environment | Run `cd backend-python && pip install -r requirements.txt` |
| WebSocket disconnection | Backend not running when frontend loads | Ensure backend on port 8080 is started before opening frontend on 5173. Frontend will automatically reconnect every 5 seconds. |
#   i n v e n t a r y - m a n a g m e n t  
 