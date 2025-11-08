import * as Joi from 'joi';

//ENSURES ENV VARIABLES ARE PRESENT AT START OF SERVER
export const envValidationSchema = Joi.object({
  PORT: Joi.string().required(),
  DATABASE_URL: Joi.string().required(),
  PRIVY_APP_ID: Joi.string().required(),
  PRIVY_APP_SECRET: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  // Solana Configuration
  SOLANA_NETWORK: Joi.string().valid('mainnet-beta', 'devnet').default('devnet'),
  SOLANA_RPC_URL: Joi.string().uri().required(),
  PLATFORM_WALLET_ADDRESS: Joi.string().required(),
  USDC_MINT_ADDRESS: Joi.string().required(),

  // Optional: HuggingFace Token
  HF_TOKEN: Joi.string().optional(),
});
