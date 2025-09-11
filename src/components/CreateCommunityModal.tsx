import React, { useState, useEffect } from 'react'
import { X, Loader, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { sanitizeInput } from '../utils/validation'

interface CreateCommunityModalProps {
  isOpen: boolean
  onClose: () => void
  onCommunityCreated: () => void
}

const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({ 
  isOpen, 
  onClose, 
  onCommunityCreated 
}) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_private: false
  })

  // Real-time validation
  useEffect(() => {
    const errors: {[key: string]: string} = {}
    
    if (formData.name) {
      const trimmedName = formData.name.trim()
      if (trimmedName.length < 2) {
        errors.name = 'Community name must be at least 2 characters'
      } else if (trimmedName.length > 50) {
        errors.name = 'Community name must be less than 50 characters'
      } else if (!/^[a-zA-Z0-9\s-_]+$/.test(trimmedName)) {
        errors.name = 'Community name can only contain letters, numbers, spaces, hyphens, and underscores'
      }
      
      // Check for reserved community names
      const reservedNames = ['admin', 'api', 'www', 'help', 'support', 'home', 'feed', 'trending']
      if (reservedNames.includes(trimmedName.toLowerCase())) {
        errors.name = 'This community name is reserved'
      }
    }
    
    if (formData.description && formData.description.trim().length > 1000) {
      errors.description = 'Description must be less than 1000 characters'
    }
    
    setValidationErrors(errors)
  }, [formData])

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setError('You must be logged in to create a community')
      return
    }

    // Check for validation errors
    if (Object.keys(validationErrors).length > 0) {
      setError('Please fix the validation errors before submitting')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Sanitize inputs
      const sanitizedName = sanitizeInput(formData.name.trim())
      const sanitizedDescription = formData.description.trim() 
        ? sanitizeInput(formData.description.trim()) 
        : null
      
      const slug = generateSlug(sanitizedName)

      // Check if slug already exists
      const { data: existingCommunity } = await supabase
        .from('communities')
        .select('slug')
        .eq('slug', slug)
        .single()

      if (existingCommunity) {
        setError('A community with this name already exists. Please choose a different name.')
        return
      }

      // Create community
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .insert([{
          name: sanitizedName,
          slug,
          description: sanitizedDescription,
          is_private: formData.is_private,
          owner_id: user.id,
          member_count: 1,
          post_count: 0
        }])
        .select()
        .single()

      if (communityError) throw communityError

      if (communityData) {
        // Add the creator as a member of the community
        const { error: memberError } = await supabase
          .from('community_members')
          .insert([{
            community_id: communityData.id,
            user_id: user.id,
            role: 'owner'
          }])

        if (memberError) {
          console.warn('Failed to add creator as member:', memberError)
          // Don't fail the entire operation for this
        }

        setSuccess(`Community "${sanitizedName}" created successfully!`)
        onCommunityCreated()
        
        // Close modal after success message
        setTimeout(() => {
          onClose()
          setFormData({
            name: '',
            description: '',
            is_private: false
          })
          setSuccess('')
        }, 2000)
      }

    } catch (error: any) {
      console.error('Community creation error:', error)
      
      // Parse specific Supabase errors
      if (error.code === 'PGRST116') {
        setError('Community name must be unique. Please choose a different name.')
      } else if (error.code === '23505') {
        setError('A community with this name already exists.')
      } else if (error.message?.includes('violates check constraint')) {
        setError('Community data does not meet requirements. Please check your inputs.')
      } else {
        setError(error.message || 'Failed to create community. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', is_private: false })
    setError('')
    setSuccess('')
    setValidationErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Create Community</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Community Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className={`w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:outline-none ${
                validationErrors.name ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
              }`}
              placeholder="e.g., Machine Learning"
              maxLength={50}
            />
            {validationErrors.name && (
              <p className="text-xs text-red-400 mt-1">
                {validationErrors.name}
              </p>
            )}
            {formData.name && !validationErrors.name && (
              <p className="text-xs text-gray-400 mt-1">
                URL: /communities/{generateSlug(formData.name)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className={`w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:outline-none resize-none ${
                validationErrors.description ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
              }`}
              placeholder="Describe what this community is about..."
              maxLength={1000}
            />
            {validationErrors.description && (
              <p className="text-xs text-red-400 mt-1">
                {validationErrors.description}
              </p>
            )}
            {formData.description && (
              <p className="text-xs text-gray-400 mt-1">
                {formData.description.length}/1000 characters
              </p>
            )}
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_private}
                onChange={(e) => setFormData({...formData, is_private: e.target.checked})}
                className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-gray-300">Make this community private</span>
            </label>
            <p className="text-xs text-gray-400 mt-1">
              Private communities require approval to join
            </p>
          </div>

          {success && (
            <div className="text-green-400 text-sm bg-green-900/20 border border-green-900/50 rounded-lg p-3 flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-900/50 rounded-lg p-3 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Object.keys(validationErrors).length > 0 || !formData.name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              {loading && <Loader className="h-4 w-4 animate-spin" />}
              <span>{loading ? 'Creating...' : 'Create Community'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateCommunityModal
