-- NeuroNest: Clean Database Setup (Drop & Recreate)
-- This safely removes any existing tables and creates fresh ones with consistent UUID types

-- Drop existing tables in correct order (dependencies first)
DROP TABLE IF EXISTS public.votes;
DROP TABLE IF EXISTS public.comments; 
DROP TABLE IF EXISTS public.posts;
DROP TABLE IF EXISTS public.community_members;
DROP TABLE IF EXISTS public.communities;
DROP TABLE IF EXISTS public.profiles;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create profiles table with comprehensive security
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username citext UNIQUE NOT NULL,
  display_name text NOT NULL,
  email citext UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  website text,
  github_username text,
  linkedin_url text,
  twitter_username text,
  total_karma integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  is_expert boolean DEFAULT false,
  is_premium boolean DEFAULT false,
  is_active boolean DEFAULT true,
  email_verified boolean DEFAULT false,
  email_verified_at timestamptz,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints for security
  CONSTRAINT username_length CHECK (length(username) >= 3 AND length(username) <= 30),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$'),
  CONSTRAINT display_name_length CHECK (length(display_name) >= 1 AND length(display_name) <= 100),
  CONSTRAINT bio_length CHECK (bio IS NULL OR length(bio) <= 500),
  CONSTRAINT website_format CHECK (website IS NULL OR website ~ '^https?://.*'),
  CONSTRAINT github_username_length CHECK (github_username IS NULL OR length(github_username) <= 39),
  CONSTRAINT linkedin_format CHECK (linkedin_url IS NULL OR linkedin_url ~ '^https://.*linkedin\.com/.*'),
  CONSTRAINT twitter_username_length CHECK (twitter_username IS NULL OR length(twitter_username) <= 15),
  CONSTRAINT karma_positive CHECK (total_karma >= 0),
  CONSTRAINT streak_positive CHECK (current_streak >= 0)
);

-- Communities table
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug citext UNIQUE NOT NULL,
  description text,
  avatar_url text,
  banner_url text,
  is_private boolean DEFAULT false,
  member_count integer DEFAULT 1,
  post_count integer DEFAULT 0,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT community_name_length CHECK (length(name) >= 2 AND length(name) <= 50),
  CONSTRAINT community_slug_format CHECK (slug ~ '^[a-z0-9_-]+$'),
  CONSTRAINT community_slug_length CHECK (length(slug) >= 2 AND length(slug) <= 30),
  CONSTRAINT description_length CHECK (description IS NULL OR length(description) <= 1000),
  CONSTRAINT member_count_positive CHECK (member_count >= 0),
  CONSTRAINT post_count_positive CHECK (post_count >= 0)
);

-- Community members table
CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at timestamptz DEFAULT now(),
  
  UNIQUE(community_id, user_id)
);

-- Posts table
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'text' CHECK (type IN ('text', 'link', 'image', 'code')),
  url text,
  image_url text,
  code_language text,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL,
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  is_solved boolean DEFAULT false,
  post_type text DEFAULT 'discussion',
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT title_length CHECK (length(title) >= 5 AND length(title) <= 300),
  CONSTRAINT content_length CHECK (length(content) >= 10 AND length(content) <= 50000),
  CONSTRAINT url_format CHECK (url IS NULL OR url ~ '^https?://.*'),
  CONSTRAINT code_language_length CHECK (code_language IS NULL OR length(code_language) <= 50),
  CONSTRAINT vote_counts_positive CHECK (upvotes >= 0 AND downvotes >= 0),
  CONSTRAINT view_count_positive CHECK (view_count >= 0),
  CONSTRAINT comment_count_positive CHECK (comment_count >= 0)
);

-- Comments table
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  content text NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT content_length CHECK (length(content) >= 1 AND length(content) <= 10000),
  CONSTRAINT vote_counts_positive CHECK (upvotes >= 0 AND downvotes >= 0)
);

