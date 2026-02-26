/*
┌───────────────────────────────────────────────────────────────────────┐
│  Mail Client - Service 2                                              │
│  Client utility to interact with Service 1's mail service             │
│  All email sending is handled centrally by Service 1                  │
│  Auto-generates OTPs and fetches user data automatically              │
└───────────────────────────────────────────────────────────────────────┘
*/

import axios, { AxiosInstance, AxiosError } from 'axios';

// ============================================================================
// TYPES
// ============================================================================

interface MailResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  statusCode?: number;
}

interface HealthCheckResponse {
  healthy: boolean;
  availableProviders: string[];
  providerCount: number;
}

// ============================================================================
// MAIL CLIENT CLASS
// ============================================================================

class MailClient {
  private client: AxiosInstance;
  private readonly SERVICE_1_URL: string;
  private readonly API_KEY: string;
  private lastClientCreation: number = 0;

  constructor() {
    // Validate configuration
    this.SERVICE_1_URL = process.env.SERVICE_1_URL || 'http://localhost:5000';
    this.API_KEY = process.env.INTERNAL_SERVICE_API_KEY || '';

    if (!this.API_KEY) {
      console.error('❌ INTERNAL_SERVICE_API_KEY not configured in environment');
      console.error('   Mail service will not work properly');
    }

    console.log(`📧 Mail Client initializing with SERVICE_1_URL: ${this.SERVICE_1_URL}`);

    // Create axios instance with default config
    this.client = this.createAxiosInstance();
    this.initializeInterceptors();
  }

