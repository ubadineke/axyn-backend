import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Agent } from '../../agent/entities/agent.entity';

export enum MessageType {
    USER = 'user',
    AGENT = 'agent',
    PAYMENT = 'payment',
    ERROR = 'error',
    SYSTEM = 'system',
}

@Entity('conversation_messages')
export class ConversationMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { eager: false })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: number;

    @ManyToOne(() => Agent, { eager: false })
    @JoinColumn({ name: 'agent_id' })
    agent: Agent;

    @Column({ name: 'agent_id' })
    agentId: number;

    @Column({
        type: 'enum',
        enum: MessageType,
        default: MessageType.USER,
    })
    type: MessageType;

    @Column('text')
    content: string;

    @Column('decimal', { precision: 10, scale: 6, nullable: true, name: 'payment_amount' })
    paymentAmount?: number;

    @Column({ nullable: true, name: 'payment_signature' })
    paymentSignature?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column('jsonb', { nullable: true })
    metadata?: Record<string, any>;
}
