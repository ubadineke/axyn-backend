import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { Agent } from './entities/agent.entity';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
  ) { }

  async create(ownerId: number, createAgentDto: CreateAgentDto): Promise<Agent> {
    const agent = this.agentRepository.create({
      ...createAgentDto,
      ownerId,
      rating: 0,
      totalJobs: 0,
      uptime: 100,
    });

    console.log('[AgentService] Creating agent:', {
      name: agent.name,
      ownerId: agent.ownerId,
    });

    return await this.agentRepository.save(agent);
  }

  async findAll(filters?: {
    category?: string;
    search?: string;
    isOnline?: boolean;
  }): Promise<Agent[]> {
    const where: any = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.isOnline !== undefined) {
      where.isOnline = filters.isOnline;
    }

    let query = this.agentRepository.find({ where, order: { createdAt: 'DESC' } });

    const agents = await query;

    // Filter by search in-memory if needed (or use SQL LIKE for better performance)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      return agents.filter(
        (agent) =>
          agent.name.toLowerCase().includes(searchLower) ||
          agent.description.toLowerCase().includes(searchLower),
      );
    }

    return agents;
  }

  async findOne(id: number): Promise<Agent> {
    const agent = await this.agentRepository.findOne({ where: { id } });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    return agent;
  }

  async findByOwner(ownerId: number): Promise<Agent[]> {
    return await this.agentRepository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: number,
    ownerId: number,
    updateAgentDto: UpdateAgentDto,
  ): Promise<Agent> {
    const agent = await this.findOne(id);

    if (agent.ownerId !== ownerId) {
      throw new ForbiddenException('You can only update your own agents');
    }

    Object.assign(agent, updateAgentDto);

    console.log('[AgentService] Updating agent:', { id, ownerId });

    return await this.agentRepository.save(agent);
  }

  async remove(id: number, ownerId: number): Promise<void> {
    const agent = await this.findOne(id);

    if (agent.ownerId !== ownerId) {
      throw new ForbiddenException('You can only delete your own agents');
    }

    console.log('[AgentService] Deleting agent:', { id, ownerId });

    await this.agentRepository.remove(agent);
  }

  async incrementJobCount(id: number): Promise<void> {
    await this.agentRepository.increment({ id }, 'totalJobs', 1);
  }

  // TODO: Add health check service to ping agent's apiEndpoint
  // and automatically update isOnline status
  async checkAgentHealth(id: number): Promise<boolean> {
    // This will ping the agent's API endpoint to see if it's responsive
    // For now, just a placeholder
    return true;
  }
}
