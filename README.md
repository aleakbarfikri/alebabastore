# AlebabaStore

Aplikasi toko akun game dengan backend Node.js, database PostgreSQL Neon, checkout
QRIS Pakasir/TemanQRIS, pengiriman produk melalui email, dan dashboard admin.

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
6. Di dashboard admin, pilih provider pembayaran. Untuk pembayaran otomatis,
   pilih Pakasir lalu isi project slug dan API key. Isi juga API key Resend dan
   alamat pengirim dari domain terverifikasi.
   Nilai rahasia dienkripsi dan tidak ditampilkan kembali.

## Inbox OTP customer

AlebabaStore dapat menerima OTP game melalui Resend Inbound dan menampilkannya
sebagai inbox hanya-baca untuk customer. Admin membuat pool 1–100 alamat acak
sepanjang 4–6 karakter dari dashboard, lalu memilih satu alamat ketika membuat
listing akun game. Panjang 6 karakter menjadi pilihan bawaan.

Untuk pemasangan tanpa istilah teknis, ikuti panduan klik-per-klik
[SETUP_EMAIL_OTP.md](SETUP_EMAIL_OTP.md). Panduan itu juga berisi tes akhir agar
Anda tahu inbox sudah benar-benar dapat menerima OTP.

1. Tambahkan subdomain penerima di Resend, misalnya `mail.alebabastore.com`, lalu
   pasang MX record yang diberikan Resend pada pengelola DNS domain.
2. Isi `INBOUND_EMAIL_DOMAIN` dengan subdomain tersebut.
3. Buat webhook Resend untuk event `email.received` dengan URL:

   `https://DOMAIN-ANDA/api/webhooks/resend/inbound`

4. Salin signing secret webhook ke `RESEND_WEBHOOK_SECRET`.
5. Isi `CRON_SECRET` dengan secret acak agar pembersihan email terjadwal Vercel
   dapat berjalan.

Setelah pembayaran lunas, password inbox dibuat otomatis dan dikirim bersama
detail akun ke email pribadi customer yang sudah diverifikasi saat checkout.
Customer masuk melalui `/login` menggunakan email AlebabaStore dan password
tersebut. Customer hanya dapat membaca pesan; perubahan password hanya dapat
dilakukan admin. Isi, subjek, dan pengirim email disimpan terenkripsi dan pesan
dihapus otomatis 60 hari setelah diterima. Attachment dan HTML aktif tidak
ditampilkan untuk mengurangi risiko pelacakan dan script berbahaya.

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

Untuk Pakasir, atur Webhook URL proyek melalui form Edit Proyek:

`https://DOMAIN-ANDA/api/webhooks/pakasir`

Webhook Pakasir selalu diverifikasi ulang ke Transaction Detail API. Order hanya
dianggap lunas jika project, order ID, nominal, metode QRIS, dan status
`completed` semuanya cocok. Untuk transaksi TemanQRIS lama, endpoint webhook-nya:

`https://DOMAIN-ANDA/api/webhooks/temanqris`

Pengiriman kredensial hanya dilakukan setelah event `payment.confirmed` memiliki
signature HMAC yang valid. Event `payment.awaiting_confirmation` tidak dianggap
sebagai pembayaran berhasil.

## Gambar dan data rahasia

Gambar upload dibatasi 10 MB, dinormalisasi, dan dikompres menjadi WebP dengan
resolusi maksimal 1600×1600. Thumbnail terpisah dibuat untuk halaman daftar.
Kredensial produk, API key Pakasir/TemanQRIS/Resend, dan webhook secret
dienkripsi dengan AES-256-GCM menggunakan `APP_ENCRYPTION_KEY`.

Jangan commit file `.env`, database lokal, API key, password, atau backup code.
