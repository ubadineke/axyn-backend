import * as Joi from 'joi';

//ENSURES ENV VARIABLES ARE PRESENT AT START OF SERVER
export const envValidationSchema = Joi.object({
  PORT: Joi.string().required(),
  DATABASE_URL: Joi.string().required(),
});
