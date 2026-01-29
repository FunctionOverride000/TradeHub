import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Inisialisasi Supabase dengan Service Role Key (Admin Access)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // 1. Validasi Method (Hanya terima POST)
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();

    // Helius mengirim array transaksi
    if (!payload || !Array.isArray(payload)) {
        return new Response('Invalid payload', { status: 400 });
    }

    console.log(`📥 Webhook received: ${payload.length} transactions processing...`);

    for (const tx of payload) {
      // Filter: Hanya proses transfer SOL asli (Native)
      if (tx.type === "TRANSFER" && tx.nativeTransfers) {
        
        for (const transfer of tx.nativeTransfers) {
          const recipient = transfer.toUserAccount;
          const amountSOL = transfer.amount / 1_000_000_000; // Konversi Lamports ke SOL
          const signature = tx.signature;

          // A. Cari apakah penerima dana adalah peserta lomba yang aktif (Verified)
          const { data: participants } = await supabase
            .from('participants')
            .select('id, total_deposit, initial_balance, current_balance, room_id, status')
            .eq('wallet_address', recipient)
            .eq('status', 'verified'); // Hanya yang sudah daftar resmi

          if (participants && participants.length > 0) {
            for (const p of participants) {
              
              // B. CEK DUPLIKASI (CRITICAL STEP)
              // Kita cek database: apakah signature ini SUDAH ADA di deposit_logs?
              const { data: existing } = await supabase
                .from('deposit_logs')
                .select('id')
                .eq('signature', signature)
                .single();
              
              // Jika sudah ada, STOP. Jangan proses lagi.
              if (existing) {
                  console.log(`⚠️ Duplicate detected: ${signature} for User ${p.id}. Skipping.`);
                  continue; 
              }

              // C. Catat ke Log Deposit
              const { error: logError } = await supabase
                .from('deposit_logs')
                .insert({
                  participant_id: p.id,
                  wallet_address: recipient,
                  amount_sol: amountSOL,
                  signature: signature
                });

              // D. Jika Log Berhasil Disimpan -> Update Total Deposit User
              if (!logError) {
                const newTotalDeposit = (p.total_deposit || 0) + amountSOL;
                
                await supabase
                  .from('participants')
                  .update({ 
                    total_deposit: newTotalDeposit,
                    // Kita tidak update net_profit di sini agar hemat resource database.
                    // Frontend akan menghitung net_profit secara real-time berdasarkan (Saldo Live - Total Deposit).
                  })
                  .eq('id', p.id);

                console.log(`✅ DEPOSIT CONFIRMED: ${amountSOL} SOL -> User ${recipient.substring(0,6)}...`);
              } else {
                console.error(`❌ DB Error Log Insert: ${logError.message}`);
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ message: "Processed successfully" }), { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    });

  } catch (err: any) {
    console.error("🔥 Webhook Fatal Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})