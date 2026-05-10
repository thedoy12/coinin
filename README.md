# CoinIn - Game Top Up Platform

Platform top-up game fullstack dengan integrasi pembayaran dan top-up otomatis.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Hono + tRPC 11.x (end-to-end type safety)
- **Database**: Drizzle ORM + PostgreSQL
- **Auth**: Username/email + password, session JWT, role admin
- **Payment**: Generic payment provider
- **Top-up**: Generic top-up provider

## Cara Menjalankan Project

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

File `.env` sudah tersedia dengan konfigurasi default. Sesuaikan bagian berikut:

```env
# Top-up Provider
TOPUP_API_URL=YOUR_TOPUP_API_URL
TOPUP_API_USERNAME=YOUR_TOPUP_USERNAME
TOPUP_API_SECRET=YOUR_TOPUP_SECRET
TOPUP_WEBHOOK_SECRET=YOUR_TOPUP_WEBHOOK_SECRET
TOPUP_WEBHOOK_URL=https://your-domain.com/api/provider-callback

# Payment Provider
PAYMENT_MERCHANT_ID=YOUR_MERCHANT_ID
PAYMENT_API_KEY=YOUR_PAYMENT_API_KEY
PAYMENT_SECRET_KEY=YOUR_PAYMENT_SECRET
PAYMENT_METHOD=QRIS
PAYMENT_API_URL=YOUR_PAYMENT_API_URL
```

### 3. Setup Database

```bash
# Push schema ke database PostgreSQL
npm run db:push

# Seed data 20 game populer
npm run db:seed
```

### 4. Jalankan Development Server

```bash
npm run dev
```

Server berjalan di `http://localhost:3000`

### 5. Build untuk Production

```bash
npm run build
npm start
```

## Fitur

### Frontend Pages

- **Homepage** - Daftar 20 game populer dengan search
- **Game Detail** - Pilih nominal dan masukkan ID game
- **Checkout** - Generate QRIS payment
- **Status** - Cek status transaksi real-time
- **Admin Dashboard** - Statistik dan manajemen transaksi

### Backend API (tRPC)

- `game.list` - List semua game
- `game.bySlug` - Detail game by slug
- `product.byGame` - List produk by game ID
- `product.byGameSlug` - List produk by game slug
- `product.byId` - Detail produk
- `order.create` - Buat transaksi baru
- `order.byReference` - Cek transaksi by reference ID
- `payment.createQris` - Generate pembayaran QRIS
- `admin.stats` - Statistik dashboard (admin only)
- `admin.allTransactions` - Semua transaksi (admin only)
- `admin.updateStatus` - Update status transaksi (admin only)

### HTTP Endpoints

- `POST /api/callback` - Handle payment callback dari gateway
- `POST /api/provider-callback` - Handle webhook update transaksi dari provider top-up
- `GET /api/status/:referenceId` - Public status check

### Security

- API keys disimpan di `.env` (backend only)
- Validasi input dengan Zod di semua tRPC procedures
- Signature verification untuk payment callback
- Role-based access control (adminQuery)
- Session-based authentication dengan JWT
- Username/password login dengan password hashing `scrypt`
- Rate limiting untuk endpoint publik
- Audit log untuk aksi admin
- Retry/sync manual untuk payment dan top-up yang gagal

### Markup Logic

```text
Game:
<= Rp20.000      : 4%, minimal Rp600
<= Rp100.000     : 3.5%, minimal Rp900
<= Rp300.000     : 3%
> Rp300.000      : 2.5%, maksimal Rp40.000
```

Harga dibulatkan ke atas ke kelipatan Rp100. Produk digital memakai markup lebih ketat:
2.5% minimal Rp400, 2.25% sampai Rp100.000, lalu 1.75% maksimal Rp8.000.

## Struktur Project

```
├── api/
│   ├── routers/          # tRPC routers
│   │   ├── game-router.ts
│   │   ├── product-router.ts
│   │   ├── order-router.ts
│   │   ├── payment-router.ts
│   │   └── admin-router.ts
│   ├── lib/              # Utilities
│   │   ├── markup.ts
│   │   ├── payment.ts    # Payment integration
│   │   └── topup.ts      # Top-up provider integration
│   ├── boot.ts           # Hono server entry
│   ├── router.ts         # tRPC app router
│   └── middleware.ts     # Auth middleware
├── db/
│   ├── schema.ts         # Database schema
│   ├── relations.ts      # Drizzle relations
│   └── seed.ts           # Seed data 20 game
├── src/
│   ├── pages/            # React pages
│   │   ├── Home.tsx
│   │   ├── GameDetail.tsx
│   │   ├── Checkout.tsx
│   │   ├── Status.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── Login.tsx
│   │   └── NotFound.tsx
│   ├── components/
│   │   └── Layout.tsx    # Main layout
│   ├── providers/
│   │   └── trpc.tsx      # tRPC client provider
│   └── hooks/
│       └── useAuth.ts    # Auth hook
├── contracts/            # Shared types
├── .env                  # Environment variables
└── package.json
```

## Database Schema

### Games

- `id` - Primary key
- `name` - Nama game
- `slug` - Unique slug
- `thumbnail` - URL thumbnail
- `category` - Kategori game
- `createdAt` - Timestamp

### Products

- `id` - Primary key
- `gameId` - Foreign key ke games
- `providerCode` - Kode provider API top-up
- `name` - Nama produk
- `priceModal` - Harga modal
- `priceSell` - Harga jual (setelah markup)
- `createdAt` - Timestamp

### Transactions

- `id` - Primary key
- `referenceId` - Unique reference ID
- `gameId` - Foreign key ke games
- `productId` - Foreign key ke products
- `userIdGame` - ID game user
- `zoneId` - Zone/server ID (opsional)
- `price` - Harga total
- `status` - Status transaksi (pending/processing/success/failed)
- `paymentStatus` - Status pembayaran (unpaid/paid/expired/failed)
- `paymentMethod` - Metode pembayaran
- `paymentReference` - Reference dari sistem pembayaran
- `topupStatus` - Status top-up
- `topupReference` - Reference dari sistem top-up
- `topupResponse` - Response dari sistem top-up
- `customerName`, `customerEmail`, `customerPhone` - Data kontak pelanggan
- `retryCount`, `lastError` - Tracking retry top-up dan error terakhir
- `expiresAt`, `paidAt`, `completedAt` - Timestamp operasional transaksi
- `createdAt`, `updatedAt` - Timestamps

## 20 Game Populer (Seed Data)

1. Mobile Legends
2. Free Fire
3. PUBG Mobile
4. Genshin Impact
5. Call of Duty Mobile
6. Honkai Star Rail
7. Valorant
8. Wild Rift
9. Clash of Clans
10. Clash Royale
11. Arena of Valor
12. Rise of Kingdoms
13. State of Survival
14. Lords Mobile
15. Dragon Raja
16. Roblox
17. Minecraft
18. Fortnite
19. FC Mobile
20. eFootball

## License

MIT
