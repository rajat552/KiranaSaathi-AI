import mongoose from 'mongoose';
import { Shop, IShop } from './shop.model.js';
import { Membership, IMembership } from './membership.model.js';
import { User } from '../auth/auth.model.js';
import { CreateShopInput, AddMemberInput } from './shop.schema.js';
import { AppError } from '../../common/errors/app-error.js';

export class ShopService {
  async createShop(userId: string, input: CreateShopInput) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const shop = new Shop({
      name: input.name,
      ownerId: userObjectId,
      address: input.address,
      timezone: input.timezone || 'Asia/Kolkata',
      defaultCurrency: input.defaultCurrency || 'INR',
      settings: input.settings || {
        defaultLeadTimeDays: 3,
        defaultSafetyCoverDays: 7,
        lowStockThresholdDefault: 10
      }
    });

    await shop.save();

    const membership = new Membership({
      shopId: shop._id,
      userId: userObjectId,
      role: 'owner',
      status: 'active'
    });

    await membership.save();

    return {
      shop: {
        id: shop._id.toString(),
        name: shop.name,
        address: shop.address,
        timezone: shop.timezone,
        defaultCurrency: shop.defaultCurrency,
        settings: shop.settings
      },
      membership: {
        id: membership._id.toString(),
        role: membership.role
      }
    };
  }

  async getShop(shopId: string) {
    const shop = await Shop.findById(shopId);
    if (!shop) throw AppError.notFound('Shop not found');
    return {
      id: shop._id.toString(),
      name: shop.name,
      address: shop.address,
      timezone: shop.timezone,
      defaultCurrency: shop.defaultCurrency,
      settings: shop.settings
    };
  }

  async listMembers(shopId: string) {
    const members = await Membership.find({
      shopId: new mongoose.Types.ObjectId(shopId),
      status: 'active'
    }).populate('userId', 'name email phone');

    return members.map(m => ({
      id: m._id.toString(),
      role: m.role,
      user: {
        id: (m.userId as any)?._id?.toString() || m.userId.toString(),
        name: (m.userId as any)?.name,
        email: (m.userId as any)?.email,
        phone: (m.userId as any)?.phone
      }
    }));
  }

  async addMember(shopId: string, input: AddMemberInput) {
    const identifier = input.emailOrPhone.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }]
    });

    if (!user) {
      throw AppError.notFound(`User with email or phone "${input.emailOrPhone}" not found. Please ask them to register first.`);
    }

    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const existingMembership = await Membership.findOne({
      shopId: shopObjectId,
      userId: user._id
    });

    if (existingMembership) {
      if (existingMembership.status === 'active') {
        throw AppError.conflict('User is already an active member of this shop');
      }
      existingMembership.status = 'active';
      existingMembership.role = input.role;
      await existingMembership.save();
      return {
        id: existingMembership._id.toString(),
        role: existingMembership.role,
        user: { id: user._id.toString(), name: user.name, email: user.email }
      };
    }

    const membership = new Membership({
      shopId: shopObjectId,
      userId: user._id,
      role: input.role,
      status: 'active'
    });

    await membership.save();

    return {
      id: membership._id.toString(),
      role: membership.role,
      user: { id: user._id.toString(), name: user.name, email: user.email }
    };
  }
}

export const shopService = new ShopService();
