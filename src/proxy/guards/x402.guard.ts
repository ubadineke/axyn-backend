import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import { Agent } from '../../agent/entities/agent.entity';

/**
 * Custom x402 Payment Guard
 * 
 * This guard dynamically enforces payment based on each agent's pricePerRequest.
 * For MVP, it returns 402 with payment requirements but doesn't verify payments yet.
 * 
 * Flow:
 * 1. Extract agentId from route params
 * 2. Fetch agent from database to get pricePerRequest and walletAddress
 * 3. Check if request includes payment proof (X-Payment-Signature header)
 * 4. If no payment → return 402 with agent's payment details
 * 5. If payment exists → verify with Corbits facilitator (TODO: implement verification)
 * 6. Allow request to proceed if payment valid
 */
@Injectable()
export class X402Guard implements CanActivate {
    constructor(
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        private readonly configService: ConfigService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();

        // Extract agent ID from route params
        const agentId = parseInt(request.params.agentId, 10);
        if (!agentId || isNaN(agentId)) {
            throw new UnauthorizedException('Invalid agent ID');
        }

        // Fetch agent to get pricing
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ['owner'],
        });

        if (!agent) {
            throw new UnauthorizedException(`Agent ${agentId} not found`);
        }

        if (!agent.isOnline) {
            throw new UnauthorizedException(`Agent ${agent.name} is offline`);
        }

        // Get payment recipient (agent owner's wallet, not platform wallet)
        const paymentRecipient = agent.walletAddress;

        if (!paymentRecipient) {
            console.error(`[X402Guard] Agent ${agentId} has no wallet address configured`);
            throw new UnauthorizedException('Agent wallet not configured');
        }

        // Convert price to USDC base units (6 decimals)
        // Example: 0.001 USD = 1000 USDC base units
        const priceInBaseUnits = Math.floor(agent.pricePerRequest * 1_000_000);

        // Check for payment proof in headers
        const paymentSignature = request.headers['x-payment-signature'] as string;
        const paymentNonce = request.headers['x-payment-nonce'] as string;

        if (!paymentSignature || !paymentNonce) {
            // No payment provided → return 402 Payment Required
            console.log(`[X402Guard] No payment for agent ${agentId}, returning 402`);

            // Generate unique nonce for this payment request
            const nonce = this.generateNonce();

            // Set 402 status code
            response.status(402);

            // Set x402 payment headers
            response.setHeader('X-Payment-Required', 'true');
            response.setHeader('X-Payment-Amount', priceInBaseUnits.toString());
            response.setHeader('X-Payment-Asset', 'USDC');
            response.setHeader('X-Payment-Network', 'devnet'); // TODO: Switch to mainnet-beta
            response.setHeader('X-Payment-Recipient', paymentRecipient);
            response.setHeader('X-Payment-Nonce', nonce);
            response.setHeader('X-Payment-Resource', request.url);

            // Return JSON response with payment details
            response.json({
                statusCode: 402,
                message: 'Payment Required',
                payment: {
                    amount: priceInBaseUnits,
                    asset: 'USDC',
                    network: 'devnet',
                    recipient: paymentRecipient,
                    nonce,
                    resource: request.url,
                    description: `Access to ${agent.name}`,
                },
                agent: {
                    id: agent.id,
                    name: agent.name,
                    priceUSD: agent.pricePerRequest,
                },
            });

            return false; // Block request
        }

        // Payment proof exists → verify with Corbits facilitator
        console.log(`[X402Guard] Payment signature provided for agent ${agentId}`);
        console.log(`[X402Guard] Signature: ${paymentSignature.substring(0, 20)}...`);
        console.log(`[X402Guard] Nonce: ${paymentNonce}`);

        // Verify payment with Corbits facilitator
        const isPaymentValid = await this.verifyPaymentWithFacilitator({
            signature: paymentSignature,
            nonce: paymentNonce,
            amount: priceInBaseUnits,
            recipient: paymentRecipient,
            network: 'devnet', // TODO: Change to 'mainnet-beta' for production
        });

        if (!isPaymentValid) {
            throw new UnauthorizedException('Payment verification failed - invalid or insufficient payment');
        }

        console.log(`[X402Guard] ✅ Payment verified - allowing request to proceed`);

        // Attach payment info to request for controller to record transaction
        (request as any).x402Payment = {
            signature: paymentSignature,
            nonce: paymentNonce,
            amount: agent.pricePerRequest,
            agentId: agent.id,
            recipient: paymentRecipient,
        };

        return true; // Allow request to proceed
    }

    /**
     * Generate a unique nonce for payment requests
     */
    private generateNonce(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }

    /**
     * Verify payment with Corbits facilitator
     * 
     * Calls the facilitator's /verify endpoint to validate:
     * - Transaction exists on-chain
     * - Correct amount was paid
     * - Payment went to correct recipient
     * - Nonce hasn't been reused
     */
    private async verifyPaymentWithFacilitator(params: {
        signature: string;
        nonce: string;
        amount: number;
        recipient: string;
        network: string;
    }): Promise<boolean> {
        try {
            // Import axios dynamically (already installed)
            const axios = (await import('axios')).default;

            console.log(`[X402Guard] Verifying payment with Corbits facilitator`);
            console.log(`[X402Guard] Signature: ${params.signature}`);
            console.log(`[X402Guard] Amount: ${params.amount} base units`);
            console.log(`[X402Guard] Recipient: ${params.recipient}`);

            // Call Corbits facilitator /verify endpoint
            // Based on documentation, the facilitator verifies the transaction on-chain
            const response = await axios.post(
                'https://facilitator.corbits.dev/verify',
                {
                    network: params.network, // 'devnet' or 'mainnet-beta'
                    signature: params.signature,
                    nonce: params.nonce,
                    requirements: {
                        asset: 'USDC',
                        amount: params.amount.toString(),
                        payTo: params.recipient,
                    },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000, // 10 second timeout
                },
            );

            console.log(`[X402Guard] Facilitator response:`, response.data);

            // Check if verification was successful
            if (response.status === 200 && response.data.verified === true) {
                console.log(`[X402Guard] ✅ Payment verified successfully`);
                return true;
            }

            console.error(`[X402Guard] ❌ Payment verification failed:`, response.data);
            return false;
        } catch (error) {
            console.error(`[X402Guard] Error verifying payment with facilitator:`, error);

            // If facilitator is unreachable, we should fail secure (reject payment)
            // In production, you might want to implement retry logic or fallback
            return false;
        }
    }
}
