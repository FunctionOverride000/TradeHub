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

// --- KONFIGURASI ---
// 🔥 LIVE MODE FORCED: Simulasi dimatikan total (Hardcoded).
// Script ini PASTI akan mengirim aset asli jika dijalankan.
const SIMULATION_MODE = false; 

// Pembagian Hadiah Juara (50%, 30%, 20%)
const REWARD_DISTRIBUTION = [0.50, 0.30, 0.20]; 

// Buffer Transaksi (PENTING: Dinaikkan agar tidak error Rent Exempt di Admin Wallet)
// 0.005 SOL untuk keamanan ekstra (Audit Recommendation)
const TX_FEE_BUFFER_LAMPORT = 5000000; 

// Batas Minimum Transfer Solana (Rent Exemption ~0.00089 SOL)
// Transfer di bawah ini akan DI-SKIP agar transaksi tidak gagal.
const MIN_TRANSFER_LAMPORT = 1000000; // 0.001 SOL

// --- KONFIGURASI XP ---
const XP_RATES = {
  CREATOR_BASE: 50,
  CREATOR_PER_USER: 20,
  CREATOR_HYPE_TIER_1: 250, 
  CREATOR_HYPE_TIER_2: 1000,
  USER_JOIN: 20,
  USER_PROFIT: 50,
  USER_RANK_1: 300,
  USER_RANK_2: 150,
  USER_RANK_3: 75
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SOLANA_RPC_URL = Deno.env.get('SOLANA_RPC_URL') ?? 'https://api.mainnet-beta.solana.com'
const PAYOUT_WALLET_PRIVATE_KEY = Deno.env.get('PAYOUT_WALLET_PRIVATE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// --- HELPER: UPDATE XP ---
async function updateUserStats(userId: string, xpAmount: number, type: 'creator' | 'user', action: string, sourceId: string) {
  if (!userId || xpAmount === 0) return { oldXp: 0, newXp: 0 };

  try {
    // Log XP History
    await supabase.from('xp_logs').insert({
      user_id: userId,
      amount: xpAmount,
      xp_category: type,
      action_type: action,
      source_id: sourceId
    });

    // Get current stats
    const { data: stats } = await supabase.from('user_stats').select('*').eq('user_id', userId).single();
    
    const colXp = type === 'creator' ? 'creator_xp' : 'user_xp';
    const colLevel = type === 'creator' ? 'creator_level' : 'user_level';
    
    const currentXp = stats ? (stats[colXp] || 0) : 0;
    const newXp = currentXp + xpAmount;
    
    // Simple Level Formula: Level = sqrt(XP / 100) + 1
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;

    if (stats) {
      await supabase.from('user_stats').update({
        [colXp]: newXp,
        [colLevel]: newLevel,
        last_updated: new Date().toISOString()
      }).eq('user_id', userId);
    } else {
      await supabase.from('user_stats').insert({
        user_id: userId,
        [colXp]: newXp,
        [colLevel]: newLevel,
        referral_code: 'TRD-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      });
    }
    return { oldXp: currentXp, newXp: newXp };
  } catch (err) {
    console.error(`Error updating XP for user ${userId}:`, err);
    return { oldXp: 0, newXp: 0 };
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    if (!PAYOUT_WALLET_PRIVATE_KEY) throw new Error('PAYOUT_WALLET_PRIVATE_KEY missing');

    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const adminKeypair = Keypair.fromSecretKey(bs58.decode(PAYOUT_WALLET_PRIVATE_KEY));
    const adminWalletAddress = adminKeypair.publicKey.toBase58();

    const modeLabel = "🚀 LIVE / REAL MONEY MODE (FORCED)";
    console.log(`🤖 Bot Active. Wallet: ${adminWalletAddress} | ${modeLabel}`);

    // Check Balance
    const adminBalance = await connection.getBalance(adminKeypair.publicKey);
    console.log(`💰 Admin Balance: ${adminBalance / LAMPORTS_PER_SOL} SOL`);

    // 1. Cari Room Pending (Limit 1 per run untuk stabilitas)
    const { data: rooms, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .lt('end_time', new Date().toISOString()) 
      .eq('distribution_status', 'pending')
      .gt('reward_token_amount', 0)
      .limit(1);

    if (roomError) throw roomError;
    if (!rooms || rooms.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending rooms found to distribute.' }), { headers: { 'Content-Type': 'application/json' } });
    }

    const room = rooms[0];
    console.log(`Processing Room: ${room.title} (${room.id})`);
    
    // Update status ke processing untuk mencegah double-run
    await supabase.from('rooms').update({ distribution_status: 'processing' }).eq('id', room.id);

    // Ambil peserta, urutkan berdasarkan profit tertinggi
    const { data: participants } = await supabase
      .from('participants')
      .select('*')
      .eq('room_id', room.id)
      .order('net_profit', { ascending: false });

    if (!participants || participants.length === 0) {
      await supabase.from('rooms').update({ distribution_status: 'failed', description: 'No participants found' }).eq('id', room.id);
      return new Response(JSON.stringify({ message: 'No participants' }));
    }

    // --- XP KREATOR (Tetap diberikan apapun hasil distribusi uang) ---
    if (room.creator_id) {
        let xp = XP_RATES.CREATOR_BASE + (participants.length * XP_RATES.CREATOR_PER_USER);
        if (participants.length > 50) xp += XP_RATES.CREATOR_HYPE_TIER_2;
        else if (participants.length > 10) xp += XP_RATES.CREATOR_HYPE_TIER_1;
        
        await updateUserStats(room.creator_id, xp, 'creator', 'arena_finished', room.id);
        console.log(`✨ Creator XP updated for ${room.creator_id}: +${xp}`);
    }

    // --- DISTRIBUSI HADIAH ---
    const transaction = new Transaction();
    let totalPayoutNeededLamports = 0;
    const winnersLog: any[] = [];
    let transferCount = 0;
    
    const winners = participants.slice(0, 3);
    const totalPrizePoolLamports = Math.floor((room.reward_token_amount || 0) * LAMPORTS_PER_SOL);

    for (let i = 0; i < winners.length; i++) {
        const p = winners[i];
        const rank = i + 1;
        
        // AUDIT FIX: Hitung share dari Lamports langsung untuk presisi integer
        const share = REWARD_DISTRIBUTION[i]; // 0.5, 0.3, 0.2
        const prizeLamports = Math.floor(totalPrizePoolLamports * share);
        const prizeSOL = prizeLamports / LAMPORTS_PER_SOL;

        // --- FILTER DUST (PENTING!) ---
        if (prizeLamports >= MIN_TRANSFER_LAMPORT) {
            // Validasi Wallet Address User
            let userPublicKey: PublicKey;
            try {
                userPublicKey = new PublicKey(p.wallet_address);
            } catch (e) {
                console.error(`Invalid wallet address for rank ${rank}: ${p.wallet_address}`);
                winnersLog.push({ rank, wallet: p.wallet_address, status: 'failed_invalid_address', error: 'Invalid Public Key' });
                continue; // Skip user ini
            }

            totalPayoutNeededLamports += prizeLamports;
            transferCount++;
            
            // Live Mode: Langsung tambahkan ke transaksi
            if (!SIMULATION_MODE) {
                transaction.add(
                    SystemProgram.transfer({
                        fromPubkey: adminKeypair.publicKey,
                        toPubkey: userPublicKey,
                        lamports: prizeLamports,
                    })
                );
            }
            
            winnersLog.push({ 
                rank, 
                wallet: p.wallet_address, 
                amount: prizeSOL, 
                roi: p.net_profit, 
                status: 'paid' 
            });
        } else {
            console.log(`⚠️ Skipping reward for Rank ${rank}: ${prizeSOL} SOL is too small (Dust).`);
            winnersLog.push({ 
                rank, 
                wallet: p.wallet_address, 
                amount: prizeSOL, 
                roi: p.net_profit, 
                status: 'skipped_too_small' 
            });
        }

        // --- XP USER ---
        let userXp = XP_RATES.USER_JOIN;
        if (Number(p.net_profit) > 0) userXp += XP_RATES.USER_PROFIT;
        if (rank === 1) userXp += XP_RATES.USER_RANK_1;
        else if (rank === 2) userXp += XP_RATES.USER_RANK_2;
        else if (rank === 3) userXp += XP_RATES.USER_RANK_3;
        
        if (p.user_id) await updateUserStats(p.user_id, userXp, 'user', `rank_${rank}`, room.id);
    }

    let signature = null;

    if (totalPayoutNeededLamports > 0 && transferCount > 0) {
        // Cek Saldo Admin dengan Buffer Aman (Audit Requirement)
        const requiredBalance = totalPayoutNeededLamports + TX_FEE_BUFFER_LAMPORT;

        if (adminBalance < requiredBalance) {
            const shortfall = (requiredBalance - adminBalance) / LAMPORTS_PER_SOL;
            const errMsg = `Insufficient Admin Balance. Have: ${(adminBalance/LAMPORTS_PER_SOL).toFixed(4)} SOL. Need: ${(requiredBalance/LAMPORTS_PER_SOL).toFixed(4)} SOL. Shortfall: ${shortfall.toFixed(4)} SOL.`;
            console.error(`❌ ${errMsg}`);
            
            // Revert status to pending so we can retry later after topup
            await supabase.from('rooms').update({ 
                distribution_status: 'failed', 
                description: errMsg 
            }).eq('id', room.id);
            
            throw new Error(errMsg);
        }

        if (!SIMULATION_MODE) {
            console.log(`🚀 Sending ${totalPayoutNeededLamports / LAMPORTS_PER_SOL} SOL to ${transferCount} winners...`);
            try {
                signature = await sendAndConfirmTransaction(connection, transaction, [adminKeypair]);
                console.log(`✅ Success! Sig: ${signature}`);
            } catch (txError: any) {
                 console.error("❌ Transaction Failed on Blockchain:", txError);
                 throw new Error(`Blockchain Tx Failed: ${txError.message}`);
            }
        }
    } else {
        console.log("ℹ️ No payouts made (Amounts too small or no winners). Marking as distributed.");
        signature = "no_payout_dust_limit";
    }

    // Update Room Final Status
    await supabase.from('rooms').update({
        distribution_status: 'distributed',
        distribution_tx_hash: signature,
        winners_info: winnersLog, // Simpan log detail siapa yang menang
        updated_at: new Date().toISOString()
    }).eq('id', room.id);

    return new Response(JSON.stringify({ success: true, signature, log: winnersLog }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("❌ Critical Distribution Error:", error);
    
    // Pastikan kita mencoba mengupdate status error ke database jika memungkinkan
    try {
        const body = await req.json().catch(() => ({})); 
        const roomId = body.id; // Fallback if getting room from logic failed
        if (roomId) {
             await supabase.from('rooms').update({ 
                distribution_status: 'failed', 
                description: `System Error: ${error.message}` 
            }).eq('id', roomId);
        }
    } catch (e) { /* Ignore secondary error */ }

    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
})