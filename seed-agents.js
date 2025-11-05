const axios = require('axios');

// Sample agents data
const agents = [
    {
        name: "Crypto Price Oracle",
        description: "Real-time cryptocurrency price analysis and predictions. Get instant market data for Bitcoin, Ethereum, and 100+ tokens with technical indicators and trend analysis.",
        category: "crypto",
        pricePerRequest: 0.05,
        walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        tags: ["crypto", "prices", "market-data", "analysis"],
        exampleInput: "What is the current price of Bitcoin?",
        exampleOutput: "Bitcoin (BTC) is currently trading at $67,432.50 USD. 24h change: +2.3%. Market cap: $1.32T. Technical indicators suggest bullish momentum.",
        interfaceType: "chat",
        isOnline: true
    },
    {
        name: "NFT Collection Analyzer",
        description: "Deep dive into NFT collections with floor price tracking, rarity analysis, and holder distribution. Get insights on top Solana and Ethereum NFT projects.",
        category: "crypto",
        pricePerRequest: 0.10,
        walletAddress: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
        tags: ["nft", "analysis", "solana", "collections"],
        exampleInput: "Analyze the Mad Lads NFT collection",
        exampleOutput: "Mad Lads Collection: Floor: 142 SOL | Volume (24h): 1,234 SOL | Unique holders: 8,234 | Rarity distribution: 70% common, 25% rare, 5% legendary. Recent trend: +15% floor price this week.",
        interfaceType: "single-query",
        isOnline: true
    },
    {
        name: "Trading Signal Bot",
        description: "AI-powered trading signals for crypto markets. Get buy/sell recommendations with entry/exit points, stop-loss levels, and confidence scores based on technical analysis.",
        category: "trading",
        pricePerRequest: 0.25,
        walletAddress: "5WbxKxkjhxQxC7aBPxEcdJHdT8fQ4vUqJZK4pM8nPxvG",
        tags: ["trading", "signals", "technical-analysis", "bot"],
        exampleInput: "Give me a trading signal for SOL/USDC",
        exampleOutput: "SOL/USDC Signal: BUY 🟢 Entry: $145-$147 | Target 1: $152 | Target 2: $158 | Stop Loss: $142 | Confidence: 78% | Timeframe: 4H | Indicators: RSI oversold, MACD bullish crossover, support at $145.",
        interfaceType: "chat",
        isOnline: true
    },
    {
        name: "DeFi Yield Optimizer",
        description: "Find the best yield farming opportunities across Solana DeFi protocols. Compare APYs, calculate impermanent loss, and get personalized strategies based on your risk tolerance.",
        category: "finance",
        pricePerRequest: 0.15,
        walletAddress: "4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy",
        tags: ["defi", "yield-farming", "apy", "optimization"],
        exampleInput: "Best yield farming options for $10,000 USDC?",
        exampleOutput: "Top 3 Yield Options for $10K USDC: 1) Marinade stSOL-USDC LP: 24.5% APY, Low risk 2) Kamino USDC Vault: 18.2% APY, Very low risk 3) Drift USDC Earn: 21.3% APY, Medium risk. Recommended allocation: 40/30/30 split for optimal risk-adjusted returns.",
        interfaceType: "single-query",
        isOnline: true
    },
    {
        name: "Smart Contract Auditor",
        description: "Quick security analysis of Solana smart contracts. Detects common vulnerabilities, checks for best practices, and provides a security score with actionable recommendations.",
        category: "research",
        pricePerRequest: 0.50,
        walletAddress: "8FE27ioQh3T7o22QsYVT5Re8NnHFqmFNbdqwiF3ywuZP",
        tags: ["security", "audit", "smart-contracts", "solana"],
        exampleInput: "[Paste contract code or program ID]",
        exampleOutput: "Security Analysis Complete ✅ Score: 8.2/10 | Issues found: 2 Medium, 3 Low | Critical: None | Key findings: Missing access control on admin function, potential reentrancy risk in withdraw(). Recommendations: Add onlyOwner modifier, implement checks-effects-interactions pattern.",
        interfaceType: "data",
        isOnline: true
    }
];

async function seedAgents() {
    const baseURL = 'http://localhost:3000';

    // You need to provide a valid JWT token here
    // Get this from your mobile app or by logging in via /auth/login
    const JWT_TOKEN = process.env.JWT_TOKEN || 'YOUR_JWT_TOKEN_HERE';

    if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
        console.error('❌ Please set JWT_TOKEN environment variable');
        console.error('Example: JWT_TOKEN="your_token" node seed-agents.js');
        console.error('\nTo get a token:');
        console.error('1. Login via mobile app');
        console.error('2. Or use: curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d \'{"authToken": "your_privy_token"}\'');
        process.exit(1);
    }

    console.log('🌱 Starting agent seeding...\n');

    let successCount = 0;
    let failCount = 0;

    for (const agent of agents) {
        try {
            const response = await axios.post(`${baseURL}/agent`, {
                ...agent,
                token: JWT_TOKEN
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log(`✅ Created: ${agent.name} (ID: ${response.data.id})`);
            successCount++;
        } catch (error) {
            console.log(`❌ Failed: ${agent.name}`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Error: ${JSON.stringify(error.response.data)}`);
            } else {
                console.log(`   Error: ${error.message}`);
            }
            failCount++;
        }
    }

    console.log(`\n📊 Results: ${successCount} created, ${failCount} failed`);

    // Test GET /agent
    try {
        const response = await axios.get(`${baseURL}/agent`);
        console.log(`\n✅ Total agents in database: ${response.data.length}`);
    } catch (error) {
        console.log('❌ Failed to fetch agents');
    }
}

seedAgents();
