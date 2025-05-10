export interface VideoItem {
  id: string;
  title: string;
  file_path: string;
  thumbnail?: string;
  url?: string;
  downloadable?: boolean;
  likes?: number;
  dislikes?: number;
}

export interface MultiVideoPlayerProps {
  videos: VideoItem[];
  initialVideoIndex?: number;
  syncByDefault?: boolean;
  apiBaseUrl?: string;
}