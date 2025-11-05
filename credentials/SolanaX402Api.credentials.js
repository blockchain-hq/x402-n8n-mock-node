"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaX402Api = void 0;
class SolanaX402Api {
    constructor() {
        this.name = 'solanaX402Api';
        this.displayName = 'Solana x402 API';
        this.documentationUrl = 'https://github.com/YOUR_USERNAME/n8n-nodes-solana-x402';
        this.properties = [
            {
                displayName: 'Network',
                name: 'network',
                type: 'options',
                options: [
                    {
                        name: 'Devnet',
                        value: 'devnet',
                    },
                    {
                        name: 'Mainnet',
                        value: 'mainnet-beta',
                    },
                ],
                default: 'devnet',
                description: 'Solana network to use for payment verification',
            },
            {
                displayName: 'Recipient Address',
                name: 'recipientAddress',
                type: 'string',
                default: '',
                required: true,
                placeholder: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
                description: 'Your Solana wallet address to receive USDC payments',
            },
            {
                displayName: 'RPC URL',
                name: 'rpcUrl',
                type: 'string',
                default: '',
                placeholder: 'https://api.devnet.solana.com',
                description: 'Optional custom RPC endpoint URL',
            },
        ];
    }
}
exports.SolanaX402Api = SolanaX402Api;
