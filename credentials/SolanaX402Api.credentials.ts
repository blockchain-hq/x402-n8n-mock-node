import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class SolanaX402Api implements ICredentialType {
  name = 'solanaX402Api';
  displayName = 'Solana x402 API';
  documentationUrl = 'https://github.com/YOUR_USERNAME/n8n-nodes-solana-x402';
  
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