import {
    Controller,
    Post,
    Param,
    Body,
    UseGuards,
    Request,
    ParseIntPipe,
} from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { X402Guard } from './guards/x402.guard';
import { ProxyRequestDto } from './dto/proxy-request.dto';

@Controller('proxy')
export class ProxyController {
    constructor(private readonly proxyService: ProxyService) { }

    /**
     * Proxy endpoint with x402 payment protection
     * POST /proxy/agent/:agentId
     * 
     * Protected by:
     * - AuthGuard: Validates JWT token from mobile app
     * - X402Guard: Enforces payment based on agent's pricePerRequest
     * 
     * Flow:
     * 1. Client calls without payment → 402 response with payment details
     * 2. Client signs USDC payment on Solana, retries with proof in headers
     * 3. X402Guard verifies payment (signature + amount match agent price)
     * 4. If valid, request reaches this handler
     * 5. Backend proxies to envoy's agent API
     * 6. Backend records transaction and returns response
     */
    @Post('agent/:agentId')
    @UseGuards(AuthGuard, X402Guard)
    async proxyToAgent(
        @Param('agentId', ParseIntPipe) agentId: number,
        @Body() proxyRequestDto: ProxyRequestDto,
        @Request() req: any,
    ) {
        const userId = req.user.sub;
        const paymentInfo = req.x402Payment; // Attached by X402Guard

        console.log(`[ProxyController] User ${userId} requesting agent ${agentId}`);
        console.log(`[ProxyController] Payment:`, paymentInfo);

        // Forward request to agent
        const result = await this.proxyService.proxyToAgent(agentId, {
            message: proxyRequestDto.message,
            conversationId: proxyRequestDto.conversationId,
            metadata: proxyRequestDto.metadata,
        });

        // Record transaction with actual payment info from guard
        const transaction = await this.proxyService.recordTransaction(
            agentId,
            userId,
            paymentInfo.amount,
            paymentInfo.signature,
        );

        return {
            ...result,
            transaction: {
                id: transaction.id,
                amount: transaction.amount,
                signature: transaction.signature,
                recipient: paymentInfo.recipient,
            },
        };
    }
}
