import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  website?: string
  github_username?: string
  linkedin_url?: string
  twitter_username?: string
  total_karma: number
  current_streak: number
  is_expert: boolean
  is_premium: boolean
  created_at: string
  updated_at: string
}

export interface Community {
  id: string
  name: string
  slug: string
  description?: string
  avatar_url?: string
  banner_url?: string
  is_private: boolean
  member_count: number
  post_count: number
  owner_id: string
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  title: string
  content: string
  type: 'text' | 'link' | 'image' | 'code'
  url?: string
  image_url?: string
  code_language?: string
  author_id: string
  community_id?: string
  upvotes: number
  downvotes: number
  comment_count: number
  view_count: number
  is_pinned: boolean
  is_locked: boolean
  is_solved?: boolean
  post_type?: string
  tags?: string[]
  created_at: string
  updated_at: string
  profiles: Profile
  communities?: Community
}

export interface Comment {
  id: string
  content: string
  author_id: string
  post_id: string
  parent_comment_id?: string
  upvotes: number
  downvotes: number
  created_at: string
  updated_at: string
  profiles: Profile
  replies?: Comment[]
}

export interface Vote {
  id: string
  user_id: string
  post_id?: string
  comment_id?: string
  vote_type: number // 1 for upvote, -1 for downvote
  created_at: string
}