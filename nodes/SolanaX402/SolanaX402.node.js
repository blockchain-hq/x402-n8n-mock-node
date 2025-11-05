"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaX402 = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const x402_server_sdk_1 = require("x402-server-sdk");
class SolanaX402 {
    constructor() {
        this.description = {
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
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        // Get credentials
        const credentials = await this.getCredentials('solanaX402Api');
        // Initialize server
        const server = new x402_server_sdk_1.SolanaX402Server({
            network: credentials.network,
            recipientAddress: credentials.recipientAddress,
            rpcUrl: credentials.rpcUrl || undefined,
        });
        // Initialize (load token accounts, etc.)
        try {
            await server.initialize();
        }
        catch (error) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to initialize x402 server: ${error.message}`);
        }
        // Process each input item
        for (let i = 0; i < items.length; i++) {
            try {
                const operation = this.getNodeParameter('operation', i);
                let responseData;
                if (operation === 'require402') {
                    // Return 402 Payment Required
                    const amount = this.getNodeParameter('amount', i);
                    const resourceId = this.getNodeParameter('resourceId', i, '');
                    responseData = await server.create402Response(amount, resourceId || undefined);
                }
                else if (operation === 'verifyPayment') {
                    // Verify Payment
                    const signature = this.getNodeParameter('signature', i);
                    const expectedAmount = this.getNodeParameter('expectedAmount', i);
                    const maxAge = this.getNodeParameter('maxAge', i, 300);
                    responseData = await server.verifyPayment(signature, expectedAmount, maxAge);
                }
                returnData.push({
                    json: responseData,
                    pairedItem: { item: i },
                });
            }
            catch (error) {
                // Error handling
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error.message,
                        },
                        pairedItem: { item: i },
                    });
                    continue;
                }
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), error.message, { itemIndex: i });
            }
        }
        return [returnData];
    }
}
exports.SolanaX402 = SolanaX402;
