import api from './client';
import {Property} from '../types';

export interface ChatAttachment {
  type: 'image' | 'pdf' | 'text' | 'file';
  url: string;
  name?: string;
  extractedText?: string | null;
  note?: string | null;
  localUri?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
}

export const aiApi = {
  generateListing: (payload: Record<string, unknown>, locale?: string) =>
    api.post<{success: boolean; title: string; description: string}>(
      '/ai/generate-listing',
      {...payload, locale},
    ),

  estimatePrice: (payload: Record<string, unknown>, locale?: string) =>
    api.post<{
      success: boolean;
      minPrice: number;
      maxPrice: number;
      currency: string;
      explanation: string;
      imageSummary?: string | null;
      suggestedAmenities?: string[];
    }>('/ai/estimate-price', {...payload, locale}),

  analyzeImages: (payload: Record<string, unknown>, locale?: string) =>
    api.post<{
      success: boolean;
      summary?: string;
      condition?: string | null;
      amenitiesGuess?: string[];
      qualityScore?: number | null;
      propertyType?: string;
    }>('/ai/analyze-images', {...payload, locale}),

  chat: (messages: ChatMessage[], context?: Record<string, unknown>, locale?: string) =>
    api.post<{success: boolean; reply: string}>(
      '/ai/chat',
      {messages, context, locale},
      {timeout: 60000},
    ),

  contactMessage: (property: Partial<Property>, locale?: string) =>
    api.post<{success: boolean; message: string}>('/ai/contact-message', {
      property,
      locale,
    }),

  summarizeNotification: (
    notification: {title?: string; message?: string; type?: string},
    locale?: string,
  ) =>
    api.post<{success: boolean; summary: string; priority: string}>(
      '/ai/summarize-notification',
      {...notification, locale},
    ),
};
