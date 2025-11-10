/**
 * Pocket Node Mock - n8n Node
 * Mock server for HTTP 402 Payment Required using official x402 protocol
 */

import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

import { X402Server } from 'x402-server-sdk';
// @ts-ignore - generateWallet is available in linked local package
import { generateWallet } from 'x402-client-sdk';
// COMMENTED OUT: No longer needed since we don't fetch from HTTP URLs
// import * as https from 'https';
// import * as http from 'http';

/**
 * Helper function to fetch resource data from API
 * COMMENTED OUT: This node should not fetch from actual HTTP URLs to avoid behaving like an HTTP Node
 */
// async function fetchResourceFromApi(apiUrl: string): Promise<any> {
//   return new Promise((resolve, reject) => {
//     try {
//       const url = new URL(apiUrl);
//       
//       let request;
//       if (url.protocol === 'https:') {
//         // For HTTPS, ignore SSL certificate errors (for self-signed certs)
//         const options = {
//           hostname: url.hostname,
//           port: url.port || 443,
//           path: url.pathname + (url.search || ''),
//           method: 'GET',
//           rejectUnauthorized: false, // Ignore SSL certificate errors
//         };
//         request = https.request(options, (res) => {
//           let data = '';
//           
//           res.on('data', (chunk) => {
//             data += chunk;
//           });
//           
//           res.on('end', () => {
//             try {
//               if (!data) {
//                 reject(new Error('Empty response from API'));
//                 return;
//               }
//               
//               const json = JSON.parse(data);
//               resolve(json);
//             } catch (error) {
//               reject(new Error(`Failed to parse API response: ${error instanceof Error ? error.message : String(error)}`));
//             }
//           });
//         });
//       } else {
//         // For HTTP, use standard get
//         request = http.get(apiUrl, (res) => {
//           let data = '';
//           
//           res.on('data', (chunk) => {
//             data += chunk;
//           });
//           
//           res.on('end', () => {
//             try {
//               if (!data) {
//                 reject(new Error('Empty response from API'));
//                 return;
//               }
//               
//               const json = JSON.parse(data);
//               resolve(json);
//             } catch (error) {
//               reject(new Error(`Failed to parse API response: ${error instanceof Error ? error.message : String(error)}`));
//             }
//           });
//         });
//       }
//       
//       request.on('error', (error) => {
//         reject(new Error(`Failed to fetch from API: ${error.message}`));
//       });
//       
//       request.end();
//     } catch (error) {
//       reject(new Error(`Invalid API URL: ${error instanceof Error ? error.message : String(error)}`));
//     }
//   });
// }

