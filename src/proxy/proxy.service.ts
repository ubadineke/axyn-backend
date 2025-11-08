import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Agent } from '../agent/entities/agent.entity';
import { Transaction } from '../transaction/entities/transaction.entity';

@Injectable()
export class ProxyService {
    constructor(
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
    ) { }

    /**
     * Forward request to envoy's agent API
     */
    async proxyToAgent(agentId: number, payload: any): Promise<any> {
        console.log(`[ProxyService] Proxying request to agent ${agentId}`);

        // Fetch agent details
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ['owner'],
        });

        if (!agent) {
            throw new NotFoundException(`Agent with ID ${agentId} not found`);
        }

        if (!agent.isOnline) {
            throw new BadRequestException(`Agent ${agent.name} is currently offline`);
        }

        if (!agent.apiEndpoint) {
            throw new BadRequestException(`Agent ${agent.name} has no API endpoint configured`);
        }

        console.log(`[ProxyService] Agent found: ${agent.name} (${agent.apiEndpoint})`);
        console.log(`[ProxyService] Forwarding payload:`, payload);

        // Parse agent metadata for request formatting
        const metadata = typeof agent.metadata === 'string'
            ? JSON.parse(agent.metadata)
            : agent.metadata || {};

        console.log(`[ProxyService] Agent metadata:`, metadata);

        // Handle dynamic endpoint parameters (e.g., language selection)
        let finalEndpoint = agent.apiEndpoint;
        if (metadata.endpointParams && payload.metadata?.endpointParams) {
            // Replace placeholders like {language} with actual values
            for (const param of metadata.endpointParams) {
                const value = payload.metadata.endpointParams[param.name];
                if (value) {
                    finalEndpoint = finalEndpoint.replace(`{${param.name}}`, value);
                    console.log(`[ProxyService] Replaced {${param.name}} with ${value}`);
                } else if (param.default) {
                    finalEndpoint = finalEndpoint.replace(`{${param.name}}`, param.default);
                    console.log(`[ProxyService] Using default for {${param.name}}: ${param.default}`);
                }
            }
        } else if (metadata.endpointParams) {
            // If no params provided, use defaults
            for (const param of metadata.endpointParams) {
                if (param.default) {
                    finalEndpoint = finalEndpoint.replace(`{${param.name}}`, param.default);
                    console.log(`[ProxyService] Using default for {${param.name}}: ${param.default}`);
                }
            }
        }

        console.log(`[ProxyService] Final endpoint: ${finalEndpoint}`);

        try {
            // Prepare request based on metadata configuration
            const requestConfig: any = {
                method: metadata.httpMethod || 'POST',
                url: finalEndpoint,
                timeout: metadata.timeout || 60000,
                headers: {
                    'User-Agent': 'AxyN-Proxy/1.0',
                    ...metadata.headers,
                },
            };

            // Build request body based on agent's request format
            let requestBody: any;

            switch (metadata.requestFormat) {
                case 'openai-chat':
                    // OpenAI-compatible chat completion (e.g., HF Inference API, OpenAI)
                    requestBody = {
                        model: metadata.model,
                        messages: [
                            {
                                role: 'user',
                                content: payload.message || payload.text || payload.prompt || JSON.stringify(payload)
                            }
                        ],
                        max_tokens: payload.max_tokens || metadata.maxTokens || 2000,
                        temperature: payload.temperature || metadata.temperature || 0.7,
                    };
                    if (metadata.authToken || process.env.HF_TOKEN) {
                        requestConfig.headers['Authorization'] = `Bearer ${metadata.authToken || process.env.HF_TOKEN}`;
                    }
                    requestConfig.headers['Content-Type'] = 'application/json';
                    break;

                case 'simple-chat':
                    // Simple JSON chat format: { message: "user input" }
                    requestBody = {
                        message: payload.message || payload.text || payload.prompt,
                        ...(payload.conversationId && { conversationId: payload.conversationId }),
                        ...(payload.metadata && { metadata: payload.metadata }),
                    };
                    requestConfig.headers['Content-Type'] = 'application/json';
                    break;

                case 'custom-json':
                    // Fully custom JSON body (defined in metadata.requestBodyTemplate)
                    // Replace placeholders like {{message}} with actual values
                    const template = metadata.requestBodyTemplate || {};
                    requestBody = JSON.parse(
                        JSON.stringify(template).replace(/\{\{message\}\}/g, payload.message || payload.text || '')
                    );
                    requestConfig.headers['Content-Type'] = 'application/json';
                    break;

                case 'form-data':
                    // For file uploads (e.g., audio transcription)
                    const FormData = require('form-data');
                    const formData = new FormData();

                    console.log(`[ProxyService] Building form-data request`);
                    console.log(`[ProxyService] Has file: ${!!payload.file}`);
                    console.log(`[ProxyService] File size (base64): ${payload.file?.length || 0} chars`);
                    console.log(`[ProxyService] Filename: ${payload.filename}`);
                    console.log(`[ProxyService] Message: ${payload.message}`);

                    // Add fields from payload
                    if (payload.file) {
                        // If file is base64, convert to buffer
                        const fileBuffer = Buffer.from(payload.file, 'base64');
                        console.log(`[ProxyService] File buffer size: ${fileBuffer.length} bytes`);

                        // Append buffer directly - form-data handles this better than streams
                        const filename = payload.filename || 'audio.mp3';
                        const contentType = filename.endsWith('.mp3') ? 'audio/mpeg' :
                            filename.endsWith('.m4a') ? 'audio/mp4' :
                                filename.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';

                        // Use fileFieldName from metadata if specified, otherwise default to 'file'
                        const fileFieldName = metadata.fileFieldName || 'file';
                        formData.append(fileFieldName, fileBuffer, {
                            filename: filename,
                            contentType: contentType,
                        });
                        console.log(`[ProxyService] Appended file buffer to FormData field '${fileFieldName}' (${fileBuffer.length} bytes, ${contentType})`);
                    }
                    if (payload.message) {
                        formData.append('text', payload.message);
                        console.log(`[ProxyService] Appended text to FormData`);
                    }

                    requestBody = formData;
                    requestConfig.headers = {
                        ...requestConfig.headers,
                        ...formData.getHeaders(),
                    };
                    console.log(`[ProxyService] FormData headers:`, formData.getHeaders());
                    break;

                default:
                    // Fallback: pass payload as-is
                    console.log(`[ProxyService] No requestFormat specified, using generic POST`);
                    requestBody = {
                        message: payload.message || payload.text || payload.prompt,
                        ...payload,
                    };
                    requestConfig.headers['Content-Type'] = 'application/json';
            }

            requestConfig.data = requestBody;

            console.log(`[ProxyService] Sending ${requestConfig.method} request to ${requestConfig.url}`);
            // console.log(`[ProxyService] Request body:`, typeof requestBody === 'object' && !(requestBody instanceof Buffer) ? JSON.stringify(requestBody, null, 2) : '<binary data>');

            // Make the request
            const response = await axios(requestConfig);

            console.log(`[ProxyService] Agent responded with status ${response.status}`);
            console.log(`[ProxyService] Response data:`, typeof response.data === 'string' ? response.data.substring(0, 200) : response.data);

            // Format response based on metadata.responseFormat
            let agentResponse: any;

            switch (metadata.responseFormat) {
                case 'openai-chat':
                    // Extract message from OpenAI format
                    agentResponse = {
                        text: response.data?.choices?.[0]?.message?.content || response.data?.choices?.[0]?.text || JSON.stringify(response.data)
                    };
                    break;

                case 'simple-text':
                    // Response is plain text or has a 'text' field
                    agentResponse = {
                        text: typeof response.data === 'string' ? response.data : (response.data?.text || response.data?.message || JSON.stringify(response.data))
                    };
                    break;

                case 'json':
                default:
                    // Return full response as-is
                    agentResponse = response.data;
            }

            return {
                success: true,
                agentResponse,
                rawResponse: response.data,
                metadata: {
                    agentId: agent.id,
                    agentName: agent.name,
                    responseTime: new Date().toISOString(),
                },
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[ProxyService] Error proxying to agent:`, errorMessage);

            if (axios.isAxiosError(error)) {
                const status = error.response?.status ?? 502;
                const responseData = error.response?.data;

                let detail: string;
                if (typeof responseData === 'string') {
                    detail = responseData;
                } else if (responseData?.error) {
                    detail = responseData.error;
                } else if (responseData?.message) {
                    detail = responseData.message;
                } else {
                    detail = errorMessage;
                }

                throw new HttpException(
                    `Agent API error (${status}): ${detail}`,
                    status,
                );
            }

            throw new InternalServerErrorException('Failed to communicate with agent');
        }
    }

    /**
     * Record payment transaction (if not already recorded)
     */
    async recordTransaction(
        agentId: number,
        userId: number,
        amount: number,
        txSignature: string,
        userPrompt?: string,
        responseSummary?: string,
        activityType?: string,
    ): Promise<Transaction> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });

        if (!agent) {
            throw new NotFoundException(`Agent with ID ${agentId} not found`);
        }

        // Check if transaction already exists (payment verification may have recorded it)
        const existingTransaction = await this.transactionRepository.findOne({
            where: { signature: txSignature },
        });

        if (existingTransaction) {
            console.log(`[ProxyService] Transaction already recorded for signature ${txSignature}`);
            return existingTransaction;
        }

        // Determine activity type based on agent category if not provided
        let finalActivityType = activityType;
        if (!finalActivityType) {
            const category = agent.category?.toLowerCase() || '';
            if (category.includes('chat') || category.includes('conversation')) {
                finalActivityType = 'chat';
            } else if (category.includes('upload') || category.includes('file')) {
                finalActivityType = 'upload';
            } else if (category.includes('analysis') || category.includes('data')) {
                finalActivityType = 'analysis';
            } else {
                finalActivityType = 'query';
            }
        }

        const transactionData = {
            userId,
            agentId,
            amount,
            signature: txSignature,
            currency: 'USDC' as const,
            status: 'completed' as const,
            userPrompt: userPrompt || undefined,
            responseSummary: responseSummary || undefined,
            activityType: finalActivityType,
        };

        const transaction = this.transactionRepository.create(transactionData);

        return this.transactionRepository.save(transaction);
    }

    /**
     * Calculate platform fee (7-10% based on agent pricing tier)
     */
    calculatePlatformFee(amount: number): { platformFee: number; envoyAmount: number } {
        // Simple 10% fee for now (can be dynamic based on agent tier later)
        const feePercentage = 0.10;
        const platformFee = amount * feePercentage;
        const envoyAmount = amount - platformFee;

        return { platformFee, envoyAmount };
    }
}
