import mongoose from 'mongoose';
import { AgentRun, IToolCallTrace } from './agent-run.model.js';
import { agentToolRegistry, AgentContext } from './agent.tools.js';
import { AppError } from '../../common/errors/app-error.js';
import { logger } from '../../config/logger.js';
import { aiProvider } from './provider.adapter.js';

export class AgentService {
  /**
   * Orchestrates the agent loop:
   * Intent -> Tool Execution -> Verification -> Grounded Response -> Audit Logging
   */
  async processQuery(context: AgentContext, prompt: string) {
    const startTime = Date.now();
    const toolCallsTrace: IToolCallTrace[] = [];

    let responseText = '';

    try {
      // 1. Intent Detection & Tool Selection via AI Provider Adapter (with automatic offline fallback)
      const providerResult = await aiProvider.processPrompt(context, prompt, agentToolRegistry);

      if (providerResult.toolName === 'calculate_reorder') {
        const toolResult = await this.executeTool(
          context,
          'calculate_reorder',
          providerResult.toolArgs || { windowDays: 14 },
          toolCallsTrace
        );
        if (toolResult.length === 0) {
          responseText =
            '✅ Good news! All products currently have healthy stock levels above their reorder thresholds. No replenishment is urgently needed today.';
        } else {
          const list = toolResult
            .map(
              (r: any) =>
                `• **${r.productName}** (${r.category}): On hand: ${r.currentStock} ${r.unit}. Velocity: ~${r.averageDailyDemand} ${r.unit}/day. Recommended reorder: **${r.suggestedReorderQty} ${r.unit}** (Lead time: ${r.leadTimeDays}d, Safety: ${r.safetyCoverDays}d). [Data: ${r.dataQuality}]`
            )
            .join('\n');
          responseText = `📦 **Replenishment Recommendations:**\n\nFound ${toolResult.length} item(s) that are below safe reorder thresholds:\n\n${list}\n\n*Would you like me to prepare a draft purchase order for any of these items?*`;
        }
      } else if (providerResult.toolName === 'get_low_stock_items') {
        const toolResult = await this.executeTool(context, 'get_low_stock_items', {}, toolCallsTrace);
        if (toolResult.length === 0) {
          responseText = '✅ None of your items are currently low on stock.';
        } else {
          const list = toolResult
            .map(
              (s: any) =>
                `• **${s.name}**: Current stock ${s.onHandQty} ${s.unit} (Reorder point: ${s.reorderPoint} ${s.unit}) — *${s.stockStatus}*`
            )
            .join('\n');
          responseText = `⚠️ **Low Stock Alert:**\n\n${toolResult.length} item(s) are running low:\n\n${list}`;
        }
      } else if (providerResult.toolName === 'get_expiry_risks') {
        const toolResult = await this.executeTool(
          context,
          'get_expiry_risks',
          providerResult.toolArgs || { horizonDays: 30 },
          toolCallsTrace
        );
        if (toolResult.length === 0) {
          responseText = '✅ No products or batches are expiring within the next 30 days.';
        } else {
          const list = toolResult
            .map(
              (e: any) =>
                `• **${e.productName}** (Batch ${e.batchCode}): ${e.remainingQty} ${e.unit} expiring on ${new Date(e.expiryDate).toLocaleDateString()} (${e.daysUntilExpiry} days left). Tied capital: ₹${e.tiedCapital}. Status: *${e.status}*`
            )
            .join('\n');
          responseText = `⏳ **Near-Expiry Warning:**\n\n${toolResult.length} lot(s) require attention:\n\n${list}\n\n*Consider offering a discount or returning to supplier before expiry.*`;
        }
      } else if (providerResult.toolName === 'get_dead_stock_summary') {
        const toolResult = await this.executeTool(
          context,
          'get_dead_stock_summary',
          {},
          toolCallsTrace
        );
        const summary = toolResult.summary;
        responseText = `💰 **Dead Stock & Ageing Inventory Analysis (PS-01):**\n\nTotal capital tied up in inventory: **₹${summary.totalLockedCapital}**\n\n**Ageing Breakdown:**\n• **0-30 Days (Active):** ${summary.bucket0_30.count} SKUs (₹${summary.bucket0_30.capital})\n• **31-60 Days (Slow):** ${summary.bucket31_60.count} SKUs (₹${summary.bucket31_60.capital})\n• **61-90 Days (At Risk):** ${summary.bucket61_90.count} SKUs (₹${summary.bucket61_90.capital})\n• **90+ Days (Dead Stock):** ${summary.bucket90Plus.count} SKUs (₹${summary.bucket90Plus.capital})\n\n${summary.bucket90Plus.count > 0 ? `⚠️ Urgent: You have ₹${summary.bucket90Plus.capital} in 90+ day dead stock. Consider counter promotions or returns to free locked cash.` : '✅ No severe dead stock (>90 days) detected.'}`;
      } else if (providerResult.toolName === 'get_cash_budget_plan') {
        const toolResult = await this.executeTool(
          context,
          'get_cash_budget_plan',
          providerResult.toolArgs || { budgetLimit: 5000 },
          toolCallsTrace
        );
        responseText = `💵 **Cash-Constrained Purchase Plan (PS-12):**\n\nBudget: ₹${toolResult.budgetLimit} | Allocated: **₹${toolResult.allocatedAmount}** (${toolResult.utilizationPercentage}%)\nRemaining Cash Buffer: ₹${toolResult.remainingCashBuffer}\n\n**Allocated SKUs (${toolResult.allocatedItems.length}):**\n` +
          toolResult.allocatedItems.map((a: any) => `• **${a.productName}**: ${a.allocatedQty} ${a.unit} @ ₹${a.unitCost} = ₹${a.lineCost}`).join('\n') +
          (toolResult.deferredItems.length > 0 ? `\n\n**Deferred SKUs (${toolResult.deferredItems.length}):**\n` + toolResult.deferredItems.map((d: any) => `• ${d.productName}: ${d.deferralReason}`).join('\n') : '');
      } else if (providerResult.toolName === 'get_khata_summary') {
        const toolResult = await this.executeTool(
          context,
          'get_khata_summary',
          {},
          toolCallsTrace
        );
        responseText = `📒 **Customer Khata & Liquidity Status (PS-08):**\n\n• **Liquid Cash Available:** ₹${toolResult.availableLiquidCash}\n• **Total Uncollected Khata:** ₹${toolResult.totalUncollectedReceivables} (across ${toolResult.khataCustomerCount} customers)\n• **Safe Purchase Budget:** **₹${toolResult.safeReplenishmentCashCap}**\n\n🛡️ *${toolResult.ownerGuidance}*`;
      } else if (providerResult.toolName === 'plan_festival_demand') {
        const toolResult = await this.executeTool(
          context,
          'plan_festival_demand',
          providerResult.toolArgs || { festivalId: 'diwali' },
          toolCallsTrace
        );
        responseText = `🎉 **${toolResult.festival.name} Demand Surge Scenarios (PS-04):**\n\n• **Conservative (+25%):** ₹${toolResult.scenarios.conservative.totalIncrementalCapital} capital (${toolResult.scenarios.conservative.skusCount} SKUs)\n• **Moderate (+60%):** ₹${toolResult.scenarios.moderate.totalIncrementalCapital} capital (${toolResult.scenarios.moderate.skusCount} SKUs)\n• **Aggressive (+120%):** ₹${toolResult.scenarios.aggressive.totalIncrementalCapital} capital (${toolResult.scenarios.aggressive.skusCount} SKUs)\n\n*${toolResult.ownerDisclaimer}*`;
      } else if (providerResult.toolName && agentToolRegistry[providerResult.toolName]) {
        const toolResult = await this.executeTool(
          context,
          providerResult.toolName,
          providerResult.toolArgs || {},
          toolCallsTrace
        );
        responseText = `Executed ${providerResult.toolName} successfully:\n${JSON.stringify(toolResult, null, 2)}`;
      } else if (providerResult.textResponse) {
        responseText = providerResult.textResponse;
      } else {
        const toolResult = await this.executeTool(context, 'get_inventory_summary', {}, toolCallsTrace);
        const lowCount = toolResult.filter((p: any) => p.isLowStock).length;
        responseText =
          `🏪 **Shop Inventory Status:**\n\nYou currently have **${toolResult.length} active products** in your catalogue. ${lowCount > 0 ? `⚠️ **${lowCount} items** are currently at or below their reorder point.` : 'All items are currently at healthy stock levels.'}\n\nYou can ask me:\n• *"What should I reorder?"*\n• *"Show low stock items"*\n• *"Analyze dead stock"*\n• *"Plan replenishment with 5000 budget"*\n• *"How much is in customer khata?"*`;
      }

      const durationMs = Date.now() - startTime;

      // 2. Persist Agent Run Audit
      const agentRun = new AgentRun({
        shopId: new mongoose.Types.ObjectId(context.shopId),
        userId: new mongoose.Types.ObjectId(context.userId),
        prompt,
        response: responseText,
        toolCalls: toolCallsTrace,
        status: 'completed',
        durationMs
      });
      await agentRun.save();

      return {
        runId: agentRun._id.toString(),
        prompt,
        response: responseText,
        toolCalls: toolCallsTrace,
        durationMs
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      logger.error('Agent execution error', err);

      const agentRun = new AgentRun({
        shopId: new mongoose.Types.ObjectId(context.shopId),
        userId: new mongoose.Types.ObjectId(context.userId),
        prompt,
        response: 'Sorry, I encountered an error executing this request.',
        toolCalls: toolCallsTrace,
        status: 'failed',
        durationMs
      });
      await agentRun.save();

      throw err;
    }
  }

  private async executeTool(
    context: AgentContext,
    toolName: string,
    rawParams: any,
    traceLog: IToolCallTrace[]
  ) {
    const tool = agentToolRegistry[toolName];
    if (!tool) {
      throw AppError.badRequest(`Unrecognized agent tool: ${toolName}`);
    }

    if (tool.requiredRoles && !tool.requiredRoles.includes(context.role)) {
      throw AppError.forbidden(`Your role (${context.role}) is not authorized to invoke tool: ${toolName}`);
    }

    const validatedParams = tool.parameters.parse(rawParams);
    const toolStart = Date.now();

    try {
      const output = await tool.execute(context, validatedParams);
      const executionTimeMs = Date.now() - toolStart;

      traceLog.push({
        toolName,
        parameters: validatedParams,
        result: output,
        status: 'success',
        durationMs: executionTimeMs
      });

      return output;
    } catch (toolErr: any) {
      const executionTimeMs = Date.now() - toolStart;
      traceLog.push({
        toolName,
        parameters: validatedParams,
        result: null,
        errorMessage: toolErr.message,
        status: 'error',
        durationMs: executionTimeMs
      });
      throw toolErr;
    }
  }

  async listRuns(shopId: string, limit = 50) {
    return AgentRun.find({ shopId: new mongoose.Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

export const agentService = new AgentService();
