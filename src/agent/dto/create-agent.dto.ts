import {
    IsString,
    IsNumber,
    IsOptional,
    IsArray,
    IsBoolean,
    IsEnum,
    IsObject,
    MinLength,
    MaxLength,
    Min,
    Max,
    IsUrl,
    Matches,
} from 'class-validator';

export enum AgentCategory {
    CHAT = 'chat',
    AUDIO = 'audio',
    IMAGE = 'image',
    VIDEO = 'video',
    DATA = 'data',
    ANALYSIS = 'analysis',
    TRADING = 'trading',
    RESEARCH = 'research',
    AUTOMATION = 'automation',
    CRYPTO = 'crypto',
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

export enum RequestFormat {
    OPENAI_CHAT = 'openai-chat',
    SIMPLE_CHAT = 'simple-chat',
    FORM_DATA = 'form-data',
    CUSTOM_JSON = 'custom-json',
    TEXT_TO_IMAGE = 'text-to-image',
}

export enum ResponseFormat {
    OPENAI_CHAT = 'openai-chat',
    SIMPLE_TEXT = 'simple-text',
    JSON = 'json',
}

export class CreateAgentDto {
    @IsString()
    @MinLength(3)
    @MaxLength(255)
    name: string;

    @IsString()
    @MinLength(10)
    @MaxLength(2000)
    description: string;

    @IsEnum(AgentCategory)
    category: AgentCategory;

    @IsNumber()
    @Min(0.0001) // Support micro-payments
    @Max(1000)
    pricePerRequest: number;

    @IsString()
    @IsUrl({}, { message: 'API endpoint must be a valid URL' })
    @IsOptional()
    apiEndpoint?: string;

    @IsString()
    @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, {
        message: 'Invalid Solana wallet address',
    })
    walletAddress: string;

    @IsString()
    @IsOptional()
    iconUrl?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    @MaxLength(50, { each: true })
    tags?: string[];

    @IsString()
    @IsOptional()
    @MaxLength(1000)
    exampleInput?: string;

    @IsString()
    @IsOptional()
    @MaxLength(1000)
    exampleOutput?: string;

    @IsEnum(InterfaceType)
    @IsOptional()
    interfaceType?: InterfaceType;

    @IsBoolean()
    @IsOptional()
    isOnline?: boolean;

    // Metadata for agent configuration
    @IsObject()
    @IsOptional()
    metadata?: {
        // Request/Response formatting
        requestFormat?: RequestFormat;
        responseFormat?: ResponseFormat;
        httpMethod?: 'GET' | 'POST' | 'PUT';
        timeout?: number;

        // For chat agents (OpenAI, HuggingFace)
        model?: string;
        temperature?: number;
        maxTokens?: number;
        authToken?: string;

        // For audio agents
        acceptsAudio?: boolean;
        supportedFormats?: string[];
        fileFieldName?: string;
        endpointParams?: Array<{
            name: string;
            type: 'select' | 'text' | 'number';
            label?: string;
            default?: any;
            options?: Array<{ value: string; label: string }>;
            required?: boolean;
        }>;

        // For image agents
        acceptsImage?: boolean;
        imageSize?: string;
        quality?: string;
        style?: string;

        // For custom agents
        customHeaders?: Record<string, string>;
        requestBodyTemplate?: Record<string, any>;

        // Provider info
        provider?: string;
    };
}
