TradeHub: The Trust Layer of Solana Ecosystem 🛡️🚀

Decentralized Proof-of-Achievement Protocol on Solana Blockchain.
TradeHub adalah lapisan integritas yang memvalidasi keahlian trading secara on-chain, memisahkan "keberuntungan" dari "strategi murni" melalui algoritma Clean ROI™.

🌟 Introduction

Dalam dunia Decentralized Finance (DeFi), kepercayaan adalah mata uang yang paling berharga. Namun, industri ini dipenuhi dengan klaim keuntungan palsu, manipulasi screenshot PnL, dan kompetisi yang tidak adil.

TradeHub hadir sebagai solusi. Kami menyediakan infrastruktur audit real-time yang terhubung langsung ke Solana RPC, memungkinkan siapa saja untuk:

Membuat Arena Kompetisi: Host turnamen trading dengan aturan yang transparan.

Berkompetisi Secara Adil: Sistem Clean ROI memfilter deposit eksternal (top-up) dari perhitungan keuntungan.

Membangun Reputasi Abadi: Mencetak sertifikat pencapaian on-chain yang tidak bisa dipalsukan.

🔥 Key Features

1. Clean ROI™ Engine (Anti-Cheat)

Algoritma kami memantau signature transaksi secara real-time via WebSocket.

Pembuatan Lomba (/create-arena):
Deposit Filtering: Transfer masuk dari luar (selain swap DEX) dideteksi dan dikurangkan dari perhitungan profit.

Fair Play: Menjamin bahwa pemenang adalah trader dengan % keuntungan murni tertinggi, bukan modal terbesar.

2. Gamified Ecosystem

XP & Leveling: Sistem progres RPG. Naikkan level dari Plankton hingga Global Elite.

Privilege System: Creator level tinggi mendapatkan diskon biaya platform hingga 100%.

Hall of Fame: Papan peringkat global yang memberikan dividen tunai (SOL) kepada Top 3 Trader setiap kuartal.

3. Creator Protocol

Monetisasi: Creator mendapatkan 90% dari penjualan tiket masuk (Entry Fee) arena mereka.

Customizable: Atur aturan main, durasi, dan syarat saldo minimum sesuka hati.

Automated Payouts: Hadiah didistribusikan otomatis oleh smart logic backend saat kompetisi berakhir.

🛠️ Tech Stack

Frontend: Next.js 14 (App Router), Tailwind CSS, Lucide React.

Backend: Supabase (PostgreSQL, Edge Functions, Auth, Realtime).

Blockchain Integration: @solana/web3.js, Helius RPC / Alchemy.

Language: TypeScript.

🚀 Quick Start (Local Development)

Ikuti langkah ini untuk menjalankan TradeHub di mesin lokal Anda.

Prerequisites

Node.js (v18+)

Supabase CLI (untuk backend lokal)

Solana Wallet (Phantom/Solflare)

Installation

Clone Repository

git clone [https://github.com/username/TradeHub.git](https://github.com/username/TradeHub.git)
cd TradeHub


Install Dependencies

npm install


Setup Environment Variables
Buat file .env.local dan isi dengan kredensial Supabase & RPC Anda:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_ALCHEMY_SOLANA_URL=your_solana_rpc_url


Run Development Server

npm run dev


Buka http://localhost:3000 di browser Anda.

🌐 Ecosystem Partners

TradeHub didukung dan terintegrasi dengan ekosistem kripto terpercaya:

Partner

Role

Solana

Layer-1 Blockchain Infrastructure

Helius

High-Performance RPC & Webhooks

Crypto Directory ID

Community Education Partner

Chat Global

Decentralized Communication Layer

⚠️ Risk Disclosure

TradeHub adalah lapisan teknologi (infrastructure layer).

Kami TIDAK menyimpan dana trading pengguna (Non-Custodial).

Kami TIDAK memberikan saran finansial.

Segala aktivitas trading dilakukan di DEX eksternal (Raydium, Jupiter, dll) dan memiliki risiko pasar inheren.

🤝 Contributing

Kontribusi sangat diterima! Silakan fork repositori ini dan buat Pull Request untuk fitur baru atau perbaikan bug.

Fork Project

Create Feature Branch (git checkout -b feature/AmazingFeature)

Commit Changes (git commit -m 'Add some AmazingFeature')

Push to Branch (git push origin feature/AmazingFeature)

Open Pull Request

<div align="center">
<p>Built with ❤️ by the <b>TradeHub Team</b></p>
<p><i>Veritas in Codice (Truth in Code)</i></p>
</div>
