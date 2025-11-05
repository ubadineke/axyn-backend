import * as Joi from 'joi';

//ENSURES ENV VARIABLES ARE PRESENT AT START OF SERVER
export const envValidationSchema = Joi.object({
  PORT: Joi.string().required(),
  DATABASE_URL: Joi.string().required(),
  PRIVY_APP_ID: Joi.string().required(),
  PRIVY_APP_SECRET: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
});
