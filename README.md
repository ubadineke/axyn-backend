<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

AxyN Backend API - NestJS backend for the AxyN AI Agent Marketplace mobile application.

## Features

- **Privy Authentication Integration**: Verifies Privy auth tokens from mobile app
- **JWT-based Authorization**: Issues and validates JWT tokens for protected routes
- **TypeORM + PostgreSQL**: Database ORM with migrations support
- **Mobile-First Auth Guard**: Accepts JWT from request body (not headers) for mobile compatibility
- **User Management**: Automatic user creation from Privy identity

## Project setup

```bash
# Install dependencies
$ npm install

# Set up environment variables
$ cp .env.example .env
# Edit .env with your Privy credentials and JWT secret

# Run database migrations (when available)
$ npm run migration:run
```

## Environment Variables

Required environment variables in `.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/axyn_db

# Privy Authentication
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_minimum_32_chars

# Server
PORT=3000
NODE_ENV=development
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Authentication Flow

### Architecture Overview

```
Mobile App (Privy) → POST /auth/login → Backend verifies token → 
Returns JWT → Mobile stores JWT → Mobile sends JWT in request body
```

### 1. Login Endpoint

**POST** `/auth/login`

Request body:
```json
{
  "authToken": "privy_auth_token_from_mobile"
}
```

Response:
```json
{
  "accessToken": "jwt_token",
  "user": {
    "id": 1,
    "privyUserId": "did:privy:...",
    "walletAddress": "solana_wallet_address",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

### 2. Protected Routes

Use `@UseGuards(AuthGuard)` on any route that requires authentication.

Example:
```typescript
@Get('me')
@UseGuards(AuthGuard)
async getCurrentUser(@Request() req) {
  const userId = req.user.sub; // JWT payload
  return this.userService.findById(userId);
}
```

### 3. Mobile Integration

The `AuthGuard` expects JWT in request **body** (not headers):

```typescript
// Mobile app should send requests like:
{
  "token": "jwt_token_here",
  // ...other request data
}
```

### How It Works

1. **Mobile app** authenticates with Privy (OAuth/Email OTP)
2. **Mobile app** gets Privy auth token via `privy.user.getAccessToken()`
3. **Mobile app** sends token to `POST /auth/login`
4. **Backend** verifies Privy token using `@privy-io/node` SDK
5. **Backend** fetches user details from Privy API
6. **Backend** checks if user exists in database (by `privyUserId`)
7. **Backend** creates user if new, updates if existing
8. **Backend** signs JWT with payload: `{ sub: user.id, privyUserId, walletAddress }`
9. **Backend** returns JWT + user object
10. **Mobile app** stores JWT in secure storage
11. **Mobile app** includes JWT in body of all protected API requests

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
