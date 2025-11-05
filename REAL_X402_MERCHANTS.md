# Real x402 Merchants

AxyN marketplace is now seeded with **REAL, PRODUCTION x402-enabled API endpoints** from the Corbits platform.

## What are these?

These are **live APIs that already have x402 payment built-in**. They accept USDC micropayments on Solana and return data immediately after payment verification.

## Current Merchants

### 1. Helius RPC
- **Endpoint**: `https://helius.api.corbits.dev`
- **Category**: Crypto / Infrastructure
- **Price**: $0.0001 per RPC call
- **What it does**: Enterprise-grade Solana blockchain data (getBlockHeight, getAccountInfo, getTransaction, etc.)
- **Use case**: Any app that needs Solana blockchain data without managing RPC subscriptions
- **Documentation**: [Helius x402 API](https://docs.corbits.dev/api/partners/helius/)

### 2. Nansen Analytics
- **Endpoint**: `https://nansen.api.corbits.dev`
- **Category**: Research / Analytics
- **Price**: $0.01 per query
- **What it does**: Blockchain analytics, whale tracking, smart money movements
- **Use case**: Research tools, trading bots that need whale alerts
- **Documentation**: [Nansen x402 API](https://docs.corbits.dev/api/partners/nansen/)

### 3. Yatori Token Data
- **Endpoint**: `https://yatori.api.corbits.dev`
- **Category**: Crypto / Token Analytics
- **Price**: $0.005 per query
- **What it does**: Solana SPL token holder data, distribution metrics, account analytics
- **Use case**: Portfolio trackers, token research tools
- **Documentation**: [Yatori x402 API](https://docs.corbits.dev/api/partners/yatori/)

### 4. Titan Exchange
- **Endpoint**: `https://titan-exchange.api.corbits.dev`
- **Category**: Trading
- **Price**: $0.002 per API call
- **What it does**: Trading infrastructure, order book data, market data
- **Use case**: Trading bots, arbitrage tools, high-frequency trading
- **Documentation**: [Titan Exchange x402 API](https://docs.corbits.dev/api/partners/titan-exchange/)

## How x402 Works

1. **Initial Request**: Mobile app calls the merchant's endpoint (e.g., Helius RPC)
2. **402 Response**: Merchant returns `402 Payment Required` with payment details
3. **Payment**: App creates USDC payment transaction, signs with Privy wallet
4. **Retry with Proof**: App retries request with `X-Payment` header containing tx signature
5. **Verification**: Merchant's x402 middleware validates payment with facilitator
6. **Access Granted**: Merchant returns the requested data

## Payment Flow in AxyN

```
User taps "Hire Agent"
  ↓
PaymentService.payAgent() sends USDC to agent's wallet
  ↓
Get tx signature
  ↓
Call agent.apiEndpoint with headers: { 'X-Payment-Proof': signature }
  ↓
Agent's x402 middleware verifies payment
  ↓
Agent returns data
  ↓
Display result to user
```

## Why Real Endpoints Matter

- **Hackathon credibility**: Judges can test with real APIs
- **Actual use cases**: Users pay real USDC, get real data
- **Ecosystem integration**: AxyN becomes the mobile discovery layer for x402
- **No mocking**: Every transaction is real blockchain activity

## Adding More Merchants

To add more real x402 merchants, search Corbits documentation:
- https://docs.corbits.dev/api/partners/
- Any endpoint at `*.api.corbits.dev` is x402-enabled
- Update `scripts/seed-real-x402-merchants.ts` with new endpoints

## Testing Flow

1. **Browse agents**: Mobile app fetches from `GET /agent`
2. **View details**: Tap agent card to see pricing, endpoint, examples
3. **Hire agent**: Tap "Hire" → Payment flows through Privy wallet
4. **Get result**: Agent's x402 API verifies payment, returns data
5. **Track usage**: Backend records transaction with signature

## Important Notes

- All merchants handle payment verification themselves via x402 middleware
- AxyN doesn't proxy API calls - we just facilitate discovery
- Payment goes directly to merchant's wallet address
- Our backend tracks transactions for analytics/ranking only