export class PocketNodeMock implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Pocket node Mock',
    name: 'PocketNodeMock',
    icon: 'file:pocket.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Mock server for HTTP 402 Payment Required (x402 protocol)',
    defaults: {
      name: 'Pocket Node Mock',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'pocketNodeApi',
        required: false,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Return 402',
            value: 'return402',
            description: 'Return HTTP 402 Payment Required response',
            action: 'Return 402 payment required',
          },
          {
            name: 'Verify Payment',
            value: 'verifyPayment',
            description: 'Verify a payment signature',
            action: 'Verify a payment signature',
          },
        ],
        default: 'return402',
      },

      // Return 402 fields
      {
        displayName: 'Resource URL',
        name: 'resource',
        type: 'string',
        default: '/api/resource',
        required: false,
        displayOptions: {
          show: {
            operation: ['return402'],
          },
        },
        description: 'Path of the resource (e.g., /api/resource). Note: This node does not accept full HTTP URLs to avoid behaving like an HTTP Node.',
      },
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        default: 'Premium content access',
        required: false,
        displayOptions: {
          show: {
            operation: ['return402'],
          },
        },
        description: 'Human-readable description of the resource',
      },
      {
        displayName: 'Amount (USDC)',
        name: 'amount',
        type: 'string',
        default: '0.01',
        required: false,
        displayOptions: {
          show: {
            operation: ['return402'],
          },
        },
        description: 'Amount required in USDC (e.g., 0.01 for 1 cent)',
      },
      {
        displayName: 'MIME Type',
        name: 'mimeType',
        type: 'string',
        default: 'application/json',
        required: false,
        displayOptions: {
          show: {
            operation: ['return402'],
          },
        },
        description: 'MIME type of the resource response',
      },
      {
        displayName: 'Timeout (seconds)',
        name: 'timeout',
        type: 'number',
        default: 60,
        required: false,
        displayOptions: {
          show: {
            operation: ['return402'],
          },
        },
        description: 'Maximum timeout in seconds',
      },

      // Verify Payment fields
      {
        displayName: 'Transaction Signature',
        name: 'signature',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['verifyPayment'],
          },
        },
        description: 'Solana transaction signature to verify',
        placeholder: '5VERv8NMvzbJMEkV...',
      },
      {
        displayName: 'Expected Amount (USDC)',
        name: 'expectedAmount',
        type: 'string',
        default: '0.01',
        required: true,
        displayOptions: {
          show: {
            operation: ['verifyPayment'],
          },
        },
        description: 'Expected payment amount in USDC',
      },
      {
        displayName: 'Wallet Address (Optional)',
        name: 'walletAddress',
        type: 'string',
        default: '',
        required: false,
        displayOptions: {
          show: {
            operation: ['return402', 'verifyPayment'],
          },
        },
        description: 'Optional: Override wallet address. If not provided, wallet will be auto-generated randomly.',
        placeholder: 'Leave empty to auto-generate',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    // Get credentials (optional)
    let credentials: any = null;
    let network: 'devnet' | 'mainnet-beta' = 'devnet';
    try {
      credentials = await this.getCredentials('pocketNodeApi');
      network = (credentials?.network as 'devnet' | 'mainnet-beta') || 'devnet';
    } catch (error) {
      // Credentials not provided - use defaults
      network = 'devnet';
    }

    for (let i = 0; i < items.length; i++) {
      try {
        // Get recipient address for this item (node parameter > credential > API > generate)
        let recipientAddress: string;
        const nodeWalletAddress = this.getNodeParameter('walletAddress', i, '') as string;
        
        if (nodeWalletAddress) {
          // Use node parameter if provided (allows per-item override)
          recipientAddress = nodeWalletAddress;
        } else if (credentials?.walletAddress) {
          // Use credential wallet as default
          recipientAddress = credentials.walletAddress as string;
        } else {
          // Will generate wallet later if not found in API
          recipientAddress = '';
        }

        if (operation === 'return402') {
          // Get resource URL - check if it's a full URL or just a path
          const resourceInput = this.getNodeParameter('resource', i, '/api/resource') as string;
          
          let resource: string;
          let description: string;
          let amount: string;
          let mimeType: string;
          let timeout: number;

          // COMMENTED OUT: Check if resource is a valid URL (starts with http:// or https://)
          // This node should not fetch from actual HTTP URLs to avoid behaving like an HTTP Node
          // const isUrl = resourceInput && (resourceInput.startsWith('http://') || resourceInput.startsWith('https://'));
          
          // if (isUrl) {
          //   // Fetch data from API first
          //   try {
          //     const apiData = await fetchResourceFromApi(resourceInput);
          //     
          //     // Extract data from API response (support 402 response format with accepts or paymentOptions)
          //     if (apiData.accepts && Array.isArray(apiData.accepts) && apiData.accepts.length > 0) {
          //       // Extract from accepts array (x402 response format)
          //       const accept = apiData.accepts[0];
          //       resource = accept.resource || apiData.resource || resourceInput;
          //       description = accept.description || apiData.description || 'Premium content access';
          //       // Convert maxAmountRequired from smallest units to USDC (divide by 1,000,000)
          //       const amountInSmallestUnits = accept.maxAmountRequired || apiData.maxAmountRequired || '10000';
          //       amount = (parseFloat(amountInSmallestUnits) / 1_000_000).toString();
          //       mimeType = accept.mimeType || apiData.mimeType || apiData.contentType || 'application/json';
          //       timeout = accept.maxTimeoutSeconds || apiData.maxTimeoutSeconds || apiData.timeout || 60;
          //       
          //       // Override wallet with the one from API if provided (MUST use API wallet)
          //       if (accept.payTo || accept.recipient) {
          //         recipientAddress = accept.payTo || accept.recipient;
          //         console.log(`✅ Using wallet from API: ${recipientAddress}`);
          //       } else {
          //         console.warn('⚠️ API response does not contain payTo or recipient in accepts[0]');
          //       }
          //       
          //       console.log(`📥 Extracted from API: resource="${resource}", description="${description}", amount=${amount} USDC, wallet=${recipientAddress}`);
          //     } else if (apiData.paymentOptions && Array.isArray(apiData.paymentOptions) && apiData.paymentOptions.length > 0) {
          //       // Extract from paymentOptions (alternative 402 response format)
          //       const paymentOption = apiData.paymentOptions[0];
          //       resource = apiData.resource || paymentOption.resource || resourceInput;
          //       description = apiData.description || paymentOption.description || 'Premium content access';
          //       amount = paymentOption.amount || apiData.amount || apiData.price || '0.01';
          //       mimeType = apiData.mimeType || paymentOption.mimeType || apiData.contentType || 'application/json';
          //       timeout = apiData.timeout || paymentOption.timeout || apiData.timeoutSeconds || paymentOption.maxTimeoutSeconds || 60;
          //       
          //       // Override wallet with the one from API if provided
          //       if (paymentOption.recipient || paymentOption.payTo) {
          //         recipientAddress = paymentOption.recipient || paymentOption.payTo;
          //       }
          //     } else {
          //       // Extract from direct JSON fields (non-402 format)
          //       resource = apiData.resource || apiData.path || resourceInput;
          //       description = apiData.description || apiData.desc || 'Premium content access';
          //       amount = apiData.amount || apiData.price || '0.01';
          //       mimeType = apiData.mimeType || apiData.contentType || 'application/json';
          //       timeout = apiData.timeout || apiData.timeoutSeconds || 60;
          //       
          //       // Override wallet if provided in API response
          //       if (apiData.recipient || apiData.payTo || apiData.wallet) {
          //         recipientAddress = apiData.recipient || apiData.payTo || apiData.wallet;
          //       }
          //     }
          //   } catch (error) {
          //     throw new NodeOperationError(
          //       this.getNode(),
          //       `Failed to fetch data from API: ${error instanceof Error ? error.message : String(error)}`,
          //       { itemIndex: i }
          //     );
          //   }
          // } else {
            // Use node parameters (resource is just a path or empty - use defaults)
            resource = resourceInput || '/api/resource';
            description = this.getNodeParameter('description', i, 'Premium content access') as string;
            amount = this.getNodeParameter('amount', i, '0.01') as string;
            mimeType = this.getNodeParameter('mimeType', i, 'application/json') as string;
            timeout = this.getNodeParameter('timeout', i, 60) as number;
          // }

          // Generate wallet if still not set (after checking API)
          if (!recipientAddress) {
            const generatedWallet = generateWallet(network);
            recipientAddress = generatedWallet.address;
            console.log(`💰 Generated wallet for ${network}: ${recipientAddress}`);
          }

          // Initialize x402 server with final recipient address (may have been updated from API)
          const server = new X402Server({
            recipientAddress,
            network,
          });

          const response = server.create402Response({
            resource,
            description,
            amount,
            mimeType,
            timeout,
          });

          returnData.push({
            json: {
              statusCode: 402,
              ...response,
            },
            pairedItem: { item: i },
          });

        } else if (operation === 'verifyPayment') {
          // Generate wallet if still not set
          if (!recipientAddress) {
            const generatedWallet = generateWallet(network);
            recipientAddress = generatedWallet.address;
            console.log(`💰 Generated wallet for ${network}: ${recipientAddress}`);
          }

          // Initialize x402 server for verification
          const server = new X402Server({
            recipientAddress,
            network,
          });

          // Verify payment
          const signature = this.getNodeParameter('signature', i) as string;
          const expectedAmount = this.getNodeParameter('expectedAmount', i) as string;

          const verification = await server.verifyPayment(signature, expectedAmount);

          returnData.push({
            json: {
              verified: verification.valid,
              signature,
              amount: verification.amount,
              from: verification.from,
              to: verification.to,
              error: verification.error,
            },
            pairedItem: { item: i },
          });
        }

      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            pairedItem: { item: i },
          });
          continue;
        }
        throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
      }
    }

    return [returnData];
  }
}
