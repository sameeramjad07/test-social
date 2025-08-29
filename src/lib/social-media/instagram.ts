import { SocialMediaWrapper } from "./base";
import axios from "axios";
import type {
  PostContent,
  PostResult,
  SocialMediaAccount,
  AccountInsights,
  InsightsTimeRange,
} from "./social-media.types";

export class InstagramWrapper extends SocialMediaWrapper {
  private clientId = process.env.INSTAGRAM_CLIENT_ID!;
  private clientSecret = process.env.INSTAGRAM_CLIENT_SECRET!;
  private redirectUri = process.env.INSTAGRAM_REDIRECT_URI!;
  private apiVersion = "v23.0";

  getAuthUrl(state: string): string {
    console.log(this.redirectUri);
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: "instagram_business_basic",
      response_type: "code",
      state,
    });

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  async handleCallback(
    code: string,
    state: string
  ): Promise<SocialMediaAccount> {
    try {
      // Create form data for the request
      const formData = new URLSearchParams();
      formData.append("client_id", this.clientId);
      formData.append("client_secret", this.clientSecret);
      formData.append("grant_type", "authorization_code");
      formData.append("redirect_uri", this.redirectUri);
      formData.append("code", code);

      console.log("Sending request with params:", {
        client_id: this.clientId,
        client_secret: this.clientSecret.substring(0, 4) + "...", // Log partial secret for debugging
        grant_type: "authorization_code",
        redirect_uri: this.redirectUri,
        code: code.substring(0, 20) + "...", // Log partial code for debugging
      });

      // Exchange code for short-lived token
      const tokenResponse = await axios.post(
        "https://api.instagram.com/oauth/access_token",
        formData.toString(), // Convert URLSearchParams to string
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded", // Correct header format
          },
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
    } catch (error: any) {
      console.error("Instagram OAuth Error:", error.response?.data || error);
      this.handleApiError(error, "Instagram");
    }
  }

  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; expiresAt?: Date }> {
    try {
      const response = await axios.get(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${refreshToken}`
      );

      return {
        accessToken: response.data.access_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
      };
    } catch (error) {
      this.handleApiError(error, "Instagram");
    }
  }

  async createPost(
    accessToken: string,
    content: PostContent
  ): Promise<PostResult> {
    try {
      const igUserId = await this.getIgUserId(accessToken);

      if (content.images && content.images.length > 0) {
        if (content.images.length === 1) {
          // Single image post
          return await this.createSingleImagePost(
            igUserId,
            accessToken,
            content
          );
        } else {
          // Carousel post
          return await this.createCarouselPost(igUserId, accessToken, content);
        }
      } else {
        throw new Error("Instagram requires at least one image for posts");
      }
    } catch (error) {
      this.handleApiError(error, "Instagram");
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
        media_type: "CAROUSEL",
        children: mediaIds.join(","),
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
      caption +=
        "\n\n" +
        content.hashtags.map((tag) => `#${tag.replace("#", "")}`).join(" ");
    }

    if (content.mentions && content.mentions.length > 0) {
      caption =
        content.mentions
          .map((mention) => `@${mention.replace("@", "")}`)
          .join(" ") +
        " " +
        caption;
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
      this.handleApiError(error, "Instagram");
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
      this.handleApiError(error, "Instagram");
    }
  }
  // Add this method to your InstagramWrapper class

  async getAccountInsights(
    accessToken: string,
    timeRange: InsightsTimeRange = { days: 30 }
  ): Promise<AccountInsights> {
    try {
      const igUserId = await this.getIgUserId(accessToken);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      if (timeRange.days) {
        startDate.setDate(endDate.getDate() - timeRange.days);
      } else if (timeRange.startDate && timeRange.endDate) {
        startDate.setTime(new Date(timeRange.startDate).getTime());
        endDate.setTime(new Date(timeRange.endDate).getTime());
      }

      const since = Math.floor(startDate.getTime() / 1000);
      const until = Math.floor(endDate.getTime() / 1000);

      // Get account info with counts
      const accountInfoResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${igUserId}?fields=followers_count,follows_count,media_count,profile_picture_url,username&access_token=${accessToken}`
      );

      // Get account insights
      const accountInsightsResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${igUserId}/insights?metric=impressions,reach,profile_views&period=day&since=${since}&until=${until}&access_token=${accessToken}`
      );

      // Get media (posts) from the time range
      const mediaResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media?fields=id,media_type,media_url,permalink,timestamp,caption&limit=100&access_token=${accessToken}`
      );

      // Filter media within date range
      const mediaInRange = mediaResponse.data.data.filter((media: any) => {
        const mediaDate = new Date(media.timestamp);
        return mediaDate >= startDate && mediaDate <= endDate;
      });

      // Get insights for each media item to find top posts
      const mediaWithInsights = await Promise.all(
        mediaInRange.slice(0, 10).map(async (media: any) => {
          try {
            const mediaInsightsResponse = await axios.get(
              `https://graph.facebook.com/${this.apiVersion}/${media.id}/insights?metric=impressions,reach,engagement&access_token=${accessToken}`
            );

            const insights = mediaInsightsResponse.data.data.reduce(
              (acc: any, insight: any) => {
                acc[insight.name] = insight.values[0]?.value || 0;
                return acc;
              },
              {}
            );

            return {
              ...media,
              insights,
            };
          } catch (error) {
            return {
              ...media,
              insights: { impressions: 0, reach: 0, engagement: 0 },
            };
          }
        })
      );

      // Calculate total metrics
      let totalImpressions = 0;
      let totalReach = 0;
      let totalProfileViews = 0;
      let totalEngagement = 0;

      accountInsightsResponse.data.data.forEach((insight: any) => {
        const totalValue = insight.values.reduce(
          (sum: number, value: any) => sum + (value.value || 0),
          0
        );

        switch (insight.name) {
          case "impressions":
            totalImpressions = totalValue;
            break;
          case "reach":
            totalReach = totalValue;
            break;
          case "profile_views":
            totalProfileViews = totalValue;
            break;
        }
      });

      // Calculate engagement from media
      totalEngagement = mediaWithInsights.reduce((sum, media) => {
        return sum + (media.insights?.engagement || 0);
      }, 0);

      // Get demographic insights if available
      let demographics = {};
      try {
        const audienceResponse = await axios.get(
          `https://graph.facebook.com/${this.apiVersion}/${igUserId}/insights?metric=audience_gender_age,audience_city,audience_country&period=lifetime&access_token=${accessToken}`
        );

        const audienceData = audienceResponse.data.data.reduce(
          (acc: any, insight: any) => {
            acc[insight.name] = insight.values[0]?.value || {};
            return acc;
          },
          {}
        );

        demographics = {
          genderSplit: Object.entries(
            audienceData.audience_gender_age || {}
          ).map(([key, value]: [string, any]) => ({
            gender: key,
            percentage: parseFloat(
              (
                (value /
                  Object.values(audienceData.audience_gender_age || {}).reduce(
                    (a: number, b: any) => a + b,
                    0
                  )) *
                100
              ).toFixed(2)
            ),
          })),
          topCountries: Object.entries(audienceData.audience_country || {})
            .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
            .slice(0, 5)
            .map(([country, count]: [string, any]) => ({
              country,
              percentage: parseFloat(
                (
                  (count /
                    Object.values(audienceData.audience_country || {}).reduce(
                      (a: number, b: any) => a + b,
                      0
                    )) *
                  100
                ).toFixed(2)
              ),
            })),
          topCities: Object.entries(audienceData.audience_city || {})
            .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
            .slice(0, 5)
            .map(([city, count]: [string, any]) => ({
              city,
              percentage: parseFloat(
                (
                  (count /
                    Object.values(audienceData.audience_city || {}).reduce(
                      (a: number, b: any) => a + b,
                      0
                    )) *
                  100
                ).toFixed(2)
              ),
            })),
        };
      } catch (error) {
        // Demographic data might not be available for all accounts
        console.warn("Instagram demographic insights not available:", error);
      }

      // Sort and get top posts by engagement
      const topPosts = mediaWithInsights
        .sort(
          (a, b) =>
            (b.insights?.engagement || 0) - (a.insights?.engagement || 0)
        )
        .slice(0, 5)
        .map((media) => ({
          id: media.id,
          type: media.media_type,
          createdAt: media.timestamp,
          impressions: media.insights?.impressions || 0,
          engagement: media.insights?.engagement || 0,
          url: media.permalink,
        }));

      const engagementRate =
        totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;

      return {
        platform: "instagram",
        accountId: igUserId,
        timeRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        metrics: {
          followers: accountInfoResponse.data.followers_count,
          following: accountInfoResponse.data.follows_count,
          posts: accountInfoResponse.data.media_count,
          impressions: totalImpressions,
          reach: totalReach,
          engagement: totalEngagement,
          engagementRate: parseFloat(engagementRate.toFixed(2)),
          profileViews: totalProfileViews,
        },
        demographics,
        topPosts,
      };
    } catch (error: any) {
      console.error(
        "Instagram insights error:",
        error.response?.data || error.message
      );
      this.handleApiError(error, "Instagram");
    }
  }
}
