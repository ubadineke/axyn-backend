import { IsString, IsNumber, IsOptional } from 'class-validator';

export class RecordTransactionDto {
    @IsNumber()
    agentId: number;

    @IsString()
    signature: string; // Solana transaction signature

    @IsNumber()
    amount: number;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsString()
    @IsOptional()
    metadata?: string;

    @IsString()
    @IsOptional()
    userPrompt?: string; // User's query/input

    @IsString()
    @IsOptional()
    responseSummary?: string; // Agent's response summary

    @IsString()
    @IsOptional()
    activityType?: string; // query, chat, upload, analysis, etc.
}
