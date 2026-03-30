# Bammidi's Collections — React (Vite) Frontend

Migrated from **Next.js 14 App Router** → **React 18 + Vite + React Router v6**.

---

## Project Structure

```
src/
├── App.tsx                          # React Router route definitions
├── main.tsx                         # App entry point (replaces layout.tsx)
├── index.css                        # Global styles (identical to globals.css)
├── lib/
│   └── api.ts                       # Axios API client
├── store/
│   ├── auth.ts                      # Zustand auth store
│   └── cart.ts                      # Zustand cart store
├── components/
│   ├── layout/Header.tsx
│   ├── products/ProductCard.tsx
│   ├── cart/FloatingCart.tsx
│   ├── bot/ShopBot.tsx
│   └── providers/QueryProvider.tsx
└── pages/
    ├── HomePage.tsx
    ├── ProductsPage.tsx
    ├── ProductDetailPage.tsx
    ├── CartPage.tsx
    ├── CheckoutPage.tsx
    ├── OrdersPage.tsx
    ├── OrderSuccessPage.tsx
    ├── OrderTrackingPage.tsx
    ├── auth/
    │   ├── LoginPage.tsx
    │   └── RegisterPage.tsx
    └── dashboard/
        ├── AdminDashboardPage.tsx
        └── DeliveryDashboardPage.tsx
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_API_URL=http://localhost:8001/api
VITE_RAZORPAY_KEY_ID=your_razorpay_key_here
```

### 3. Add logo
Place your `logo.png` in the `public/` folder.

### 4. Run development server
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
npm run preview
```

---

## Migration Reference: Next.js → React

| Next.js                          | React (Vite)                          |
|----------------------------------|---------------------------------------|
| `next/link` `<Link href=...>`    | `react-router-dom` `<Link to=...>`    |
| `next/image` `<Image>`           | Native `<img>`                        |
| `useRouter().push()`             | `useNavigate()(path)`                 |
| `useRouter().back()`             | `useNavigate()(-1)`                   |
| `usePathname()`                  | `useLocation().pathname`              |
| `useSearchParams()` (next)       | `useSearchParams()` (react-router)    |
| `useParams()` (next)             | `useParams()` (react-router)          |
| `NEXT_PUBLIC_API_URL`            | `VITE_API_URL`                        |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`    | `VITE_RAZORPAY_KEY_ID`                |
| `process.env.NEXT_PUBLIC_*`      | `import.meta.env.VITE_*`             |
| `'use client'` directive         | Removed (not needed)                  |
| `app/page.tsx` (App Router)      | `src/pages/Page.tsx`                  |
| `app/layout.tsx`                 | `src/main.tsx` + `src/App.tsx`        |
| `<Suspense>` for `useSearchParams` | Not required (no SSR boundary)      |
| `export const metadata`          | `<meta>` tags in `index.html`         |
| `next.config.js`                 | `vite.config.ts`                      |

---

## Docker Update

Update `frontend/Dockerfile` to use Vite instead of Next.js:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf` for SPA routing:
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Key Architectural Decisions

1. **Vite over CRA** — Faster HMR, native ESM, better DX, smaller bundles
2. **React Router v6** — Industry standard, matches Next.js routing mental model closely
3. **`@` path alias** — Preserved identical import paths (`@/components/...`, `@/lib/...`)
4. **`import.meta.env`** — Vite's env system, same security model as `NEXT_PUBLIC_*`
5. **No SSR** — This is a pure client-side SPA; all auth, data fetching unchanged
6. **Logo as `<img>`** — Next.js `<Image>` was overkill for SPA; native `<img>` works perfectly
7. **`public/` folder** — Same convention as Next.js; `logo.png` goes here
