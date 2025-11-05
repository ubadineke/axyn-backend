import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  privyUserId: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  email?: string;

  @Column()
  walletAddress: string;

  // Profile fields
  @Column({ nullable: true })
  bio?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  // Login method tracking (google, twitter, discord, email, phone)
  @Column({ nullable: true })
  loginMethod?: string;

  // Additional identity fields from different login methods
  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  twitterUsername?: string;

  @Column({ nullable: true })
  discordUsername?: string;

  @Column({ nullable: true })
  googleEmail?: string;

  // Agent hiring statistics
  @Column({ type: 'int', default: 0 })
  totalAgentsHired: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalSpent: number;

  // Agent listing statistics (for users who list agents)
  @Column({ type: 'int', default: 0 })
  totalAgentsListed: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalEarned: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
