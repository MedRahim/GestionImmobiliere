import {Platform} from 'react-native';

import {API_BASE_URL, API_HOST} from '../config/api';

import {storage} from '../utils/storage';



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

        'Content-Type': 'multipart/form-data',

      },

      body: formData,

    });



    const data = await response.json();

    if (!response.ok) {

      throw new Error(data.message || 'Upload failed');

    }



    return {

      url: data.url as string,

      fullUrl: (data.fullUrl as string) || `${API_HOST}${data.url}`,

    };

  },

};