  /**
   * Create a fresh axios instance (useful for reinitializing after connection issues)
   */
  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: `${this.SERVICE_1_URL}/api/v1/mail-service`,
      timeout: 15000, // 15 seconds for email operations
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': this.API_KEY,
      },
    });
  }

  /**
   * Initialize axios interceptors for logging and error handling
   */
  private initializeInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`📤 Mail request to Service 1: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Mail request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Mail response from Service 1: ${response.status}`);
        return response;
      },
      async (error: AxiosError) => {
        if (error.response) {
          // Server responded with error status
          console.error(`❌ Mail API error: ${error.response.status}`, error.response.data);
        } else if (error.request) {
          // Request made but no response received
          console.error('❌ Mail API no response - Service 1 may be down or connection failed');
          console.error('   Error details:', error.message);
        } else {
          // Error in setting up request
          console.error('❌ Mail API request setup error:', error.message);
          
          // If "client is closed", reinitialize
          if (error.message.includes('client is closed') || error.message.includes('Client is closed')) {
            console.warn('⚠️ Axios client was closed, reinitializing...');
            this.client = this.createAxiosInstance();
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send OTP Email
   * Auto-generates 6-digit OTP, stores in Redis, sends email
   * 
   * @param email - Recipient email address
   * @returns Promise with mail response including OTP expiry info
   * 
   * @example
   * ```typescript
   * const result = await mailClient.sendOTP('user@example.com');
   * if (result.success) {
   *   console.log('OTP sent, expires in:', result.data?.expiresIn);
   * }
   * ```
   */
  public async sendOTP(email: string): Promise<MailResponse> {
    try {
      const response = await this.client.post('/send-otp', { email });

      return {
        success: true,
        message: response.data.message || 'OTP sent successfully',
        data: response.data.data,
        statusCode: response.status,
      };
    } catch (error) {
      return this.handleError(error as AxiosError, 'sendOTP');
    }
  }

  /**
   * Send Custom OTP Email
   * Send pre-generated OTP to user's email
   * 
   * @param email - Recipient email address
   * @param otp - Pre-generated OTP to send
   * @returns Promise with mail response including provider info
   * 
   * @example
   * ```typescript
   * const otp = '123456';
   * const result = await mailClient.sendCustomOTP('user@example.com', otp);
   * if (result.success) {
   *   console.log('OTP sent via:', result.data?.provider);
   * }
   * ```
   */
  public async sendCustomOTP(email: string, otp: string): Promise<MailResponse> {
    try {
      // Try the correct endpoint - check Service 1 for the actual path
      // Common alternatives: /send-otp, /otp/send, /custom-otp
      const response = await this.client.post('/send-otp', { 
        email,
        otp 
      });

      return {
        success: true,
        message: response.data.message || 'OTP sent successfully',
        data: response.data.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      // If client is closed, retry once with fresh client
      if (error.message?.includes('client is closed') || error.message?.includes('Client is closed')) {
        console.warn('⚠️ Retrying with new client instance...');
        try {
          this.client = this.createAxiosInstance();
          const response = await this.client.post('/send-otp', { 
            email,
            otp 
          });

          return {
            success: true,
            message: response.data.message || 'OTP sent successfully',
            data: response.data.data,
            statusCode: response.status,
          };
        } catch (retryError) {
          return this.handleError(retryError as AxiosError, 'sendCustomOTP');
        }
      }
      
      return this.handleError(error as AxiosError, 'sendCustomOTP');
    }  
  }

  /**
   * Send Welcome Email
   * Auto-fetches user name from database and sends welcome email
   * 
   * @param email - Recipient email address
   * @returns Promise with mail response
   * 
   * @example
   * ```typescript
   * await mailClient.sendWelcomeEmail('newuser@example.com');
   * ```
   */
  public async sendWelcomeEmail(email: string): Promise<MailResponse> {
    try {
      const response = await this.client.post('/send-welcome', { email });

      return {
        success: true,
        message: response.data.message || 'Welcome email sent successfully',
        data: response.data.data,
        statusCode: response.status,
      };
    } catch (error) {
      return this.handleError(error as AxiosError, 'sendWelcomeEmail');
    }
  }

  /**
   * Send Password Reset Confirmation
   * Sends beautiful HTML email confirming password reset with security details
   * 
   * @param email - Recipient email address
   * @param options - Optional security and user details
   * @param options.userName - User's name for personalization
   * @param options.resetTime - When password was reset (defaults to now)
   * @param options.ipAddress - IP address from where reset was done
   * @param options.deviceInfo - Device/browser information
   * @param options.location - Approximate location (city, country)
   * @returns Promise with mail response
   * 
   * @example
   * ```typescript
   * // Basic usage
   * await mailClient.sendPasswordResetConfirmation('user@example.com');
   * 
   * // With full security details
   * await mailClient.sendPasswordResetConfirmation('user@example.com', {
   *   userName: 'John Doe',
   *   ipAddress: '192.168.1.1',
   *   deviceInfo: 'Chrome on Windows',
   *   location: 'Mumbai, India'
   * });
   * ```
   */
  public async sendPasswordResetConfirmation(
    email: string,
    options?: {
      userName?: string;
      resetTime?: Date;
      ipAddress?: string;
      deviceInfo?: string;
      location?: string;
    }
  ): Promise<MailResponse> {
    try {
      const response = await this.client.post('/send-password-reset-confirmation', { 
        email,
        userName: options?.userName,
        resetTime: options?.resetTime || new Date(),
        ipAddress: options?.ipAddress,
        deviceInfo: options?.deviceInfo,
        location: options?.location,
      });

      return {
        success: true,
        message: response.data.message || 'Password reset confirmation sent successfully',
        data: response.data.data,
        statusCode: response.status,
      };
    } catch (error) {
      return this.handleError(error as AxiosError, 'sendPasswordResetConfirmation');
    }
  }

  /**
   * Send Notification Email
   * 
   * @param email - Recipient email address
   * @param subject - Email subject
   * @param message - Email message
   * @returns Promise with mail response
   * 
   * @example
   * ```typescript
   * await mailClient.sendNotificationEmail(
   *   'user@example.com',
   *   'Order Confirmed',
   *   'Your order #12345 has been confirmed'
   * );
   * ```
   */
  public async sendNotificationEmail(
    email: string,
    subject: string,
    message: string
  ): Promise<MailResponse> {
    try {
      const response = await this.client.post('/send-notification', {
        email,
        subject,
        message,
      });

      return {
        success: true,
        message: response.data.message || 'Notification sent successfully',
        data: response.data.data,
        statusCode: response.status,
      };
    } catch (error) {
      return this.handleError(error as AxiosError, 'sendNotificationEmail');
    }
  }

  /**
   * Send Bulk Notification Emails
   * 
   * @param emails - Array of recipient email addresses
   * @param subject - Email subject
   * @param message - Email message
   * @returns Promise with mail response including success/failure counts
   * 
   * @example
   * ```typescript
   * const result = await mailClient.sendBulkNotification(
   *   ['user1@example.com', 'user2@example.com'],
   *   'System Update',
   *   'New features available'
   * );
   * console.log(`Sent: ${result.data?.success}, Failed: ${result.data?.failed}`);
   * ```
   */
  public async sendBulkNotification(
    emails: string[],
    subject: string,
    message: string
  ): Promise<MailResponse> {
    try {
      const response = await this.client.post('/send-bulk-notification', {
        emails,
        subject,
        message,
      });

      return {
        success: true,
        message: response.data.message || 'Bulk notifications sent successfully',
        data: response.data.data,
        statusCode: response.status,
      };
    } catch (error) {
      return this.handleError(error as AxiosError, 'sendBulkNotification');
    }
  }

  /**
   * Check Mail Service Health
   * 
   * @returns Promise with health check response
   */
  public async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await this.client.get('/health');

      return {
        healthy: response.data.data.healthy,
        availableProviders: response.data.data.availableProviders,
        providerCount: response.data.data.providerCount,
      };
    } catch (error) {
      console.error('❌ Mail service health check failed:', error);
      return {
        healthy: false,
        availableProviders: [],
        providerCount: 0,
      };
    }
  }

  /**
   * Handle errors from Service 1
   */
  private handleError(error: AxiosError, operation: string): MailResponse {
    if (error.response) {
      // Service 1 responded with error
      const data: any = error.response.data;
      return {
        success: false,
        error: data.message || 'Mail service error',
        statusCode: error.response.status,
      };
    } else if (error.request) {
      // No response from Service 1
      return {
        success: false,
        error: 'Mail service unavailable - Service 1 may be down',
        statusCode: 503,
      };
    } else {
      // Request setup error
      return {
        success: false,
        error: error.message || 'Failed to send email request',
        statusCode: 500,
      };
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const mailClient = new MailClient();
export default mailClient;
