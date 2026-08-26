// Minimal ambient typing for the native BarcodeDetector API — not yet in TypeScript's
// bundled DOM lib. Chrome/Android only; components must feature-detect before use and
// fall back to @zxing/browser (see components/barcode-scanner.tsx).
interface BarcodeDetectorOptions {
  formats?: string[];
}

interface DetectedBarcode {
  boundingBox: DOMRectReadOnly;
  cornerPoints: { x: number; y: number }[];
  format: string;
  rawValue: string;
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  static getSupportedFormats(): Promise<string[]>;
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector;
}
