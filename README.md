# AxyN Backend

REST API for the AxyN AI Agent Marketplace, powering mobile discovery and interaction with AI agents through x402 micropayments on Solana.

AxyN Backend is a NestJS application that provides authentication, agent registry, payment verification, and proxy services for the AxyN mobile marketplace. Built in collaboration with protocol engineers and AI developers to create a seamless agent marketplace experience.

## Overall Architecture
![AxyN Backend Architecture](./axyn_architecture_diagram.png)

Figure: High-level architecture of the AxyN backend, mobile client, and external integrations.

## Features

**Authentication**
- Privy token verification and validation
- JWT issuance for mobile clients
- Automatic user profile creation and sync
- Solana wallet address extraction from Privy accounts

**Agent Registry**
- CRUD operations for agent listings
- Search and filtering by category, pricing, ratings
- Agent metadata management (name, description, pricing, interface type)
- Icon upload and storage
- Status management (active, inactive, maintenance)

**Payment Verification**
- x402 protocol integration via Corbits Faremeter
- USDC transaction verification on Solana
- Payment splitting (7-10% platform fee, 90-93% to agent creator)
- Nonce-based payment validation
- Support for both mainnet and devnet

**Proxy Service**
- Secure proxy layer between mobile app and agent endpoints
- x402 payment protection for agent interactions
- Request/response logging for activity tracking
- Error handling and timeout management
- Agent endpoint health monitoring

**Activity Tracking**
- Complete transaction history with user prompts
- Response summaries and activity categorization
- Usage statistics per agent
- Earnings tracking for agent creators

**User Management**
- Profile updates and avatar uploads
- Statistics calculation (total spent, agents hired, earnings)
- Membership tracking
- Wallet address management

## Tech Stack

**Backend Framework**
- NestJS 11 (TypeScript)
- TypeORM (PostgreSQL ORM)
- Node.js 20+

**Authentication**
- Privy SDK (@privy-io/node)
- JWT (jsonwebtoken)
- Custom mobile-first auth guards

**Database**
- PostgreSQL 14+
- TypeORM migrations
- Relational data modeling

**Payment Integration**
- Corbits Faremeter (@faremeter/middleware)
- Solana Web3.js
- USDC token verification

**File Storage**
- Local filesystem (uploads/)
- Multer for multipart/form-data

## Getting Started

**Clone and Install**

```bash
git clone https://github.com/yourusername/axyn-backend.git
cd axyn-backend
npm install
```

**Database Setup**

Create a PostgreSQL database and configure the connection:

```bash
# Create database
createdb axyn_db

# Copy environment template
cp .env.example .env
```

**Configure Environment**

Edit `.env` with your configuration:

```env
# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/axyn_db

# Privy Authentication
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret

# JWT Configuration
JWT_SECRET=your_secure_random_secret_minimum_32_characters

# Solana Configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
PLATFORM_WALLET_ADDRESS=your_platform_wallet_address
USDC_MINT_ADDRESS=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Server Configuration
PORT=3000
NODE_ENV=development
```

**Run Migrations**

```bash
npm run migration:run
```

**Start the Server**

```bash
# Development mode (watch mode)
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The server will start on `http://localhost:3000`

## Architecture

The application follows NestJS modular architecture with clean separation of concerns:

```
src/
  auth/           # Authentication and JWT management
  user/           # User profiles and statistics
  agent/          # Agent registry and CRUD operations
  proxy/          # x402 payment proxy to agent endpoints
  transaction/    # Transaction recording and activity history
  conversation/   # Agent conversation message persistence
  database/       # TypeORM configuration and migrations
```

**Module Responsibilities**

- **AuthModule**: Privy token verification, JWT signing, user authentication
- **UserModule**: Profile management, avatar uploads, statistics calculation
- **AgentModule**: Agent listings, search, filtering, metadata management
- **ProxyModule**: Payment verification, agent endpoint proxying
- **TransactionModule**: Activity tracking, usage statistics, earnings calculation
- **ConversationModule**: Chat history persistence for agent interactions

## API Endpoints

**Authentication**

```
POST /auth/login
  Body: { authToken: string }
  Returns: { accessToken: string, user: UserObject }
```

**User Management**

```
GET  /user/me                  # Get current user profile
PATCH /user/me                 # Update profile
POST /user/avatar              # Upload avatar image
```

**Agent Registry**

```
GET  /agent                    # List all agents (with search/filter)
GET  /agent/my-agents          # Get user's created agents
GET  /agent/:id                # Get agent details
POST /agent                    # Create new agent
PATCH /agent/:id               # Update agent
DELETE /agent/:id              # Delete agent
POST /agent/upload-icon        # Upload agent icon
```

