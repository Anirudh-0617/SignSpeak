import type { FeatureFrame } from '../input/InputSource';

type Layer = { weights: number[][]; biases: number[] };
type Model = {
  featureSpecVersion: string;
  aggregation: 'mean+std';
  featureLen: number;
  nChunks?: number;
  layers: Layer[];
};

export type Prediction = {
  label: string;
  confidence: number;
  timestamp: number;
  topK: { label: string; confidence: number }[];
};

// ponytail: hand-rolled MLP forward pass — no tf.js runtime for a 128-neuron
// dense net. Swap to tf.js when Phase 5's temporal model actually needs it.
export class Classifier {
  private model: Model | null = null;
  private labels: string[] = [];
  private buffer: Float32Array[] = [];

  private readonly windowSize: number;
  private readonly minFrames: number;
  constructor(windowSize = 30, minFrames = 5) {
    this.windowSize = windowSize;
    this.minFrames = minFrames;
  }

  async load(baseUrl = '/models/fingerspell_asl') {
    const [mRes, lRes] = await Promise.all([
      fetch(`${baseUrl}/model.json`),
      fetch(`${baseUrl}/labels.json`),
    ]);
    if (!mRes.ok || !lRes.ok) {
      throw new Error(`model fetch failed (${mRes.status}/${lRes.status})`);
    }
    this.model = (await mRes.json()) as Model;
    this.labels = (await lRes.json()) as string[];
  }

  ready() {
    return this.model !== null;
  }

  reset() {
    this.buffer = [];
  }

  predict(frame: FeatureFrame): Prediction | null {
    if (!this.model) return null;
    // ponytail: back-compat during v0.3 → v0.4 rollout. Browser emits 178-dim
    // raw (hands + face); a legacy 126-dim model has featureLen = 2*nChunks*126
    // AFTER mean+std, so we must compare at the RAW dim, not the aggregated one.
    // Drop when all deployed models are v0.4.
    const nChunks = this.model.nChunks ?? 1;
    const rawDim = this.model.featureLen / (2 * nChunks);
    const v = frame.vector.length > rawDim
      ? frame.vector.slice(0, rawDim)
      : frame.vector;
    this.buffer.push(v);
    if (this.buffer.length > this.windowSize) this.buffer.shift();
    if (this.buffer.length < this.minFrames) return null;

    const feats = meanStd(this.buffer, this.model.nChunks ?? 1);
    const logits = forward(feats, this.model.layers);
    const probs = softmax(logits);
    // Top-K via partial sort — 23 classes max, negligible cost.
    // Array.from gives a proper number[] (Float32Array.map returns Float32Array).
    const K = Math.min(3, probs.length);
    const idx = Array.from({ length: probs.length }, (_, i) => i)
      .sort((a, b) => probs[b] - probs[a])
      .slice(0, K);
    const topK = idx.map((i) => ({ label: this.labels[i], confidence: probs[i] }));
    return {
      label: topK[0].label,
      confidence: topK[0].confidence,
      timestamp: frame.timestamp,
      topK,
    };
  }
}

// ponytail: chunk-aware mean+std matches ml/train.py aggregate(n_chunks=K).
// K=1 = original static descriptor. K=3 splits into start/mid/end so trajectory-
// driven signs (HAPPY vs SAD) don't collapse to the same mean position.
function meanStd(buffer: Float32Array[], nChunks: number): Float32Array {
  const n = buffer.length;
  const d = buffer[0].length;
  const k = Math.max(1, nChunks);
  const out = new Float32Array(2 * d * k);
  const base = Math.floor(n / k);
  const extras = n % k;
  let start = 0;
  for (let c = 0; c < k; c++) {
    const size = base + (c < extras ? 1 : 0);
    const off = 2 * d * c;
    for (let j = 0; j < size; j++) {
      const v = buffer[start + j];
      for (let i = 0; i < d; i++) out[off + i] += v[i];
    }
    for (let i = 0; i < d; i++) out[off + i] /= size;
    for (let j = 0; j < size; j++) {
      const v = buffer[start + j];
      for (let i = 0; i < d; i++) {
        const diff = v[i] - out[off + i];
        out[off + d + i] += diff * diff;
      }
    }
    for (let i = 0; i < d; i++) out[off + d + i] = Math.sqrt(out[off + d + i] / size);
    start += size;
  }
  return out;
}

function forward(x: Float32Array, layers: Layer[]): Float32Array {
  let a: Float32Array | number[] = x;
  for (let l = 0; l < layers.length; l++) {
    const { weights, biases } = layers[l];
    const out = new Float32Array(biases.length);
    const isOutput = l === layers.length - 1;
    for (let j = 0; j < biases.length; j++) {
      let s = biases[j];
      for (let i = 0; i < a.length; i++) s += a[i] * weights[i][j];
      out[j] = isOutput ? s : Math.max(0, s);
    }
    a = out;
  }
  return a as Float32Array;
}

function softmax(x: Float32Array): Float32Array {
  let max = -Infinity;
  for (const v of x) if (v > max) max = v;
  const out = new Float32Array(x.length);
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    out[i] = Math.exp(x[i] - max);
    sum += out[i];
  }
  for (let i = 0; i < x.length; i++) out[i] /= sum;
  return out;
}
