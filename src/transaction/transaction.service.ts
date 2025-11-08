import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { RecordTransactionDto } from './dto/record-transaction.dto';
import { AgentService } from '../agent/agent.service';

@Injectable()
export class TransactionService {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
        private readonly agentService: AgentService,
    ) { }

    /**
     * Record a transaction after payment is made
     * NOTE: In production, this should verify the transaction on-chain
     * For MVP, we trust the mobile app's signature
     */
    async recordTransaction(
        userId: number,
        dto: RecordTransactionDto,
    ): Promise<Transaction> {
        console.log('[TransactionService] Recording transaction:', {
            userId,
            agentId: dto.agentId,
            signature: dto.signature,
        });

        // Check if transaction already recorded (prevent duplicates)
        const existing = await this.transactionRepository.findOne({
            where: { signature: dto.signature },
        });

        if (existing) {
            console.log('[TransactionService] Transaction already recorded');
            return existing;
        }

        // Verify agent exists
        const agent = await this.agentService.findOne(dto.agentId);
        if (!agent) {
            throw new NotFoundException('Agent not found');
        }

        // Verify amount matches agent's price
        if (dto.amount !== agent.pricePerRequest) {
            throw new BadRequestException(
                `Payment amount ${dto.amount} does not match agent price ${agent.pricePerRequest}`,
            );
        }

        // Create transaction record
        const transaction = this.transactionRepository.create({
            userId,
            agentId: dto.agentId,
            signature: dto.signature,
            amount: dto.amount,
            currency: dto.currency || 'USDC',
            status: 'completed',
            metadata: dto.metadata,
            userPrompt: dto.userPrompt,
            responseSummary: dto.responseSummary,
            activityType: dto.activityType || 'query',
        });

        const saved = await this.transactionRepository.save(transaction);

        // Increment agent's job count
        await this.agentService.incrementJobCount(dto.agentId);

        console.log('[TransactionService] Transaction recorded successfully');
        return saved;
    }

    /**
     * Check if user has paid for an agent
     */
    async hasUserPaidAgent(userId: number, agentId: number): Promise<boolean> {
        const transaction = await this.transactionRepository.findOne({
            where: {
                userId,
                agentId,
                status: 'completed',
            },
        });

        return !!transaction;
    }

    /**
     * Get user's transaction history
     */
    async getUserTransactions(userId: number): Promise<Transaction[]> {
        return await this.transactionRepository.find({
            where: { userId },
            relations: ['agent'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get transactions for a specific agent (for analytics)
     */
    async getAgentTransactions(agentId: number): Promise<Transaction[]> {
        return await this.transactionRepository.find({
            where: { agentId },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get user's hired agents (agents they've paid for)
     */
    async getUserHiredAgents(userId: number): Promise<any[]> {
        const transactions = await this.transactionRepository
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.agent', 'agent')
            .where('transaction.userId = :userId', { userId })
            .andWhere('transaction.status = :status', { status: 'completed' })
            .select([
                'agent.id',
                'agent.name',
                'agent.description',
                'agent.category',
                'agent.pricePerRequest',
                'agent.rating',
                'agent.isOnline',
                'MAX(transaction.createdAt) as lastUsed',
                'COUNT(transaction.id) as timesHired',
                'SUM(transaction.amount) as totalSpent',
            ])
            .groupBy('agent.id')
            .addGroupBy('agent.name')
            .addGroupBy('agent.description')
            .addGroupBy('agent.category')
            .addGroupBy('agent.pricePerRequest')
            .addGroupBy('agent.rating')
            .addGroupBy('agent.isOnline')
            .orderBy('lastUsed', 'DESC')
            .getRawMany();

        // Transform raw results to proper structure
        return transactions.map((row) => ({
            id: row.agent_id,
            name: row.agent_name,
            description: row.agent_description,
            category: row.agent_category,
            price: parseFloat(row.agent_pricePerRequest) || 0,
            rating: parseFloat(row.agent_rating) || 0,
            status: row.agent_isOnline ? 'active' : 'offline',
            lastUsed: row.lastUsed ? new Date(row.lastUsed).toISOString() : new Date().toISOString(),
            usageCount: parseInt(row.timesHired, 10) || 0,
            totalSpent: parseFloat(row.totalSpent) || 0,
        }));
    }

    /**
     * Get user's detailed activity history with prompts and responses
     */
    async getActivityHistory(userId: number): Promise<any[]> {
        const transactions = await this.transactionRepository.find({
            where: { userId, status: 'completed' },
            relations: ['agent'],
            order: { createdAt: 'DESC' },
            take: 100, // Limit to last 100 activities
        });

        return transactions.map((tx) => ({
            id: tx.id,
            agentId: tx.agent.id,
            agentName: tx.agent.name,
            agentCategory: tx.agent.category,
            amount: parseFloat(tx.amount as any) || 0,
            currency: tx.currency,
            timestamp: tx.createdAt.toISOString(),
            activityType: tx.activityType || 'query',
            userPrompt: tx.userPrompt ? tx.userPrompt.substring(0, 100) + '...' : null, // Preview only
            hasFullHistory: !!tx.userPrompt,
            signature: tx.signature,
        }));
    }

    /**
     * Get detailed information for a specific activity/transaction
     */
    async getActivityDetail(userId: number, transactionId: number): Promise<any> {
        const transaction = await this.transactionRepository.findOne({
            where: { id: transactionId, userId },
            relations: ['agent'],
        });

        if (!transaction) {
            throw new NotFoundException('Activity not found');
        }

        return {
            id: transaction.id,
            agentId: transaction.agent.id,
            agentName: transaction.agent.name,
            agentDescription: transaction.agent.description,
            agentCategory: transaction.agent.category,
            amount: parseFloat(transaction.amount as any) || 0,
            currency: transaction.currency,
            timestamp: transaction.createdAt.toISOString(),
            activityType: transaction.activityType || 'query',
            userPrompt: transaction.userPrompt,
            responseSummary: transaction.responseSummary,
            signature: transaction.signature,
            metadata: transaction.metadata ? JSON.parse(transaction.metadata) : null,
        };
    }
}
