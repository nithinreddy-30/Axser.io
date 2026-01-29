
export interface User {
  name: string;
  email: string;
  avatar?: string;
  memberSince: string;
  bio?: string;
  role?: 'admin' | 'user';
}

export interface Garment {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  timestamp: string;
  gender: string;
  brand?: string;
  accessCode?: string;
  userId?: string;
}

export interface StylingSuggestion {
  id?: string;
  userId: string;
  title: string;
  advice: string;
  combination: string[];
}

export interface VerificationResult {
  status: 'original' | 'fake' | 'unknown';
  message: string;
  details: string;
}

export interface AccessRequest {
  id: string;
  userId: string;
  userName: string;
  garmentName: string;
  brand: string;
  timestamp: number;
  status: 'pending' | 'resolved' | 'denied';
  resolvedCode?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  type: 'request_sent' | 'code_received' | 'request_denied';
}

export interface AnalysisResult {
  title: string;
  description: string;
  searchReferences?: Array<{ uri: string; title: string }>;
  siteStructure: {
    pages: string[];
    components: string[];
  };
  techStack: string[];
  features: string[];
  colorPalette: {
    primary: string;
    accent: string;
  };
  uxPhilosophy: string;
  targetAudience: string;
}
