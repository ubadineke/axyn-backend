import { IsString, IsOptional, IsObject } from 'class-validator';

export class ProxyRequestDto {
    @IsString()
    message: string;

    @IsOptional()
    @IsString()
    conversationId?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;

    @IsOptional()
    @IsString()
    file?: string; // Base64-encoded file data

    @IsOptional()
    @IsString()
    filename?: string; // Original filename
}
