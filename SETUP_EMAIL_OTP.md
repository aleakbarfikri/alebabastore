# Pasang Email OTP AlebabaStore (cara mudah)

Panduan ini cukup dilakukan sekali. Siapkan akses ke Vercel, Resend, dan tempat
Anda membeli/mengelola domain AlebabaStore.

## Tiga nama yang perlu diketahui

Ganti contoh berikut dengan milik Anda:

- Domain website: `alebabastore.shop`
- Domain inbox OTP: `mail.alebabastore.shop`
- Alamat webhook: `https://www.alebabastore.shop/api/webhooks/resend/inbound`

Gunakan subdomain `mail.` khusus untuk inbox. Jangan memakai domain utama karena
dapat mengganggu email bisnis yang sudah ada.

## 1. Buat domain penerima di Resend

1. Masuk ke Resend.
2. Buka **Domains**, lalu pilih **Add Domain**.
3. Masukkan `mail.DOMAIN-ANDA`, misalnya `mail.alebabastore.shop`.
4. Pilih region terdekat jika Resend menanyakannya.
5. Resend akan menampilkan beberapa DNS record. Biarkan halaman ini terbuka.

## 2. Pasang DNS

1. Buka halaman DNS di tempat domain Anda dikelola (misalnya Cloudflare,
   Hostinger, Namecheap, atau Vercel Domains).
2. Tambahkan semua record yang ditampilkan Resend, terutama record **MX** untuk
   `mail`.
3. Kembali ke Resend dan tekan **Verify DNS Records**.
4. Tunggu sampai status domain menjadi **Verified**. Perubahan DNS kadang perlu
   beberapa menit hingga beberapa jam.

Jangan mengubah atau menghapus record email lama pada domain utama. Cukup tambah
record untuk subdomain `mail` sesuai nilai dari Resend.

## 3. Buat webhook penerima

1. Di Resend buka **Webhooks**, lalu pilih **Add Webhook**.
2. URL webhook:

   `https://DOMAIN-WEBSITE-ANDA/api/webhooks/resend/inbound`

3. Centang event **email.received** saja.
4. Simpan webhook.
5. Buka webhook yang baru dibuat dan salin **Signing Secret**. Biasanya dimulai
   dengan `whsec_`. Jangan kirim atau simpan secret ini di chat.

## 4. Isi tiga nilai di Vercel

1. Di Vercel buka project **alebabastore-web**.
2. Buka **Settings → Environment Variables**.
3. Tambahkan nilai berikut pada environment yang tercantum:

| Name | Value | Environment |
| --- | --- | --- |
| `INBOUND_EMAIL_DOMAIN` | `mail.DOMAIN-ANDA` tanpa `https://` | Production dan Preview |
| `RESEND_WEBHOOK_SECRET` | Signing Secret dari langkah 3 | Production |
| `CRON_SECRET` | Teks acak panjang minimal 32 karakter | Production |

Untuk `CRON_SECRET`, gunakan password generator. Jangan menggunakan password
admin, API key, nama toko, atau nomor WhatsApp.

4. Pastikan variable lama seperti `DATABASE_URL_ALEBABASTORE`,
   `APP_ENCRYPTION_KEY`, `PUBLIC_BASE_URL`, dan password awal admin masih ada.
5. Buka tab **Deployments**, pilih deployment terbaru, lalu tekan **Redeploy**
   agar nilai baru digunakan.

## 5. Pastikan API key Resend tersimpan

1. Login admin AlebabaStore.
2. Buka pengaturan pembayaran/email.
3. Isi API key Resend yang mempunyai izin mengirim dan membaca email masuk.
4. Isi alamat pengirim dari domain yang sudah diverifikasi di Resend, lalu
   simpan.

API key dan secret tidak boleh dimasukkan ke source code atau GitHub.

## 6. Tes dari awal sampai akhir

1. Login admin, buka menu **Inbox OTP**, lalu buat 1 alamat dengan panjang 6.
2. Kirim email biasa dari Gmail ke alamat baru tersebut.
3. Tunggu beberapa detik, lalu login customer melalui tombol **Login** yang sama
   menggunakan alamat AlebabaStore dan password inbox.
4. Pastikan pesan muncul dan customer hanya dapat membaca.
5. Pastikan tidak ada tombol hapus atau ubah password pada halaman customer.

Jika pesan tidak muncul:

- pastikan domain Resend berstatus **Verified**;
- pastikan webhook menampilkan event `email.received` dengan respons sukses;
- pastikan `INBOUND_EMAIL_DOMAIN` sama persis dengan domain di Resend;
- pastikan deployment dilakukan ulang setelah environment variable disimpan;
- periksa log Vercel untuk route `/api/webhooks/resend/inbound`.

## Pemakaian sehari-hari

1. Admin membuat 10–100 alamat acak di menu Inbox OTP.
   Password setiap alamat baru ditampilkan sekali; segera salin semua atau unduh CSV.
   Untuk alamat lama, tekan tombol kunci untuk membuat password.
2. Saat membuat produk akun game, admin memilih salah satu alamat kosong.
3. Customer checkout memakai email pribadinya.
4. Setelah pembayaran berhasil, sistem mengirim email domain AlebabaStore dan
   password inbox ke email pribadi customer.
5. Customer login dan hanya melihat pesan/OTP miliknya.

Pesan otomatis hilang setelah 60 hari. Customer tidak dapat menghapus pesan,
mengganti password, atau melihat inbox customer lain. Reset password dan
menonaktifkan inbox hanya tersedia untuk admin.
