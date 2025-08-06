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
  type: 'image' | 'video';
  caption?: string;
}