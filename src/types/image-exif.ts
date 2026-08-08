export interface ImageExif {
  fileName: string;
  fileType: string;
  fileSize: number;
  camera: CameraInfo;
  capture: CaptureInfo;
  gps: GpsInfo | null;
  thumbnailPresent: boolean;
  rawFields: ExifField[];
}

export interface CameraInfo {
  make: string;
  model: string;
  lensModel: string;
  software: string;
  serialNumber: string;
}

export interface CaptureInfo {
  dateTimeOriginal: string;
  exposureTime: string;
  fNumber: string;
  iso: string;
  focalLength: string;
  orientation: string;
}

export interface GpsInfo {
  latitude: number;
  longitude: number;
  altitude: number | null;
  mapUrl: string;
}

export interface ExifField {
  tag: string;
  value: string;
}
