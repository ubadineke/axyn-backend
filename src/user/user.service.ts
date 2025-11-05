import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
}
