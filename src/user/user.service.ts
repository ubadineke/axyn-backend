import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { Agent } from '../agent/entities/agent.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
  ) { }

  async findByPrivyUserId(privyUserId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { privyUserId } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async create(userData: {
    privyUserId: string;
    walletAddress: string;
    email?: string;
    name?: string;
    loginMethod?: string;
    phoneNumber?: string;
    twitterUsername?: string;
    discordUsername?: string;
    googleEmail?: string;
  }): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async update(
    id: number,
    updateData: Partial<{
      email: string;
      name: string;
      walletAddress: string;
      bio: string;
      avatarUrl: string;
      loginMethod: string;
      phoneNumber: string;
      twitterUsername: string;
      discordUsername: string;
      googleEmail: string;
    }>,
  ): Promise<User | null> {
    await this.userRepository.update(id, updateData);
    return this.findById(id);
  }

  /**
   * Calculate and update user statistics
   * - totalAgentsHired: count of unique agents the user has paid for
   * - totalSpent: sum of all transaction amounts by user
   * - totalAgentsListed: count of agents owned by user
   * - totalEarned: sum of all transaction amounts for user's agents
   */
  async updateUserStats(userId: number): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      return;
    }

    // Calculate hiring stats (as a buyer)
    const hiredAgentsResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('COUNT(DISTINCT transaction.agentId)', 'count')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.status = :status', { status: 'completed' })
      .getRawOne();

    const totalSpentResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('COALESCE(SUM(transaction.amount), 0)', 'total')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.status = :status', { status: 'completed' })
      .getRawOne();

    // Calculate listing stats (as an agent owner/envoy)
    const listedAgentsCount = await this.agentRepository.count({
      where: { ownerId: userId },
    });

    const earnedResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.agent', 'agent')
      .select('COALESCE(SUM(transaction.amount), 0)', 'total')
      .where('agent.ownerId = :userId', { userId })
      .andWhere('transaction.status = :status', { status: 'completed' })
      .getRawOne();

    // Update user with calculated stats
    await this.userRepository.update(userId, {
      totalAgentsHired: parseInt(hiredAgentsResult?.count || '0'),
      totalSpent: parseFloat(totalSpentResult?.total || '0'),
      totalAgentsListed: listedAgentsCount,
      totalEarned: parseFloat(earnedResult?.total || '0'),
    });
  }

  /**
   * Increment totalAgentsHired when user hires a new agent
   */
  async incrementAgentsHired(userId: number): Promise<void> {
    await this.userRepository.increment({ id: userId }, 'totalAgentsHired', 1);
  }

  /**
   * Increment totalAgentsListed when user creates a new agent
   */
  async incrementAgentsListed(userId: number): Promise<void> {
    await this.userRepository.increment({ id: userId }, 'totalAgentsListed', 1);
  }
}
