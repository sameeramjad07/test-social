import { SocialMediaWrapper } from "./base";
import axios from "axios";
import type {
  PostContent,
  PostResult,
  SocialMediaAccount,
  InsightsTimeRange,
  AccountInsights,
} from "./social-media.types";

export class FacebookWrapper extends SocialMediaWrapper {
  private clientId = process.env.FACEBOOK_CLIENT_ID!;
  private clientSecret = process.env.FACEBOOK_CLIENT_SECRET!;
  private redirectUri = process.env.FACEBOOK_REDIRECT_URI!;
  private apiVersion = "v23.0";

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope:
        "pages_manage_posts,pages_read_engagement,pages_manage_engagement,pages_show_list",
      response_type: "code",
    });

    return `https://www.facebook.com/${
      this.apiVersion
    }/dialog/oauth?${params.toString()}`;
  }

  async handleCallback(
    code: string,
    state: string
  ): Promise<SocialMediaAccount> {
    try {
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

      const userResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/me?fields=id,name,picture&access_token=${access_token}`
      );

      const pagesResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/me/accounts?access_token=${access_token}`
      );

      const page = pagesResponse.data.data[0];
      if (!page) {
        throw new Error(
          'No Facebook pages found. Please ensure your account manages at least one page and has granted the "pages_show_list" permission.'
        );
      }

      return {
        id: page.id,
        username: page.name,
        profilePicture: page.picture?.data?.url,
        accessToken: page.access_token,
        refreshToken: undefined, // Explicitly set to undefined since Facebook page tokens don't use refresh tokens
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Assume 60-day expiration for page tokens
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Facebook API Error:",
          error.response?.data || error.message
        );
      } else {
        console.error("Facebook API Error:", error);
      }
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.error?.message ||
            "Failed to connect Facebook account"
        );
      } else {
        throw new Error(
          "An unknown error occurred while connecting the Facebook account"
        );
      }
    }
  }

  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; expiresAt?: Date }> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`,
        {
          params: {
            grant_type: "fb_exchange_token",
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
      this.handleApiError(error, "Facebook");
    }
  }

  async createPost(
    accessToken: string,
    content: PostContent
  ): Promise<PostResult> {
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
          postData.attached_media = photoIds.map((id) => ({ media_fbid: id }));
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
      this.handleApiError(error, "Facebook");
    }
  }

  private formatMessage(content: PostContent): string {
    let message = content.text;

    if (content.hashtags && content.hashtags.length > 0) {
      message +=
        "\n\n" +
        content.hashtags.map((tag) => `#${tag.replace("#", "")}`).join(" ");
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
      this.handleApiError(error, "Facebook");
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
      this.handleApiError(error, "Facebook");
    }
  }
  // Add this method to your FacebookWrapper class

  async getAccountInsights(
    accessToken: string,
    timeRange: InsightsTimeRange = { days: 30 }
  ): Promise<AccountInsights> {
    try {
      const pageId = await this.getPageId(accessToken);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      if (timeRange.days) {
        startDate.setDate(endDate.getDate() - timeRange.days);
      } else if (timeRange.startDate && timeRange.endDate) {
        startDate.setTime(new Date(timeRange.startDate).getTime());
        endDate.setTime(new Date(timeRange.endDate).getTime());
      }

      const since = startDate.toISOString().split("T")[0];
      const until = endDate.toISOString().split("T")[0];

      // Get basic page info
      const pageInfoResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${pageId}?fields=id,name,fan_count,followers_count,talking_about_count&access_token=${accessToken}`
      );

      // Get page insights
      const pageInsightsMetrics = [
        "page_impressions",
        "page_impressions_unique",
        "page_post_engagements",
        "page_posts_impressions",
        "page_posts_impressions_unique",
        "page_fan_adds",
        "page_fan_removes",
        "page_views_total",
        "page_video_views",
      ].join(",");

      const pageInsightsResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${pageId}/insights?metric=${pageInsightsMetrics}&since=${since}&until=${until}&period=day&access_token=${accessToken}`
      );

      // Get posts from the time range
      const postsResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${pageId}/posts?fields=id,message,created_time,type,permalink_url&since=${since}&until=${until}&limit=50&access_token=${accessToken}`
      );

      // Get insights for individual posts to find top performers
      const postsWithInsights = await Promise.all(
        postsResponse.data.data.slice(0, 10).map(async (post: any) => {
          try {
            const postInsightsResponse = await axios.get(
              `https://graph.facebook.com/${this.apiVersion}/${post.id}/insights?metric=post_impressions,post_engaged_users,post_clicks,post_reactions_like_total,post_reactions_love_total,post_reactions_wow_total,post_reactions_haha_total,post_reactions_sorry_total,post_reactions_anger_total&access_token=${accessToken}`
            );

            const insights = postInsightsResponse.data.data.reduce(
              (acc: any, insight: any) => {
                acc[insight.name] = insight.values[0]?.value || 0;
                return acc;
              },
              {}
            );

            // Calculate total reactions
            const totalReactions =
              (insights.post_reactions_like_total || 0) +
              (insights.post_reactions_love_total || 0) +
              (insights.post_reactions_wow_total || 0) +
              (insights.post_reactions_haha_total || 0) +
              (insights.post_reactions_sorry_total || 0) +
              (insights.post_reactions_anger_total || 0);

            return {
              ...post,
              insights: {
                ...insights,
                total_reactions: totalReactions,
              },
            };
          } catch (error) {
            return {
              ...post,
              insights: {
                post_impressions: 0,
                post_engaged_users: 0,
                post_clicks: 0,
                total_reactions: 0,
              },
            };
          }
        })
      );

      // Calculate total metrics from page insights
      const insightsTotals = pageInsightsResponse.data.data.reduce(
        (totals: any, insight: any) => {
          const total = insight.values.reduce(
            (sum: number, value: any) => sum + (value.value || 0),
            0
          );
          totals[insight.name] = total;
          return totals;
        },
        {}
      );

      // Calculate engagement from posts
      const totalPostEngagement = postsWithInsights.reduce((sum, post) => {
        return sum + (post.insights?.post_engaged_users || 0);
      }, 0);

      // Get demographic insights
      let demographics = {};
      try {
        const demographicsMetrics = [
          "page_fans_gender_age",
          "page_fans_country",
          "page_fans_city",
        ].join(",");

        const demographicsResponse = await axios.get(
          `https://graph.facebook.com/${this.apiVersion}/${pageId}/insights?metric=${demographicsMetrics}&period=lifetime&access_token=${accessToken}`
        );

        const demoData = demographicsResponse.data.data.reduce(
          (acc: any, insight: any) => {
            acc[insight.name] = insight.values[0]?.value || {};
            return acc;
          },
          {}
        );

        demographics = {
          genderSplit: Object.entries(demoData.page_fans_gender_age || {})
            .reduce((acc: any[], [key, value]: [string, any]) => {
              const [gender] = key.split(".");
              const existing = acc.find((item) => item.gender === gender);
              if (existing) {
                existing.count += value;
              } else {
                acc.push({ gender, count: value });
              }
              return acc;
            }, [])
            .map((item: any) => ({
              gender: item.gender,
              percentage: parseFloat(
                ((item.count / pageInfoResponse.data.fan_count) * 100).toFixed(
                  2
                )
              ),
            })),
          topCountries: Object.entries(demoData.page_fans_country || {})
            .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
            .slice(0, 5)
            .map(([country, count]: [string, any]) => ({
              country,
              percentage: parseFloat(
                ((count / pageInfoResponse.data.fan_count) * 100).toFixed(2)
              ),
            })),
          topCities: Object.entries(demoData.page_fans_city || {})
            .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
            .slice(0, 5)
            .map(([city, count]: [string, any]) => ({
              city,
              percentage: parseFloat(
                ((count / pageInfoResponse.data.fan_count) * 100).toFixed(2)
              ),
            })),
        };
      } catch (error) {
        console.warn("Facebook demographic insights not available:", error);
      }

      // Sort and get top posts by engagement
      const topPosts = postsWithInsights
        .sort(
          (a, b) =>
            (b.insights?.post_engaged_users || 0) -
            (a.insights?.post_engaged_users || 0)
        )
        .slice(0, 5)
        .map((post) => ({
          id: post.id,
          type: post.type || "status",
          createdAt: post.created_time,
          impressions: post.insights?.post_impressions || 0,
          engagement: post.insights?.post_engaged_users || 0,
          url: post.permalink_url,
        }));

      const totalImpressions = insightsTotals.page_posts_impressions || 0;
      const engagementRate =
        totalImpressions > 0
          ? (totalPostEngagement / totalImpressions) * 100
          : 0;

      return {
        platform: "facebook",
        accountId: pageId,
        timeRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        metrics: {
          followers:
            pageInfoResponse.data.fan_count ||
            pageInfoResponse.data.followers_count,
          posts: postsResponse.data.data.length,
          impressions: totalImpressions,
          reach: insightsTotals.page_posts_impressions_unique || 0,
          engagement: totalPostEngagement,
          engagementRate: parseFloat(engagementRate.toFixed(2)),
          likes: postsWithInsights.reduce(
            (sum, post) => sum + (post.insights?.total_reactions || 0),
            0
          ),
          videoViews: insightsTotals.page_video_views || 0,
          profileViews: insightsTotals.page_views_total || 0,
        },
        demographics,
        topPosts,
      };
    } catch (error: any) {
      console.error(
        "Facebook insights error:",
        error.response?.data || error.message
      );
      this.handleApiError(error, "Facebook");
    }
  }
}
