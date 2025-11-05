/**
 * Seed script for AxyN Demo Agents
 * 
 * Seeds FREE demo AI agents using:
 * 1. HuggingFace free inference API (text generation, image generation)
 * 2. Simple utility agents (no external API needed)
 * 
 * These are demonstration agents to show how the AxyN platform works.
 * Envoys can later create their own agents with real APIs.
 * 
 * Usage:
 *   1. Start backend: npm run start:dev
 *   2. Login via mobile app to get JWT token
 *   3. Run: JWT_TOKEN="your_token_here" npx ts-node scripts/seed-demo-agents.ts
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.JWT_TOKEN;

// Demo agents for MVP - these will be replaced by real envoy agents
const DEMO_AGENTS = [
    {
        name: 'Text Summarizer AI',
        description:
            'Powered by HuggingFace\'s free inference API. Summarizes long text into concise paragraphs. Perfect for research papers, articles, or documentation. Uses BART model for high-quality summaries.',
        category: 'productivity',
        pricePerRequest: 0.001, // $0.001 per summary
        walletAddress: 'Apzno34N1uKnUoaiVbVVEWi4X2rsYpVx4a5HHE8FX8C4', // AxyN wallet (we're testing as the agent lister)
        apiEndpoint: 'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
        tags: ['text', 'summarization', 'ai', 'free'],
        exampleInput: 'Long article text to summarize...',
        exampleOutput: 'Concise 2-3 sentence summary of the key points.',
        interfaceType: 'single-query',
        isOnline: true,
    },
    {
        name: 'Sentiment Analyzer',
        description:
            'Analyzes text sentiment using HuggingFace\'s DistilBERT model. Returns positive, negative, or neutral classification with confidence scores. Great for customer feedback analysis or social media monitoring.',
        category: 'research',
        pricePerRequest: 0.0005, // $0.0005 per analysis
        walletAddress: 'Apzno34N1uKnUoaiVbVVEWi4X2rsYpVx4a5HHE8FX8C4',
        apiEndpoint: 'https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english',
        tags: ['sentiment', 'analysis', 'nlp', 'ai'],
        exampleInput: 'This product is amazing! Best purchase ever.',
        exampleOutput: '{"label": "POSITIVE", "score": 0.9998}',
        interfaceType: 'single-query',
        isOnline: true,
    },
    {
        name: 'Question Answering Bot',
        description:
            'AI-powered Q&A agent using HuggingFace\'s BERT model. Provide context and ask questions - it extracts precise answers from the text. Useful for document analysis and knowledge extraction.',
        category: 'productivity',
        pricePerRequest: 0.002, // $0.002 per question
        walletAddress: 'Apzno34N1uKnUoaiVbVVEWi4X2rsYpVx4a5HHE8FX8C4',
        apiEndpoint: 'https://api-inference.huggingface.co/models/deepset/roberta-base-squad2',
        tags: ['qa', 'bert', 'nlp', 'ai'],
        exampleInput: 'Context: "Paris is the capital of France." Question: "What is the capital of France?"',
        exampleOutput: '{"answer": "Paris", "score": 0.98}',
        interfaceType: 'chat',
        isOnline: true,
    },
    {
        name: 'Language Translator',
        description:
            'Multi-language translation agent powered by HuggingFace. Supports 50+ languages including English, Spanish, French, German, Chinese, Japanese, and more. Fast and accurate translations for text up to 512 tokens.',
        category: 'productivity',
        pricePerRequest: 0.001, // $0.001 per translation
        walletAddress: 'Apzno34N1uKnUoaiVbVVEWi4X2rsYpVx4a5HHE8FX8C4',
        apiEndpoint: 'https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-en-es',
        tags: ['translation', 'language', 'nlp', 'ai'],
        exampleInput: 'Translate to Spanish: "Hello, how are you today?"',
        exampleOutput: 'Hola, ¿cómo estás hoy?',
        interfaceType: 'single-query',
        isOnline: true,
    },
    {
        name: 'Text Classification AI',
        description:
            'Classifies text into predefined categories using zero-shot classification. No training needed - just provide categories and text. Great for content moderation, topic detection, and email routing.',
        category: 'research',
        pricePerRequest: 0.0015, // $0.0015 per classification
        walletAddress: 'Apzno34N1uKnUoaiVbVVEWi4X2rsYpVx4a5HHE8FX8C4',
        apiEndpoint: 'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
        tags: ['classification', 'zero-shot', 'nlp', 'ai'],
        exampleInput: 'Text: "Bitcoin hits new all-time high" Categories: ["finance", "sports", "tech"]',
        exampleOutput: '{"labels": ["finance", "tech", "sports"], "scores": [0.95, 0.35, 0.01]}',
        interfaceType: 'single-query',
        isOnline: true,
    },
];

async function seedDemoAgents() {
    if (!JWT_TOKEN || JWT_TOKEN === 'your_token_here') {
        console.error('❌ JWT_TOKEN environment variable is required');
        console.error('\nUsage:');
        console.error('  JWT_TOKEN="your_jwt_token" npx ts-node scripts/seed-demo-agents.ts');
        console.error('\nTo get a JWT token:');
        console.error('  1. Login via the mobile app');
        console.error('  2. Check secure storage or network logs for the token');
        process.exit(1);
    }

    console.log('🌱 Seeding demo agents to', BASE_URL);
    console.log('ℹ️  These are FREE demo agents using HuggingFace API\n');

    let successCount = 0;
    let failCount = 0;

    for (const agent of DEMO_AGENTS) {
        try {
            const response = await fetch(`${BASE_URL}/agent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...agent,
                    token: JWT_TOKEN,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            console.log(`✅ Created: ${agent.name} (ID: ${data.id})`);
            successCount++;
        } catch (error: any) {
            console.error(`❌ Failed: ${agent.name}`);
            console.error(`   Error: ${error.message}`);
            failCount++;
        }
    }

    console.log('');
    console.log('📊 Results:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log('');

    if (successCount > 0) {
        console.log('🎉 Demo agents seeded successfully!');
        console.log('');
        console.log('ℹ️  Note: These are demonstration agents using FREE APIs.');
        console.log('   In production, envoys will create their own agents with');
        console.log('   their hosted APIs and wallet addresses.');
        console.log('');
        console.log('   Mobile app can now:');
        console.log('   - Browse agents: GET /agent');
        console.log('   - View details: GET /agent/:id');
        console.log('   - Interact: POST /proxy/agent/:id (x402 protected)');
    }
}

seedDemoAgents().catch((error) => {
    console.error('💥 Seed script failed:', error.message);
    process.exit(1);
});
