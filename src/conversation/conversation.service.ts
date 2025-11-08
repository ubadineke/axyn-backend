import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConversationMessage } from './entities/conversation-message.entity';
import {
    CreateConversationMessageDto,
    GetConversationMessagesDto,
    ConversationMessageResponseDto,
} from './dto/conversation-message.dto';
import { User } from '../user/entities/user.entity';
import { Agent } from '../agent/entities/agent.entity';

@Injectable()
export class ConversationService {
    constructor(
        @InjectRepository(ConversationMessage)
        private readonly conversationRepo: Repository<ConversationMessage>,
        @InjectRepository(Agent)
        private readonly agentRepo: Repository<Agent>,
    ) { }

    /**
     * Save a conversation message to the database
     */
    async createMessage(
        user: User,
        dto: CreateConversationMessageDto,
    ): Promise<ConversationMessageResponseDto> {
        // Verify agent exists
        const agent = await this.agentRepo.findOne({ where: { id: dto.agentId } });
        if (!agent) {
            throw new NotFoundException(`Agent with ID ${dto.agentId} not found`);
        }

        const message = this.conversationRepo.create({
            userId: user.id,
            agentId: dto.agentId,
            type: dto.type,
            content: dto.content,
            paymentAmount: dto.paymentAmount,
            paymentSignature: dto.paymentSignature,
            metadata: dto.metadata,
        });

        const saved = await this.conversationRepo.save(message);

        return this.toResponseDto(saved);
    }

    /**
     * Get conversation history for a user with a specific agent
     */
    async getMessages(
        user: User,
        dto: GetConversationMessagesDto,
    ): Promise<ConversationMessageResponseDto[]> {
        const queryBuilder = this.conversationRepo
            .createQueryBuilder('message')
            .where('message.user_id = :userId', { userId: user.id })
            .andWhere('message.agent_id = :agentId', { agentId: dto.agentId })
            .orderBy('message.created_at', 'DESC')
            .limit(dto.limit || 100);

        // Pagination support
        if (dto.before) {
            const beforeMessage = await this.conversationRepo.findOne({
                where: { id: dto.before },
            });
            if (beforeMessage) {
                queryBuilder.andWhere('message.created_at < :beforeDate', {
                    beforeDate: beforeMessage.createdAt,
                });
            }
        }

        const messages = await queryBuilder.getMany();

        // Return in chronological order (oldest first)
        return messages.reverse().map((msg) => this.toResponseDto(msg));
    }

    /**
     * Get all conversations for a user (distinct agents with last message preview)
     */
    async getConversationList(user: User): Promise<any[]> {
        const conversations = await this.conversationRepo
            .createQueryBuilder('message')
            .select('message.agent_id', 'agentId')
            .addSelect('MAX(message.created_at)', 'lastMessageAt')
            .addSelect(
                `(
          SELECT content FROM conversation_messages 
          WHERE user_id = ${user.id} AND agent_id = message.agent_id
          ORDER BY created_at DESC LIMIT 1
        )`,
                'lastMessage',
            )
            .where('message.user_id = :userId', { userId: user.id })
            .groupBy('message.agent_id')
            .orderBy('lastMessageAt', 'DESC')
            .getRawMany();

        // Enrich with agent details
        const agentIds = conversations.map((c) => c.agentId);
        const agents = await this.agentRepo.findByIds(agentIds);
        const agentMap = new Map(agents.map((a) => [a.id, a]));

        return conversations.map((conv) => ({
            agentId: conv.agentId,
            agentName: agentMap.get(conv.agentId)?.name || 'Unknown Agent',
            lastMessage: conv.lastMessage,
            lastMessageAt: conv.lastMessageAt,
        }));
    }

    /**
     * Delete all messages in a conversation
     */
    async deleteConversation(user: User, agentId: number): Promise<void> {
        await this.conversationRepo.delete({
            userId: user.id,
            agentId: agentId,
        });
    }

    private toResponseDto(message: ConversationMessage): ConversationMessageResponseDto {
        return {
            id: message.id,
            agentId: message.agentId,
            type: message.type,
            content: message.content,
            paymentAmount: message.paymentAmount ? Number(message.paymentAmount) : undefined,
            paymentSignature: message.paymentSignature,
            createdAt: message.createdAt,
            metadata: message.metadata,
        };
    }
}
