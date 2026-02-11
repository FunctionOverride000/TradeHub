// Mengambil URL dari Environment Variable (.env.local)
// Kita gunakan nama variabel yang sudah ada di file .env.local Anda: NEXT_PUBLIC_ALCHEMY_SOLANA_URL
// Fallback ke Public RPC jika env tidak ditemukan (Not Recommended for Production High Traffic)
const ALCHEMY_RPC_URL = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || 'https://api.mainnet-beta.solana.com';

/**
 * Mengambil saldo SOL dari alamat wallet tertentu.
 * Menggunakan koneksi HTTP JSON-RPC langsung (Fetch API) agar ringan.
 * * @param address Public Key Wallet (String)
 * @returns Saldo dalam SOL (Number)
 */
export const getSolBalance = async (address: string) => {
  // Validasi input: Pastikan address ada dan valid string
  if (!address) return 0;

  try {
    const response = await fetch(ALCHEMY_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address]
      })
    });

    const data = await response.json();
    
    // Cek error dari RPC Provider (misal Rate Limit atau Invalid Address)
    if (data.error) {
      console.warn("RPC Warning:", data.error.message);
      return 0;
    }

    // Konversi Lamports ke SOL (1 SOL = 1,000,000,000 Lamports)
    // data.result.value adalah saldo dalam Lamport
    const lamports = data.result?.value || 0;
    return lamports / 1_000_000_000;
    
  } catch (error) {
    // Error jaringan atau fetch gagal
    console.error("Scanner Error (Network/Fetch):", error);
    return 0; // Return 0 agar UI tidak crash, dianggap saldo 0
  }
};