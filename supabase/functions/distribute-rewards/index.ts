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
import { decode } from 'https://esm.sh/bs58@5.0.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SOLANA_RPC_URL = Deno.env.get('SOLANA_RPC_URL') ?? 'https://api.devnet.solana.com' 
const PAYOUT_WALLET_PRIVATE_KEY = Deno.env.get('PAYOUT_WALLET_PRIVATE_KEY') ?? ''

// Konfigurasi Pembagian Hadiah (Persentase)
// Juara 1: 50%, Juara 2: 30%, Juara 3: 20%
const REWARD_DISTRIBUTION = [0.50, 0.30, 0.20]; 

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  // Handle CORS Preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    // 1. Validasi Environment Variables
    if (!PAYOUT_WALLET_PRIVATE_KEY) {
      throw new Error('PAYOUT_WALLET_PRIVATE_KEY not configured in Supabase Secrets')
    }

    // 2. Setup Koneksi Solana & Wallet Admin
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
    
    // Decode Private Key (Base58 string -> Uint8Array)
    let adminKeypair: Keypair;
    try {
      const secretKey = decode(PAYOUT_WALLET_PRIVATE_KEY)
      adminKeypair = Keypair.fromSecretKey(secretKey)
    } catch (e) {
      throw new Error(`Failed to decode private key. Pastikan format Base58 benar. Error: ${e.message}`)
    }

    console.log(`🤖 Payout Bot Active. Wallet: ${adminKeypair.publicKey.toBase58()}`)

    // 3. Cari Room yang "pending" distribusi
    // Logic: end_time sudah lewat DAN distribution_status masih pending DAN ada reward
    const { data: rooms, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .lt('end_time', new Date().toISOString()) 
      .eq('distribution_status', 'pending')
      .gt('reward_token_amount', 0)
      .limit(5) // Batasi 5 room per eksekusi

    if (roomError) throw roomError
    
    if (!rooms || rooms.length === 0) {
      return new Response(JSON.stringify({ message: 'No rooms pending distribution' }), { 
        headers: { 'Content-Type': 'application/json' } 
      })
    }

    const results = []

    // 4. Loop setiap Room untuk proses pembayaran
    for (const room of rooms) {
      console.log(`Processing Room ID: ${room.id} | Reward: ${room.reward_token_amount} ${room.reward_token_symbol}`)
      
      // Update status jadi 'processing' agar tidak terambil oleh cron job lain secara bersamaan
      await supabase.from('rooms').update({ distribution_status: 'processing' }).eq('id', room.id)

      try {
        // Ambil Top 3 Peserta berdasarkan net_profit
        const { data: participants, error: partError } = await supabase
          .from('participants')
          .select('id, wallet_address, net_profit, user_id')
          .eq('room_id', room.id)
          .order('net_profit', { ascending: false })
          .limit(3)

        if (partError) throw partError
        
        // Jika tidak ada peserta, tandai gagal
        if (!participants || participants.length === 0) {
           await supabase.from('rooms').update({ 
             distribution_status: 'failed', 
             description: 'No participants found' 
           }).eq('id', room.id)
           continue;
        }

        // Siapkan Transaksi Solana
        const transaction = new Transaction()
        const totalReward = room.reward_token_amount || 0
        const winnersLog = []
        let instructionAdded = false

        // Loop peserta untuk bagi-bagi hadiah
        participants.forEach((participant, index) => {
          if (index >= REWARD_DISTRIBUTION.length) return 

          const sharePercentage = REWARD_DISTRIBUTION[index]
          const amountSOL = totalReward * sharePercentage
          // Konversi SOL ke Lamports (1 SOL = 1,000,000,000 Lamports)
          const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL)

          if (amountLamports > 0) {
            console.log(`Adding transfer: ${amountSOL} SOL to ${participant.wallet_address} (Rank ${index + 1})`)
            
            transaction.add(
              SystemProgram.transfer({
                fromPubkey: adminKeypair.publicKey,
                toPubkey: new PublicKey(participant.wallet_address),
                lamports: amountLamports,
              })
            )
            
            instructionAdded = true
            winnersLog.push({
              rank: index + 1,
              wallet: participant.wallet_address,
              amount: amountSOL,
              user_id: participant.user_id
            })
          }
        })

        if (instructionAdded) {
            // Kirim Transaksi
            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [adminKeypair]
            )

            console.log(`✅ Success! Tx Signature: ${signature}`)

            // Update Database: Sukses
            await supabase.from('rooms').update({
                distribution_status: 'distributed',
                distribution_tx_hash: signature,
                winners_info: winnersLog
            }).eq('id', room.id)

            results.push({ roomId: room.id, status: 'success', signature })
        } else {
             // Hadiah terlalu kecil atau error hitungan
             await supabase.from('rooms').update({ 
               distribution_status: 'failed_calc',
               description: 'Calculated amounts were zero'
             }).eq('id', room.id)
        }

      } catch (err) {
        console.error(`❌ Error processing room ${room.id}:`, err)
        // Kembalikan status ke pending (atau failed) agar bisa diretry manual
        await supabase.from('rooms').update({ 
            distribution_status: 'failed', 
            description: `Error: ${err.message}` 
        }).eq('id', room.id)
        
        results.push({ roomId: room.id, status: 'error', error: err.message })
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Critical Error:", error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    })
  }
})