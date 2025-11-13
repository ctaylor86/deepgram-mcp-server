/**
 * Logger utility for MCP server
 * Logs to both console and webhook relay for debugging
 */

import axios from "axios";

export class Logger {
  private webhookUrl: string;
  private enabled: boolean;

  constructor(webhookUrl: string, enabled: boolean = true) {
    this.webhookUrl = webhookUrl;
    this.enabled = enabled;
  }

  /**
   * Log an event (fire-and-forget to webhook, immediate to console)
   */
  async log(event: string, data: Record<string, any> = {}) {
    if (!this.enabled) return;

    const logEntry = {
      event,
      timestamp: new Date().toISOString(),
      ...data,
    };

    // Console log (synchronous)
    console.log(`[${event}]`, JSON.stringify(logEntry, null, 2));

    // Webhook log (fire-and-forget, don't wait)
    if (this.webhookUrl) {
      const logEndpoint = this.webhookUrl.replace('/callback', '/log');
      
      // Fire-and-forget: don't await, don't catch errors
      axios.post(logEndpoint, logEntry, {
        timeout: 2000, // 2 second timeout
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {
        // Silently ignore webhook logging errors
        // We don't want logging failures to break the actual request
      });
    }
  }

  /**
   * Log request received
   */
  async logRequestReceived(tool: string, requestId: string, params?: any) {
    await this.log('request_received', {
      tool,
      request_id: requestId,
      params: params ? this.sanitizeParams(params) : undefined,
    });
  }

  /**
   * Log response sent
   */
  async logResponseSent(tool: string, requestId: string, durationMs: number, responseSize?: number) {
    await this.log('response_sent', {
      tool,
      request_id: requestId,
      duration_ms: durationMs,
      response_size_bytes: responseSize,
    });
  }

  /**
   * Log external API call
   */
  async logExternalApiCall(service: string, requestId: string, durationMs: number, status: number) {
    await this.log('external_api_call', {
      service,
      request_id: requestId,
      duration_ms: durationMs,
      status,
    });
  }

  /**
   * Log error
   */
  async logError(tool: string, requestId: string, error: any) {
    await this.log('error', {
      tool,
      request_id: requestId,
      error_message: error.message || String(error),
      error_stack: error.stack,
    });
  }

  /**
   * Sanitize params to remove sensitive data
   */
  private sanitizeParams(params: any): any {
    const sanitized = { ...params };
    
    // Remove or mask sensitive fields
    if (sanitized.apiKey) sanitized.apiKey = '***';
    if (sanitized.deepgramApiKey) sanitized.deepgramApiKey = '***';
    
    return sanitized;
  }
}
