import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Inisialisasi Supabase
// Pastikan menggunakan Service Role Key agar bisa akses data user (auth.admin)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// --- CONFIGURATION ---
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Security Check
  // Ini akan menggunakan secret yang "sudah ada dari lama" punya kamu.
  const webhookSecret = Deno.env.get("HELIUS_WEBHOOK_SECRET");
  const authHeader = req.headers.get("authorization");
  
  if (webhookSecret && authHeader !== webhookSecret) {
    console.error("⛔ Unauthorized webhook attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload = await req.json();

    if (!payload || !Array.isArray(payload)) {
        return new Response('Invalid payload', { status: 400 });
    }

    console.log(`📥 Webhook received: ${payload.length} transactions.`);

    for (const tx of payload) {
      if (tx.type === "TRANSFER" && tx.nativeTransfers) {
        
        for (const transfer of tx.nativeTransfers) {
          const recipient = transfer.toUserAccount;
          const amountSOL = transfer.amount / 1_000_000_000;
          const signature = tx.signature;

          // A. Cek Peserta
          const { data: participants } = await supabase
            .from('participants')
            .select('id, total_deposit, wallet_address, room_id, status, user_id')
            .eq('wallet_address', recipient)
            .eq('status', 'verified');

          if (participants && participants.length > 0) {
            for (const p of participants) {
              
              // B. Cek Duplikasi Log
              const { data: existing } = await supabase
                .from('deposit_logs')
                .select('id')
                .eq('signature', signature)
                .single();
              
              if (existing) continue;

              // C. Insert Log
              const { error: logError } = await supabase
                .from('deposit_logs')
                .insert({
                  participant_id: p.id,
                  wallet_address: recipient,
                  amount_sol: amountSOL,
                  signature: signature
                });

              if (!logError) {
                // Update Total Deposit
                const newTotalDeposit = (p.total_deposit || 0) + amountSOL;
                await supabase.from('participants').update({ total_deposit: newTotalDeposit }).eq('id', p.id);

                console.log(`✅ DEPOSIT CONFIRMED: ${amountSOL} SOL -> User ${recipient.substring(0,6)}...`);

                // D. SISTEM NOTIFIKASI
                if (p.room_id) {
                    // 1. Ambil Info Arena & ID Creator
                    const { data: arenaInfo } = await supabase
                        .from('arenas') // Pastikan nama tabel di DB kamu 'arenas' atau 'rooms'
                        .select('id, created_by, title') 
                        .eq('id', p.room_id)
                        .single();

                    if (arenaInfo && arenaInfo.created_by) {
                        const shortWallet = `${recipient.substring(0, 4)}...${recipient.substring(recipient.length - 4)}`;
                        const alertTitle = "🚨 Deposit Susulan Terdeteksi";
                        const alertMsg = `Peserta ${shortWallet} melakukan deposit sebesar ${amountSOL} SOL di arena "${arenaInfo.title}".`;
                        
                        // 2. Ambil Email Creator (Dinamis dari Auth Users)
                        const { data: userData } = await supabase.auth.admin.getUserById(arenaInfo.created_by);
                        const creatorEmail = userData?.user?.email;

                        // --- NOTIFIKASI 1: DATABASE (In-App untuk Creator) ---
                        await supabase.from('notifications').insert({
                            user_id: arenaInfo.created_by,
                            type: 'warning',
                            title: alertTitle,
                            message: `${alertMsg} Harap cek apakah ini mempengaruhi ROI peserta.`,
                            is_read: false,
                            metadata: { signature: signature, amount: amountSOL }
                        });

                        // --- NOTIFIKASI 2: TELEGRAM (Untuk SUPER ADMIN) ---
                        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
                            await sendTelegramAlert(alertTitle, alertMsg, signature, amountSOL, arenaInfo.title, creatorEmail || "Unknown");
                        }

                        // --- NOTIFIKASI 3: EMAIL (Personal ke CREATOR ARENA) ---
                        if (RESEND_API_KEY && creatorEmail) {
                            await sendEmailAlert(
                              creatorEmail, 
                              alertTitle, 
                              alertMsg, 
                              signature, 
                              amountSOL, 
                              arenaInfo.title
                            );
                        } else {
                          console.log("⚠️ Skip email: No Resend API Key or Creator Email not found");
                        }
                    }
                }
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

  } catch (err: any) {
    console.error("🔥 Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})

// --- HELPER FUNCTIONS ---

async function sendTelegramAlert(title: string, message: string, tx: string, amount: number, arena: string, creatorEmail: string) {
    const text = `
<b>${title}</b>
------------------------
<b>Arena:</b> ${arena}
<b>Creator:</b> ${creatorEmail}
<b>Amount:</b> ${amount} SOL
<b>Message:</b> ${message}
<b>TX:</b> <a href="https://solscan.io/tx/${tx}">Lihat di Solscan</a>
    `;

    try {
        await fetch(`https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: Deno.env.get('TELEGRAM_CHAT_ID'),
                text: text,
                parse_mode: 'HTML'
            })
        });
        console.log("✈️ Telegram Admin Alert Sent");
    } catch (e) {
        console.error("Failed to send Telegram:", e);
    }
}

async function sendEmailAlert(toEmail: string, title: string, message: string, tx: string, amount: number, arena: string) {
    const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f; margin-bottom: 20px;">${title}</h2>
        <p>Halo Creator,</p>
        <p>Sistem kami mendeteksi adanya deposit susulan (Top-up) pada arena kompetisi Anda.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Arena:</strong> ${arena}</p>
          <p style="margin: 5px 0;"><strong>Jumlah:</strong> ${amount} SOL</p>
          <p style="margin: 5px 0;"><strong>Pesan:</strong> ${message}</p>
        </div>

        <p>Mohon periksa Dashboard Arena Anda untuk memastikan hal ini tidak memanipulasi persentase ROI (Return on Investment) peserta.</p>
        
        <br/>
        <a href="https://solscan.io/tx/${tx}" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Cek Transaksi Blockchain</a>
    </div>
    `;

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: "TradeHub Alert <onboarding@resend.dev>", // Ganti dengan domain verified kamu nanti
                to: toEmail,
                subject: `[TradeHub Alert] Deposit Susulan di ${arena}`,
                html: html
            })
        });
        
        if (!res.ok) {
            const errData = await res.json();
            console.error("Resend API Error:", errData);
        } else {
            console.log(`✉️ Email alert sent to Creator: ${toEmail}`);
        }
    } catch (e) {
        console.error("Failed to send Email:", e);
    }
}