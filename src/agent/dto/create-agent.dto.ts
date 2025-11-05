import {
    IsString,
    IsNumber,
    IsOptional,
    IsArray,
    IsBoolean,
    IsEnum,
    MinLength,
    MaxLength,
    Min,
    Max,
} from 'class-validator';

export enum AgentCategory {
    CRYPTO = 'crypto',
    TRADING = 'trading',
    ANALYSIS = 'analysis',
    RESEARCH = 'research',
    AUTOMATION = 'automation',
    SOCIAL = 'social',
    GAMING = 'gaming',
    FINANCE = 'finance',
    OTHER = 'other',
}

export enum InterfaceType {
    CHAT = 'chat',
    SINGLE_QUERY = 'single-query',
    DATA = 'data',
}

export class CreateAgentDto {
    @IsString()
    @MinLength(3)
    @MaxLength(255)
    name: string;

    @IsString()
    @MinLength(10)
    description: string;

    @IsEnum(AgentCategory)
    category: AgentCategory;

    @IsNumber()
    @Min(0.01)
    @Max(1000)
    pricePerRequest: number;

    @IsString()
    @IsOptional()
    apiEndpoint?: string;

    @IsString()
    walletAddress: string;

    @IsString()
    @IsOptional()
    iconUrl?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    tags?: string[];

    @IsString()
    @IsOptional()
    exampleInput?: string;

    @IsString()
    @IsOptional()
    exampleOutput?: string;

    @IsEnum(InterfaceType)
    @IsOptional()
    interfaceType?: InterfaceType;

    @IsBoolean()
    @IsOptional()
    isOnline?: boolean;
}
