# AlebabaStore

Aplikasi toko akun game dengan backend Node.js, database PostgreSQL Neon, checkout
TemanQRIS, pengiriman produk melalui email, dan dashboard admin.

## Pemisahan database Neon

Buat project/database Neon tersendiri untuk AlebabaStore dan masukkan connection
string-nya sebagai `DATABASE_URL_ALEBABASTORE`. Jangan memakai connection string
KasirKita atau Aletix. Nama environment variable yang khusus juga membantu
mencegah database tertukar saat deployment.

## Menjalankan

1. Salin `.env.example` menjadi `.env` di secret/configuration platform.
2. Isi `DATABASE_URL_ALEBABASTORE`, `APP_ENCRYPTION_KEY`,
   `ADMIN_INITIAL_PASSWORD`, dan `PUBLIC_BASE_URL`.
3. Jalankan `npm install`, lalu `npm run db:init`.
4. Development: `npm run dev`. Production: `npm run build && npm start`.
5. Login admin dengan username `alebabastore` dan password awal yang disimpan
   sebagai secret deployment.
6. Di dashboard admin, isi API key serta webhook secret TemanQRIS dan konfigurasi
   SMTP. Nilai rahasia dienkripsi dan tidak ditampilkan kembali.

### Deployment Vercel

Project Vercel dapat tetap menggunakan Root Directory `apps/web`. Rewrite
`/api/:path*` di `apps/web/vercel.json` meneruskan semua endpoint ke satu
Serverless Function Express, sementara Vite tetap menghasilkan frontend statis.
Rewrite fallback berikutnya meneruskan route browser seperti `/payment-status`
ke `index.html`, sehingga React Router tetap bekerja saat callback pembayaran
dibuka langsung.
Tambahkan semua environment
variable dari `.env.example` ke Production dan Preview sebelum redeploy. Neon
Integration milik Vercel biasanya menyediakan `DATABASE_URL`; backend menerima
nama tersebut selama database yang ditautkan memang khusus AlebabaStore.

Untuk mengimpor akun dan review dari backup PocketBase lama, set
`LEGACY_POCKETBASE_DB_PATH=/path/ke/data.db` lalu jalankan
`npm run db:migrate:pocketbase`. Gambar lama perlu diunggah ulang, dan setiap akun
lama wajib diedit untuk menambahkan kredensial pengiriman terenkripsi sebelum
dapat dibeli.

Endpoint webhook yang didaftarkan otomatis pada payment link:

`https://DOMAIN-ANDA/api/webhooks/temanqris`

Pengiriman kredensial hanya dilakukan setelah event `payment.confirmed` memiliki
signature HMAC yang valid. Event `payment.awaiting_confirmation` tidak dianggap
sebagai pembayaran berhasil.

## Gambar dan data rahasia

Gambar upload dibatasi 10 MB, dinormalisasi, dan dikompres menjadi WebP dengan
resolusi maksimal 1600×1600. Thumbnail terpisah dibuat untuk halaman daftar.
Kredensial produk, API key TemanQRIS, webhook secret, dan password SMTP dienkripsi
dengan AES-256-GCM menggunakan `APP_ENCRYPTION_KEY`.

Jangan commit file `.env`, database lokal, API key, password, atau backup code.
