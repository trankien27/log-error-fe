export interface ThemeLayout {
  id: number;
  code: string;
  name: string;
  width: number;
  height: number;
}

export interface ThemeCategory {
  id: number;
  name: string;
  orderNo: number | null;
  isActive: boolean;
}

export interface ThemeList {
  id: number;
  name: string;
  orderNo: number | null;
  isActive: boolean;
}

export interface ResizedThemeImage {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  customWidth: number;
  customHeight: number;
  layout?: ThemeLayout;
}

export interface ThemeUploadValues {
  name: string;
  color: string;
  themeCategoryId: number;
  themeListIds: number[];
  orderNo?: number;
  layoutListId?: number;
  thumbnail: File | null;
  isDisplayOnLiveview: boolean;
}

export interface ThemeUploadProfile {
  id: number;
  name: string;
  color: string;
  themeCategoryId: number;
  themeListIds: number[];
  orderNo: number | null;
  layoutListId: number | null;
  isDisplayOnLiveview: boolean;
  canManage: boolean;
}

export type SaveThemeUploadProfile = Omit<ThemeUploadProfile, 'id' | 'canManage'>;
