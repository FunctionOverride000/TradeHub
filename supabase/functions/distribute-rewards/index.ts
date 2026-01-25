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
const SIMULATION_MODE = false; // Set false untuk Live (Uang Asli)

// Pembagian Hadiah Juara (50%, 30%, 20%)
const REWARD_DISTRIBUTION = [0.50, 0.30, 0.20]; 

// --- KONFIGURASI XP (GAMIFIKASI) ---
const XP_RATES = {
  CREATOR_BASE: 50,         // Modal bikin lomba
  CREATOR_PER_USER: 20,     // Insentif per peserta (Viral Loop)
  CREATOR_HYPE_TIER_1: 250, // Bonus Hype jika > 10 peserta
  CREATOR_HYPE_TIER_2: 1000,// Bonus Hype jika > 50 peserta
  
  USER_JOIN: 20,            // XP Partisipasi
  USER_PROFIT: 50,          // Bonus jika profit positif
  USER_RANK_1: 300,         // XP Juara 1
  USER_RANK_2: 150,         // XP Juara 2
  USER_RANK_3: 75           // XP Juara 3
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SOLANA_RPC_URL = Deno.env.get('SOLANA_RPC_URL') ?? 'https://api.devnet.solana.com' 
const PAYOUT_WALLET_PRIVATE_KEY = Deno.env.get('PAYOUT_WALLET_PRIVATE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// --- HELPER: UPDATE XP & LEVEL ---
async function updateUserStats(
  userId: string, 
  xpAmount: number, 
  type: 'creator' | 'user', 
  action: string, 
  sourceId: string
): Promise<{ oldXp: number, newXp: number }> {
  
  if (!userId || xpAmount === 0) return { oldXp: 0, newXp: 0 };

  // 1. Catat Log (Audit Trail) agar transparan
  await supabase.from('xp_logs').insert({
    user_id: userId,
    amount: xpAmount,
    xp_category: type,
    action_type: action,
    source_id: sourceId
  });

  // 2. Ambil Data Stats Saat Ini
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  const colXp = type === 'creator' ? 'creator_xp' : 'user_xp';
  const colLevel = type === 'creator' ? 'creator_level' : 'user_level';
  
  const currentXp = stats ? (stats[colXp] || 0) : 0;
  const newXp = currentXp + xpAmount;
  
  // 3. Hitung Level Baru (Logika Akar Kuadrat: Makin tinggi level, makin susah naik)
  // Level 1: 0 XP, Level 10: ~10.000 XP
  const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;

  // 4. Update Database
  if (stats) {
    await supabase.from('user_stats').update({
      [colXp]: newXp,
      [colLevel]: newLevel,
      last_updated: new Date().toISOString()
    }).eq('user_id', userId);
  } else {
    // Fallback insert jika row belum ada (Trigger harusnya sudah handle ini, tapi untuk jaga-jaga)
    await supabase.from('user_stats').insert({
      user_id: userId,
      [colXp]: newXp,
      [colLevel]: newLevel,
      // Generate referral code acak jika belum ada
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
    if (!PAYOUT_WALLET_PRIVATE_KEY) throw new Error('PAYOUT_WALLET_PRIVATE_KEY not configured')

    const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
    let adminKeypair: Keypair;
    try {
      const secretKey = bs58.decode(PAYOUT_WALLET_PRIVATE_KEY)
      adminKeypair = Keypair.fromSecretKey(secretKey)
    } catch (e: any) {
      throw new Error(`Failed to decode private key: ${e.message}`)
    }

    console.log(`🤖 Payout & XP Bot Active. Wallet: ${adminKeypair.publicKey.toBase58()}`)

    // 1. Cari Room yang Pending Distribusi
    const { data: rooms, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .lt('end_time', new Date().toISOString()) 
      .eq('distribution_status', 'pending')
      .gt('reward_token_amount', 0)
      .limit(5)

    if (roomError) throw roomError
    
    if (!rooms || rooms.length === 0) {
      return new Response(JSON.stringify({ message: 'No rooms pending distribution' }), { headers: { 'Content-Type': 'application/json' } })
    }

    const results = []

    // 2. Loop Proses Setiap Room
    for (const room of rooms) {
      console.log(`Processing Room ID: ${room.id} | Reward Pool: ${room.reward_token_amount} SOL`)
      // Tandai processing agar tidak diambil worker lain
      await supabase.from('rooms').update({ distribution_status: 'processing' }).eq('id', room.id)

      try {
        const { data: participants, error: partError } = await supabase
          .from('participants')
          .select('id, wallet_address, net_profit, user_id, initial_balance, current_balance')
          .eq('room_id', room.id)
          .order('net_profit', { ascending: false }); // PENTING: Urutkan profit tertinggi

        if (partError) throw partError
        
        const participantCount = participants?.length || 0;
        
        // --- A. PROSES XP KREATOR (Viral Incentivization) ---
        if (room.creator_id) {
            let creatorXpEarned = XP_RATES.CREATOR_BASE;
            
            // XP Variabel dari jumlah peserta
            creatorXpEarned += (participantCount * XP_RATES.CREATOR_PER_USER);
            
            // Hype Bonus (Jackpot XP)
            if (participantCount > 50) creatorXpEarned += XP_RATES.CREATOR_HYPE_TIER_2;
            else if (participantCount > 10) creatorXpEarned += XP_RATES.CREATOR_HYPE_TIER_1;

            const { oldXp, newXp } = await updateUserStats(room.creator_id, creatorXpEarned, 'creator', 'arena_finished', room.id);
            console.log(`Creator ${room.creator_id} earned ${creatorXpEarned} XP. Total: ${newXp}`);

            // ** CREATOR REWARD (1 SOL jika tembus 10.000 XP) **
            // Cek apakah user baru saja melewati ambang batas 10.000 XP
            if (oldXp < 10000 && newXp >= 10000) {
               console.log(`🎉 CREATOR ${room.creator_id} REACHED VISIONARY LEVEL! Sending 1 SOL Bonus.`);
               // Kirim Bonus 1 SOL (Real Money)
               if (!SIMULATION_MODE) {
                  // Ambil wallet creator dari tabel rooms (sebagai fallback jika tidak ada di profile)
                  // Idealnya ada tabel user_wallets, tapi kita pakai creator_wallet dari room terakhir ini
                  const creatorWalletAddr = room.creator_wallet; 
                  
                  if (creatorWalletAddr) {
                      const bonusTx = new Transaction().add(
                          SystemProgram.transfer({
                              fromPubkey: adminKeypair.publicKey,
                              toPubkey: new PublicKey(creatorWalletAddr),
                              lamports: 1 * LAMPORTS_PER_SOL, // 1 SOL
                          })
                      );
                      const bonusSig = await sendAndConfirmTransaction(connection, bonusTx, [adminKeypair]);
                      console.log(`✅ Bonus 1 SOL Sent! Sig: ${bonusSig}`);
                      
                      // Catat di log bahwa reward sudah diklaim
                      await supabase.from('xp_logs').insert({
                        user_id: room.creator_id,
                        amount: 0,
                        xp_category: 'creator',
                        action_type: 'reward_claimed_1sol',
                        description: `Bonus for reaching 10k XP. Sig: ${bonusSig}`
                      });
                  }
               }
            }
        }

        // --- B. PROSES HADIAH USER & XP USER ---
        if (participantCount === 0) {
           await supabase.from('rooms').update({ distribution_status: 'failed', description: 'No participants' }).eq('id', room.id);
           continue;
        }

        const transaction = new Transaction();
        const totalReward = room.reward_token_amount || 0;
        const winnersLog: any[] = [];
        let instructionAdded = false;

        // Loop setiap peserta untuk hitung XP dan Hadiah
        for (let i = 0; i < participants.length; i++) {
            const p = participants[i];
            const rank = i + 1;
            let userXpEarned = XP_RATES.USER_JOIN; // Base XP

            // Bonus XP Profit
            if (Number(p.net_profit) > 0) userXpEarned += XP_RATES.USER_PROFIT;

            // Bonus XP Juara
            if (rank === 1) userXpEarned += XP_RATES.USER_RANK_1;
            else if (rank === 2) userXpEarned += XP_RATES.USER_RANK_2;
            else if (rank === 3) userXpEarned += XP_RATES.USER_RANK_3;

            // Simpan XP User
            if (p.user_id) {
                await updateUserStats(p.user_id, userXpEarned, 'user', `rank_${rank}`, room.id);
            }

            // --- TRANSFER HADIAH SOL (Hanya Top 3) ---
            if (rank <= 3) {
                const sharePercentage = REWARD_DISTRIBUTION[i];
                const amountSOL = totalReward * sharePercentage;
                const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

                if (amountLamports > 0) {
                    console.log(`Plan transfer: ${amountSOL} SOL to ${p.wallet_address} (Rank ${rank})`);
                    
                    if (!SIMULATION_MODE) {
                        transaction.add(
                            SystemProgram.transfer({
                                fromPubkey: adminKeypair.publicKey,
                                toPubkey: new PublicKey(p.wallet_address),
                                lamports: amountLamports,
                            })
                        );
                    }
                    
                    instructionAdded = true;
                    winnersLog.push({
                        rank: rank,
                        wallet: p.wallet_address,
                        amount: amountSOL,
                        user_id: p.user_id,
                        roi: p.net_profit
                    });
                }
            }
        }

        // --- C. FINALISASI TRANSAKSI ---
        let signature = `simulated_tx_${Math.random().toString(36).substring(7)}`;

        if (instructionAdded) {
            if (!SIMULATION_MODE) {
                console.log("🚀 Sending Real Transaction...");
                signature = await sendAndConfirmTransaction(connection, transaction, [adminKeypair]);
                console.log(`✅ Transaction Sent! Sig: ${signature}`);
            } else {
                console.log(`⚠️ SIMULATION MODE: Fake Sig: ${signature}`);
            }
        }

        // Update Status Room jadi Distributed
        await supabase.from('rooms').update({
            distribution_status: 'distributed',
            distribution_tx_hash: signature,
            winners_info: winnersLog
        }).eq('id', room.id);

        results.push({ roomId: room.id, status: 'success', signature, mode: SIMULATION_MODE ? 'simulation' : 'live' });

      } catch (err: any) {
        console.error(`❌ Error processing room ${room.id}:`, err);
        await supabase.from('rooms').update({ distribution_status: 'failed', description: `Error: ${err.message}` }).eq('id', room.id);
        results.push({ roomId: room.id, status: 'error', error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
})