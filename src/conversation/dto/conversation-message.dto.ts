import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { MessageType } from '../entities/conversation-message.entity';

export class CreateConversationMessageDto {
    @IsNumber()
    @IsNotEmpty()
    agentId: number;

    @IsEnum(MessageType)
    type: MessageType;

    @IsString()
    @IsNotEmpty()
    content: string;

    @IsOptional()
    @IsNumber()
    paymentAmount?: number;

    @IsOptional()
    @IsString()
    paymentSignature?: string;

    @IsOptional()
    metadata?: Record<string, any>;
}

export class GetConversationMessagesDto {
    @IsNumber()
    @IsNotEmpty()
    agentId: number;

    @IsOptional()
    @IsNumber()
    limit?: number = 100;

    @IsOptional()
    @IsString()
    before?: string; // Message ID for pagination
}

export class ConversationMessageResponseDto {
    id: string;
    agentId: number;
    type: MessageType;
    content: string;
    paymentAmount?: number;
    paymentSignature?: string;
    createdAt: Date;
    metadata?: Record<string, any>;
}
