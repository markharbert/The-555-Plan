export const LANDSCAPE = { width: 1280, height: 720, orientation: 'landscape' } as const;
export const PORTRAIT = { width: 720, height: 1280, orientation: 'portrait' } as const;
export type RecordingFrame = typeof LANDSCAPE | typeof PORTRAIT;

type Device = Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> & { userAgentData?: { mobile?: boolean } };

// Device identity, not window width: a narrow desktop window is still landscape,
// and rotating a phone does not change a take's portrait output.
export function recordingFrame(device: Device = navigator): RecordingFrame {
  const mobile = device.userAgentData?.mobile || /Android|iPhone|iPad|iPod|Mobile/i.test(device.userAgent)
    || (device.platform === 'MacIntel' && device.maxTouchPoints > 1);
  return mobile ? PORTRAIT : LANDSCAPE;
}

export function frameCrop(width: number, height: number, frame: RecordingFrame) {
  const ratio = frame.width / frame.height;
  const cropWidth = Math.min(width, height * ratio);
  const cropHeight = Math.min(height, width / ratio);
  return { x: (width - cropWidth) / 2, y: (height - cropHeight) / 2, width: cropWidth, height: cropHeight };
}

export function drawFramedVideo(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, frame: RecordingFrame, width: number, height: number) {
  const crop = frameCrop(video.videoWidth, video.videoHeight, frame);
  ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
}

/** Keep native capture when correctly framed; normalize cameras that ignore ideals. */
export function framedRecordingStream(source: MediaStream, video: HTMLVideoElement | null, frame: RecordingFrame) {
  if (!video?.videoWidth || !video.videoHeight) throw new Error('Wait for the camera preview, then try again.');
  const actual = video.videoWidth / video.videoHeight;
  const target = frame.width / frame.height;
  if (frame.orientation === 'landscape' && Math.abs(actual / target - 1) < 0.005) return { stream: source, stop: () => {} };

  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx || !canvas.captureStream) throw new Error('This browser cannot frame this camera. Try a newer browser.');
  let animation = 0;
  let videoCallback = 0;
  let stopped = false;
  const draw = () => {
    if (stopped) return;
    drawFramedVideo(ctx, video, frame, canvas.width, canvas.height);
    if (video.requestVideoFrameCallback) videoCallback = video.requestVideoFrameCallback(draw);
    else animation = requestAnimationFrame(draw);
  };
  draw();
  const capture = canvas.captureStream(30);
  return {
    stream: new MediaStream([...capture.getVideoTracks(), ...source.getAudioTracks()]),
    stop: () => {
      stopped = true;
      cancelAnimationFrame(animation);
      if (videoCallback) video.cancelVideoFrameCallback(videoCallback);
      capture.getTracks().forEach((track) => track.stop());
    },
  };
}
