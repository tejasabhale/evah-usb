export type VaultCategory = 
  | 'passwords' 
  | 'api-keys' 
  | 'recovery-phrases' 
  | 'notes' 
  | 'secrets';

export interface VaultItem {
  id: string;
  title: string;
  category: VaultCategory;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VaultData {
  items: VaultItem[];
  version: number;
  lastModified: string;
}
