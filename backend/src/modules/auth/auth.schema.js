const { z } = require('zod');

const loginSchema = z.object({
  email: z.string({
    error: 'Email and password are required.',
  }).min(1, 'Email and password are required.'),
  password: z.string({
    error: 'Email and password are required.',
  }).min(1, 'Email and password are required.'),
});

const registerBranchSchema = z.object({
  name: z.string().min(1, 'Store branch name is required'),
  code: z.string().optional(),
  type: z.string().optional(),
  state: z.string().optional(),
  managerName: z.string().min(1, 'Store manager name is required'),
  managerEmail: z.string().email('Valid store manager email is required'),
  managerPassword: z.string().min(8, 'Store manager passwords must be at least 8 characters long.'),
});

const registerSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
  taxId: z.string().optional().nullable(),
  adminName: z.string().min(1, 'Admin name is required'),
  email: z.string().email('Valid admin email is required'),
  password: z.string().min(8, 'Admin password must be at least 8 characters long'),
  industry: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  branches: z.array(registerBranchSchema).optional(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

module.exports = {
  loginSchema,
  registerSchema,
  changePasswordSchema,
};
