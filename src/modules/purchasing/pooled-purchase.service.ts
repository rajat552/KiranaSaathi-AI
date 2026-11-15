import mongoose from 'mongoose';
import { PooledPurchaseProposal, IPooledPurchaseProposal } from './pooled-purchase.model.js';
import { AppError } from '../../common/errors/app-error.js';

export class PooledPurchaseService {
  async createProposal(
    shopId: string,
    ownerId: string,
    data: {
      title: string;
      category: string;
      productDescription: string;
      regularPrice: number;
      bulkDiscountPrice: number;
      minimumTargetQty: number;
      initialCommitmentQty?: number;
      expiresInDays?: number;
    }
  ): Promise<IPooledPurchaseProposal> {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const ownerObjectId = new mongoose.Types.ObjectId(ownerId);

    const initialCommit = data.initialCommitmentQty || 0;
    const expiresAt = new Date(Date.now() + (data.expiresInDays || 7) * 24 * 60 * 60 * 1000);

    const participatingShops = [];
    if (initialCommit > 0) {
      participatingShops.push({
        shopId: shopObjectId,
        ownerId: ownerObjectId,
        requestedQty: initialCommit,
        approved: true,
        approvedAt: new Date()
      });
    }

    const proposal = new PooledPurchaseProposal({
      title: data.title,
      category: data.category,
      productDescription: data.productDescription,
      regularPrice: data.regularPrice,
      bulkDiscountPrice: data.bulkDiscountPrice,
      minimumTargetQty: data.minimumTargetQty,
      totalCommittedQty: initialCommit,
      status: initialCommit >= data.minimumTargetQty ? 'TARGET_REACHED' : 'OPEN',
      expiresAt,
      participatingShops,
      createdByShopId: shopObjectId
    });

    await proposal.save();
    return proposal;
  }

  async listProposals(status?: string): Promise<IPooledPurchaseProposal[]> {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    return PooledPurchaseProposal.find(filter).sort({ createdAt: -1 });
  }

  async joinProposal(
    proposalId: string,
    shopId: string,
    ownerId: string,
    requestedQty: number
  ): Promise<IPooledPurchaseProposal> {
    if (requestedQty <= 0) throw AppError.badRequest('Requested quantity must be at least 1');

    const proposal = await PooledPurchaseProposal.findById(proposalId);
    if (!proposal) throw AppError.notFound('Pooled purchase proposal not found');
    if (proposal.status !== 'OPEN') {
      throw AppError.badRequest(`Cannot join proposal in status "${proposal.status}"`);
    }

    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const ownerObjectId = new mongoose.Types.ObjectId(ownerId);

    const existingIndex = proposal.participatingShops.findIndex(
      p => p.shopId.toString() === shopId
    );

    if (existingIndex >= 0) {
      proposal.participatingShops[existingIndex].requestedQty = requestedQty;
      proposal.participatingShops[existingIndex].approved = false; // requires re-approval
      proposal.participatingShops[existingIndex].approvedAt = undefined;
    } else {
      proposal.participatingShops.push({
        shopId: shopObjectId,
        ownerId: ownerObjectId,
        requestedQty,
        approved: false
      });
    }

    // Recalculate total committed quantity
    proposal.totalCommittedQty = proposal.participatingShops.reduce(
      (sum, p) => sum + p.requestedQty,
      0
    );

    if (proposal.totalCommittedQty >= proposal.minimumTargetQty) {
      proposal.status = 'TARGET_REACHED';
    }

    await proposal.save();
    return proposal;
  }

  /**
   * PS-15 Invariant: Only the shop owner can approve their specific shop's financial liability
   */
  async approveShopLiability(
    proposalId: string,
    shopId: string,
    ownerId: string
  ): Promise<IPooledPurchaseProposal> {
    const proposal = await PooledPurchaseProposal.findById(proposalId);
    if (!proposal) throw AppError.notFound('Pooled purchase proposal not found');

    const commitment = proposal.participatingShops.find(p => p.shopId.toString() === shopId);
    if (!commitment) {
      throw AppError.badRequest('Shop has not joined this pooled proposal');
    }

    // Security check: owner validation
    if (commitment.ownerId.toString() !== ownerId) {
      throw AppError.forbidden('Only the authorized owner of this shop can approve its liability');
    }

    commitment.approved = true;
    commitment.approvedAt = new Date();

    await proposal.save();
    return proposal;
  }
}

export const pooledPurchaseService = new PooledPurchaseService();
