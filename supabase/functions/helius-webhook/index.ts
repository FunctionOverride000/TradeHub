import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Inisialisasi Supabase dengan Service Role Key agar bisa menembus RLS
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  try {
    const payload = await req.json();

    // Helius mengirim array transaksi dalam satu webhook call
    for (const tx of payload) {
      // Kita hanya memproses transfer SOL asli (bukan token/swap)
      if (tx.type === "TRANSFER" && tx.nativeTransfers) {
        for (const transfer of tx.nativeTransfers) {
          const recipient = transfer.toUserAccount;
          const amountSOL = transfer.amount / 1_000_000_000; // Lamports ke SOL
          const signature = tx.signature;

          // 1. Cari apakah recipient adalah peserta aktif di TradeHub
          const { data: participants } = await supabase
            .from('participants')
            .select('id, total_deposit, initial_balance, current_balance')
            .eq('wallet_address', recipient);

          if (participants && participants.length > 0) {
            for (const p of participants) {
              // 2. Catat ke log (Constraint UNIQUE pada 'signature' mencegah double counting)
              const { error: logError } = await supabase
                .from('deposit_logs')
                .insert({
                  participant_id: p.id,
                  wallet_address: recipient,
                  amount_sol: amountSOL,
                  signature: signature
                });

              // Jika log berhasil disimpan (bukan duplikat signature)
              if (!logError) {
                const newTotalDeposit = (p.total_deposit || 0) + amountSOL;
                
                // 3. Update total_deposit & hitung ulang net_profit untuk ranking
                const adjustedCurrent = p.current_balance - newTotalDeposit;
                const newNetProfit = p.initial_balance > 0 
                  ? ((adjustedCurrent - p.initial_balance) / p.initial_balance) * 100 
                  : 0;

                await supabase
                  .from('participants')
                  .update({ 
                    total_deposit: newTotalDeposit,
                    net_profit: newNetProfit 
                  })
                  .eq('id', p.id);

                console.log(`[ANTI-CHEAT] ${amountSOL} SOL ditambahkan ke deposit ${recipient}.`);
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ message: "Processed" }), { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
})