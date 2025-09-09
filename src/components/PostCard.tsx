import React from 'react'
import { 
  ArrowUp, ArrowDown, MessageCircle, Eye, Star, Award, 
  CheckCircle2, Zap, MoreHorizontal 
} from 'lucide-react'
import { Post } from '../lib/supabase'
import { User } from '@supabase/supabase-js'

interface PostCardProps {
  post: Post
  onVote: (postId: string, voteType: number) => void
  currentUser: User | null
}

const PostCard: React.FC<PostCardProps> = ({ post, onVote, currentUser }) => {
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'tutorial': return 'bg-green-600 text-white'
      case 'question': return 'bg-blue-600 text-white'
      case 'showcase': return 'bg-purple-600 text-white'
      default: return 'bg-orange-600 text-white'
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors p-6 mb-4">
      {/* Post header */}
      <div className="flex items-start space-x-3 mb-4">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">
            {post.profiles.username?.[0]?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className={`font-medium ${post.profiles.is_expert ? 'text-blue-400' : 'text-white'}`}>
              {post.profiles.display_name}
            </span>
            <span className="text-gray-400 text-sm">@{post.profiles.username}</span>
            {post.profiles.is_expert && (
              <CheckCircle2 className="h-4 w-4 text-blue-400" />
            )}
            <span className="text-gray-500">•</span>
            <span className="text-gray-400 text-sm">{getTimeAgo(post.created_at)}</span>
            {post.communities && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-blue-400 text-sm">r/{post.communities.slug}</span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <div className="flex items-center space-x-1">
              <Zap className="h-3 w-3 text-yellow-400" />
              <span className="text-gray-400 text-sm">{post.profiles.total_karma.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {post.is_pinned && (
            <div className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full">
              PINNED
            </div>
          )}
          <button className="text-gray-400 hover:text-white">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Post type and status */}
      <div className="flex items-center space-x-2 mb-3">
        <span className={`text-xs px-2 py-1 rounded-full uppercase font-medium ${getPostTypeColor(post.post_type || 'discussion')}`}>
{post.post_type || 'Discussion'}
       </span>
       {post.is_solved && (
         <span className="flex items-center space-x-1 text-green-400 text-xs">
           <CheckCircle2 className="h-3 w-3" />
           <span>SOLVED</span>
         </span>
       )}
     </div>

     {/* Title and content */}
     <h2 className="text-xl font-semibold text-white mb-3 hover:text-blue-400 cursor-pointer">
       {post.title}
     </h2>
     <p className="text-gray-300 mb-4 line-clamp-3">{post.content}</p>

     {/* Tags */}
     {post.tags && post.tags.length > 0 && (
       <div className="flex flex-wrap gap-2 mb-4">
         {post.tags.map((tag: string) => (
           <span key={tag} className="bg-gray-700 text-blue-400 text-xs px-2 py-1 rounded hover:bg-gray-600 cursor-pointer">
             #{tag}
           </span>
         ))}
       </div>
     )}

     {/* Actions */}
     <div className="flex items-center justify-between">
       <div className="flex items-center space-x-6">
         {/* Voting */}
         <div className="flex items-center space-x-1">
           <button 
             onClick={() => onVote(post.id, 1)}
             className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-green-400"
           >
             <ArrowUp className="h-4 w-4" />
           </button>
           <span className="text-white font-medium">{post.upvotes - post.downvotes}</span>
           <button 
             onClick={() => onVote(post.id, -1)}
             className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"
           >
             <ArrowDown className="h-4 w-4" />
           </button>
         </div>

         {/* Comments */}
         <button className="flex items-center space-x-1 text-gray-400 hover:text-white">
           <MessageCircle className="h-4 w-4" />
           <span>{post.comment_count}</span>
         </button>

         {/* Views */}
         <div className="flex items-center space-x-1 text-gray-400">
           <Eye className="h-4 w-4" />
           <span>{post.view_count.toLocaleString()}</span>
         </div>
       </div>

       {/* Share/Save */}
       <div className="flex items-center space-x-2">
         <button className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-yellow-400">
           <Star className="h-4 w-4" />
         </button>
         <button className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white">
           <Award className="h-4 w-4" />
         </button>
       </div>
     </div>
   </div>
 )
}

export default PostCard