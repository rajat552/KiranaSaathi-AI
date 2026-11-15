import mongoose, { Schema, Document } from 'mongoose';

export interface IToolCallTrace {
  toolName: string;
  parameters: any;
  result: any;
  durationMs: number;
  status: 'success' | 'error';
  errorMessage?: string;
}

export interface IAgentRun extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  prompt: string;
  response: string;
  toolCalls: IToolCallTrace[];
  status: 'completed' | 'failed';
  durationMs: number;
  createdAt: Date;
}

const ToolCallTraceSchema = new Schema<IToolCallTrace>(
  {
    toolName: { type: String, required: true },
    parameters: { type: Schema.Types.Mixed },
    result: { type: Schema.Types.Mixed },
    durationMs: { type: Number, required: true },
    status: { type: String, enum: ['success', 'error'], required: true },
    errorMessage: { type: String }
  },
  { _id: false }
);

const AgentRunSchema = new Schema<IAgentRun>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    prompt: { type: String, required: true },
    response: { type: String, required: true },
    toolCalls: { type: [ToolCallTraceSchema], default: [] },
    status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
    durationMs: { type: Number, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AgentRunSchema.index({ shopId: 1, createdAt: -1 });

export const AgentRun = mongoose.model<IAgentRun>('AgentRun', AgentRunSchema);
