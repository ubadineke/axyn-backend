import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AgentService } from './agent.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) { }

  @Post()
  @UseGuards(AuthGuard)
  create(@Request() req, @Body() createAgentDto: CreateAgentDto) {
    const userId = req.user.sub;
    console.log('[AgentController] Creating agent for user:', userId);
    return this.agentService.create(userId, createAgentDto);
  }

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('isOnline') isOnline?: string,
  ) {
    console.log('[AgentController] Finding agents with filters:', {
      category,
      search,
      isOnline,
    });

    const filters: any = {};
    if (category) filters.category = category;
    if (search) filters.search = search;
    if (isOnline !== undefined) filters.isOnline = isOnline === 'true';

    return this.agentService.findAll(filters);
  }

  @Get('my-agents')
  @UseGuards(AuthGuard)
  findMyAgents(@Request() req) {
    const userId = req.user.sub;
    console.log('[AgentController] Finding agents for owner:', userId);
    return this.agentService.findByOwner(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    console.log('[AgentController] Finding agent by ID:', id);
    return this.agentService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    const userId = req.user.sub;
    console.log('[AgentController] Updating agent:', { id, userId });
    return this.agentService.update(+id, userId, updateAgentDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    console.log('[AgentController] Deleting agent:', { id, userId });
    return this.agentService.remove(+id, userId);
  }
}
