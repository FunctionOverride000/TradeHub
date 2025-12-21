// Data Alchemy dari Env Anda
const ALCHEMY_URL = '[https://solana-mainnet.g.alchemy.com/v2/5oY8dpug7Eee7SqmYRHxs](https://solana-mainnet.g.alchemy.com/v2/5oY8dpug7Eee7SqmYRHxs)';

export const getSolBalance = async (address: string) => {
  try {
    const response = await fetch(ALCHEMY_URL, {
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
    
    if (data.error) {
      console.error("Alchemy Error:", data.error);
      return 0;
    }

    // Convert Lamports to SOL (1 SOL = 1,000,000,000 Lamports)
    const lamports = data.result?.value || 0;
    return lamports / 1000000000;
  } catch (error) {
    console.error("Scanner Error:", error);
    return 0;
  }
};