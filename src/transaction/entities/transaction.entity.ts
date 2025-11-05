import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Agent } from '../../agent/entities/agent.entity';

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    agentId: number;

    @ManyToOne(() => Agent)
    @JoinColumn({ name: 'agentId' })
    agent: Agent;

    @Column({ type: 'varchar', length: 255, unique: true })
    signature: string; // Solana transaction signature

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number; // Amount paid in USD

    @Column({ type: 'varchar', length: 50, default: 'USDC' })
    currency: string;

    @Column({ type: 'varchar', length: 20, default: 'completed' })
    status: string; // completed, pending, failed

    @Column({ type: 'text', nullable: true })
    metadata: string; // JSON string for additional data

    @CreateDateColumn()
    createdAt: Date;
}
