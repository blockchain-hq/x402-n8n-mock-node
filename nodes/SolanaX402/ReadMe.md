# n8n-nodes-solana-x402

n8n community node for Solana x402 payment protocol. Return HTTP 402 Payment Required responses for USDC payments on Solana.

[n8n](https://n8n.io/) is a workflow automation platform.

## Installation

### Community Nodes (Recommended)

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-solana-x402`
4. Click **Install**

### Manual Installation
```bash
npm install n8n-nodes-solana-x402
```

## Operations

### Return 402 Payment Required

Returns an HTTP 402 status with payment requirements for clients to pay in Solana USDC.

**Parameters:**
- **Amount (USDC)**: Amount required (e.g., 0.01 for 1 cent)
- **Resource ID**: Optional unique identifier

**Output:**
```json
{
  "statusCode": 402,
  "headers": {
    "Content-Type": "application/json",
    "WWW-Authenticate": "x402 version=\"1.0\""
  },
  "body": {
    "version": "1.0",
    "paymentOptions": [{
      "network": "devnet",
      "recipient": "YOUR_WALLET",
      "amount": "0.01"
    }]
  }
}
```

### Verify Payment

Verifies a Solana USDC payment transaction on-chain.

**Parameters:**
- **Transaction Signature**: Solana transaction signature
- **Expected Amount**: Amount to verify (USDC)
- **Max Age**: Maximum transaction age in seconds

**Output:**
```json
{
  "valid": true,
  "signature": "5VERv...",
  "amount": 0.01,
  "from": "PAYER_ADDRESS",
  "to": "RECIPIENT_ADDRESS"
}
```

## Credentials

### Solana x402 API

**Required fields:**
- **Network**: `devnet` or `mainnet-beta`
- **Recipient Address**: Your Solana wallet address to receive payments
- **RPC URL** (optional): Custom RPC endpoint

## Use Cases

- Monetize API endpoints
- Content paywalls
- Pay-per-use services
- Premium features

## Example Workflow

Webhook
↓
IF: Has X-Payment header?
→ No: Solana x402 (Return 402)
→ Yes: Solana x402 (Verify Payment)
↓
IF: Valid?
→ Yes: Serve content
→ No: Return 403

## Resources

- [x402 Protocol](https://x402.org/)
- [Solana Docs](https://docs.solana.com/)
- [GitHub Repository](https://github.com/YOUR_USERNAME/n8n-nodes-solana-x402)

## License

MIT

## Support

- [GitHub Issues](https://github.com/YOUR_USERNAME/n8n-nodes-solana-x402/issues)
- [n8n Community](https://community.n8n.io/)