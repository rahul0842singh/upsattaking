// src/validators/results.schema.js
const { z } = require('zod');

const createResultSchema = z.object({
  gameCode: z.string().min(1),
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().min(3),
  value: z.string().min(1).max(4),
  note: z.string().optional()
});

const timewiseQuerySchema = z.object({
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

module.exports = { createResultSchema, timewiseQuerySchema };