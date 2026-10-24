export function isAppleMobile() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function videoFile(blob: Blob, name: string) {
  // Use the real container MIME type, without MediaRecorder codec parameters.
  // Renaming WebM to MP4 would not make it compatible with Photos.
  return new File([blob], name, { type: blob.type.split(';')[0] || 'application/octet-stream' });
}

export function canShareVideo(file: File) {
  try {
    return typeof navigator.share === 'function'
      && typeof navigator.canShare === 'function'
      && navigator.canShare({ files: [file] });
  } catch { return false; }
}
