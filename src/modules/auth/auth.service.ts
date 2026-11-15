import { User, IUser } from './auth.model.js';
import { RegisterInput, LoginInput } from './auth.schema.js';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken, verifyRefreshToken, computeSha256 } from '../../common/utils/crypto.js';
import { AppError } from '../../common/errors/app-error.js';
import { AuthUser } from '../../common/types/index.js';
import { Membership } from '../shops/membership.model.js';

export class AuthService {
  async register(input: RegisterInput) {
    const query: Record<string, unknown>[] = [];
    if (input.email) query.push({ email: input.email.toLowerCase() });
    if (input.phone) query.push({ phone: input.phone });

    const existingUser = await User.findOne({ $or: query });
    if (existingUser) {
      throw AppError.conflict('User with this email or phone already exists', 'USER_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(input.password);
    const user = new User({
      name: input.name,
      email: input.email?.toLowerCase(),
      phone: input.phone,
      passwordHash
    });

    await user.save();

    const authUser: AuthUser = {
      userId: user._id.toString(),
      email: user.email,
      phone: user.phone,
      name: user.name
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    user.refreshTokenHash = computeSha256(refreshToken);
    await user.save();

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      accessToken,
      refreshToken
    };
  }

  async login(input: LoginInput) {
    const identifier = input.identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }]
    });

    if (!user || user.status !== 'active') {
      throw AppError.unauthorized('Invalid email/phone or password', 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await comparePassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw AppError.unauthorized('Invalid email/phone or password', 'INVALID_CREDENTIALS');
    }

    const authUser: AuthUser = {
      userId: user._id.toString(),
      email: user.email,
      phone: user.phone,
      name: user.name
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    user.refreshTokenHash = computeSha256(refreshToken);
    await user.save();

    const memberships = await Membership.find({ userId: user._id, status: 'active' }).populate('shopId', 'name');

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      memberships: memberships.map(m => ({
        id: m._id.toString(),
        shopId: (m.shopId as any)?._id?.toString() || m.shopId.toString(),
        shopName: (m.shopId as any)?.name || 'Unknown Shop',
        role: m.role
      })),
      accessToken,
      refreshToken
    };
  }

  async refresh(refreshToken: string) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.sub);

      if (!user || user.status !== 'active') {
        throw AppError.unauthorized('Invalid refresh session');
      }

      const providedHash = computeSha256(refreshToken);
      if (user.refreshTokenHash !== providedHash) {
        // Reuse detection / revocation
        user.refreshTokenHash = undefined;
        await user.save();
        throw AppError.unauthorized('Refresh token revoked or reused', 'REVOKED_TOKEN');
      }

      const authUser: AuthUser = {
        userId: user._id.toString(),
        email: user.email,
        phone: user.phone,
        name: user.name
      };

      const newAccessToken = generateAccessToken(authUser);
      const newRefreshToken = generateRefreshToken(authUser);

      user.refreshTokenHash = computeSha256(newRefreshToken);
      await user.save();

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw AppError.unauthorized('Invalid or expired refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId).select('-passwordHash -refreshTokenHash');
    if (!user) throw AppError.notFound('User not found');

    const memberships = await Membership.find({ userId: user._id, status: 'active' }).populate('shopId', 'name address');

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      memberships: memberships.map(m => ({
        id: m._id.toString(),
        shopId: (m.shopId as any)?._id?.toString() || m.shopId.toString(),
        shopName: (m.shopId as any)?.name || 'Unknown Shop',
        role: m.role
      }))
    };
  }
}

export const authService = new AuthService();
