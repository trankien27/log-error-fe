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
  layoutListId?: number;
  thumbnail: File | null;
  isDisplayOnLiveview: boolean;
}
