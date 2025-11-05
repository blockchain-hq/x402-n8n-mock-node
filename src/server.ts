// x402-server-sdk/src/server.ts - Updated for SOL

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  X402ServerConfig,
  PaymentRequirements,
  PaymentOption,
  PaymentVerification,
  X402Response,
} from './types';
import {
  SOLANA_DEVNET_RPC,
  SOLANA_MAINNET_RPC,
  SOL_DECIMALS,
  X402_VERSION,
} from './constants';

export class SolanaX402Server {
  private connection: Connection;
  private config: X402ServerConfig;

  constructor(config: X402ServerConfig) {
    this.config = config;
    
    // Set RPC URL
    const rpcUrl = config.rpcUrl || 
      (config.network === 'devnet' ? SOLANA_DEVNET_RPC : SOLANA_MAINNET_RPC);
    
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Initialize the server (simplified for SOL - no token accounts needed)
   */
  async initialize(): Promise<void> {
    // Verify recipient address is valid
    try {
      new PublicKey(this.config.recipientAddress);
      console.log('✅ Server initialized with recipient:', this.config.recipientAddress);
    } catch (error) {
      throw new Error('Invalid recipient address');
    }
  }

  /**
   * Create payment requirements for HTTP 402 response (SOL)
   */
  async createPaymentRequirements(
    amountInSol: number,
    resourceId?: string
  ): Promise<PaymentRequirements> {
    const paymentOption: PaymentOption = {
      id: resourceId || `sol-${Date.now()}`,
      scheme: 'solana',
      network: this.config.network,
      recipient: this.config.recipientAddress,
      token: 'native', // 'native' means SOL payment
      amount: amountInSol.toString(),
      decimals: SOL_DECIMALS,
    };

    return {
      version: X402_VERSION,
      paymentOptions: [paymentOption],
    };
  }

  /**
   * Create a proper HTTP 402 response (SOL)
   */
  async create402Response(
    amountInSol: number,
    resourceId?: string
  ): Promise<X402Response> {
    const requirements = await this.createPaymentRequirements(amountInSol, resourceId);
    
    return {
      statusCode: 402,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `x402 version="${X402_VERSION}"`,
      },
      body: requirements,
    };
  }

  /**
   * Verify a SOL payment transaction
   */
  async verifyPayment(
    signature: string,
    expectedAmountSol: number,
    maxAgeSeconds: number = 300
  ): Promise<PaymentVerification> {
    try {
      // Get transaction
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return {
          valid: false,
          error: 'Transaction not found',
        };
      }

      // Check transaction age
      const now = Math.floor(Date.now() / 1000);
      const txTime = tx.blockTime || 0;
      const age = now - txTime;

      if (age > maxAgeSeconds) {
        return {
          valid: false,
          error: `Transaction too old: ${age}s (max ${maxAgeSeconds}s)`,
        };
      }

      // Check if transaction succeeded
      if (tx.meta?.err) {
        return {
          valid: false,
          error: 'Transaction failed',
        };
      }

      // For SOL transfers, check the account balance changes
      const recipientPubkey = new PublicKey(this.config.recipientAddress);
      
      // Get pre and post balances
      const accountKeys = tx.transaction.message.getAccountKeys();
      const recipientIndex = accountKeys.staticAccountKeys.findIndex(
        (key) => key.equals(recipientPubkey)
      );

      if (recipientIndex === -1) {
        return {
          valid: false,
          error: 'Recipient not found in transaction',
        };
      }

      const preBalance = tx.meta?.preBalances[recipientIndex] || 0;
      const postBalance = tx.meta?.postBalances[recipientIndex] || 0;
      const receivedLamports = postBalance - preBalance;
      const receivedSol = receivedLamports / LAMPORTS_PER_SOL;

      // Check amount (allow small tolerance for rounding)
      const tolerance = 0.0001;

      if (Math.abs(receivedSol - expectedAmountSol) > tolerance) {
        return {
          valid: false,
          error: `Amount mismatch: expected ${expectedAmountSol} SOL, got ${receivedSol} SOL`,
        };
      }

      // Find sender (first signer)
      const senderPubkey = accountKeys.staticAccountKeys[0];

      return {
        valid: true,
        signature,
        amount: receivedSol,
        token: 'SOL',
        from: senderPubkey.toBase58(),
        to: this.config.recipientAddress,
        timestamp: txTime,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: `Verification failed: ${error.message}`,
      };
    }
  }

  /**
   * Helper: Check if a signature has already been used (prevent replay attacks)
   */
  async isSignatureUsed(signature: string): Promise<boolean> {
    // TODO: Implement database check
    const tx = await this.connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    return tx !== null;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(signature: string): Promise<{
    confirmed: boolean;
    finalized: boolean;
  }> {
    const confirmedTx = await this.connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    const finalizedTx = await this.connection.getTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
    });

    return {
      confirmed: confirmedTx !== null,
      finalized: finalizedTx !== null,
    };
  }

  /**
   * Check recipient SOL balance
   */
  async getRecipientBalance(): Promise<number> {
    const pubkey = new PublicKey(this.config.recipientAddress);
    const balance = await this.connection.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
  }
}