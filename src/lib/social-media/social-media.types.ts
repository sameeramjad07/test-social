export interface SocialMediaAccount {
  id: string;
  username: string;
  profilePicture?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface PostContent {
  text: string;
  images?: string[];
  hashtags?: string[];
  mentions?: string[];
}

export interface PostResult {
  success: boolean;
  postId?: string;
  error?: string;
  url?: string;
}

export interface MediaUpload {
  url: string;
  type: "image" | "video";
  caption?: string;
}

// First, let's define the types for insights data
export interface AccountInsights {
  platform: "linkedin" | "instagram" | "facebook";
  accountId: string;
  timeRange: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    followers?: number;
    following?: number;
    posts?: number;
    impressions?: number;
    reach?: number;
    engagement?: number;
    engagementRate?: number;
    clicks?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    videoViews?: number;
    profileViews?: number;
  };
  demographics?: {
    topCountries?: Array<{ country: string; percentage: number }>;
    topCities?: Array<{ city: string; percentage: number }>;
    ageGroups?: Array<{ ageRange: string; percentage: number }>;
    genderSplit?: Array<{ gender: string; percentage: number }>;
  };
  topPosts?: Array<{
    id: string;
    type: string;
    createdAt: string;
    impressions?: number;
    engagement?: number;
    url?: string;
  }>;
}

export interface InsightsTimeRange {
  days?: number;
  startDate?: string;
  endDate?: string;
}
