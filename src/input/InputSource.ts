export interface FeatureFrame {
  timestamp: number;
  vector: Float32Array;
  source: 'camera' | 'glove';
  meta?: {
    handsDetected?: number;
    faceDetected?: boolean;
  };
}

export interface InputSource {
  readonly kind: 'camera' | 'glove';
  start(): Promise<void>;
  stop(): Promise<void>;
  onFrame(cb: (frame: FeatureFrame) => void): void;
}
