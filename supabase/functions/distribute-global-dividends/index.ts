import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL 
} from 'https://esm.sh/@solana/web3.js@1.87.6'
import bs58 from 'https://esm.sh/bs58@5.0.0'

// --- KONFIGURASI GLOBAL ---
const SIMULATION_MODE = false; // Set 'true' untuk testing tanpa kirim uang asli
const REVENUE_SHARE_PERCENTAGE = 0.20; // 20% dari Pendapatan Platform
const WINNER_SHARE_DISTRIBUTION = [0.50, 0.30, 0.20]; // Juara 1: 50%, Juara 2: 30%, Juara 3: 20% dari Pool Dividen

// --- ENV VARIABLES ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SOLANA_RPC_URL = Deno.env.get('SOLANA_RPC_URL') ?? 'https://api.mainnet-beta.solana.com'
const TREASURY_PRIVATE_KEY = Deno.env.get('PAYOUT_WALLET_PRIVATE_KEY') ?? '' // Wallet sumber dana dividen

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// --- INTERFACE ---
interface TraderStats {
  user_id: string;
  wallet_address: string;
  total_net_profit: number;
}

Deno.serve(async (req) => {
  // Handle CORS (Optional jika dipanggil dari browser, tapi ini biasanya Cron Job)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    console.log("--- 🌏 STARTING QUARTERLY GLOBAL DIVIDEND DISTRIBUTION ---");

    if (!TREASURY_PRIVATE_KEY) throw new Error('Wallet Private Key not configured');

    // 1. Setup Koneksi Solana
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(TREASURY_PRIVATE_KEY));
    console.log(`Treasury Wallet: ${treasuryKeypair.publicKey.toBase58()}`);

    // 2. Tentukan Periode Waktu (3 Bulan Terakhir / Kuartal)
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    
    console.log(`Analyzing revenue from: ${threeMonthsAgo.toISOString()} to ${now.toISOString()}`);

    // 3. Hitung Pendapatan Platform (Total Entry Fee)
    // Mengambil semua room yang selesai ('distributed') dalam 3 bulan terakhir
    const { data: closedRooms, error: roomError } = await supabase
      .from('rooms')
      .select('entry_fee, id')
      .eq('distribution_status', 'distributed')
      .gte('end_time', threeMonthsAgo.toISOString())
      .gt('entry_fee', 0); // Hanya room berbayar

    if (roomError) throw new Error(`Database error fetching rooms: ${roomError.message}`);

    const totalEntryFees = closedRooms?.reduce((sum, room) => sum + (room.entry_fee || 0), 0) || 0;
    const dividendPool = totalEntryFees * REVENUE_SHARE_PERCENTAGE;

    console.log(`💰 Total Revenue (3 Mo): ${totalEntryFees.toFixed(4)} SOL`);
    console.log(`💎 Dividend Pool (20%): ${dividendPool.toFixed(4)} SOL`);

    if (dividendPool < 0.01) {
      return new Response(JSON.stringify({ message: 'Dividend pool too small to distribute.', pool: dividendPool }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 4. Cari Top 3 Global Traders (Logic Hall of Fame)
    // Kita mengambil semua partisipasi user dan menjumlahkan net_profit mereka
    const { data: allParticipants, error: partError } = await supabase
      .from('participants')
      .select('user_id, wallet_address, net_profit')
      .not('user_id', 'is', null); // Pastikan user terdaftar

    if (partError) throw new Error(`Database error fetching participants: ${partError.message}`);

    // Agregasi Profit per User
    const traderMap: Record<string, TraderStats> = {};

    allParticipants?.forEach((p: any) => {
      if (!p.user_id) return;
      
      if (!traderMap[p.user_id]) {
        traderMap[p.user_id] = {
          user_id: p.user_id,
          wallet_address: p.wallet_address,
          total_net_profit: 0
        };
      }
      // Akumulasi profit (bisa positif atau negatif)
      traderMap[p.user_id].total_net_profit += Number(p.net_profit || 0);
    });

    // Urutkan (Ranking)
    const topTraders = Object.values(traderMap)
      .sort((a, b) => b.total_net_profit - a.total_net_profit) // Highest profit first
      .slice(0, 3); // Ambil Top 3

    console.log("🏆 Top 3 Traders Identified:");
    topTraders.forEach((t, i) => console.log(`#${i+1}: ${t.wallet_address} (Profit: ${t.total_net_profit.toFixed(2)}%)`));

    // 5. Eksekusi Distribusi Dividen
    const transaction = new Transaction();
    const payoutLogs: any[] = [];
    let instructionsAdded = false;

    for (let i = 0; i < topTraders.length; i++) {
      const trader = topTraders[i];
      const share = WINNER_SHARE_DISTRIBUTION[i]; // 0.5, 0.3, atau 0.2
      const amountSol = dividendPool * share;
      const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

      if (amountLamports > 0) {
        console.log(`Plan: Sending ${amountSol.toFixed(4)} SOL to Rank #${i+1} (${trader.wallet_address})`);
        
        if (!SIMULATION_MODE) {
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: treasuryKeypair.publicKey,
              toPubkey: new PublicKey(trader.wallet_address),
              lamports: amountLamports,
            })
          );
        }
        instructionsAdded = true;
        payoutLogs.push({
          rank: i + 1,
          user_id: trader.user_id,
          wallet: trader.wallet_address,
          amount_sol: amountSol,
          percentage: share * 100
        });
      }
    }

    let signature = "simulation-sig";

    if (instructionsAdded && !SIMULATION_MODE) {
      console.log("🚀 Sending Transaction to Blockchain...");
      signature = await sendAndConfirmTransaction(connection, transaction, [treasuryKeypair]);
      console.log(`✅ Success! Signature: ${signature}`);
    } else if (SIMULATION_MODE) {
      console.log("⚠️ Simulation Mode: No real funds sent.");
    }

    // 6. Simpan Log Audit Dividen
    // Kita bisa simpan ini di tabel 'xp_logs' atau tabel baru 'dividend_logs'
    // Untuk saat ini kita pakai xp_logs dengan kategori khusus
    if (!SIMULATION_MODE && instructionsAdded) {
      for (const log of payoutLogs) {
        await supabase.from('xp_logs').insert({
          user_id: log.user_id,
          amount: 0, // 0 XP, karena ini uang
          xp_category: 'global_dividend',
          action_type: 'payout_received',
          description: `Received ${log.amount_sol.toFixed(4)} SOL (Rank #${log.rank} Quarterly Reward). Sig: ${signature}`
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      revenue_period: 'last_3_months',
      total_revenue_sol: totalEntryFees,
      dividend_pool_sol: dividendPool,
      winners: payoutLogs,
      tx_signature: signature
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error("❌ Dividend Distribution Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
})