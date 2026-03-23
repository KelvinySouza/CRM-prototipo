const { z } = require('zod');

// Validation middleware
function validate(schema) {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
  };
}

// Auth schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const registerCompanySchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(100),
  domain: z.string().min(1, 'Domain is required').max(50).regex(/^[a-z0-9-]+$/, 'Domain must be lowercase alphanumeric with hyphens'),
  adminName: z.string().min(1, 'Admin name is required').max(100),
  adminEmail: z.string().email('Invalid email format'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// Conversation schemas
const sendMessageSchema = z.object({
  conversationId: z.number().int().positive(),
  content: z.string().min(1, 'Message content is required').max(1000),
  type: z.enum(['text', 'image', 'file']).default('text'),
});

// Lead schemas
const createLeadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  value: z.number().positive().optional(),
  customerId: z.number().int().positive().optional(),
  assignedTo: z.number().int().positive().optional(),
});

// Product schemas
const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
});

// Order schemas
const createOrderSchema = z.object({
  customerId: z.number().int().positive(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })).min(1, 'At least one item required'),
});

module.exports = {
  validate,
  loginSchema,
  registerCompanySchema,
  sendMessageSchema,
  createLeadSchema,
  createProductSchema,
  createOrderSchema,
};