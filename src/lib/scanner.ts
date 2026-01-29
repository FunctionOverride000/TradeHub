// Mengambil URL dari Environment Variable (.env.local)
// Kita gunakan nama variabel yang sudah ada di file .env.local Anda: NEXT_PUBLIC_ALCHEMY_SOLANA_URL
const ALCHEMY_RPC_URL = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || 'https://api.mainnet-beta.solana.com';

export const getSolBalance = async (address: string) => {
  // Validasi input: Pastikan address ada
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
    
    // Cek error dari RPC Provider
    if (data.error) {
      console.error("RPC Error:", data.error);
      return 0;
    }

    // Konversi Lamports ke SOL (1 SOL = 1,000,000,000 Lamports)
    const lamports = data.result?.value || 0;
    return lamports / 1000000000;
  } catch (error) {
    console.error("Scanner Error (Network/Fetch):", error);
    return 0;
  }
};