**Agent Interaction**

```
POST /proxy/agent/:agentId     # Interact with agent (x402 protected)
  Body: { message: string, token: string }
  Headers: x402 payment headers (added by mobile client)
```

**Transaction History**

```
GET /transaction/my-transactions        # User's transaction history
GET /transaction/my-hired-agents        # Agents user has interacted with
GET /transaction/agent/:id              # Transactions for specific agent
GET /transaction/activity-history       # Activity feed with prompts/responses
GET /transaction/activity/:id           # Detailed activity view
POST /transaction                       # Record new transaction
```

**Conversations**

```
GET  /conversations                     # List user's conversations
GET  /conversations/:agentId/messages   # Get conversation messages
POST /conversations/messages            # Save conversation message
DELETE /conversations/:agentId          # Delete conversation
```

## Authentication Flow

**Mobile to Backend Integration**

1. Mobile app authenticates user with Privy (OAuth or Email OTP)
2. Mobile gets Privy auth token via `privy.user.getAccessToken()`
3. Mobile sends token to `POST /auth/login`
4. Backend verifies token with Privy SDK
5. Backend fetches user details from Privy API
6. Backend creates or updates user in database
7. Backend extracts Solana wallet address from Privy linked accounts
8. Backend signs JWT with payload: `{ sub: userId, privyUserId, walletAddress }`
9. Backend returns JWT and user object
10. Mobile stores JWT securely
11. Mobile includes JWT in request body for all protected routes

**JWT Payload Structure**

```typescript
{
  sub: number,           // User ID (database primary key)
  privyUserId: string,   // Privy DID
  walletAddress: string, // Solana wallet address
  iat: number,           // Issued at timestamp
  exp: number            // Expiration timestamp (7 days)
}
```

**Protected Route Pattern**

```typescript
@Get('me')
@UseGuards(AuthGuard)
async getCurrentUser(@Request() req) {
  const userId = req.user.sub;
  return this.userService.findById(userId);
}
```

**Mobile-First Auth Guard**

The custom `AuthGuard` accepts JWT from request body (not headers) for mobile compatibility:

```typescript
// Mobile app sends requests with JWT in body:
{
  "token": "jwt_token_here",
  ...other request data
}
```

## Payment Flow

**x402 Protocol Integration**

1. Mobile calls `POST /proxy/agent/:agentId` with user message
2. Backend checks if payment is required
3. Backend returns `402 Payment Required` with payment details in headers
4. Mobile parses payment amount, recipient, nonce from headers
5. Mobile signs USDC transfer transaction with Privy wallet
6. Mobile retries request with payment proof in headers
7. Backend verifies payment via Corbits Faremeter
8. Backend validates transaction on Solana blockchain
9. Backend splits payment (7-10% platform, 90-93% agent creator)
10. Backend proxies request to agent's API endpoint
11. Backend captures response and logs activity
12. Backend returns agent response to mobile

**Payment Verification Service**

```typescript
@Injectable()
export class PaymentVerificationService {
  async verifyPayment(signature: string, expectedAmount: number): Promise<boolean> {
    // Fetch transaction from Solana
    // Verify USDC transfer to platform wallet
    // Validate amount matches expected
    // Check nonce to prevent replay attacks
    // Return verification result
  }
}
```

## Database Schema

**User Entity**

```typescript
{
  id: number (PK)
  privyUserId: string (unique, indexed)
  walletAddress: string
  email: string?
  name: string?
  avatar: string?
  totalAgentsHired: number
  totalSpent: number
  totalAgentsListed: number
  totalEarned: number
  createdAt: Date
  updatedAt: Date
}
```

**Agent Entity**

```typescript
{
  id: number (PK)
  name: string
  description: string
  category: string
  pricePerRequest: number
  rating: number
  totalJobs: number
  status: enum (active, inactive, maintenance)
  iconUrl: string?
  walletAddress: string
  apiEndpoint: string
  interfaceType: enum (chat, single-query, data-api)
  tags: string[]
  ownerId: number (FK -> User)
  createdAt: Date
  updatedAt: Date
}
```

**Transaction Entity**

```typescript
{
  id: number (PK)
  userId: number (FK -> User)
  agentId: number (FK -> Agent)
  amount: number
  signature: string (Solana transaction signature)
  status: enum (pending, completed, failed)
  nonce: string
  userPrompt: string?
  responseSummary: string?
  activityType: enum (chat, query, upload, analysis)
  createdAt: Date
}
```

**Conversation Message Entity**

