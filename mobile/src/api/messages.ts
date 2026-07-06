import api from './client';
import {ChatMessage, Conversation} from '../types';

export const messagesApi = {
  getConversations: () =>
    api
      .get<{success: boolean; conversations: Conversation[]}>('/messages/conversations')
      .then(r => r.data),

  getThread: (userId: number) =>
    api
      .get<{success: boolean; messages: ChatMessage[]}>('/messages/thread/' + userId)
      .then(r => r.data),

  send: (data: {receiverId: number; message: string; propertyId?: number}) =>
    api
      .post<{success: boolean; message: ChatMessage}>('/messages', data)
      .then(r => r.data),
};
