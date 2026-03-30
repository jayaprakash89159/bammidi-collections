# 🥻 Bammidi's Collections — E-Commerce Platform

Ladies ethnic & western fashion for Telugu women. Built with Django + Next.js.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Docker Desktop (running)
- No port conflicts on: **3001** (frontend), **8001** (backend), **5433** (PostgreSQL), **6380** (Redis)

### 1. Start All Services
```bash
cd bammidi
docker-compose up --build
```

### 2. Access the Application
| Service | URL |
|---------|-----|
| 🛍 Frontend (Shop) | http://localhost:3001 |
| ⚙️ Backend API | http://localhost:8001/api |
| 🔧 Django Admin | http://localhost:8001/admin |

### 3. Admin Login
```
Email:    admin@bammidi.com
Password: Bammidi@Admin123
```

---

## 📦 Delivery Fee Policy

| State | Free Delivery | Below Threshold |
|-------|--------------|-----------------|
| Andhra Pradesh | Orders ≥ ₹499 | ₹199 |
| Telangana | Orders ≥ ₹499 | ₹199 |
| All Other States | Orders ≥ ₹999 | ₹199 |

Delivery time is **location-based** (not instant delivery).

---

## 🏗 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | **Next.js 14** + TypeScript + Tailwind CSS |
| Backend | **Python Django** + DRF + Channels (WebSocket) |
| Database | **PostgreSQL 15** |
| Cache / Queue | **Redis 7** + Celery |
| Payments | **Razorpay** |
| Auth | JWT (SimpleJWT) |

---

## 🔧 Configuration (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_NAME` | bammidi_collections | PostgreSQL database name |
| `DB_USER` | bammidi_user | PostgreSQL user |
| `DB_PASSWORD` | bammidi_secure_pass_2024 | PostgreSQL password |
| `FREE_DELIVERY_THRESHOLD_AP_TG` | 499 | Free delivery threshold for AP & TG |
| `FREE_DELIVERY_THRESHOLD_OTHER` | 999 | Free delivery threshold for other states |
| `DELIVERY_FEE` | 199 | Delivery charge when below threshold |
| `RAZORPAY_KEY_ID` | — | Your Razorpay key |
| `RAZORPAY_KEY_SECRET` | — | Your Razorpay secret |

### Ports (all changed from original to avoid conflicts)
- Frontend: **3001** (was 3000)
- Backend: **8001** (was 8000)
- PostgreSQL: **5433** (was 5432)
- Redis: **6380** (was 6379)

---

## 🛍 Product Categories

1. **Sarees** — Silk, Georgette, Cotton, Banarasi
2. **Blouses** — Designer, Embroidered, Readymade
3. **Dresses** — Western, Maxi, Indo-Western
4. **Nightwear** — Cotton sets, Satin gowns, Loungewear
5. **Lehengas** — Bridal, Party, Casual
6. **Kurtis** — Anarkali, A-line, Straight

---

## 🐳 Docker Services

```
bammidi_db       → PostgreSQL (port 5433)
bammidi_redis    → Redis (port 6380)
bammidi_backend  → Django API (port 8001)
bammidi_celery   → Celery worker
bammidi_frontend → Next.js (port 3001)
```

### Useful Commands
```bash
# View logs
docker-compose logs -f backend

# Run Django management commands
docker exec -it bammidi_backend python manage.py shell

# Reset database
docker-compose down -v && docker-compose up --build
```

---

## 🔑 API Endpoints

```
POST /api/auth/register/       — Customer registration
POST /api/auth/login/          — Login (returns JWT)
GET  /api/products/            — Product listing (filterable)
GET  /api/products/categories/ — All categories
GET  /api/orders/cart/         — View cart
POST /api/orders/cart/add/     — Add to cart
POST /api/orders/delivery-fee-preview/ — Calculate delivery fee
POST /api/orders/create/       — Place order
```

---

## 📝 Notes
- Sample data (8 products, 6 categories) is auto-loaded on first startup
- Change credentials in `.env` before any production use
- Add your Razorpay keys to `.env` to enable payments
