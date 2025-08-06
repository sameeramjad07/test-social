import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import type { PostContent, PostResult, SocialMediaAccount } from './social-media.types';

export abstract class SocialMediaWrapper {
  protected prisma: PrismaClient;
  
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }
  
  abstract getAuthUrl(state: string): string;
  abstract handleCallback(code: string, state: string): Promise<SocialMediaAccount>;
  abstract refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }>;
  abstract createPost(accessToken: string, content: PostContent): Promise<PostResult>;
  abstract deletePost(accessToken: string, postId: string): Promise<boolean>;
  abstract getAccountInfo(accessToken: string): Promise<SocialMediaAccount>;
  
  protected handleApiError(error: any, platform: string): never {
    console.error(error?.response?.data)
    console.error(`${platform} API Error:`, error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to communicate with ${platform} API`,
      cause: error,
    });
  }
}
