import { IsOptional, IsString } from 'class-validator';

export class LoginDto {
    @IsString()
    authToken: string;

    @IsOptional()
    @IsString()
    walletAddress?: string;
}
