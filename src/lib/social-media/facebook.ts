import { SocialMediaWrapper } from './base';
import axios from 'axios';
import type { PostContent, PostResult, SocialMediaAccount } from './social-media.types';

export class FacebookWrapper extends SocialMediaWrapper {
  private clientId = process.env.FACEBOOK_CLIENT_ID!;
  private clientSecret = process.env.FACEBOOK_CLIENT_SECRET!;
  private redirectUri = process.env.FACEBOOK_REDIRECT_URI!;
  private apiVersion = 'v23.0';
  
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope: 'pages_manage_posts,pages_read_engagement,pages_manage_engagement,pages_show_list',
      response_type: 'code',
    });
    
    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?${params.toString()}`;
  }
  
  async handleCallback(code: string, state: string): Promise<SocialMediaAccount> {
    try {
      // Exchange code for access token
      const tokenResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`,
        {
          params: {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uri: this.redirectUri,
            code,
          },
        }
      );
      
      const { access_token } = tokenResponse.data;
      
      // Get user info and pages
      const userResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/me?fields=id,name,picture&access_token=${access_token}`
      );
      
      // Get pages the user manages
      const pagesResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/me/accounts?access_token=${access_token}`
      );
      
      // For now, we'll use the first page. In production, you'd want to let users select
      const page = pagesResponse.data.data[0];
      if (!page) {
        throw new Error('No Facebook pages found for this account');
      }
      
      return {
        id: page.id,
        username: page.name,
        profilePicture: page.picture?.data?.url,
        accessToken: page.access_token, // Page access token
      };
    } catch (error) {
      this.handleApiError(error, 'Facebook');
    }
  }
  
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.clientId,
            client_secret: this.clientSecret,
            fb_exchange_token: refreshToken,
          },
        }
      );
      
      return {
        accessToken: response.data.access_token,
        expiresAt: response.data.expires_in 
          ? new Date(Date.now() + response.data.expires_in * 1000)
          : undefined,
      };
    } catch (error) {
      this.handleApiError(error, 'Facebook');
    }
  }
  
  async createPost(accessToken: string, content: PostContent): Promise<PostResult> {
    try {
      const pageId = await this.getPageId(accessToken);
      
      let postData: any = {
        message: this.formatMessage(content),
        access_token: accessToken,
      };
      
      // Handle images
      if (content.images && content.images.length > 0) {
        if (content.images.length === 1) {
          // Single image
          postData.url = content.images[0];
          const response = await axios.post(
            `https://graph.facebook.com/${this.apiVersion}/${pageId}/photos`,
            postData
          );
          
          return {
            success: true,
            postId: response.data.id,
            url: `https://www.facebook.com/${response.data.id}`,
          };
        } else {
          // Multiple images - create individual photo posts first
          const photoIds = await Promise.all(
            content.images.map(async (imageUrl) => {
              const response = await axios.post(
                `https://graph.facebook.com/${this.apiVersion}/${pageId}/photos`,
                {
                  url: imageUrl,
                  published: false,
                  access_token: accessToken,
                }
              );
              return response.data.id;
            })
          );
          
          // Create multi-photo post
          postData.attached_media = photoIds.map(id => ({ media_fbid: id }));
        }
      }
      
      // Create the post
      const response = await axios.post(
        `https://graph.facebook.com/${this.apiVersion}/${pageId}/feed`,
        postData
      );
      
      return {
        success: true,
        postId: response.data.id,
        url: `https://www.facebook.com/${response.data.id}`,
      };
    } catch (error) {
      this.handleApiError(error, 'Facebook');
    }
  }
  
  private formatMessage(content: PostContent): string {
    let message = content.text;
    
    if (content.hashtags && content.hashtags.length > 0) {
      message += '\n\n' + content.hashtags.map(tag => `#${tag.replace('#', '')}`).join(' ');
    }
    
    return message;
  }
  
  private async getPageId(accessToken: string): Promise<string> {
    const response = await axios.get(
      `https://graph.facebook.com/${this.apiVersion}/me?access_token=${accessToken}`
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
      this.handleApiError(error, 'Facebook');
    }
  }
  
  async getAccountInfo(accessToken: string): Promise<SocialMediaAccount> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/me?fields=id,name,picture&access_token=${accessToken}`
      );
      
      return {
        id: response.data.id,
        username: response.data.name,
        profilePicture: response.data.picture?.data?.url,
        accessToken,
      };
    } catch (error) {
      this.handleApiError(error, 'Facebook');
    }
  }
}