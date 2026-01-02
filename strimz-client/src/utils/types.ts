import { TLimit, TOrderBy, TPage, TSortBy } from "../services/movies";

export type Torrent = {
    url: string;
    hash: string;
    quality: string;
    type: string;
    is_repack: string;
    video_codec: string;
    bit_depth: string;
    audio_channels: string;
    seeds: number;
    peers: number;
    size: string;
    size_bytes: number;
    date_uploaded: string;
    date_uploaded_unix: number;
}

export type Filters = {
  genre: string;
  sort_by: TSortBy;
  order_by: TOrderBy;
  minimum_rating: number;
  query_term: string;
  quality: string;
  limit: TLimit;
  page?: TPage;
}

export type DownloadProgressData = {
  hash: string;
  slug: string;
  progress: number;
  speed: number;
  peers: number;
  done: boolean;
  downloaded: number;
  timeRemaining: number;
  fileName: string;
  paused: boolean;
  url: string;
}

export type Cue = {
  start: number;
  end: number;
  text: string;
}

export type DiskSpaceInfo = {
  diskPath: string;
  free: number;
  size: number;
}