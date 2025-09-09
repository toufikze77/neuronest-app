import React, { useState, useEffect } from 'react'
import { 
  Menu, X, Search, Bell, Plus, Home, Users, Brain, BookOpen, TrendingUp,
  Settings, User, LogOut, Crown, Zap, MessageCircle, ArrowUp, ArrowDown,
  Reply, Award, Star, Clock, CheckCircle2, Code, Github, Linkedin,
  Twitter, Globe, Lock, Eye, EyeOff, Filter, MoreHorizontal, Edit,
  Trash2, Flag, Pin, Flame, Target, Trophy, Calendar, CreditCard
} from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import { supabase, Post, Community, Comment } from './lib/supabase'
import AuthModal from './components/AuthModal'
import CreatePostModal from './components/CreatePostModal'
import CreateCommunityModal from './components/CreateCommunityModal'
import PostCard from './components/PostCard'

interface NavigationItem {
  name: string
  id: string
  icon: React.ComponentType<{ className?: string }>
}

const NeuroNestApp: React.FC = () => {
  const { user, profile, signOut } = useAuth()
  const [currentView, setCurrentView] = useState<string>('home')
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false)
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false)
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false)
  const [showCreatePostModal, setShowCreatePostModal] = useState<boolean>(false)
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState<boolean>(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')

  const navigation: NavigationItem[] = [
    { name: 'Home', id: 'home', icon: Home },
    { name: 'Communities', id: 'communities', icon: Users },
    { name: 'AI Training', id: 'ai-training', icon: Brain },
    { name: 'Mentorship', id: 'mentorship', icon: BookOpen },
    { name: 'Leaderboard', id: 'leaderboard', icon: TrendingUp },
    { name: 'Karma', id: 'karma', icon: Zap },
    { name: 'Billing', id: 'billing', icon: CreditCard }
  ]

  // Fetch data on component mount
  useEffect(() => {
    fetchPosts()
    fetchCommunities()
    fetchLeaderboard()
  }, [])

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_author_id_fkey (
            id, username, display_name, avatar_url, total_karma, is_expert
          ),
          communities (
            name, slug
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .order('member_count', { ascending: false })

      if (error) throw error
      setCommunities(data || [])
    } catch (error) {
      console.error('Error fetching communities:', error)
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('total_karma', { ascending: false })
        .limit(10)

      if (error) throw error
      setLeaderboard(data || [])
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    }
  }

  const handleVote = async (postId: string, voteType: number) => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    try {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('votes')
        .select('*')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single()

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote if clicking same button
          await supabase
            .from('votes')
            .delete()
            .eq('id', existingVote.id)
        } else {
          // Update vote
          await supabase
            .from('votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id)
        }
      } else {
        // Create new vote
        await supabase
          .from('votes')
          .insert([{
            user_id: user.id,
            post_id: postId,
            vote_type: voteType
          }])
      }

      // Refresh posts to show updated vote counts
      fetchPosts()
      
      // Update karma for post author
      updateUserKarma(postId, voteType)
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  const updateUserKarma = async (postId: string, voteType: number) => {
    try {
      const post = posts.find(p => p.id === postId)
      if (!post) return

      const karmaChange = voteType === 1 ? 10 : -5 // +10 for upvote, -5 for downvote

      const { error } = await supabase
        .from('profiles')
        .update({
          total_karma: (post.profiles.total_karma || 0) + karmaChange
        })
        .eq('id', post.author_id)

      if (error) throw error
    } catch (error) {
      console.error('Error updating karma:', error)
    }
  }

  const joinCommunity = async (communityId: string) => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('community_members')
        .select('*')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .single()

      if (existingMember) {
        // Leave community
        await supabase
          .from('community_members')
          .delete()
          .eq('id', existingMember.id)

        // Decrease member count
        const community = communities.find(c => c.id === communityId)
        if (community) {
          await supabase
            .from('communities')
            .update({ member_count: Math.max(0, community.member_count - 1) })
            .eq('id', communityId)
        }
      } else {
        // Join community
        await supabase
          .from('community_members')
          .insert([{
            community_id: communityId,
            user_id: user.id
          }])

        // Increase member count
        const community = communities.find(c => c.id === communityId)
        if (community) {
          await supabase
            .from('communities')
            .update({ member_count: community.member_count + 1 })
            .eq('id', communityId)
        }
      }

      fetchCommunities()
    } catch (error) {
      console.error('Error joining/leaving community:', error)
    }
  }

  const renderView = (): JSX.Element => {
    switch (currentView) {
      case 'home':
        return (
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {user ? `Welcome back, ${profile?.display_name || profile?.username}!` : 'Welcome to NeuroNest!'}
                </h1>
                <p className="text-gray-400">Discover the latest in AI development</p>
              </div>
              <button 
                onClick={() => user ? setShowCreatePostModal(true) : setShowAuthModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Create Post</span>
              </button>
            </div>

            {/* User Stats (if logged in) */}
            {user && profile && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 text-white">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span className="font-semibold">Total Karma</span>
                  </div>
                  <div className="text-2xl font-bold">{profile.total_karma.toLocaleString()}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center space-x-2 text-orange-400">
                    <Flame className="h-5 w-5" />
                    <span className="font-semibold">Streak</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{profile.current_streak} days</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center space-x-2 text-purple-400">
                    <Trophy className="h-5 w-5" />
                    <span className="font-semibold">Posts</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{posts.filter(p => p.author_id === user.id).length}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center space-x-2 text-green-400">
                    <Users className="h-5 w-5" />
                    <span className="font-semibold">Level</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{Math.floor(profile.total_karma / 1000) + 1}</div>
                </div>
              </div>
            )}

            {/* Search and Filter */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search posts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <button className="flex items-center space-x-1 text-gray-400 hover:text-white">
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                </button>
              </div>
            </div>

            {/* Posts */}
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-400 mt-4">Loading posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-2">No posts yet</h3>
                  <p className="text-gray-400 mb-6">Be the first to share something with the community!</p>
                  <button 
                    onClick={() => user ? setShowCreatePostModal(true) : setShowAuthModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                  >
                    Create First Post
                  </button>
                </div>
              ) : (
                posts
                  .filter(post => 
                    searchTerm === '' || 
                    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    post.content.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((post: Post) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      onVote={handleVote}
                      currentUser={user}
                    />
                  ))
              )}
            </div>
          </div>
        )

      case 'communities':
        return (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white">Communities</h1>
                <p className="text-gray-400">Discover and join AI communities</p>
              </div>
              <button 
                onClick={() => user ? setShowCreateCommunityModal(true) : setShowAuthModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Community</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communities.map((community: Community) => (
                <div key={community.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{community.name[0]}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{community.name}</h3>
                      <div className="flex items-center space-x-2">
                        {community.is_private ? (
                          <Lock className="h-3 w-3 text-yellow-400" />
                        ) : (
                          <Globe className="h-3 w-3 text-green-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {community.description && (
                    <p className="text-gray-400 text-sm mb-4">{community.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                    <span>{community.member_count.toLocaleString()} members</span>
                    <span>{community.post_count} posts</span>
                  </div>
                  
                  <button 
                    onClick={() => joinCommunity(community.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                  >
                    Join Community
                  </button>
                </div>
              ))}
            </div>
          </div>
        )

      case 'leaderboard':
        return (
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
              <p className="text-gray-400">Top contributors in the NeuroNest community</p>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Top Users by Karma</h3>
              </div>
              
              <div className="divide-y divide-gray-700">
                {leaderboard.map((user, index) => (
                  <div key={user.id} className="px-6 py-4 flex items-center space-x-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-amber-600' : 'bg-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {user.username?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white">{user.display_name}</span>
                        <span className="text-gray-400 text-sm">@{user.username}</span>
                        {user.is_expert && (
                          <CheckCircle2 className="h-4 w-4 text-blue-400" />
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        Level {Math.floor(user.total_karma / 1000) + 1}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-yellow-400">
                        <Zap className="h-4 w-4" />
                        <span className="font-bold">{user.total_karma.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'karma':
        if (!user || !profile) {
          return (
            <div className="max-w-4xl mx-auto text-center py-12">
              <h2 className="text-2xl font-bold text-white mb-4">Sign in to view your karma</h2>
              <button 
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
              >
                Sign In
              </button>
            </div>
          )
        }

        return (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Your Karma & Reputation</h1>
            
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <Zap className="h-8 w-8 text-yellow-300" />
                    <span className="text-3xl font-bold">{profile.total_karma.toLocaleString()}</span>
                  </div>
                  <p className="text-blue-100">Total Karma</p>
                  <div className="flex items-center space-x-4 mt-4">
                    <div className="flex items-center space-x-2 text-yellow-300">
                      <Crown className="h-5 w-5" />
                      <span>Level {Math.floor(profile.total_karma / 1000) + 1}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-orange-300">
                      <Flame className="h-4 w-4" />
                      <span>{profile.current_streak} day streak</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-blue-100 mb-1">Posts Created</div>
                  <div className="text-2xl font-bold">{posts.filter(p => p.author_id === user.id).length}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {posts.filter(p => p.author_id === user.id).slice(0, 5).map(post => (
                    <div key={post.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-white text-sm">{post.title}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-400 font-bold text-sm">
                          +{(post.upvotes - post.downvotes) * 10}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Progress to Next Level</h3>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Level {Math.floor(profile.total_karma / 1000) + 1}</span>
                    <span>Level {Math.floor(profile.total_karma / 1000) + 2}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{
                        width: `${((profile.total_karma % 1000) / 1000) * 100}%`
                      }}
                    ></div>
                  </div>
                  <div className="text-center text-sm text-gray-400 mt-2">
                    {1000 - (profile.total_karma % 1000)} karma to next level
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'billing':
        return (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Billing & Subscription</h1>
            
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Current Plan</h3>
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-medium text-white">
                      {profile?.is_premium ? 'Premium' : 'Free'}
                    </span>
                    {profile?.is_premium && <Crown className="h-6 w-6 text-purple-400" />}
                  </div>
                  <p className="text-gray-400 mt-2">
                    {profile?.is_premium 
                      ? 'Enjoy unlimited access to all features' 
                      : 'Upgrade to unlock premium features'
                    }
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {profile?.is_premium ? '$19' : '$0'}
                  </div>
                  <div className="text-gray-400">/month</div>
                </div>
              </div>
            </div>

            {!profile?.is_premium && (
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white mb-8">
                <h3 className="text-xl font-semibold mb-4">Upgrade to Premium</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Premium Features:</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Unlimited AI training minutes</li>
                      <li>• Priority community access</li>
                      <li>• Advanced analytics</li>
                      <li>• Custom badges</li>
                      <li>• Ad-free experience</li>
                    </ul>
                  </div>
                  <div className="text-right">
                    <button className="bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100">
                      Upgrade Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">
              {navigation.find(n => n.id === currentView)?.name}
            </h2>
            <p className="text-gray-400">This feature is coming soon!</p>
          </div>
        )
    }
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">NeuroNest</h1>
              <p className="text-gray-400">AI Development Community</p>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={() => setShowAuthModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                Sign In
              </button>
              
              <p className="text-gray-400 text-sm">
                Join thousands of AI developers sharing knowledge and building the future
              </p>
            </div>
          </div>
        </div>
        
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              
              <div className="flex items-center ml-2 md:ml-0 cursor-pointer" onClick={() => setCurrentView('home')}>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-white">NeuroNest</span>
                </div>
              </div>
            </div>

            <div className="hidden md:block flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
type="text"
                 placeholder="Search posts, users, communities..."
                 className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
               />
             </div>
           </div>

           <div className="flex items-center space-x-4">
             <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg relative">
               <Bell className="h-5 w-5" />
               <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-xs text-white rounded-full flex items-center justify-center">
                 3
               </span>
             </button>

             <div className="relative">
               <button
                 onClick={() => setUserMenuOpen(!userMenuOpen)}
                 className="flex items-center space-x-2 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
               >
                 <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                   <span className="text-white text-sm font-bold">
                     {profile?.username?.[0]?.toUpperCase() || '?'}
                   </span>
                 </div>
                 <span className="hidden md:block text-white">{profile?.username}</span>
                 {profile?.is_premium && <Crown className="h-4 w-4 text-purple-400" />}
               </button>

               {userMenuOpen && (
                 <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
                   <div className="p-4 border-b border-gray-700">
                     <p className="font-medium text-white">{profile?.display_name}</p>
                     <p className="text-sm text-gray-400">@{profile?.username}</p>
                   </div>
                   <div className="py-2">
                     <button className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 flex items-center space-x-2">
                       <User className="h-4 w-4" />
                       <span>Profile</span>
                     </button>
                     <button
                       onClick={() => setCurrentView('karma')}
                       className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                     >
                       <Zap className="h-4 w-4" />
                       <span>Karma & Badges</span>
                     </button>
                     <button className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 flex items-center space-x-2">
                       <Settings className="h-4 w-4" />
                       <span>Settings</span>
                     </button>
                     <div className="border-t border-gray-700 my-2"></div>
                     <button 
                       onClick={signOut}
                       className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 flex items-center space-x-2"
                     >
                       <LogOut className="h-4 w-4" />
                       <span>Sign Out</span>
                     </button>
                   </div>
                 </div>
               )}
             </div>
           </div>
         </div>
       </div>
     </header>

     <div className="flex">
       <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-30 w-64 bg-gray-800 transition-transform duration-300 ease-in-out`}>
         <div className="flex flex-col h-full">
           <nav className="flex-1 px-4 py-6 space-y-2">
             {navigation.map((item: NavigationItem) => {
               const Icon = item.icon
               return (
                 <button
                   key={item.id}
                   onClick={() => {
                     setCurrentView(item.id)
                     setSidebarOpen(false)
                   }}
                   className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                     currentView === item.id
                       ? 'bg-blue-600 text-white'
                       : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                   }`}
                 >
                   <Icon className="h-5 w-5" />
                   <span>{item.name}</span>
                 </button>
               )
             })}
           </nav>

           <div className="p-4 border-t border-gray-700">
             <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-3 text-white">
               <div className="flex items-center space-x-2 mb-2">
                 {profile?.is_premium ? (
                   <Crown className="h-4 w-4 text-yellow-300" />
                 ) : (
                   <Zap className="h-4 w-4 text-yellow-300" />
                 )}
                 <span className="text-sm font-medium">
                   {profile?.is_premium ? 'Premium' : 'Free Plan'}
                 </span>
               </div>
               <div className="text-xs text-blue-100">
                 Level {Math.floor((profile?.total_karma || 0) / 1000) + 1} • {profile?.total_karma || 0} karma
               </div>
             </div>
           </div>
         </div>
       </aside>

       {sidebarOpen && (
         <div
           className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
           onClick={() => setSidebarOpen(false)}
         ></div>
       )}

       <main className="flex-1 p-6">
         {renderView()}
       </main>
     </div>

     {/* Modals */}
     <AuthModal 
       isOpen={showAuthModal}
       onClose={() => setShowAuthModal(false)}
     />
     
     <CreatePostModal
       isOpen={showCreatePostModal}
       onClose={() => setShowCreatePostModal(false)}
       onPostCreated={() => {
         fetchPosts()
         setShowCreatePostModal(false)
       }}
       communities={communities}
     />
     
     <CreateCommunityModal
       isOpen={showCreateCommunityModal}
       onClose={() => setShowCreateCommunityModal(false)}
       onCommunityCreated={() => {
         fetchCommunities()
         setShowCreateCommunityModal(false)
       }}
     />
   </div>
 )
}

export default NeuroNestApp
