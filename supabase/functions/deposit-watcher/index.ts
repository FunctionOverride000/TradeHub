import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { 
  Connection, 
  PublicKey, 
  LAMPORTS_PER_SOL 
} from 'https://esm.sh/@solana/web3.js@1.87.6'

// --- KONFIGURASI ---
// Pastikan Env Var ini ada. Gunakan RPC Private (Alchemy/Helius) jika ada untuk stabilitas.
const SOLANA_RPC_URL = Deno.env.get('SOLANA_RPC_URL') ?? 'https://api.mainnet-beta.solana.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  // Handle CORS (Optional untuk Cron, tapi bagus untuk testing manual)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    console.log("🔍 Deposit Watcher started...");
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

    // 1. Ambil Room yang sedang Aktif (Belum berakhir)
    // Kita hanya scan peserta di room yang masih jalan untuk hemat resource.
    const { data: activeRooms } = await supabase
        .from('rooms')
        .select('id')
        .gt('end_time', new Date().toISOString());
    
    if (!activeRooms || activeRooms.length === 0) {
        return new Response(JSON.stringify({ message: "No active rooms to scan." }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    const roomIds = activeRooms.map(r => r.id);

    // 2. Ambil Peserta Terverifikasi di Room tersebut
    // Limitasi 50 user per run agar tidak timeout (Edge Function limit)
    const { data: participants } = await supabase
        .from('participants')
        .select('id, wallet_address, total_deposit')
        .in('room_id', roomIds)
        .eq('status', 'verified')
        .limit(50); // Bisa di-tweak atau di-randomize

    if (!participants || participants.length === 0) {
        return new Response(JSON.stringify({ message: "No active participants found." }), { headers: { 'Content-Type': 'application/json' } });
    }

    console.log(`Running backup scan for ${participants.length} participants...`);

    const recoveredDeposits = [];
    let processedCount = 0;

    // 3. Loop Scan Transaksi per User
    for (const p of participants) {
        try {
            const pubKey = new PublicKey(p.wallet_address);
            
            // Ambil 5 transaksi terakhir saja (asumsi cron jalan tiap 10-15 menit)
            const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 5 });

            for (const sigInfo of signatures) {
                if (sigInfo.err) continue; // Skip transaksi gagal

                const signature = sigInfo.signature;

                // A. Cek apakah Signature ini sudah ada di DB?
                const { data: existing } = await supabase
                    .from('deposit_logs')
                    .select('id')
                    .eq('signature', signature)
                    .eq('participant_id', p.id)
                    .single();

                // Jika SUDAH ADA, skip. (Berarti Webhook Helius berhasil menangkapnya)
                if (existing) continue;

                // B. Jika BELUM ADA, kita fetch detailnya (Recovery Mode)
                const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });

                if (!tx || !tx.meta || tx.meta.err) continue;

                // C. Parse Instruksi Transfer
                // Cari instruksi SystemProgram.transfer yang menuju ke wallet peserta
                let depositAmountLamports = 0;
                const instructions = tx.transaction.message.instructions;

                for (const ix of instructions) {
                    // Cek instruksi standard System Program
                    if ('program' in ix && ix.program === 'system') {
                         const parsed = (ix as any).parsed;
                         if (parsed.type === 'transfer') {
                             const info = parsed.info;
                             // Pastikan tujuannya adalah wallet peserta
                             if (info.destination === p.wallet_address) {
                                 depositAmountLamports += info.lamports;
                             }
                         }
                    }
                }

                const amountSOL = depositAmountLamports / LAMPORTS_PER_SOL;

                // D. Jika ada deposit valid yang terlewat, Simpan ke DB!
                if (amountSOL > 0) {
                    console.log(`✅ RECOVERED: ${amountSOL} SOL for ${p.wallet_address} (Sig: ${signature})`);
                    
                    // Catat ke log
                    const { error: insertError } = await supabase
                        .from('deposit_logs')
                        .insert({
                            participant_id: p.id,
                            wallet_address: p.wallet_address,
                            amount_sol: amountSOL,
                            signature: signature,
                            notes: 'Recovered by Deposit Watcher Backup' // Penanda bahwa ini hasil backup
                        });

                    if (!insertError) {
                        // Update Saldo Peserta
                        const newTotal = (p.total_deposit || 0) + amountSOL;
                        await supabase
                            .from('participants')
                            .update({ 
                                total_deposit: newTotal,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', p.id);
                        
                        recoveredDeposits.push({ user: p.id, amount: amountSOL, sig: signature });
                    } else {
                        console.error("DB Insert Error:", insertError);
                    }
                }
            }

            // Jeda sejenak untuk menghormati Rate Limit RPC
            processedCount++;
            await new Promise(r => setTimeout(r, 200)); 

        } catch (err) {
            console.error(`Error checking user ${p.wallet_address}:`, err);
        }
    }

    return new Response(JSON.stringify({ 
        success: true, 
        processed: processedCount, 
        recovered_count: recoveredDeposits.length,
        recovered_details: recoveredDeposits
    }), { 
        headers: { "Content-Type": "application/json" },
        status: 200 
    });

  } catch (err: any) {
    console.error("🔥 Watcher Fatal Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
})