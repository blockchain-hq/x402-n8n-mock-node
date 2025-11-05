export interface X402ServerConfig {
    network: 'devnet' | 'mainnet-beta';
    recipientAddress: string; // Your wallet to receive payments
    rpcUrl?: string;
    usdcMintAddress?: string;
  }
  
  export interface PaymentRequirements {
    version: string;
    paymentOptions: PaymentOption[];
  }
  
  export interface PaymentOption {
    id: string;
    scheme: 'solana';
    network: string;
    recipient: string;
    token: string;
    amount: string;
    decimals: number;
  }
  
  export interface PaymentVerification {
    valid: boolean;
    signature?: string;
    amount?: number;
    token?: string;
    from?: string;
    to?: string;
    timestamp?: number;
    error?: string;
  }
  
  export interface X402Response {
    statusCode: 402;
    headers: {
      'Content-Type': 'application/json';
      'WWW-Authenticate': string;
    };
    body: PaymentRequirements;
  }