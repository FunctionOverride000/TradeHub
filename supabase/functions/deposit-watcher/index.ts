// [DEPRECATED]
// Fungsi ini dinonaktifkan karena tidak efisien untuk skala besar (sering timeout).
// Sekarang kita menggunakan Helius Webhook yang lebih cepat dan real-time.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("🚫 Deposit Watcher is disabled in favor of Helius Webhook.")

serve(async (req) => {
  return new Response(JSON.stringify({ 
    success: true,
    message: "This function is deprecated. System is now fully event-driven via Helius Webhooks." 
  }), { 
    headers: { "Content-Type": "application/json" },
    status: 200 
  })
})