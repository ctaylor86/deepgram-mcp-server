import axios, { AxiosInstance } from "axios";

export interface DeepgramConfig {
  apiKey: string;
  projectId?: string;
}

export interface TranscriptionOptions {
  url: string;
  diarize?: boolean;
  smart_format?: boolean;
  punctuate?: boolean;
  paragraphs?: boolean;
  utterances?: boolean;
  sentiment?: boolean;
  summarize?: boolean | string;
  topics?: boolean;
  detect_entities?: boolean;
  filler_words?: boolean;
  language?: string;
  model?: string;
  callback?: string; // Optional: User's callback URL for async processing
}

export interface SubmitTranscriptionResponse {
  request_id: string;
}

export interface Project {
  project_id: string;
  name: string;
}

export interface ListProjectsResponse {
  projects: Project[];
}

export interface TranscriptionResult {
  request_id: string;
  project_uuid: string;
  created: string;
  path: string;
  api_key_id: string;
  response: any;
  code: number;
  deployment: string;
  callback?: string;
}

export interface GetRequestResponse {
  request: TranscriptionResult;
}

export class DeepgramClient {
  private client: AxiosInstance;
  private config: DeepgramConfig;
  private projectIdCache: string | null = null;

  constructor(config: DeepgramConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: "https://api.deepgram.com/v1",
      headers: {
        Authorization: `Token ${config.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Submit an audio/video URL for transcription
   * - Without callback: Synchronous, returns full transcript immediately
   * - With callback: Async, returns request_id and sends results to callback URL
   */
  async submitTranscription(
    options: TranscriptionOptions
  ): Promise<any> {
    // Build query parameters
    const params: Record<string, any> = {};

    // Add callback if provided (for async mode)
    if (options.callback) {
      params.callback = options.callback;
    }

    // Add optional parameters if provided
    if (options.diarize !== undefined) params.diarize = options.diarize;
    if (options.smart_format !== undefined)
      params.smart_format = options.smart_format;
    if (options.punctuate !== undefined) params.punctuate = options.punctuate;
    if (options.paragraphs !== undefined) params.paragraphs = options.paragraphs;
    if (options.utterances !== undefined)
      params.utterances = options.utterances;
    if (options.sentiment !== undefined) params.sentiment = options.sentiment;
    if (options.summarize !== undefined) params.summarize = options.summarize;
    if (options.topics !== undefined) params.topics = options.topics;
    if (options.detect_entities !== undefined)
      params.detect_entities = options.detect_entities;
    if (options.filler_words !== undefined)
      params.filler_words = options.filler_words;
    if (options.language !== undefined) params.language = options.language;
    if (options.model !== undefined) params.model = options.model;

    const response = await this.client.post(
      "/listen",
      { url: options.url },
      { params }
    );

    return response.data;
  }

  /**
   * Get the project ID associated with the API key
   * Uses provided projectId from config if available, otherwise fetches and caches
   */
  async getProjectId(): Promise<string> {
    // If projectId was provided in config, use that
    if (this.config.projectId) {
      return this.config.projectId;
    }

    // If already cached, return cached value
    if (this.projectIdCache) {
      return this.projectIdCache;
    }

    // Otherwise, fetch from API
    try {
      const response = await this.client.get<ListProjectsResponse>("/projects");

      if (!response.data.projects || response.data.projects.length === 0) {
        throw new Error(
          "No projects found for this API key. Please provide projectId in configuration."
        );
      }

      // Use the first project
      this.projectIdCache = response.data.projects[0].project_id;
      return this.projectIdCache;
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error(
          "403 Forbidden: Your API key does not have permission to list projects. " +
          "Please provide projectId in the configuration, or create an API key with Member role or higher. " +
          "Visit https://console.deepgram.com to manage your API keys."
        );
      }
      throw error;
    }
  }

  /**
   * Get the status and results of a transcription request
   */
  async getTranscriptionResult(
    requestId: string
  ): Promise<TranscriptionResult> {
    const projectId = await this.getProjectId();

    try {
      const response = await this.client.get<GetRequestResponse>(
        `/projects/${projectId}/requests/${requestId}`
      );

      return response.data.request;
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error(
          "403 Forbidden: Your API key does not have permission to access request details. " +
          "This requires 'usage:read' permission (Member role or higher). " +
          "Please create an API key with proper permissions at https://console.deepgram.com"
        );
      }
      if (error.response?.status === 404) {
        throw new Error(
          `Request ID '${requestId}' not found. Please verify the request_id is correct and belongs to project '${projectId}'.`
        );
      }
      throw error;
    }
  }

  /**
   * Test connection to Deepgram API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get("/projects");
      return true;
    } catch (error) {
      return false;
    }
  }
}
