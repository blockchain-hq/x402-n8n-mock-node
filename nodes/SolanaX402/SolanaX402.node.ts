import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
  } from 'n8n-workflow';
  
  import { SolanaX402Server } from 'x402-server-sdk';
  
  export class SolanaX402 implements INodeType {
    description: INodeTypeDescription = {
      displayName: 'Solana x402',
      name: 'solanaX402',
      icon: 'file:solana.svg',
      group: ['transform'],
      version: 1,
      subtitle: '={{$parameter["operation"]}}',
      description: 'Return HTTP 402 Payment Required for Solana USDC payments',
      defaults: {
        name: 'Solana x402',
      },
      inputs: ['main'],
      outputs: ['main'],
      credentials: [
        {
          name: 'solanaX402Api',
          required: true,
        },
      ],
      properties: [
        // Operation
        {
          displayName: 'Operation',
          name: 'operation',
          type: 'options',
          noDataExpression: true,
          options: [
            {
              name: 'Return 402 Payment Required',
              value: 'require402',
              description: 'Return HTTP 402 status with payment requirements',
              action: 'Return payment required response',
            },
            {
              name: 'Verify Payment',
              value: 'verifyPayment',
              description: 'Verify a Solana USDC payment transaction',
              action: 'Verify payment transaction',
            },
          ],
          default: 'require402',
        },
  
        // Fields for Return 402
        {
          displayName: 'Amount (USDC)',
          name: 'amount',
          type: 'number',
          required: true,
          displayOptions: {
            show: {
              operation: ['require402'],
            },
          },
          default: 0.01,
          description: 'Amount in USDC required to access the resource',
          typeOptions: {
            minValue: 0.001,
            numberPrecision: 6,
          },
        },
        {
          displayName: 'Resource ID',
          name: 'resourceId',
          type: 'string',
          displayOptions: {
            show: {
              operation: ['require402'],
            },
          },
          default: '',
          placeholder: 'premium-content-001',
          description: 'Optional unique identifier for the protected resource',
        },
  
        // Fields for Verify Payment
        {
          displayName: 'Transaction Signature',
          name: 'signature',
          type: 'string',
          required: true,
          displayOptions: {
            show: {
              operation: ['verifyPayment'],
            },
          },
          default: '',
          placeholder: '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW',
          description: 'Solana transaction signature to verify',
        },
        {
          displayName: 'Expected Amount (USDC)',
          name: 'expectedAmount',
          type: 'number',
          required: true,
          displayOptions: {
            show: {
              operation: ['verifyPayment'],
            },
          },
          default: 0.01,
          description: 'Expected payment amount in USDC',
          typeOptions: {
            minValue: 0.001,
            numberPrecision: 6,
          },
        },
        {
          displayName: 'Max Age (Seconds)',
          name: 'maxAge',
          type: 'number',
          displayOptions: {
            show: {
              operation: ['verifyPayment'],
            },
          },
          default: 300,
          description: 'Maximum age of transaction in seconds (prevents replay attacks)',
          typeOptions: {
            minValue: 60,
            maxValue: 3600,
          },
        },
      ],
    };
  
    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
      const items = this.getInputData();
      const returnData: INodeExecutionData[] = [];
  
      // Get credentials
      const credentials = await this.getCredentials('solanaX402Api');
      
      // Initialize server
      const server = new SolanaX402Server({
        network: credentials.network as 'devnet' | 'mainnet-beta',
        recipientAddress: credentials.recipientAddress as string,
        rpcUrl: credentials.rpcUrl as string || undefined,
      });
  
      // Initialize (load token accounts, etc.)
      try {
        await server.initialize();
      } catch (error) {
        throw new NodeOperationError(
          this.getNode(),
          `Failed to initialize x402 server: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
  
      // Process each input item
      for (let i = 0; i < items.length; i++) {
        try {
          const operation = this.getNodeParameter('operation', i) as string;
  
          let responseData: any;
  
          if (operation === 'require402') {
            // Return 402 Payment Required
            const amount = this.getNodeParameter('amount', i) as number;
            const resourceId = this.getNodeParameter('resourceId', i, '') as string;
            
            responseData = await server.create402Response(
              amount,
              resourceId || undefined
            );
  
          } else if (operation === 'verifyPayment') {
            // Verify Payment
            const signature = this.getNodeParameter('signature', i) as string;
            const expectedAmount = this.getNodeParameter('expectedAmount', i) as number;
            const maxAge = this.getNodeParameter('maxAge', i, 300) as number;
  
            responseData = await server.verifyPayment(
              signature,
              expectedAmount,
              maxAge
            );
          }
  
          returnData.push({
            json: responseData,
            pairedItem: { item: i },
          });
  
        } catch (error) {
          // Error handling
          if (this.continueOnFail()) {
            returnData.push({
              json: {
                error: error instanceof Error ? error.message : String(error),
              },
              pairedItem: { item: i },
            });
            continue;
          }
          throw new NodeOperationError(
            this.getNode(),
            error instanceof Error ? error.message : String(error),
            { itemIndex: i }
          );
        }
      }
  
      return [returnData];
    }
  }