import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('agents')
export class Agent {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'varchar', length: 100 })
    category: string;

    @Column({ type: 'decimal', precision: 10, scale: 6 })
    pricePerRequest: number;

    @Column({ type: 'varchar', length: 500, nullable: true })
    apiEndpoint: string;

    @Column({ type: 'varchar', length: 255 })
    walletAddress: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    iconUrl: string;

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
    rating: number;

    @Column({ type: 'int', default: 0 })
    totalJobs: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    uptime: number;

    @Column({ type: 'boolean', default: true })
    isOnline: boolean;

    @Column({ type: 'simple-array', nullable: true })
    tags: string[];

    @Column({ type: 'text', nullable: true })
    exampleInput: string;

    @Column({ type: 'text', nullable: true })
    exampleOutput: string;

    @Column({ type: 'varchar', length: 50, default: 'chat' })
    interfaceType: string; // 'chat', 'single-query', 'data'

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>; // Provider-specific config (model, requestFormat, etc.)

    @Column({ type: 'int' })
    ownerId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ownerId' })
    owner: User;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
