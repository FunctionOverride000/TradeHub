import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// --- KONFIGURASI XP ---
const REFERRAL_BONUS_XP = 150; // XP untuk yang mengundang
const REFEREE_BONUS_XP = 50;   // XP untuk yang diundang (opsional)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { userId, referralCode } = await req.json()

    if (!userId || !referralCode) {
      throw new Error('Missing parameters')
    }

    // 1. Cek apakah user sudah pernah di-refer (mencegah abuse)
    const { data: currentUserStats } = await supabase
      .from('user_stats')
      .select('referred_by')
      .eq('user_id', userId)
      .single()

    if (currentUserStats?.referred_by) {
      return new Response(JSON.stringify({ success: false, message: 'User already referred' }), { headers: { 'Content-Type': 'application/json' } })
    }

    // 2. Cari pemilik kode referral
    const { data: referrerStats } = await supabase
      .from('user_stats')
      .select('user_id, user_xp, total_referrals')
      .eq('referral_code', referralCode)
      .single()

    if (!referrerStats) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid referral code' }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (referrerStats.user_id === userId) {
      return new Response(JSON.stringify({ success: false, message: 'Cannot refer yourself' }), { headers: { 'Content-Type': 'application/json' } })
    }

    // 3. Update User yang DIUNDANG (Referee)
    // Set 'referred_by' dan beri sedikit XP bonus awal
    await supabase.from('user_stats').update({
      referred_by: referrerStats.user_id,
      user_xp: (currentUserStats?.user_xp || 0) + REFEREE_BONUS_XP
    }).eq('user_id', userId)

    // Log XP Referee
    await supabase.from('xp_logs').insert({
      user_id: userId,
      amount: REFEREE_BONUS_XP,
      xp_category: 'user',
      action_type: 'referral_redeemed',
      description: `Used code: ${referralCode}`
    })

    // 4. Update PENGUNDANG (Referrer)
    // Tambah Total Referral count dan XP
    const newReferrerXp = (referrerStats.user_xp || 0) + REFERRAL_BONUS_XP
    const newReferralCount = (referrerStats.total_referrals || 0) + 1
    
    // Hitung level baru referrer (rumus akar kuadrat standar)
    const newLevel = Math.floor(Math.sqrt(newReferrerXp / 100)) + 1

    await supabase.from('user_stats').update({
      user_xp: newReferrerXp,
      user_level: newLevel,
      total_referrals: newReferralCount
    }).eq('user_id', referrerStats.user_id)

    // Log XP Referrer
    await supabase.from('xp_logs').insert({
      user_id: referrerStats.user_id,
      amount: REFERRAL_BONUS_XP,
      xp_category: 'user',
      action_type: 'referral_bonus',
      source_id: userId, // ID teman yang diajak
      description: 'Friend joined via referral'
    })

    return new Response(JSON.stringify({ success: true, message: 'Referral applied successfully!' }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})