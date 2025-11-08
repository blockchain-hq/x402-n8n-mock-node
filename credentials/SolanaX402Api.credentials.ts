import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class SolanaX402Api implements ICredentialType {
  name = 'pocketNodeApi';
  displayName = 'Pocket Node API';
  documentationUrl = 'https://github.com/blockchain-hq/x402-pocket-node-mock';
  
  properties: INodeProperties[] = [
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
      displayName: 'Wallet Address',
      name: 'walletAddress',
      type: 'string',
      default: '',
      required: false,
      placeholder: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
      description: 'Your Solana wallet address to receive USDC payments (will be auto-generated if not provided)',
    },
  ];
}