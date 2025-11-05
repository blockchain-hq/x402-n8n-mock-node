import {
    Connection,
    PublicKey,
    ParsedTransactionWithMeta,
    PartiallyDecodedInstruction,
    ParsedInstruction,
  } from '@solana/web3.js';
  import {
    getAssociatedTokenAddress,
  } from '@solana/spl-token';
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
    USDC_DEVNET_MINT,
    USDC_MAINNET_MINT,
    USDC_DECIMALS,
    X402_VERSION,
  } from './constants';
  
  export class SolanaX402Server {
    private connection: Connection;
    private config: X402ServerConfig;
    private usdcMint: PublicKey;
    private recipientTokenAccount: PublicKey | null = null;
  
    constructor(config: X402ServerConfig) {
      this.config = config;
      
      // Set RPC URL
      const rpcUrl = config.rpcUrl || 
        (config.network === 'devnet' ? SOLANA_DEVNET_RPC : SOLANA_MAINNET_RPC);
      
      this.connection = new Connection(rpcUrl, 'confirmed');
      
      // Set USDC mint
      const defaultMint = config.network === 'devnet' 
        ? USDC_DEVNET_MINT 
        : USDC_MAINNET_MINT;
      
      this.usdcMint = new PublicKey(config.usdcMintAddress || defaultMint);
    }
  
    /**
     * Initialize the server - gets the recipient token account
     */
    async initialize(): Promise<void> {
      const recipient = new PublicKey(this.config.recipientAddress);
      this.recipientTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        recipient
      );
    }
  
    /**
     * Create payment requirements for HTTP 402 response
     * This is what you return when payment is required
     */
    async createPaymentRequirements(
      amount: number,
      resourceId?: string
    ): Promise<PaymentRequirements> {
      if (!this.recipientTokenAccount) {
        await this.initialize();
      }
  
      const paymentOption: PaymentOption = {
        id: resourceId || `payment-${Date.now()}`,
        scheme: 'solana',
        network: this.config.network,
        recipient: this.config.recipientAddress,
        token: this.usdcMint.toBase58(),
        amount: amount.toString(),
        decimals: USDC_DECIMALS,
      };
  
      return {
        version: X402_VERSION,
        paymentOptions: [paymentOption],
      };
    }
  
    /**
     * Create a proper HTTP 402 response
     */
    async create402Response(
      amount: number,
      resourceId?: string
    ): Promise<X402Response> {
      const requirements = await this.createPaymentRequirements(amount, resourceId);
      
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
     * Verify a payment from the X-PAYMENT header
     * This checks if the transaction is valid and paid the correct amount
     */
    async verifyPayment(
      signature: string,
      expectedAmount: number,
      maxAgeSeconds: number = 300 // 5 minutes
    ): Promise<PaymentVerification> {
      try {
        // Get transaction
        const tx = await this.connection.getParsedTransaction(signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        });
  
        if (!tx) {
          return {
            valid: false,
            error: 'Transaction not found',
          };
        }
  
        // Check if transaction was successful
        if (tx.meta?.err) {
          return {
            valid: false,
            error: 'Transaction failed',
          };
        }
  
        // Check transaction age
        const txTime = tx.blockTime;
        if (txTime) {
          const age = Date.now() / 1000 - txTime;
          if (age > maxAgeSeconds) {
            return {
              valid: false,
              error: `Transaction too old (${Math.floor(age)}s > ${maxAgeSeconds}s)`,
            };
          }
        }
  
        // Find the SPL token transfer instruction
        const transferInfo = this.findTokenTransfer(tx);
        
        if (!transferInfo) {
          return {
            valid: false,
            error: 'No token transfer found in transaction',
          };
        }
  
        // Verify recipient
        if (transferInfo.destination !== this.recipientTokenAccount?.toBase58()) {
          return {
            valid: false,
            error: 'Payment sent to wrong address',
          };
        }
  
        // Verify amount
        const actualAmount = transferInfo.amount / Math.pow(10, USDC_DECIMALS);
        const expectedAmountInSmallestUnit = expectedAmount * Math.pow(10, USDC_DECIMALS);
        
        if (transferInfo.amount < expectedAmountInSmallestUnit) {
          return {
            valid: false,
            error: `Insufficient payment amount: ${actualAmount} < ${expectedAmount}`,
          };
        }
  
        // Payment is valid!
        return {
          valid: true,
          signature,
          amount: actualAmount,
          token: 'USDC',
          from: transferInfo.source,
          to: transferInfo.destination,
          timestamp: txTime || undefined,
        };
  
      } catch (error: any) {
        return {
          valid: false,
          error: error.message || 'Unknown error during verification',
        };
      }
    }
  
    /**
     * Helper: Find token transfer in transaction
     */
    private findTokenTransfer(tx: ParsedTransactionWithMeta): {
      source: string;
      destination: string;
      amount: number;
    } | null {
      const instructions = tx.transaction.message.instructions;
  
      for (const instruction of instructions) {
        if ('parsed' in instruction && instruction.parsed) {
          const parsed = instruction.parsed;
          
          if (
            parsed.type === 'transfer' || 
            parsed.type === 'transferChecked'
          ) {
            return {
              source: parsed.info.source,
              destination: parsed.info.destination,
              amount: parsed.info.amount || parsed.info.tokenAmount?.amount,
            };
          }
        }
      }
  
      return null;
    }
  
    /**
     * Helper: Check if a signature has already been used (prevent replay attacks)
     * You should store used signatures in a database
     */
    async isSignatureUsed(signature: string): Promise<boolean> {
      // TODO: Implement database check
      // For now, just check if transaction exists
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
  }