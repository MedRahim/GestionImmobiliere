import {Platform} from 'react-native';
import {API_BASE_URL, API_HOST} from '../config/api';
import {storage} from '../utils/storage';

async function parseUploadResponse(response: Response) {
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {message: text || 'Invalid server response'};
  }
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Endpoint upload introuvable — serveur à mettre à jour');
    }
    throw new Error(data.message || `Upload failed (${response.status})`);
  }
  return data;
}

export type GuideAttachment = {
  type: 'image' | 'pdf' | 'text' | 'file';
  url: string;
  path?: string;
  name?: string;
  mime?: string | null;
  extractedText?: string | null;
  note?: string | null;
  localUri?: string;
};

export const uploadApi = {
  uploadImage: async (uri: string, fileName?: string, type?: string) => {
    const token = await storage.getToken();
    const formData = new FormData();
    formData.append('image', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      type: type || 'image/jpeg',
      name: fileName || `photo-${Date.now()}.jpg`,
    } as unknown as Blob);

    const response = await fetch(`${API_BASE_URL}/upload/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await parseUploadResponse(response);
    return {
      url: data.url as string,
      fullUrl: (data.fullUrl as string) || `${API_HOST}${data.url}`,
    };
  },

  uploadVideo: async (uri: string, fileName?: string, type?: string) => {
    const token = await storage.getToken();
    if (!token) {
      throw new Error('Connectez-vous pour envoyer une vidéo');
    }
    const formData = new FormData();
    formData.append('video', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      type: type || 'video/mp4',
      name: fileName || `video-${Date.now()}.mp4`,
    } as unknown as Blob);

    const response = await fetch(`${API_BASE_URL}/upload/video`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await parseUploadResponse(response);
    return {
      url: data.url as string,
      fullUrl: (data.fullUrl as string) || `${API_HOST}${data.url}`,
    };
  },

  /** Guide chatbot — guests OK (optional Bearer) */
  uploadGuide: async (uri: string, opts?: {fileName?: string; type?: string}) => {
    const token = await storage.getToken();
    const formData = new FormData();
    const name = opts?.fileName || `guide-${Date.now()}.jpg`;
    const mime = opts?.type || 'image/jpeg';
    formData.append('file', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      type: mime,
      name,
    } as unknown as Blob);

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload/guide`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await parseUploadResponse(response);
    const attachment = data.attachment as GuideAttachment;
    if (!attachment?.url) {
      throw new Error('Réponse upload invalide');
    }
    return {
      ...attachment,
      localUri: uri,
      url: attachment.url.startsWith('http')
        ? attachment.url
        : `${API_HOST}${attachment.url}`,
    } as GuideAttachment;
  },
};
