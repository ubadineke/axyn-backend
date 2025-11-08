import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import {
    CreateConversationMessageDto,
    GetConversationMessagesDto,
    ConversationMessageResponseDto,
} from './dto/conversation-message.dto';

@Controller('conversations')
@UseGuards(AuthGuard)
export class ConversationController {
    constructor(private readonly conversationService: ConversationService) { }

    /**
     * POST /conversations/messages
     * Save a new message to conversation history
     */
    @Post('messages')
    async createMessage(
        @Request() req,
        @Body() dto: CreateConversationMessageDto,
    ): Promise<ConversationMessageResponseDto> {
        return this.conversationService.createMessage(req.user, dto);
    }

    /**
     * GET /conversations/:agentId/messages
     * Get conversation history with a specific agent
     */
    @Get(':agentId/messages')
    async getMessages(
        @Request() req,
        @Param('agentId') agentId: string,
        @Query('limit') limit?: number,
        @Query('before') before?: string,
    ): Promise<ConversationMessageResponseDto[]> {
        const dto: GetConversationMessagesDto = {
            agentId: Number(agentId),
            limit: limit ? Number(limit) : 100,
            before,
        };
        return this.conversationService.getMessages(req.user, dto);
    }

    /**
     * GET /conversations
     * Get list of all conversations (agents user has talked to)
     */
    @Get()
    async getConversationList(@Request() req) {
        return this.conversationService.getConversationList(req.user);
    }

    /**
     * DELETE /conversations/:agentId
     * Delete conversation history with a specific agent
     */
    @Delete(':agentId')
    async deleteConversation(@Request() req, @Param('agentId') agentId: string) {
        await this.conversationService.deleteConversation(req.user, Number(agentId));
        return { success: true, message: 'Conversation deleted' };
    }
}
