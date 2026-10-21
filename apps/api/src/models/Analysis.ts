import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITactic {
  name: string;
  evidence: string;
  severity: 'low' | 'medium' | 'high';
}

export interface IFinding {
  type: string;
  category: string;
  timestampSec: number | null;
  explanation: string;
  severity: 'low' | 'medium' | 'high';
}

export interface IClause {
  text: string;
  risk: 'low' | 'medium' | 'high';
  reason: string;
  citation: string | null;
}

export interface IDeadline {
  label: string;
  date: string;
  source: string;
}

export interface IDraft {
  kind: 'family_alert' | 'report' | 'complaint' | 'reply' | 'cancellation';
  title: string;
  body: string;
}

export interface IAnalysis extends Document {
  submissionId: Types.ObjectId;
  userId: Types.ObjectId;
  mode: 'scam' | 'dark_pattern' | 'paperwork';
  risk: 'low' | 'medium' | 'high';
  verdict: 'likely_scam' | 'unclear' | 'looks_genuine' | 'issues_found' | 'no_issues';
  confidence: number;
  summary: string;
  tactics: ITactic[];
  findings: IFinding[];
  clauses: IClause[];
  deadlines: IDeadline[];
  safeSteps: string[];
  drafts: IDraft[];
  audioUrl: string | null;
  escalate: boolean;
  disclaimer: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisSchema = new Schema<IAnalysis>(
  {
    submissionId: {
      type: Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      unique: true,
      index: true
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mode: {
      type: String,
      enum: ['scam', 'dark_pattern', 'paperwork'],
      required: true
    },
    risk: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
      index: true
    },
    verdict: {
      type: String,
      enum: ['likely_scam', 'unclear', 'looks_genuine', 'issues_found', 'no_issues'],
      required: true
    },
    confidence: { type: Number, required: true },
    summary: { type: String, required: true },
    tactics: [
      {
        name: { type: String, required: true },
        evidence: { type: String, required: true },
        severity: { type: String, enum: ['low', 'medium', 'high'], required: true }
      }
    ],
    findings: [
      {
        type: { type: String, required: true },
        category: { type: String, required: true },
        timestampSec: { type: Number, default: null },
        explanation: { type: String, required: true },
        severity: { type: String, enum: ['low', 'medium', 'high'], required: true }
      }
    ],
    clauses: [
      {
        text: { type: String, required: true },
        risk: { type: String, enum: ['low', 'medium', 'high'], required: true },
        reason: { type: String, required: true },
        citation: { type: String, default: null }
      }
    ],
    deadlines: [
      {
        label: { type: String, required: true },
        date: { type: String, required: true },
        source: { type: String, required: true }
      }
    ],
    safeSteps: [{ type: String }],
    drafts: [
      {
        kind: {
          type: String,
          enum: ['family_alert', 'report', 'complaint', 'reply', 'cancellation'],
          required: true
        },
        title: { type: String, required: true },
        body: { type: String, required: true }
      }
    ],
    audioUrl: { type: String, default: null },
    escalate: { type: Boolean, default: false },
    disclaimer: { type: String, required: true }
  },
  {
    timestamps: true
  }
);

AnalysisSchema.index({ createdAt: -1 });

export const Analysis = mongoose.model<IAnalysis>('Analysis', AnalysisSchema);
