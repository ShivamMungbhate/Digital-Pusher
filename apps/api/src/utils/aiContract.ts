import { z } from 'zod';

export const tacticSchema = z.object({
  name: z.enum(['urgency', 'authority', 'fear', 'secrecy', 'payment_demand', 'other']),
  evidence: z.string(),
  severity: z.enum(['low', 'medium', 'high'])
});

export const findingSchema = z.object({
  type: z.string(),
  category: z.string(),
  timestampSec: z.number().nullable().optional(),
  explanation: z.string(),
  severity: z.enum(['low', 'medium', 'high'])
});

export const clauseSchema = z.object({
  text: z.string(),
  risk: z.enum(['low', 'medium', 'high']),
  reason: z.string(),
  citation: z.string().nullable().optional()
});

export const deadlineSchema = z.object({
  label: z.string(),
  date: z.string(),
  source: z.string()
});

export const draftSchema = z.object({
  kind: z.enum(['family_alert', 'report', 'complaint', 'reply', 'cancellation']),
  title: z.string(),
  body: z.string()
});

export const analysisContractSchema = z.object({
  mode: z.enum(['scam', 'dark_pattern', 'paperwork']),
  risk: z.enum(['low', 'medium', 'high']),
  verdict: z.enum(['likely_scam', 'unclear', 'looks_genuine', 'issues_found', 'no_issues']),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  tactics: z.array(tacticSchema).default([]),
  findings: z.array(findingSchema).default([]),
  clauses: z.array(clauseSchema).default([]),
  deadlines: z.array(deadlineSchema).default([]),
  safeSteps: z.array(z.string()).default([]),
  drafts: z.array(draftSchema).default([]),
  audioUrl: z.string().nullable().optional().default(null),
  escalate: z.boolean(),
  disclaimer: z.string()
});

export type AnalysisContract = z.infer<typeof analysisContractSchema>;
