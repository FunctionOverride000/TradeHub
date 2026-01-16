// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from 'https://esm.sh/@solana/web3.js@1.77.3'

// --- KONFIGURASI ---
// Pastikan Anda sudah set env var ini: npx supabase secrets set HELIUS_API_KEY=... atau ALCHEMY
// Default fallback ke mainnet public jika tidak ada env var (tapi rawan rate limit)
const RPC_URL = Deno.env.get('ALCHEMY_SOLANA_URL') || 'https://api.mainnet-beta.solana.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const connection = new Connection(RPC_URL, 'confirmed')

// Helper untuk delay agar tidak kena Rate Limit RPC
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

console.log("👮 Deposit Watcher dimulai...")

Deno.serve(async (req) => {
  try {
    // 1. Ambil semua peserta yang statusnya 'verified' di room yang aktif
    // Kita join dengan tabel rooms untuk cek tanggal
    const now = new Date().toISOString()
    
    const { data: activeParticipants, error } = await supabase
      .from('participants')
      .select(`
        id,
        wallet_address,
        room_id,
        rooms!inner (
          id,
          end_time
        )
      `)
      .eq('status', 'verified')
      .gt('rooms.end_time', now) // Hanya room yang belum berakhir

    if (error) throw error
    
    console.log(`🔍 Memeriksa ${activeParticipants?.length || 0} peserta aktif...`)

    let detectedCount = 0

    if (activeParticipants && activeParticipants.length > 0) {
      // 2. Loop setiap peserta
      for (const participant of activeParticipants) {
        const walletPubkey = new PublicKey(participant.wallet_address)
        
        // Ambil 5-10 transaksi terakhir (cukup untuk cron 5 menitan)
        // Limit kecil agar proses cepat & hemat RPC credits
        const signatures = await connection.getSignaturesForAddress(walletPubkey, { limit: 10 })
        
        for (const sigInfo of signatures) {
          // Cek apakah signature ini sudah tercatat di deposit_logs?
          // Kita cek database dulu biar hemat request ke RPC Solana (Parse Transaction mahal)
          const { data: existingLog } = await supabase
            .from('deposit_logs')
            .select('id')
            .eq('signature', sigInfo.signature)
            .single()

          // Jika sudah ada, skip (berarti sudah diproses sebelumnya)
          if (existingLog) continue;

          // Jika belum ada, kita bedah transaksinya
          // Fetch detail transaksi
          const tx = await connection.getParsedTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0
          })

          if (!tx || !tx.meta) continue

          // --- LOGIKA DETEKSI DEPOSIT ---
          // Kita mencari instruksi "SystemProgram: Transfer" dimana:
          // 1. Destination adalah wallet peserta
          // 2. Source BUKAN wallet peserta (berarti uang masuk dari luar)
          
          let isDeposit = false
          let depositAmount = 0

          // Cek Native Balance Change (Perubahan Saldo SOL)
          // preBalances & postBalances array indexnya sesuai accountKeys
          const accountIndex = tx.transaction.message.accountKeys.findIndex(
            (key: any) => key.pubkey.toString() === participant.wallet_address
          )

          if (accountIndex === -1) continue

          const preBalance = tx.meta.preBalances[accountIndex]
          const postBalance = tx.meta.postBalances[accountIndex]
          const balanceChange = postBalance - preBalance

          // Jika saldo BERTAMBAH (> 5000 lamports untuk toleransi debu/rent)
          if (balanceChange > 5000) {
            
            // Sekarang kita pastikan ini BUKAN hasil swap.
            // Ciri khas transfer murni: Program utamanya adalah 'system' dan type 'transfer'
            
            const instructions = tx.transaction.message.instructions
            const isSystemTransfer = instructions.some((inst: any) => {
              // Cek parsed instruction standard
              if (inst.program === 'system' && inst.parsed?.type === 'transfer') {
                const info = inst.parsed.info
                return info.destination === participant.wallet_address
              }
              return false
            })

            // Jika ini System Transfer (masuk)
            if (isSystemTransfer) {
               isDeposit = true
               depositAmount = balanceChange / LAMPORTS_PER_SOL
            }
          }

          // --- AKSI JIKA TERBUKTI DEPOSIT ---
          if (isDeposit && depositAmount > 0) {
            console.log(`🚨 DEPOSIT TERDETEKSI! User: ${participant.wallet_address} | Amount: ${depositAmount} SOL`)
            
            // Panggil RPC database yang sudah kita buat
            const { error: rpcError } = await supabase.rpc('register_deposit', {
               p_wallet_address: participant.wallet_address,
               p_amount: depositAmount,
               p_signature: sigInfo.signature,
               p_room_id: participant.room_id
            })

            if (rpcError) {
              console.error("Gagal mencatat deposit:", rpcError)
            } else {
              detectedCount++
            }
          }
        }
        
        // Istirahat 200ms antar user agar tidak kena limit RPC
        await delay(200)
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Pemeriksaan selesai. ${detectedCount} deposit baru ditemukan.` 
    }), { headers: { "Content-Type": "application/json" } })

  } catch (error: any) {
    console.error("Error Watcher:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})