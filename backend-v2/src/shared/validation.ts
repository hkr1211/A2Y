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

// Common UUID param schema
export const uuidParamSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

// Inquiry schemas
export const createInquirySchema = {
  body: Joi.object({
    productName: Joi.string().trim().max(200).required(),
    materialType: Joi.string().trim().max(100).required(),
    specifications: Joi.string().trim().required(),
    specialRequirements: Joi.string().trim().allow('', null).optional(),
    quantity: Joi.number().integer().min(1).required(),
  }),
};

export const updateInquirySchema = {
  body: Joi.object({
    productName: Joi.string().trim().max(200),
    materialType: Joi.string().trim().max(100),
    specifications: Joi.string().trim(),
    specialRequirements: Joi.string().trim().allow('', null),
    quantity: Joi.number().integer().min(1),
  }).min(1),
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

export const inquiryActionSchema = {
  body: Joi.object({
    action: Joi.string().valid('publish', 'cancel').required(),
  }),
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

export const inquiryListSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().trim().allow('').default(''),
    sort: Joi.string()
      .valid('created_at', 'inquiry_number')
      .default('created_at'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    status: Joi.string()
      .valid('draft', 'published', 'quoted', 'converted', 'cancelled')
      .optional(),
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

// Quotation schemas
export const createQuotationSchema = {
  body: Joi.object({
    inquiryId: Joi.string().uuid().required(),
    unitPrice: Joi.number().min(0).required(),
    totalPrice: Joi.number().min(0).required(),
    deliveryDays: Joi.number().integer().min(1).required(),
    remarks: Joi.string().trim().allow('', null).optional(),
  }),
};

export const withdrawQuotationSchema = {
  params: Joi.object({
    inquiryId: Joi.string().uuid().required(),
  }),
};

// Order schemas
export const createOrderSchema = {
  body: Joi.object({
    // From inquiry
    inquiryId: Joi.string().uuid().optional(),
    // Standalone fields
    productName: Joi.string().trim().max(200).when('inquiryId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    materialType: Joi.string().trim().max(100).when('inquiryId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    specifications: Joi.string().trim().when('inquiryId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    specialRequirements: Joi.string().trim().allow('', null).optional(),
    unitPrice: Joi.number().min(0).when('inquiryId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    quantity: Joi.number().integer().min(1).when('inquiryId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    totalPrice: Joi.number().min(0).when('inquiryId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
  }),
};

export const orderActionSchema = {
  body: Joi.object({
    action: Joi.string()
      .valid(
        'cancel',
        'reject',
        'confirm',
        'start_production',
        'ship',
        'complete'
      )
      .required(),
    reason: Joi.string().trim().allow('').optional(),
  }),
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

// File schemas
export const uploadFileSchema = {
  body: Joi.object({
    relatedId: Joi.string().uuid().required(),
    relatedType: Joi.string().valid('inquiry', 'order').required(),
  }),
};

export const orderListSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().trim().allow('').default(''),
    sort: Joi.string()
      .valid('created_at', 'order_number')
      .default('created_at'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    status: Joi.string()
      .valid(
        'pending',
        'confirmed',
        'rejected',
        'production',
        'shipped',
        'completed',
        'cancelled'
      )
      .optional(),
    format: Joi.string().valid('excel').optional(),
  }),
};

// Chat schemas
const relatedParams = Joi.object({
  relatedType: Joi.string().valid('inquiry', 'order').required(),
  relatedId: Joi.string().uuid().required(),
});

export const chatMessagesSchema = {
  params: relatedParams,
  query: Joi.object({
    since: Joi.string().isoDate().optional(),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(50),
  }),
};

export const sendMessageSchema = {
  params: relatedParams,
  body: Joi.object({
    content: Joi.string().trim().min(1).max(2000).required(),
  }),
};

export const chatParamsSchema = {
  params: relatedParams,
};

// Notification schemas
export const notificationListSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    isRead: Joi.string().valid('true', 'false').optional(),
  }),
};

export const markNotificationReadSchema = {
  body: Joi.object({
    id: Joi.string().uuid().optional(),
    all: Joi.boolean().optional(),
  }).or('id', 'all'),
};
