import { Activity } from '../../types';
import { apiClient } from './apiClient';

export const activitiesService = {
  getRecent: async (): Promise<Activity[]> => {
    return apiClient.get<Activity[]>('/activities/recent');
  },
};

