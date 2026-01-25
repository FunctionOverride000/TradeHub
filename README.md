TradeHub - Solana Competitive Trading Platform 🚀

TradeHub adalah platform kompetisi trading terdesentralisasi (DeFi) di jaringan Solana. Platform ini memungkinkan pengguna untuk membuat, mengikuti, dan memenangkan turnamen trading secara transparan dengan validasi data on-chain (Proof-of-Skill).

📌 Status Proyek (Current State)

Terakhir Diperbarui: 25 Januari 2026
Fase: Beta / Pre-Launch (Live Ready)
Core Logic: ✅ Selesai (100% Automated)

🌟 Apa yang Sudah Kita Kerjakan?

Berikut adalah rincian modul yang telah selesai dibangun dan terintegrasi:

1. Sistem Autentikasi & Keamanan

Supabase Auth: Login via Email/Password, Google, dan GitHub.

MFA (Multi-Factor Authentication): Integrasi TOTP (Google Authenticator) untuk keamanan akun tingkat tinggi (Level AAL2).

Delete Account: Fitur penghapusan akun mandiri dengan validasi MFA/Password yang aman.

2. Manajemen Kompetisi (Arena)

Pembuatan Lomba (/buat-lomba):

Creator bisa membuat lomba Gratis atau Berbayar.

Fitur Premium: Private Room (Password), Whitelist (Undangan khusus).

Ekonomi Baru: Creator wajib mendepositkan Reward Pool di awal untuk menjamin hadiah tersedia.

Revenue Share: Skema bagi hasil 50% Platform / 50% Creator dari penjualan tiket.

Pendaftaran Peserta:

Validasi saldo wallet minimum sebelum join.

Pembayaran tiket masuk (Entry Fee) via Phantom Wallet.

Cek duplikasi pendaftaran.

3. Dashboard & Monitoring

User Dashboard (/dashboard):

Statistik personal (Win Rate, ROI, Total Profit).

Gamifikasi: Tampilan Level, XP Bar, dan Kode Referral.

Manajemen Wallet & Keamanan.

Admin Dashboard (/admin/dashboard):

Monitoring status distribusi hadiah (Pending/Distributed).

Audit log aktivitas platform.

Fitur edit arena & boost arena.

Hall of Fame (/hall-of-fame):

Papan peringkat global Top 3 Trader.

Informasi hadiah musiman (Quarterly Grand Prize).

Profil Publik (/profile/[userId]):

Halaman pamer reputasi dengan statistik on-chain yang valid.

Tombol "Share Reputation" dengan link referral otomatis.

4. Otomatisasi & Backend (Edge Functions)

Ini adalah "otak" dari sistem TradeHub yang berjalan otomatis di server Supabase:

Nama Fungsi

Deskripsi & Status

distribute-rewards

CRITICAL. Berjalan tiap jam. Mengecek lomba selesai -> Hitung pemenang -> Kirim SOL otomatis -> Hitung & Bagi XP ke Creator/User.

distribute-quarterly-rewards

SEASONAL. Berjalan tiap 3 bulan (Q1-Q4). Menghitung Top 3 Global Profit dan mengirim hadiah besar (Revenue Share 20% Platform).

helius-webhook

Menerima data transaksi real-time dari blockchain Solana (via Helius) untuk update saldo peserta.

deposit-watcher

Memantau deposit eksternal untuk sistem Anti-Cheat (Clean ROI).

5. Sistem Gamifikasi & Ekonomi (Terbaru)

XP System:

Creator: Dapat XP dari membuat lomba + bonus besar dari jumlah peserta (Viral Loop).

User: Dapat XP dari Join, Profit, dan Juara.

Leveling: Rank (Rookie -> Grandmaster) berdasarkan XP. Level tinggi memberikan Diskon Fee Platform.

Referral: Setiap user punya kode unik. Mengajak teman memberikan bonus XP.

🏗️ Struktur Database

Tabel-tabel utama yang menopang sistem ini:

auth.users: Data user bawaan Supabase.

public.rooms: Data kompetisi (judul, reward, status distribusi, wallet creator).

public.participants: Data peserta (saldo awal, saldo akhir, profit, status).

public.deposit_logs: Log deposit eksternal untuk deteksi kecurangan.

public.user_stats (BARU): Menyimpan Level, XP, Kode Referral, dan Total Referral.

public.xp_logs (BARU): Riwayat penambahan XP untuk transparansi.

📝 Apa yang Perlu Dilanjutkan / Ditambahkan?

Jika Anda ingin melanjutkan coding, inilah Action Items berikutnya:

Prioritas Tinggi (Wajib Cek)

Validasi Webhook Helius:

Pastikan file supabase/functions/helius-webhook/index.ts sudah dikonfigurasi dengan Webhook ID yang benar dari dashboard Helius.dev Anda.

Tes apakah transaksi swap di Raydium/Jupiter benar-benar terdeteksi dan mengupdate kolom current_balance di tabel participants.

Cron Job Scheduling:

Pastikan Anda sudah menjalankan perintah SQL pg_cron di dashboard Supabase untuk memicu fungsi distribute-rewards setiap jam.

Fitur Tambahan (Opsional / Masa Depan)

Notifikasi Pengguna:

Kirim email atau notifikasi Telegram saat user memenangkan lomba atau saat hadiah cair.

Leaderboard Referral:

Membuat halaman khusus "Top Referrer" untuk memacu semangat user mengajak teman.

Halaman Klaim Bonus:

Saat ini Bonus Creator (1 SOL saat level Visionary) dikirim otomatis. Bisa diubah menjadi sistem "Claim Manual" agar user merasa lebih dihargai saat menekan tombol claim.

Support Token Lain (SPL Token):

Saat ini sistem fokus pada SOL. Masa depan bisa support USDC atau BONK sebagai mata uang taruhan.

🛠️ Cara Melanjutkan Development

Install Dependencies:

npm install


Jalankan Server Lokal:

npm run dev


Deploy Edge Functions (Jika ada perubahan backend):

npx supabase functions deploy distribute-rewards --no-verify-jwt
npx supabase functions deploy distribute-quarterly-rewards --no-verify-jwt


Cek Database: Gunakan Table Editor di Dashboard Supabase untuk memantau data yang masuk.

Catatan Pengembang:
Sistem ini sudah dirancang Self-Sustaining. Pendapatan platform (50% dari tiket) sudah lebih dari cukup untuk menutupi biaya operasional (gas fee robot) dan hadiah musiman (20% dari profit). Anda tidak perlu "nombok" selama ada aktivitas di platform.

Selamat mengembangkan TradeHub! 🚀