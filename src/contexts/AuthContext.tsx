import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'
import { validateSignupData, sanitizeInput, RateLimiter, parseAuthError } from '../utils/validation'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, userData: { username: string; display_name: string }) => Promise<{ error?: string; success?: boolean; needsVerification?: boolean }>
  signIn: (email: string, password: string) => Promise<{ error?: string; success?: boolean }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: string; success?: boolean }>
  resendVerification: () => Promise<{ error?: string; success?: boolean }>
  isRateLimited: (action: string) => boolean
  getRemainingCooldown: (action: string) => number
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Rate limiters for different actions
  const signupRateLimiter = new RateLimiter(3, 15 * 60 * 1000) // 3 attempts per 15 minutes
  const signinRateLimiter = new RateLimiter(5, 15 * 60 * 1000) // 5 attempts per 15 minutes
  const verificationRateLimiter = new RateLimiter(3, 5 * 60 * 1000) // 3 attempts per 5 minutes

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, userData: { username: string; display_name: string }) => {
    // Rate limiting check
    const clientIP = 'client-signup' // In production, you'd use actual IP
    if (!signupRateLimiter.canAttempt(clientIP)) {
      const remainingTime = Math.ceil(signupRateLimiter.getRemainingTime(clientIP) / 1000 / 60)
      return { 
        error: `Too many signup attempts. Please wait ${remainingTime} minutes before trying again.`,
        success: false 
      }
    }

    // Validate input data
    const validation = validateSignupData({
      email: email.trim(),
      password,
      username: userData.username.trim(),
      displayName: userData.display_name.trim()
    })

    if (!validation.isValid) {
      return { 
        error: validation.errors.join('. '),
        success: false 
      }
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.trim().toLowerCase())
    const sanitizedUsername = sanitizeInput(userData.username.trim().toLowerCase())
    const sanitizedDisplayName = sanitizeInput(userData.display_name.trim())

    try {
      // Record the attempt
      signupRateLimiter.recordAttempt(clientIP)

      // Check if username is already taken
      const { data: existingUsername } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', sanitizedUsername)
        .single()

      if (existingUsername) {
        return { 
          error: 'Username is already taken. Please choose a different one.',
          success: false 
        }
      }

      // Attempt to sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            username: sanitizedUsername,
            display_name: sanitizedDisplayName,
          }
        }
      })

      if (error) {
        return { 
          error: parseAuthError(error),
          success: false 
        }
      }

      if (data.user) {
        // Create profile in database
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              username: sanitizedUsername,
              display_name: sanitizedDisplayName,
              email: sanitizedEmail,
              total_karma: 0,
              current_streak: 0,
              is_expert: false,
              is_premium: false,
              email_verified: false,
              is_active: true
            },
          ])

        if (profileError) {
          console.error('Error creating profile:', profileError)
          return { 
            error: 'Account created but profile setup failed. Please contact support.',
            success: false 
          }
        }

        return { 
          success: true,
          needsVerification: !data.session, // If no session, email verification is required
        }
      }

      return { 
        error: 'Signup failed. Please try again.',
        success: false 
      }

    } catch (error: any) {
      console.error('Signup error:', error)
      return { 
        error: 'An unexpected error occurred. Please try again.',
        success: false 
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    // Rate limiting check
    const clientIP = 'client-signin' // In production, you'd use actual IP
    if (!signinRateLimiter.canAttempt(clientIP)) {
      const remainingTime = Math.ceil(signinRateLimiter.getRemainingTime(clientIP) / 1000 / 60)
      return { 
        error: `Too many signin attempts. Please wait ${remainingTime} minutes before trying again.`,
        success: false 
      }
    }

    // Basic input validation
    if (!email || !password) {
      return { 
        error: 'Email and password are required.',
        success: false 
      }
    }

    if (password.length < 6) {
      return { 
        error: 'Password must be at least 6 characters long.',
        success: false 
      }
    }

    const sanitizedEmail = sanitizeInput(email.trim().toLowerCase())

    try {
      // Record the attempt
      signinRateLimiter.recordAttempt(clientIP)

      const { error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      })

      if (error) {
        return { 
          error: parseAuthError(error),
          success: false 
        }
      }

      return { success: true }

    } catch (error: any) {
      console.error('Signin error:', error)
      return { 
        error: 'An unexpected error occurred. Please try again.',
        success: false 
      }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      return { 
        error: 'Must be logged in to update profile.',
        success: false 
      }
    }

    try {
      // Sanitize and validate updates
      const sanitizedUpdates: Partial<Profile> = {}
      
      if (updates.display_name) {
        const sanitized = sanitizeInput(updates.display_name.trim())
        if (sanitized.length === 0 || sanitized.length > 100) {
          return { 
            error: 'Display name must be between 1 and 100 characters.',
            success: false 
          }
        }
        sanitizedUpdates.display_name = sanitized
      }

      if (updates.bio) {
        const sanitized = sanitizeInput(updates.bio.trim())
        if (sanitized.length > 500) {
          return { 
            error: 'Bio must be less than 500 characters.',
            success: false 
          }
        }
        sanitizedUpdates.bio = sanitized
      }

      if (updates.website) {
        const url = updates.website.trim()
        if (url && !url.match(/^https?:\/\/.+/)) {
          return { 
            error: 'Website must be a valid URL starting with http:// or https://',
            success: false 
          }
        }
        sanitizedUpdates.website = url
      }

      // Add updated_at timestamp
      sanitizedUpdates.updated_at = new Date().toISOString()

      const { error } = await supabase
        .from('profiles')
        .update(sanitizedUpdates)
        .eq('id', user.id)

      if (error) {
        console.error('Profile update error:', error)
        return { 
          error: 'Failed to update profile. Please try again.',
          success: false 
        }
      }

      setProfile(prev => prev ? { ...prev, ...sanitizedUpdates } : null)
      return { success: true }

    } catch (error: any) {
      console.error('Profile update error:', error)
      return { 
        error: 'An unexpected error occurred. Please try again.',
        success: false 
      }
    }
  }

  const resendVerification = async () => {
    if (!user?.email) {
      return { 
        error: 'No email address found. Please sign up again.',
        success: false 
      }
    }

    const clientIP = 'client-verification'
    if (!verificationRateLimiter.canAttempt(clientIP)) {
      const remainingTime = Math.ceil(verificationRateLimiter.getRemainingTime(clientIP) / 1000 / 60)
      return { 
        error: `Please wait ${remainingTime} minutes before requesting another verification email.`,
        success: false 
      }
    }

    try {
      verificationRateLimiter.recordAttempt(clientIP)

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        return { 
          error: parseAuthError(error),
          success: false 
        }
      }

      return { success: true }

    } catch (error: any) {
      console.error('Verification resend error:', error)
      return { 
        error: 'Failed to resend verification email. Please try again.',
        success: false 
      }
    }
  }

  const isRateLimited = (action: string): boolean => {
    switch (action) {
      case 'signup':
        return !signupRateLimiter.canAttempt('client-signup')
      case 'signin':
        return !signinRateLimiter.canAttempt('client-signin')
      case 'verification':
        return !verificationRateLimiter.canAttempt('client-verification')
      default:
        return false
    }
  }

  const getRemainingCooldown = (action: string): number => {
    switch (action) {
      case 'signup':
        return signupRateLimiter.getRemainingTime('client-signup')
      case 'signin':
        return signinRateLimiter.getRemainingTime('client-signin')
      case 'verification':
        return verificationRateLimiter.getRemainingTime('client-verification')
      default:
        return 0
    }
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resendVerification,
    isRateLimited,
    getRemainingCooldown,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Export both named and default for better compatibility
export default useAuth
