import { SocialMediaWrapper } from './base';
import axios from 'axios';
import type { PostContent, PostResult, SocialMediaAccount } from './social-media.types';

export class LinkedInWrapper extends SocialMediaWrapper {
  private clientId = process.env.LINKEDIN_CLIENT_ID!;
  private clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
  private redirectUri = process.env.LINKEDIN_REDIRECT_URI!;
  private apiUrl = 'https://api.linkedin.com/v2';
  private openIdUrl = 'https://api.linkedin.com/v2/userinfo'; // OpenID Connect endpoint

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope: 'openid profile email w_member_social',
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<SocialMediaAccount> {
    try {
      // Exchange code for access token
      const tokenResponse = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, expires_in } = tokenResponse.data;

      // Get user info using OpenID Connect endpoint
      const profileResponse = await axios.get(this.openIdUrl, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      // Extract user information from OpenID response
      const { sub: id, name, email, picture } = profileResponse.data;

      return {
        id,
        username: name || email,
        profilePicture: picture,
        accessToken: access_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      };
    } catch (error) {
      this.handleApiError(error, 'LinkedIn');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
    try {
      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return {
        accessToken: response.data.access_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
      };
    } catch (error) {
      this.handleApiError(error, 'LinkedIn');
    }
  }

  async createPost(accessToken: string, content: PostContent): Promise<PostResult> {
    try {
      const authorId = await this.getAuthorId(accessToken);

      let shareContent: any = {
        author: `urn:li:person:${authorId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: this.formatText(content),
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      // Handle images
      if (content.images && content.images.length > 0) {
        const mediaUrns = await this.uploadImages(accessToken, authorId, content.images);

        shareContent.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
        shareContent.specificContent['com.linkedin.ugc.ShareContent'].media = mediaUrns.map(urn => ({
          status: 'READY',
          media: urn,
        }));
      }

      const response = await axios.post(
        `${this.apiUrl}/ugcPosts`,
        shareContent,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      const postId = response.headers['x-restli-id'];

      return {
        success: true,
        postId,
        url: `https://www.linkedin.com/feed/update/${postId}`,
      };
    } catch (error) {
      this.handleApiError(error, 'LinkedIn');
    }
  }

  private async uploadImages(
    accessToken: string,
    authorId: string,
    imageUrls: string[]
  ): Promise<string[]> {
    const uploadedUrns: string[] = [];

    for (const imageUrl of imageUrls) {
      // Step 1: Register upload
      const registerResponse = await axios.post(
        `${this.apiUrl}/assets?action=registerUpload`,
        {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: `urn:li:person:${authorId}`,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const uploadUrl = registerResponse.data.value.uploadMechanism[
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
      ].uploadUrl;
      const asset = registerResponse.data.value.asset;

      // Step 2: Download image
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });

      // Step 3: Upload to LinkedIn
      await axios.post(uploadUrl, imageResponse.data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream',
        },
      });

      uploadedUrns.push(asset);
    }

    return uploadedUrns;
  }

  private formatText(content: PostContent): string {
    let text = content.text;

    if (content.hashtags && content.hashtags.length > 0) {
      text += '\n\n' + content.hashtags.map(tag => `#${tag.replace('#', '')}`).join(' ');
    }

    return text;
  }

  private async getAuthorId(accessToken: string): Promise<string> {
    // Use OpenID Connect endpoint to get user info
    const response = await axios.get(this.openIdUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    // The 'sub' field contains the LinkedIn member ID
    return response.data.sub;
  }

  async deletePost(accessToken: string, postId: string): Promise<boolean> {
    try {
      await axios.delete(`${this.apiUrl}/ugcPosts/${postId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });
      return true;
    } catch (error) {
      this.handleApiError(error, 'LinkedIn');
    }
  }

  async getAccountInfo(accessToken: string): Promise<SocialMediaAccount> {
    try {
      // Use OpenID Connect endpoint
      const response = await axios.get(this.openIdUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const { sub: id, name, email, picture } = response.data;

      return {
        id,
        username: name || email,
        profilePicture: picture,
        accessToken,
      };
    } catch (error) {
      this.handleApiError(error, 'LinkedIn');
    }
  }
}