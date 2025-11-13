import axios, { AxiosInstance } from "axios";

export interface DeepgramConfig {
  apiKey: string;
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
   * Submit an audio/video URL for async transcription
   * Uses a dummy callback URL to trigger async processing
   */
  async submitTranscription(
    options: TranscriptionOptions
  ): Promise<SubmitTranscriptionResponse> {
    // Build query parameters
    const params: Record<string, any> = {
      // Use a dummy callback to trigger async mode
      callback: "https://webhook.site/00000000-0000-0000-0000-000000000000",
    };

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

    const response = await this.client.post<SubmitTranscriptionResponse>(
      "/listen",
      { url: options.url },
      { params }
    );

    return response.data;
  }

  /**
   * Get the project ID associated with the API key
   * Caches the result to avoid repeated API calls
   */
  async getProjectId(): Promise<string> {
    if (this.projectIdCache) {
      return this.projectIdCache;
    }

    const response = await this.client.get<ListProjectsResponse>("/projects");

    if (!response.data.projects || response.data.projects.length === 0) {
      throw new Error("No projects found for this API key");
    }

    // Use the first project
    this.projectIdCache = response.data.projects[0].project_id;
    return this.projectIdCache;
  }

  /**
   * Get the status and results of a transcription request
   */
  async getTranscriptionResult(
    requestId: string
  ): Promise<TranscriptionResult> {
    const projectId = await this.getProjectId();

    const response = await this.client.get<GetRequestResponse>(
      `/projects/${projectId}/requests/${requestId}`
    );

    return response.data.request;
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
