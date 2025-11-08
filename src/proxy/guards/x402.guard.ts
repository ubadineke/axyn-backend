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
import { PaymentVerificationService } from '../services/payment-verification.service';

/**
 * Custom x402 Payment Guard
 * 
 * This guard dynamically enforces payment based on each agent's pricePerRequest.
 * Implements industry-standard payment verification following x402 protocol best practices.
 * 
 * Flow:
 * 1. Extract agentId from route params
 * 2. Fetch agent from database to get pricePerRequest
 * 3. Check if request includes payment proof (X-Payment-Signature header)
 * 4. If no payment → return 402 with payment requirements
 * 5. If payment exists → verify on-chain using PaymentVerificationService
 * 6. Allow request to proceed if payment valid
 * 
 * Security Features:
 * - Nonce replay prevention
 * - Signature double-spend prevention
 * - On-chain transaction verification
 * - Amount validation with tolerance
 * - Recipient verification
 * - Token mint verification (USDC only)
 */
@Injectable()
export class X402Guard implements CanActivate {
    constructor(
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        private readonly configService: ConfigService,
        private readonly paymentVerificationService: PaymentVerificationService,
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

        // Get AxyN platform wallet (receives all payments, backend handles split to envoy)
        const platformWallet = this.configService.get<string>('PLATFORM_WALLET_ADDRESS');

        if (!platformWallet) {
            console.error(`[X402Guard] PLATFORM_WALLET_ADDRESS not configured in environment`);
            throw new UnauthorizedException('Platform wallet not configured');
        }

        const paymentRecipient = platformWallet;

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
            // Get network from config
            const network = this.configService.get<string>('SOLANA_NETWORK') || 'devnet';

            response.setHeader('X-Payment-Required', 'true');
            response.setHeader('X-Payment-Amount', priceInBaseUnits.toString());
            response.setHeader('X-Payment-Asset', 'USDC');
            response.setHeader('X-Payment-Network', network);
            response.setHeader('X-Payment-Recipient', paymentRecipient);
            response.setHeader('X-Payment-Nonce', nonce);
            response.setHeader('X-Payment-Resource', request.url);            // Return JSON response with payment details
            response.json({
                statusCode: 402,
                message: 'Payment Required',
                payment: {
                    amount: priceInBaseUnits,
                    asset: 'USDC',
                    network: network,
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

        // Payment proof exists → verify on-chain
        console.log(`[X402Guard] Payment signature provided for agent ${agentId}`);
        console.log(`[X402Guard] Signature: ${paymentSignature.substring(0, 20)}...`);
        console.log(`[X402Guard] Nonce: ${paymentNonce}`);

        // Extract userId from JWT (set by AuthGuard)
        const userId = (request as any).user?.sub;
        if (!userId) {
            throw new UnauthorizedException('User authentication required for payment verification');
        }

        // Verify payment on-chain using robust verification service
        const verificationResult = await this.paymentVerificationService.verifyPayment({
            signature: paymentSignature,
            nonce: paymentNonce,
            expectedAmount: priceInBaseUnits,
            userId: userId,
            agentId: agent.id,
        });

        if (!verificationResult.verified) {
            console.error(`[X402Guard] ❌ Payment verification failed: ${verificationResult.reason}`);
            throw new UnauthorizedException(
                `Payment verification failed: ${verificationResult.reason || 'Invalid payment'}`
            );
        }

        console.log(`[X402Guard] ✅ Payment verified on-chain - allowing request to proceed`);

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
     * Format: timestamp-random to ensure uniqueness and prevent replay attacks
     */
    private generateNonce(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }
}
