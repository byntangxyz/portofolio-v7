export interface Project {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  thumbnail_url: string;
  gallery_urls?: string[];
  tech_stack: string[];
  live_url?: string;
  repo_url?: string;
  featured: boolean;
  order: number;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
  };
}
