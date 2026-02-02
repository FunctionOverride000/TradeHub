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
const SIMULATION_MODE = Deno.env.get('SIMULATION_MODE') === 'false';

// Pembagian Hadiah Juara (50%, 30%, 20%)
const REWARD_DISTRIBUTION = [0.50, 0.30, 0.20]; 

// Buffer Transaksi (PENTING: Dinaikkan agar tidak error Rent Exempt di Admin Wallet)
// 0.002 SOL = 2,000,000 Lamports
const TX_FEE_BUFFER = 2000000; 

// Batas Minimum Transfer Solana (Rent Exemption ~0.00089 SOL)
// Kita set ke 0.001 SOL (1.000.000 Lamports) agar aman.
// Transfer di bawah ini akan DI-SKIP agar transaksi tidak gagal.
const MIN_TRANSFER_LAMPORT = 1000000; 

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

  await supabase.from('xp_logs').insert({
    user_id: userId,
    amount: xpAmount,
    xp_category: type,
    action_type: action,
    source_id: sourceId
  });

  const { data: stats } = await supabase.from('user_stats').select('*').eq('user_id', userId).single();
  
  const colXp = type === 'creator' ? 'creator_xp' : 'user_xp';
  const colLevel = type === 'creator' ? 'creator_level' : 'user_level';
  
  const currentXp = stats ? (stats[colXp] || 0) : 0;
  const newXp = currentXp + xpAmount;
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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    if (!PAYOUT_WALLET_PRIVATE_KEY) throw new Error('PAYOUT_WALLET_PRIVATE_KEY missing');

    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const adminKeypair = Keypair.fromSecretKey(bs58.decode(PAYOUT_WALLET_PRIVATE_KEY));
    const adminWalletAddress = adminKeypair.publicKey.toBase58();

    console.log(`🤖 Bot Active. Wallet: ${adminWalletAddress} | Simulation: ${SIMULATION_MODE}`);

    const adminBalance = await connection.getBalance(adminKeypair.publicKey);
    console.log(`💰 Admin Balance: ${adminBalance / LAMPORTS_PER_SOL} SOL`);

    // 1. Cari Room Pending (Hanya 1 per run)
    const { data: rooms, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .lt('end_time', new Date().toISOString()) 
      .eq('distribution_status', 'pending')
      .gt('reward_token_amount', 0)
      .limit(1);

    if (roomError) throw roomError;
    if (!rooms || rooms.length === 0) {
      return new Response(JSON.stringify({ message: 'No rooms pending' }), { headers: { 'Content-Type': 'application/json' } });
    }

    const room = rooms[0];
    console.log(`Processing Room: ${room.title} (${room.id})`);
    
    // Update status ke processing
    await supabase.from('rooms').update({ distribution_status: 'processing' }).eq('id', room.id);

    const { data: participants } = await supabase
      .from('participants')
      .select('*')
      .eq('room_id', room.id)
      .order('net_profit', { ascending: false });

    if (!participants || participants.length === 0) {
        await supabase.from('rooms').update({ distribution_status: 'failed', description: 'No participants' }).eq('id', room.id);
        return new Response(JSON.stringify({ message: 'No participants' }));
    }

    // --- XP KREATOR ---
    if (room.creator_id) {
        let xp = XP_RATES.CREATOR_BASE + (participants.length * XP_RATES.CREATOR_PER_USER);
        if (participants.length > 50) xp += XP_RATES.CREATOR_HYPE_TIER_2;
        else if (participants.length > 10) xp += XP_RATES.CREATOR_HYPE_TIER_1;
        await updateUserStats(room.creator_id, xp, 'creator', 'arena_finished', room.id);
    }

    // --- DISTRIBUSI HADIAH ---
    const transaction = new Transaction();
    let totalPayoutNeeded = 0;
    const winnersLog: any[] = [];
    let transferCount = 0;
    
    const winners = participants.slice(0, 3);

    for (let i = 0; i < winners.length; i++) {
        const p = winners[i];
        const rank = i + 1;
        
        const share = REWARD_DISTRIBUTION[i];
        const amountSOL = (room.reward_token_amount || 0) * share;
        const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

        // --- FILTER DUST (PENTING!) ---
        // Jika hadiah terlalu kecil (< 0.001 SOL), SKIP transfernya.
        // Ini untuk mencegah error "Insufficient funds for rent" pada wallet penerima baru.
        if (amountLamports > MIN_TRANSFER_LAMPORT) {
            totalPayoutNeeded += amountLamports;
            transferCount++;
            
            if (!SIMULATION_MODE) {
                transaction.add(
                    SystemProgram.transfer({
                        fromPubkey: adminKeypair.publicKey,
                        toPubkey: new PublicKey(p.wallet_address),
                        lamports: amountLamports,
                    })
                );
            }
            winnersLog.push({ 
                rank, 
                wallet: p.wallet_address, 
                amount: amountSOL, 
                roi: p.net_profit, 
                status: 'paid' 
            });
        } else {
            console.log(`⚠️ Skipping reward for Rank ${rank}: ${amountSOL} SOL is too small (Dust).`);
            winnersLog.push({ 
                rank, 
                wallet: p.wallet_address, 
                amount: amountSOL, 
                roi: p.net_profit, 
                status: 'skipped_too_small' 
            });
        }

        // XP User tetap diberikan walau hadiah di-skip
        let userXp = XP_RATES.USER_JOIN;
        if (Number(p.net_profit) > 0) userXp += XP_RATES.USER_PROFIT;
        if (rank === 1) userXp += XP_RATES.USER_RANK_1;
        else if (rank === 2) userXp += XP_RATES.USER_RANK_2;
        else if (rank === 3) userXp += XP_RATES.USER_RANK_3;
        
        if (p.user_id) await updateUserStats(p.user_id, userXp, 'user', `rank_${rank}`, room.id);
    }

    let signature = null;

    if (totalPayoutNeeded > 0 && transferCount > 0) {
        // Cek Saldo Admin dengan Buffer Aman
        if (adminBalance < (totalPayoutNeeded + TX_FEE_BUFFER)) {
            const shortfall = ((totalPayoutNeeded + TX_FEE_BUFFER) - adminBalance) / LAMPORTS_PER_SOL;
            throw new Error(`Insufficient Admin Balance. Need ${shortfall.toFixed(4)} more SOL.`);
        }

        if (!SIMULATION_MODE) {
            console.log(`🚀 Sending ${totalPayoutNeeded / LAMPORTS_PER_SOL} SOL to ${transferCount} winners...`);
            signature = await sendAndConfirmTransaction(connection, transaction, [adminKeypair]);
            console.log(`✅ Success! Sig: ${signature}`);
        } else {
            console.log(`⚠️ SIMULATION: Would send ${totalPayoutNeeded / LAMPORTS_PER_SOL} SOL`);
            signature = `simulated_${Date.now()}`;
        }
    } else {
        console.log("ℹ️ No payouts made (Amounts too small or no winners). Marking as distributed.");
        signature = "no_payout_dust_limit";
    }

    // Update Sukses
    await supabase.from('rooms').update({
        distribution_status: 'distributed',
        distribution_tx_hash: signature,
        winners_info: winnersLog
    }).eq('id', room.id);

    return new Response(JSON.stringify({ success: true, signature }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("❌ Distribution Error:", error);
    // Kembalikan error agar status bisa dibaca lognya
    // Update jadi 'failed' agar admin sadar ada masalah.
    await supabase.from('rooms').update({ 
        distribution_status: 'failed', 
        description: `Error: ${error.message}` 
    }).eq('id', (await req.json()).id).catch(() => {}); // Try catch in case req body lost

    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})