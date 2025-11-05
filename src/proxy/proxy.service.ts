import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Agent } from '../agent/entities/agent.entity';
import { Transaction } from '../transaction/entities/transaction.entity';

@Injectable()
export class ProxyService {
    constructor(
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
    ) { }

    /**
     * Forward request to envoy's agent API
     */
    async proxyToAgent(agentId: number, payload: any): Promise<any> {
        console.log(`[ProxyService] Proxying request to agent ${agentId}`);

        // Fetch agent details
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ['owner'],
        });

        if (!agent) {
            throw new NotFoundException(`Agent with ID ${agentId} not found`);
        }

        if (!agent.isOnline) {
            throw new BadRequestException(`Agent ${agent.name} is currently offline`);
        }

        if (!agent.apiEndpoint) {
            throw new BadRequestException(`Agent ${agent.name} has no API endpoint configured`);
        }

        console.log(`[ProxyService] Agent found: ${agent.name} (${agent.apiEndpoint})`);
        console.log(`[ProxyService] Forwarding payload:`, payload);

        try {
            // Forward request to envoy's API
            const response = await axios.post(agent.apiEndpoint, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'AxyN-Proxy/1.0',
                },
                timeout: 30000, // 30 second timeout
            });

            console.log(`[ProxyService] Agent responded with status ${response.status}`);

            return {
                success: true,
                agentResponse: response.data,
                metadata: {
                    agentId: agent.id,
                    agentName: agent.name,
                    responseTime: new Date().toISOString(),
                },
            };
        } catch (error) {
            console.error(`[ProxyService] Error proxying to agent:`, error.message);

            if (axios.isAxiosError(error)) {
                throw new BadRequestException(
                    `Agent API error: ${error.response?.data?.message || error.message}`
                );
            }

            throw new InternalServerErrorException('Failed to communicate with agent');
        }
    }

    /**
     * Record payment transaction
     */
    async recordTransaction(
        agentId: number,
        userId: number,
        amount: number,
        txSignature: string,
    ): Promise<Transaction> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });

        if (!agent) {
            throw new NotFoundException(`Agent with ID ${agentId} not found`);
        }

        const transaction = this.transactionRepository.create({
            userId,
            agentId,
            amount,
            signature: txSignature, // Field name is 'signature' in entity
            currency: 'USDC',
            status: 'completed',
        });

        return this.transactionRepository.save(transaction);
    }

    /**
     * Calculate platform fee (7-10% based on agent pricing tier)
     */
    calculatePlatformFee(amount: number): { platformFee: number; envoyAmount: number } {
        // Simple 10% fee for now (can be dynamic based on agent tier later)
        const feePercentage = 0.10;
        const platformFee = amount * feePercentage;
        const envoyAmount = amount - platformFee;

        return { platformFee, envoyAmount };
    }
}
