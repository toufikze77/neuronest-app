import React, { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Loader, AlertCircle, CheckCircle, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { validateEmail, validatePassword, validateUsername, validateDisplayName } from '../utils/validation'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp, resendVerification, isRateLimited, getRemainingCooldown } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string[]}>({})
  const [cooldownTime, setCooldownTime] = useState(0)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: ''
  })

  // Update cooldown timer
  useEffect(() => {
    if (!isOpen) return
    
    const updateCooldown = () => {
      const action = isSignUp ? 'signup' : 'signin'
      const remaining = getRemainingCooldown(action)
      setCooldownTime(remaining)
    }

    updateCooldown()
    const interval = setInterval(updateCooldown, 1000)
    
    return () => clearInterval(interval)
  }, [isOpen, isSignUp, getRemainingCooldown])

  // Real-time validation
  useEffect(() => {
    const errors: {[key: string]: string[]} = {}
    
    if (formData.email) {
      const emailValidation = validateEmail(formData.email)
      if (!emailValidation.isValid) {
        errors.email = emailValidation.errors
      }
    }
    
    if (formData.password) {
      const passwordValidation = validatePassword(formData.password)
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.errors
      }
    }
    
    if (isSignUp && formData.username) {
      const usernameValidation = validateUsername(formData.username)
      if (!usernameValidation.isValid) {
        errors.username = usernameValidation.errors
      }
    }
    
    if (isSignUp && formData.displayName) {
      const displayNameValidation = validateDisplayName(formData.displayName)
      if (!displayNameValidation.isValid) {
        errors.displayName = displayNameValidation.errors
      }
    }
    
    setValidationErrors(errors)
  }, [formData, isSignUp])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    setNeedsVerification(false)

    // Check rate limiting
    const action = isSignUp ? 'signup' : 'signin'
    if (isRateLimited(action)) {
      const remainingMinutes = Math.ceil(getRemainingCooldown(action) / 1000 / 60)
      setError(`Too many attempts. Please wait ${remainingMinutes} minutes before trying again.`)
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        const result = await signUp(formData.email, formData.password, { 
          username: formData.username, 
          display_name: formData.displayName 
        })
        
        if (result.success) {
          if (result.needsVerification) {
            setNeedsVerification(true)
            setSuccess('Account created successfully! Please check your email to verify your account.')
          } else {
            setSuccess('Account created and verified successfully! Welcome to NeuroNest!')
            setTimeout(onClose, 2000)
          }
        } else if (result.error) {
          setError(result.error)
        }
      } else {
        const result = await signIn(formData.email, formData.password)
        
        if (result.success) {
          setSuccess('Welcome back!')
          setTimeout(onClose, 1000)
        } else if (result.error) {
          setError(result.error)
        }
      }
    } catch (error: any) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Auth error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setLoading(true)
    setError('')
    
    try {
      const result = await resendVerification()
      if (result.success) {
        setSuccess('Verification email sent! Please check your inbox.')
      } else if (result.error) {
        setError(result.error)
      }
    } catch (error: any) {
      setError('Failed to resend verification email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ email: '', password: '', username: '', displayName: '' })
    setError('')
    setSuccess('')
    setNeedsVerification(false)
    setValidationErrors({})
  }

  const handleModeSwitch = () => {
    setIsSignUp(!isSignUp)
    resetForm()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {isSignUp ? 'Join NeuroNest' : 'Welcome Back'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {needsVerification ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Verify Your Email</h3>
            <p className="text-gray-400 text-sm">
              We've sent a verification link to your email address. Please click the link to activate your account.
            </p>
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
            <button
              onClick={handleResendVerification}
              disabled={loading || isRateLimited('verification')}
              className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2 rounded-lg font-medium flex items-center justify-center space-x-2"
            >
              {loading && <Loader className="h-4 w-4 animate-spin" />}
              <span>Resend Verification Email</span>
            </button>
            <button
              onClick={() => setNeedsVerification(false)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className={`w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:outline-none ${
                      validationErrors.username ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                    }`}
                    placeholder="Enter your username (letters, numbers, underscore)"
                  />
                  {validationErrors.username && (
                    <div className="mt-1 text-red-400 text-xs">
                      {validationErrors.username.map((error, index) => (
                        <div key={index}>• {error}</div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                    className={`w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:outline-none ${
                      validationErrors.displayName ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                    }`}
                    placeholder="Enter your display name"
                  />
                  {validationErrors.displayName && (
                    <div className="mt-1 text-red-400 text-xs">
                      {validationErrors.displayName.map((error, index) => (
                        <div key={index}>• {error}</div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className={`w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:outline-none ${
                  validationErrors.email ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                }`}
                placeholder="Enter your email address"
              />
              {validationErrors.email && (
                <div className="mt-1 text-red-400 text-xs">
                  {validationErrors.email.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className={`w-full bg-gray-700 text-white rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:outline-none ${
                    validationErrors.password ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {validationErrors.password && (
                <div className="mt-1 text-red-400 text-xs">
                  {validationErrors.password.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              )}
              {isSignUp && (
                <div className="mt-1 text-gray-400 text-xs">
                  Password must contain: 8+ characters, uppercase, lowercase, number, special character
                </div>
              )}
            </div>

            {cooldownTime > 0 && (
              <div className="text-yellow-400 text-sm bg-yellow-900/20 border border-yellow-900/50 rounded-lg p-3 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4" />
                <span>Please wait {Math.ceil(cooldownTime / 1000)} seconds before trying again.</span>
              </div>
            )}

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

            <button
              type="submit"
              disabled={loading || cooldownTime > 0 || Object.keys(validationErrors).length > 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              {loading && <Loader className="h-4 w-4 animate-spin" />}
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            </button>
          </form>
        )}

        {!needsVerification && (
          <div className="mt-6 text-center space-y-2">
            <button
              onClick={handleModeSwitch}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
            {isSignUp && (
              <p className="text-gray-500 text-xs">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
                Email verification is required to activate your account.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthModal