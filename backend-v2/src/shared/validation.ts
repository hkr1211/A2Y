import Joi from 'joi';

// Auth schemas
export const loginSchema = {
  body: Joi.object({
    username: Joi.string().trim().min(2).max(50).required(),
    password: Joi.string().min(6).max(100).required(),
  }),
};

export const changePasswordSchema = {
  body: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(100).required(),
  }),
};

// User schemas
export const createUserSchema = {
  body: Joi.object({
    username: Joi.string().trim().min(2).max(50).required(),
    password: Joi.string().min(6).max(100).required(),
    role: Joi.string().valid('admin', 'buyer', 'supplier').required(),
    company: Joi.string().valid('arroz', 'yunjie', 'admin').required(),
    language: Joi.string().valid('zh', 'ja').default('zh'),
  }),
};

export const updateUserSchema = {
  body: Joi.object({
    role: Joi.string().valid('admin', 'buyer', 'supplier'),
    company: Joi.string().valid('arroz', 'yunjie', 'admin'),
    language: Joi.string().valid('zh', 'ja'),
  }).min(1),
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

export const resetPasswordSchema = {
  body: Joi.object({
    newPassword: Joi.string().min(6).max(100).required(),
  }),
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

export const userIdParamSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

// Common query schemas
export const paginationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().trim().allow('').default(''),
    sort: Joi.string().valid('created_at', 'username').default('created_at'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    format: Joi.string().valid('excel').optional(),
  }),
};

export const userListSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().trim().allow('').default(''),
    sort: Joi.string().valid('created_at', 'username').default('created_at'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    role: Joi.string().valid('admin', 'buyer', 'supplier').optional(),
    format: Joi.string().valid('excel').optional(),
  }),
};
