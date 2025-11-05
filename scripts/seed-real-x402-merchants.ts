/**
 * Seed script for AxyN REAL x402 merchant endpoints
 * 
 * Seeds PRODUCTION x402-enabled APIs from Corbits platform:
 * - Helius RPC (Solana blockchain data)
 * - Nansen Analytics (Smart money tracking)
 * - Yatori Token Data (SPL token analytics)
 * - Titan Exchange (Trading infrastructure)
 * 
 * All endpoints are LIVE and accept x402 payments via USDC.
 * See https://docs.corbits.dev/api/partners/ for full documentation.
 * 
 * Usage:
 *   1. Start backend: npm run start:dev
 *   2. Login via mobile app to get JWT token
 *   3. Run: JWT_TOKEN="your_token_here" npx ts-node scripts/seed-test-agents.ts
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.JWT_TOKEN;

// REAL x402 merchants on Corbits platform
// These are LIVE, PRODUCTION endpoints that accept x402 payments
// All endpoints verified from https://docs.corbits.dev/api/partners/
const REAL_X402_AGENTS = [
  {
    name: 'Helius RPC',
    description:
      'Enterprise-grade Solana RPC infrastructure powered by Helius. Access all Solana blockchain data with x402 micropayments - getBlockHeight, getAccountInfo, getTransaction, and more. No API key or subscription required.',
    category: 'crypto',
    pricePerRequest: 0.0001, // $0.0001 per RPC call
    walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', // Facilitator wallet
    apiEndpoint: 'https://helius.api.corbits.dev',
    tags: ['solana', 'rpc', 'blockchain', 'helius', 'infrastructure', 'real-time'],
    exampleInput: 'POST body: {"jsonrpc":"2.0","id":1,"method":"getBlockHeight"}',
    exampleOutput: '{"jsonrpc":"2.0","result":348510722,"id":1}',
    interfaceType: 'data',
    isOnline: true,
  },
  {
    name: 'Nansen Analytics',
    description:
      'Blockchain analytics and smart money tracking from Nansen. Get insights on whale movements, token holder data, and on-chain analytics across Ethereum and Solana. Pay per query with x402.',
    category: 'research',
    pricePerRequest: 0.01, // $0.01 per analytics query
    walletAddress: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
    apiEndpoint: 'https://nansen.api.corbits.dev',
    tags: ['analytics', 'blockchain', 'ethereum', 'solana', 'whale-tracking', 'smart-money'],
    exampleInput: 'GET /api/v1/token-holders?address=0x...',
    exampleOutput: 'List of token holders with wallet labels and balances',
    interfaceType: 'data',
    isOnline: true,
  },
  {
    name: 'Yatori Token Data',
    description:
      'Solana token account data services by Yatori (Kouba). Access real-time SPL token holder information, distribution analytics, and token account metrics. Perfect for token research and portfolio tracking.',
    category: 'crypto',
    pricePerRequest: 0.005, // $0.005 per token data query
    walletAddress: '5WbxKxkjhxQxC7aBPxEcdJHdT8fQ4vUqJZK4pM8nPxvG',
    apiEndpoint: 'https://yatori.api.corbits.dev',
    tags: ['solana', 'spl-tokens', 'token-data', 'holders', 'analytics'],
    exampleInput: 'GET /api/token-accounts?mint=So11111...',
    exampleOutput: 'Token holder distribution and account metrics',
    interfaceType: 'data',
    isOnline: true,
  },
  {
    name: 'Titan Exchange',
    description:
      'Institutional-grade trading infrastructure and market data from Titan Exchange. Access order book data, trading history, and execute trades programmatically. Built for high-frequency trading and arbitrage bots.',
    category: 'trading',
    pricePerRequest: 0.002, // $0.002 per API call
    walletAddress: '4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy',
    apiEndpoint: 'https://titan-exchange.api.corbits.dev',
    tags: ['trading', 'dex', 'order-book', 'market-data', 'institutional'],
    exampleInput: 'GET /api/v1/orderbook?pair=SOL-USDC',
    exampleOutput: 'Live order book with bids and asks',
    interfaceType: 'data',
    isOnline: true,
  },
];

async function seedAgents() {
  if (!JWT_TOKEN || JWT_TOKEN === 'your_token_here') {
    console.error('❌ JWT_TOKEN environment variable is required');
    console.error('\nUsage:');
    console.error('  JWT_TOKEN="your_jwt_token" npx ts-node scripts/seed-test-agents.ts');
    console.error('\nTo get a JWT token:');
    console.error('  1. Login via the mobile app');
    console.error('  2. Check secure storage or network logs for the token');
    process.exit(1);
  }

  console.log('🌱 Seeding test agents to', BASE_URL);
  console.log('');

  let successCount = 0;
  let failCount = 0;

  for (const agent of REAL_X402_AGENTS) {
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
    console.log('🎉 Test agents seeded successfully!');
    console.log('   Mobile app can now fetch real agent data from GET /agent');
  }
}

seedAgents().catch((error) => {
  console.error('💥 Seed script failed:', error.message);
  process.exit(1);
});
