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
}
