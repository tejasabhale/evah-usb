export type AppId = 
  | 'files' 
  | 'browser' 
  | 'vault' 
  | 'settings' 
  | 'themes' 
  | 'terminal' 
  | 'notes' 
  | 'about';

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowInstance {
  id: string;
  appId: AppId;
  title: string;
  icon: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  isFocused: boolean;
  zIndex: number;
  bounds: WindowRect;
  prevBounds?: WindowRect;
  minWidth?: number;
  minHeight?: number;
  initialParams?: any;
}
