// Video category enum
export type VideoCategory =
  | "gaming"
  | "music"
  | "education"
  | "entertainment"
  | "sports"
  | "news"
  | "technology"
  | "other";

// Access control types
export type AccessType = "public" | "token-gated" | "subscription";

export interface AccessControlCondition {
  contractAddress: string;
  standardContractType?: "ERC20" | "ERC721" | "ERC1155";
  chain: string;
  method: string;
  parameters: string[];
  returnValueTest: {
    comparator: string;
    value: string;
  };
}

// Copyright holder info
export interface CopyrightHolder {
  address: string;
  percentage: number;
  name?: string;
}

// Revenue split configuration
export interface RevenueSplit {
  creator: number; // e.g., 85 = 85%
  platform: number; // e.g., 10 = 10%
  copyrightHolders: CopyrightHolder[];
}

// Video rendition (quality variant)
export interface VideoRendition {
  quality: "1080p" | "720p" | "480p" | "360p";
  bandwidth: number;
  segmentsCid: string; // Irys CID
  encryptionKeyHash: string;
}

// Transcode status
export type TranscodeStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

// Main video metadata interface
export interface VideoMetadata {
  id: string; // Irys transaction ID
  creatorAddress: string;
  createdAt: number;

  // Content info
  title: string;
  description: string;
  thumbnailCid: string;
  duration: number;
  category: VideoCategory;
  tags: string[];

  // Technical info
  transcodeStatus: TranscodeStatus;
  hlsManifestCid: string;
  renditions: VideoRendition[];

  // Access control
  accessType: AccessType;
  accessControlConditions: AccessControlCondition[];

  // Revenue distribution
  revenueSplit: RevenueSplit;
}

// Upload progress tracking
export interface UploadProgress {
  stage:
    | "preparing"
    | "uploading"
    | "transcoding"
    | "encrypting"
    | "storing"
    | "completed"
    | "failed";
  percentage: number;
  message: string;
}

// Upload parameters
export interface UploadVideoParams {
  file: File;
  title: string;
  description: string;
  category: VideoCategory;
  tags: string[];
  accessType: AccessType;
  accessControlConditions?: AccessControlCondition[];
  revenueSplit: RevenueSplit;
}

// Video query parameters
export interface VideoQueryParams {
  creatorAddress?: string;
  category?: VideoCategory;
  accessType?: AccessType;
  limit?: number;
  offset?: number;
  tags?: string[];
}

// Livepeer asset types
export interface LivepeerAsset {
  id: string;
  playbackId: string;
  status: {
    phase: "waiting" | "processing" | "ready" | "failed";
    errorMessage?: string;
    progress?: number;
  };
  source?: {
    type: string;
    url?: string;
  };
  playbackUrl?: string;
  downloadUrl?: string;
}

// Livepeer upload response
export interface LivepeerUploadResponse {
  assetId: string;
  uploadUrl: string;
  tusEndpoint: string;
  task?: {
    id: string;
  };
}

// HLS segment info
export interface HLSSegment {
  uri: string;
  duration: number;
  data?: ArrayBuffer;
}

// HLS manifest info
export interface HLSManifest {
  masterPlaylist: string;
  renditions: {
    quality: string;
    bandwidth: number;
    playlist: string;
    segments: HLSSegment[];
  }[];
}

// Encrypted segment info
export interface EncryptedSegment {
  uri: string;
  ciphertext: string;
  dataToEncryptHash: string;
}

// Tip record from smart contract
export interface TipRecord {
  sender: string;
  amount: bigint;
  message: string;
  timestamp: number;
}

// Video list item (lightweight for listings)
export interface VideoListItem {
  id: string;
  title: string;
  thumbnailCid: string;
  duration: number;
  creatorAddress: string;
  createdAt: number;
  category: VideoCategory;
  accessType: AccessType;
  totalTips: bigint;
}
