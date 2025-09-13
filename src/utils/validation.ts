// Comprehensive validation utilities for secure authentication
import { AuthError } from '@supabase/supabase-js'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// Email validation with security considerations
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = []
  
  if (!email) {
    errors.push('Email is required')
    return { isValid: false, errors }
  }
  
  // Basic email format check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email)) {
    errors.push('Please enter a valid email address')
  }
  
  // Length check
  if (email.length > 254) {
    errors.push('Email address is too long')
  }
  
  // Domain validation to prevent some attacks
  const domain = email.split('@')[1]
  if (domain && domain.length > 253) {
    errors.push('Email domain is too long')
  }
  
  // Check for dangerous patterns
  if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
    errors.push('Email contains invalid patterns')
  }
  
  return { isValid: errors.length === 0, errors }
}

// Strong password validation
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = []
  
  if (!password) {
    errors.push('Password is required')
    return { isValid: false, errors }
  }
  
  // Length requirements
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters')
  }
  
  // Character requirements
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  // Common password checks
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'abc123', 'password123', 
    'admin', 'letmein', 'welcome', '123456789', 'password1'
  ]
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password')
  }
  
  // Sequential characters check
  if (/123456|abcdef|qwerty|654321|fedcba|ytrewq/.test(password.toLowerCase())) {
    errors.push('Password contains sequential characters')
  }
  
  return { isValid: errors.length === 0, errors }
}

// Username validation with security
export const validateUsername = (username: string): ValidationResult => {
  const errors: string[] = []
  
  if (!username) {
    errors.push('Username is required')
    return { isValid: false, errors }
  }
  
  // Length check
  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long')
  }
  
  if (username.length > 30) {
    errors.push('Username must be less than 30 characters long')
  }
  
  // Format validation (alphanumeric and underscore only)
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores')
  }
  
  // Must start with letter or number
  if (!/^[a-zA-Z0-9]/.test(username)) {
    errors.push('Username must start with a letter or number')
  }
  
  // Reserved usernames
  const reservedUsernames = [
    'admin', 'root', 'administrator', 'moderator', 'support', 'help',
    'api', 'www', 'mail', 'ftp', 'blog', 'news', 'shop', 'forum',
    'user', 'users', 'profile', 'account', 'settings', 'login', 'signup',
    'auth', 'oauth', 'security', 'privacy', 'terms', 'about', 'contact',
    'null', 'undefined', 'system', 'bot', 'guest', 'anonymous', 'test'
  ]
  
  if (reservedUsernames.includes(username.toLowerCase())) {
    errors.push('This username is reserved and cannot be used')
  }
  
  return { isValid: errors.length === 0, errors }
}

// Display name validation
export const validateDisplayName = (displayName: string): ValidationResult => {
  const errors: string[] = []
  
  if (!displayName) {
    errors.push('Display name is required')
    return { isValid: false, errors }
  }
  
  // Length check
  if (displayName.length < 1) {
    errors.push('Display name cannot be empty')
  }
  
  if (displayName.length > 100) {
    errors.push('Display name must be less than 100 characters long')
  }
  
  // Trim whitespace for validation
  const trimmed = displayName.trim()
  if (trimmed.length === 0) {
    errors.push('Display name cannot be only whitespace')
  }
  
  // Check for potentially harmful content
  if (/[<>"'&]/.test(displayName)) {
    errors.push('Display name contains invalid characters')
  }
  
  return { isValid: errors.length === 0, errors }
}

// Sanitize input to prevent XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>"'&]/g, '') // Remove potentially harmful characters
    .trim() // Remove leading/trailing whitespace
    .slice(0, 1000) // Limit length to prevent DoS
}

// Rate limiting helper (client-side)
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  private readonly maxAttempts: number
  private readonly windowMs: number
  
  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) { // 5 attempts per 15 minutes
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs
  }
  
  canAttempt(key: string): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs)
    this.attempts.set(key, validAttempts)
    
    return validAttempts.length < this.maxAttempts
  }
  
  recordAttempt(key: string): void {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    attempts.push(now)
    this.attempts.set(key, attempts)
  }
  
  getRemainingTime(key: string): number {
    const attempts = this.attempts.get(key) || []
    if (attempts.length < this.maxAttempts) return 0
    
    const oldestAttempt = Math.min(...attempts)
    const remainingTime = this.windowMs - (Date.now() - oldestAttempt)
    return Math.max(0, remainingTime)
  }
}

// Validate complete signup data
export const validateSignupData = (data: {
  email: string
  password: string
  username: string
  displayName: string
}): ValidationResult => {
  const allErrors: string[] = []
  
  const emailValidation = validateEmail(data.email)
  const passwordValidation = validatePassword(data.password)
  const usernameValidation = validateUsername(data.username)
  const displayNameValidation = validateDisplayName(data.displayName)
  
  allErrors.push(...emailValidation.errors)
  allErrors.push(...passwordValidation.errors)
  allErrors.push(...usernameValidation.errors)
  allErrors.push(...displayNameValidation.errors)
  
  return { isValid: allErrors.length === 0, errors: allErrors }
}

// Parse Supabase auth errors for user-friendly messages
export const parseAuthError = (error: AuthError | Error): string => {
  if ('code' in error) {
    // Supabase AuthError
    switch (error.code) {
      case 'email_already_in_use':
        return 'An account with this email already exists. Please sign in instead.'
      case 'weak_password':
        return 'Password is too weak. Please choose a stronger password.'
      case 'invalid_email':
        return 'Please enter a valid email address.'
      case 'email_not_confirmed':
        return 'Please check your email and click the verification link before signing in.'
      case 'invalid_credentials':
        return 'Invalid email or password. Please check your credentials and try again.'
      case 'too_many_requests':
        return 'Too many requests. Please wait a few minutes before trying again.'
      case 'signup_disabled':
        return 'Account registration is currently disabled.'
      case 'email_address_not_authorized':
        return 'This email address is not authorized to create an account.'
      default:
        return error.message || 'An authentication error occurred. Please try again.'
    }
  }
  
  // Generic error
  return error.message || 'An unexpected error occurred. Please try again.'
}

// Generate secure random token
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}