```typescript
{
  id: number (PK)
  userId: number (FK -> User)
  agentId: number (FK -> Agent)
  role: enum (user, agent)
  content: string
  timestamp: Date
}
```

## Development

**Code Quality**

```bash
npm run lint              # ESLint
npm run format            # Prettier
npm run test              # Unit tests
npm run test:e2e          # End-to-end tests
npm run test:cov          # Test coverage
```

**Database Migrations**

```bash
# Generate new migration
npm run migration:generate -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

**Seeding Data**

```bash
# Seed demo agents
node scripts/seed-demo-agents.ts

# Seed real x402 merchants as agents
node scripts/seed-real-x402-merchants.ts
```

## Deployment

**Production Checklist**

1. Set `NODE_ENV=production` in environment
2. Use strong `JWT_SECRET` (min 32 characters)
3. Configure production `DATABASE_URL`
4. Set `SOLANA_NETWORK=mainnet-beta`
5. Update `USDC_MINT_ADDRESS` to mainnet address
6. Configure production Privy credentials
7. Set up SSL/TLS certificates
8. Enable CORS for mobile app domain
9. Configure rate limiting
10. Set up monitoring and logging

**Environment Variables for Production**

```env
NODE_ENV=production
DATABASE_URL=postgresql://prod_user:password@prod_host:5432/axyn_prod
PRIVY_APP_ID=prod_privy_app_id
PRIVY_APP_SECRET=prod_privy_secret
JWT_SECRET=production_secret_min_32_chars
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
PLATFORM_WALLET_ADDRESS=production_platform_wallet
USDC_MINT_ADDRESS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
PORT=3000
```

**Building for Production**

```bash
npm run build
npm run start:prod
```

## Contributing

This project is built in collaboration with:

**Protocol Engineer:** Ubadineke (Solana blockchain integration, x402 protocol)
**AI Models:** Zion, Zurri AI (Agent API endpoints and model integration)
**Backend Development:** Joel (Heisjoel0x) - NestJS architecture and API design

## Project Team

**Lead Developer:** Joel  
**Twitter:** [@Heisjoel0x](https://twitter.com/Heisjoel0x)  
**Email:** immadominion@gmail.com

**Protocol Engineer:** Ubadineke  
**AI Integration:** Zion (Zurri AI)

## License

MIT License - See LICENSE file for details.

---

## Architecture Diagram Information

For creating a visual architecture diagram, use the following components and flow:

**System Components:**

1. Mobile App (Flutter)
   - Privy Authentication
   - Embedded Solana Wallet
   - Agent Marketplace UI
   - Activity Tracking

2. AxyN Backend (NestJS)
   - Auth Module
   - User Module
   - Agent Module
   - Proxy Module
   - Transaction Module
   - Conversation Module

3. External Services
   - Privy API (authentication)
   - Solana Blockchain (payments)
   - Corbits Faremeter (x402 verification)
   - Agent API Endpoints (envoy-hosted)

4. Data Storage
   - PostgreSQL (users, agents, transactions, messages)
   - File System (avatars, agent icons)

**Data Flow:**

**Authentication Flow:**
```
Mobile → Privy SDK → Privy API → Mobile gets auth token
Mobile → POST /auth/login → Backend verifies with Privy → Returns JWT
Mobile → Stores JWT → Uses in all requests
```

**Agent Discovery Flow:**
```
Mobile → GET /agent → Backend queries PostgreSQL → Returns agent list
Mobile → Displays marketplace → User selects agent
```

**Payment and Interaction Flow:**
```
Mobile → POST /proxy/agent/:id → Backend checks payment
Backend → Returns 402 Payment Required
Mobile → Signs USDC transaction with Privy wallet
Mobile → Retries with payment proof
Backend → Verifies with Corbits Faremeter
Backend → Validates on Solana blockchain
Backend → Splits payment (platform + envoy)
Backend → Proxies to Agent API
Agent API → Processes request → Returns response
Backend → Logs activity → Returns to mobile
Mobile → Displays response
```

**Activity Tracking Flow:**
```
Backend → Records transaction with prompt/response
Mobile → GET /transaction/activity-history
Backend → Queries PostgreSQL → Returns activity feed
Mobile → Displays in Activity tab
```

**Key Integrations:**
- Privy: OAuth providers (Google, Twitter, Discord), Email OTP
- Solana: USDC token transfers, transaction verification
- Corbits: x402 payment protocol, nonce management
- Agent APIs: Envoy-hosted endpoints with various interfaces

**Security Layers:**
- JWT authentication on all protected routes
- x402 payment verification before agent access
- Nonce-based replay attack prevention
- HTTPS/TLS encryption
- Wallet signature validation
