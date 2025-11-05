// simple-402-server.ts
// ONLY returns 402 Payment Required - nothing else!

import express, { Request, Response } from 'express';
import { SolanaX402Server } from './server';

const app = express();
const PORT = 3000;

// Your wallet where you want to receive payments
const YOUR_WALLET = '8qEoLvRsumJpNCn7Q5PT19W5X5g62TKjCaMBDVBpu1hr';

// Initialize x402 server
const x402 = new SolanaX402Server({
  network: 'devnet',
  recipientAddress: YOUR_WALLET,
});

x402.initialize().then(() => console.log('✅ Ready\n'));

// This endpoint ONLY returns 402 - no payment handling!
app.get('/protected', async (req: Request, res: Response) => {
  // Create 402 response
  const payment402 = await x402.create402Response(0.01);
  
  // Return 402!
  res.status(402)
     .set(payment402.headers)
     .json(payment402.body);
});

app.listen(PORT, () => {
  console.log(`
🚀 Server running: http://localhost:${PORT}

Test it:
  Browser: http://localhost:${PORT}/protected
  curl: curl -v http://localhost:${PORT}/protected

Expected: 402 Payment Required with your wallet address
  `);
});