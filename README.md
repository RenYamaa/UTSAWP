# 💻 Comifuro E-Commerce & Management System

Selamat datang di repositori proyek Sistem E-Commerce dan Manajemen Comifuro. Proyek ini merupakan sebuah aplikasi web lengkap yang dibangun menggunakan Node.js dan MySQL, dirancang sebagai prototipe untuk ujian tengah semester mata kuliah Advance Web.

Aplikasi ini mensimulasikan sebuah platform toko online sederhana dengan sistem manajemen berbasis peran (role-based) untuk mengelola produk, pengguna, dan pesanan.

---

## ✨ Fitur Utama

Aplikasi ini memiliki fungsionalitas yang terbagi berdasarkan peran pengguna:

### 👤 Pengguna Publik (Homepage)
- **Katalog Produk Dinamis**: Melihat daftar produk yang diambil langsung dari database.
- **Filter & Pencarian**: Mencari produk berdasarkan nama atau memfilter berdasarkan kategori (A4/A5).

### 👨‍💻 Pengguna Terdaftar (User - Role R04)
- **Katalog Produk Lengkap**: Melihat produk yang tersedia untuk dibeli.
- **Keranjang Belanja**: Menambah, mengubah kuantitas, dan menghapus produk dari keranjang.
- **Proses Checkout**: Melakukan pemesanan dengan mengisi alamat dan memilih metode pembayaran.
- **Riwayat Pesanan**: Melihat daftar semua pesanan yang pernah dibuat beserta status dan nomor resi pengiriman.

### 🔧 Staf Proses Pesanan (Role R02)
- **Dashboard Pesanan**: Melihat daftar pesanan yang sudah lunas dan siap diproses.
- **Manajemen Status Pesanan**: Mengubah status pesanan dari "Pending" menjadi "Diproses", "Dikirim", hingga "Selesai".
- **Input Nomor Resi**: Memasukkan nomor resi saat pesanan dikirim.

### 💰 Koordinator Keuangan (Finance - Role R03)
- **Dashboard Verifikasi**: Melihat daftar semua transaksi yang masuk.
- **Konfirmasi Pembayaran**: Mengubah status transaksi menjadi "Berhasil" atau "Gagal".

### 👑 Manajer Katalog (Role R01)
- **Akses Penuh**: Memiliki semua hak akses dari Staf dan Finance.
- **Manajemen Pengguna (CRUD)**: Menambah, melihat, mengedit, dan menghapus data semua pengguna.
- **Aktivasi Akun Baru**: Menyetujui dan mengaktifkan akun pengguna yang baru mendaftar.
- **Manajemen Produk (CRUD)**: Menambah, melihat, mengedit, dan menghapus produk di katalog.
- **Laporan Penjualan**: Melihat laporan penjualan lengkap dengan filter, pencarian, ringkasan total, dan fitur cetak.

---

## 🛠️ Teknologi yang Digunakan

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla JS)
- **Dependencies**: `express-session`, `mysql2`, `uuid`, `cors`, `dotenv`

---

## 🚀 Cara Menjalankan Proyek Secara Lokal

Untuk menjalankan proyek ini di komputermu, ikuti langkah-langkah berikut:

1.  **Clone repositori ini:**
    ```bash
    git clone [https://github.com/namamu/nama-repo-ini.git](https://github.com/namamu/nama-repo-ini.git)
    cd nama-repo-ini
    ```

2.  **Install semua dependency yang dibutuhkan:**
    ```bash
    npm install
    ```

3.  **Setup Database:**
    - Buat database baru di MySQL (misalnya, via XAMPP/phpMyAdmin) dengan nama `comifuro`.
    - Impor file `comifuro.sql` yang ada di repositori ini ke dalam database yang baru kamu buat.

4.  **Konfigurasi Koneksi Database:**
    - Buka file `routes/ConnectRoute.js`.
    - Sesuaikan detail `host`, `user`, `password`, dan `database` agar cocok dengan konfigurasi MySQL lokalmu.

5.  **Jalankan server:**
    ```bash
    node server.js
    ```

6.  **Buka aplikasi:**
    - Buka browser dan akses `http://localhost:3000`.

---

## 🔑 Akun untuk Login

Akun dilampirkan tersirat pada TXT File secara pribadi.

_Catatan: Kamu juga bisa mendaftarkan akun User baru melalui halaman "Create Account". Akun baru tersebut perlu diaktivasi oleh Manajer sebelum bisa digunakan untuk login._

---

Proyek ini dibuat sebagai pemenuhan tugas Ujian Tengah Semester. Terima kasih telah berkunjung!