-- Votes table
CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  vote_type integer CHECK (vote_type IN (-1, 1)) NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, comment_id),
  CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public can view verified active profiles" ON public.profiles
  FOR SELECT USING (is_active = true AND email_verified = true);

CREATE POLICY "System can insert profiles during signup" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin access for toufik.zemri@outlook.com
CREATE POLICY "Admin full access to profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'toufik.zemri@outlook.com'
    )
  );

-- RLS Policies for communities
CREATE POLICY "Anyone can view public communities" ON public.communities
  FOR SELECT USING (is_private = false);

CREATE POLICY "Members can view private communities" ON public.communities
  FOR SELECT USING (
    is_private = true AND 
    EXISTS (
      SELECT 1 FROM public.community_members 
      WHERE community_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create communities" ON public.communities
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their communities" ON public.communities
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Admin full access to communities" ON public.communities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'toufik.zemri@outlook.com'
    )
  );

-- RLS Policies for community members
CREATE POLICY "Members can view community membership" ON public.community_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.community_members 
      WHERE community_id = community_members.community_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join communities" ON public.community_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities" ON public.community_members
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admin full access to community members" ON public.community_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'toufik.zemri@outlook.com'
    )
  );

-- RLS Policies for posts
CREATE POLICY "Anyone can view posts in public communities" ON public.posts
  FOR SELECT USING (
    community_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM public.communities 
      WHERE id = community_id AND is_private = false
    )
  );

CREATE POLICY "Members can view posts in private communities" ON public.posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      JOIN public.communities c ON cm.community_id = c.id
      WHERE c.id = community_id AND cm.user_id = auth.uid() AND c.is_private = true
    )
  );

CREATE POLICY "Authenticated users can create posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their posts" ON public.posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their posts" ON public.posts
  FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Admin full access to posts" ON public.posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'toufik.zemri@outlook.com'
    )
  );

-- RLS Policies for comments
CREATE POLICY "Anyone can view comments on public posts" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      LEFT JOIN public.communities c ON p.community_id = c.id
      WHERE p.id = post_id AND (c.is_private = false OR c.is_private IS NULL)
    )
  );

CREATE POLICY "Members can view comments on private community posts" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      JOIN public.communities c ON p.community_id = c.id
      JOIN public.community_members cm ON cm.community_id = c.id
      WHERE p.id = post_id AND cm.user_id = auth.uid() AND c.is_private = true
    )
  );

CREATE POLICY "Authenticated users can create comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their comments" ON public.comments
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their comments" ON public.comments
  FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Admin full access to comments" ON public.comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'toufik.zemri@outlook.com'
    )
  );

-- RLS Policies for votes
CREATE POLICY "Users can manage their own votes" ON public.votes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin full access to votes" ON public.votes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'toufik.zemri@outlook.com'
    )
  );

-- Create indexes for performance
CREATE INDEX profiles_username_idx ON public.profiles(username);
CREATE INDEX profiles_email_idx ON public.profiles(email);
CREATE INDEX profiles_active_verified_idx ON public.profiles(is_active, email_verified);
CREATE INDEX communities_slug_idx ON public.communities(slug);
CREATE INDEX communities_owner_idx ON public.communities(owner_id);
CREATE INDEX posts_author_idx ON public.posts(author_id);
CREATE INDEX posts_community_idx ON public.posts(community_id);
CREATE INDEX posts_created_idx ON public.posts(created_at DESC);
CREATE INDEX community_members_community_idx ON public.community_members(community_id);
CREATE INDEX community_members_user_idx ON public.community_members(user_id);
CREATE INDEX votes_user_post_idx ON public.votes(user_id, post_id);
CREATE INDEX votes_user_comment_idx ON public.votes(user_id, comment_id);
CREATE INDEX comments_post_idx ON public.comments(post_id);
CREATE INDEX comments_author_idx ON public.comments(author_id);

-- Create functions for triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER communities_updated_at BEFORE UPDATE ON public.communities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();