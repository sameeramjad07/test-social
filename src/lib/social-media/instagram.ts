import { SocialMediaWrapper } from './base';
import axios from 'axios';
import type { PostContent, PostResult, SocialMediaAccount } from './social-media.types';

export class InstagramWrapper extends SocialMediaWrapper {
  private clientId = process.env.INSTAGRAM_CLIENT_ID!;
  private clientSecret = process.env.INSTAGRAM_CLIENT_SECRET!;
  private redirectUri = process.env.INSTAGRAM_REDIRECT_URI!;
  private apiVersion = 'v23.0';

  getAuthUrl(state: string): string {
    console.log(this.redirectUri)
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'instagram_business_basic',
      response_type: 'code',
      state,
    });

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<SocialMediaAccount> {
    try {
      // Create form data for the request
      const formData = new URLSearchParams();
      formData.append('client_id', this.clientId);
      formData.append('client_secret', this.clientSecret);
      formData.append('grant_type', 'authorization_code');
      formData.append('redirect_uri', this.redirectUri);
      formData.append('code', code);

      console.log('Sending request with params:', {
        client_id: this.clientId,
        client_secret: this.clientSecret.substring(0, 4) + '...', // Log partial secret for debugging
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        code: code.substring(0, 20) + '...', // Log partial code for debugging
      });

      // Exchange code for short-lived token
      const tokenResponse = await axios.post(
        'https://api.instagram.com/oauth/access_token',
        formData.toString(), // Convert URLSearchParams to string
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded', // Correct header format
          }
        }
      );

      const { access_token, user_id } = tokenResponse.data;

      // Exchange short-lived token for long-lived token
      const longLivedResponse = await axios.get(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${this.clientSecret}&access_token=${access_token}`
      );

      const longLivedToken = longLivedResponse.data.access_token;
      const expiresIn = longLivedResponse.data.expires_in; // 60 days

      // Get user info
      const userResponse = await axios.get(
        `https://graph.instagram.com/${this.apiVersion}/${user_id}?fields=id,username,profile_picture_url&access_token=${longLivedToken}`
      );

      return {
        id: userResponse.data.id,
        username: userResponse.data.username,
        profilePicture: userResponse.data.profile_picture_url,
        accessToken: longLivedToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };
    } catch (error:any) {
      console.error('Instagram OAuth Error:', error.response?.data || error);
      this.handleApiError(error, 'Instagram');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
    try {
      const response = await axios.get(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${refreshToken}`
      );

      return {
        accessToken: response.data.access_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
      };
    } catch (error) {
      this.handleApiError(error, 'Instagram');
    }
  }

  async createPost(accessToken: string, content: PostContent): Promise<PostResult> {
    try {
      const igUserId = await this.getIgUserId(accessToken);

      if (content.images && content.images.length > 0) {
        if (content.images.length === 1) {
          // Single image post
          return await this.createSingleImagePost(igUserId, accessToken, content);
        } else {
          // Carousel post
          return await this.createCarouselPost(igUserId, accessToken, content);
        }
      } else {
        throw new Error('Instagram requires at least one image for posts');
      }
    } catch (error) {
      this.handleApiError(error, 'Instagram');
    }
  }

  private async createSingleImagePost(
    igUserId: string,
    accessToken: string,
    content: PostContent
  ): Promise<PostResult> {
    // Step 1: Create media container
    const containerResponse = await axios.post(
      `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media`,
      {
        image_url: content.images![0],
        caption: this.formatCaption(content),
        access_token: accessToken,
      }
    );

    const creationId = containerResponse.data.id;

    // Step 2: Publish the media
    const publishResponse = await axios.post(
      `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media_publish`,
      {
        creation_id: creationId,
        access_token: accessToken,
      }
    );

    return {
      success: true,
      postId: publishResponse.data.id,
      url: `https://www.instagram.com/p/${publishResponse.data.id}/`,
    };
  }

  private async createCarouselPost(
    igUserId: string,
    accessToken: string,
    content: PostContent
  ): Promise<PostResult> {
    // Step 1: Create media containers for each image
    const mediaIds = await Promise.all(
      content.images!.map(async (imageUrl) => {
        const response = await axios.post(
          `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media`,
          {
            image_url: imageUrl,
            is_carousel_item: true,
            access_token: accessToken,
          }
        );
        return response.data.id;
      })
    );

    // Step 2: Create carousel container
    const carouselResponse = await axios.post(
      `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media`,
      {
        media_type: 'CAROUSEL',
        children: mediaIds.join(','),
        caption: this.formatCaption(content),
        access_token: accessToken,
      }
    );

    const creationId = carouselResponse.data.id;

    // Step 3: Publish the carousel
    const publishResponse = await axios.post(
      `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media_publish`,
      {
        creation_id: creationId,
        access_token: accessToken,
      }
    );

    return {
      success: true,
      postId: publishResponse.data.id,
      url: `https://www.instagram.com/p/${publishResponse.data.id}/`,
    };
  }

  private formatCaption(content: PostContent): string {
    let caption = content.text;

    if (content.hashtags && content.hashtags.length > 0) {
      caption += '\n\n' + content.hashtags.map(tag => `#${tag.replace('#', '')}`).join(' ');
    }

    if (content.mentions && content.mentions.length > 0) {
      caption = content.mentions.map(mention => `@${mention.replace('@', '')}`).join(' ') + ' ' + caption;
    }

    return caption;
  }

  private async getIgUserId(accessToken: string): Promise<string> {
    const response = await axios.get(
      `https://graph.facebook.com/${this.apiVersion}/me?fields=id&access_token=${accessToken}`
    );
    return response.data.id;
  }

  async deletePost(accessToken: string, postId: string): Promise<boolean> {
    try {
      await axios.delete(
        `https://graph.facebook.com/${this.apiVersion}/${postId}?access_token=${accessToken}`
      );
      return true;
    } catch (error) {
      this.handleApiError(error, 'Instagram');
    }
  }

  async getAccountInfo(accessToken: string): Promise<SocialMediaAccount> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/me?fields=id,username,profile_picture_url&access_token=${accessToken}`
      );

      return {
        id: response.data.id,
        username: response.data.username,
        profilePicture: response.data.profile_picture_url,
        accessToken,
      };
    } catch (error) {
      this.handleApiError(error, 'Instagram');
    }
  }
}