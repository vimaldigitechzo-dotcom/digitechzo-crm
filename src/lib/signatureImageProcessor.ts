/**
 * signatureImageProcessor.ts
 * High-precision client-side automated background removal for handwritten signatures and stamps.
 * Extracts signature ink strokes and renders paper/photo backgrounds 100% transparent.
 */

export interface ProcessSignatureOptions {
  /**
   * Sensitivity threshold for background extraction.
   * Default: 0.22 (adaptive contrast threshold)
   */
  sensitivity?: number;
  /**
   * Ink color enhancement mode:
   * - 'auto': Detects if ink is blue/colored or black, and deepens it cleanly.
   * - 'black': Converts all ink to crisp professional document black (#0f172a).
   * - 'blue': Converts ink to crisp professional royal navy blue pen (#1d4ed8).
   * - 'original': Preserves original pixel RGB, only removes background alpha.
   */
  inkColorMode?: 'auto' | 'black' | 'blue' | 'original';
  /**
   * Automatically crop outer transparent margins. Default: true.
   */
  autoCrop?: boolean;
  /**
   * Padding in pixels around cropped signature. Default: 12.
   */
  cropPadding?: number;
}

/**
 * Loads an image source (data URL, blob, object URL or remote URL) into an HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load signature image: ' + err));
    img.src = src;
  });
}

/**
 * Calculates perceived luminance of an RGB pixel (0 - 255).
 */
function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Automatically removes paper background from a signature image and returns a transparent PNG data URL.
 */
export async function removeSignatureBackground(
  imageSource: string | File | Blob,
  options: ProcessSignatureOptions = {}
): Promise<string> {
  const {
    sensitivity = 0.20,
    inkColorMode = 'auto',
    autoCrop = true,
    cropPadding = 12,
  } = options;

  let srcUrl: string;
  let isObjectUrl = false;

  if (typeof imageSource === 'string') {
    srcUrl = imageSource;
  } else {
    srcUrl = URL.createObjectURL(imageSource);
    isObjectUrl = true;
  }

  try {
    const img = await loadImage(srcUrl);

    const canvas = document.createElement('canvas');
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const totalPixels = width * height;

    // 1. Sample outer border pixels to determine the background paper tone
    const borderSamples: { r: number; g: number; b: number; lum: number }[] = [];
    const step = Math.max(1, Math.floor(Math.min(width, height) / 50));

    // Sample top and bottom rows
    for (let x = 0; x < width; x += step) {
      for (let y = 0; y < Math.min(10, height); y++) {
        const idx = (y * width + x) * 4;
        borderSamples.push({
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2],
          lum: getLuminance(data[idx], data[idx + 1], data[idx + 2]),
        });
      }
      for (let y = Math.max(0, height - 10); y < height; y++) {
        const idx = (y * width + x) * 4;
        borderSamples.push({
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2],
          lum: getLuminance(data[idx], data[idx + 1], data[idx + 2]),
        });
      }
    }

    // Sample left and right columns
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < Math.min(10, width); x++) {
        const idx = (y * width + x) * 4;
        borderSamples.push({
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2],
          lum: getLuminance(data[idx], data[idx + 1], data[idx + 2]),
        });
      }
      for (let x = Math.max(0, width - 10); x < width; x++) {
        const idx = (y * width + x) * 4;
        borderSamples.push({
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2],
          lum: getLuminance(data[idx], data[idx + 1], data[idx + 2]),
        });
      }
    }

    // Calculate background statistics from border samples
    let avgBgR = 240;
    let avgBgG = 240;
    let avgBgB = 240;
    let avgBgLum = 240;

    if (borderSamples.length > 0) {
      // Sort luminances and take 80th percentile to avoid sampling dark ink touching border
      borderSamples.sort((a, b) => a.lum - b.lum);
      const targetIdx = Math.floor(borderSamples.length * 0.8);
      const medianSample = borderSamples[targetIdx];
      avgBgR = medianSample.r;
      avgBgG = medianSample.g;
      avgBgB = medianSample.b;
      avgBgLum = medianSample.lum;
    }

    // Also scan whole image to find min luminance (darkest ink)
    let minLum = 255;
    let maxLum = 0;
    let hasBlueInk = false;

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = getLuminance(r, g, b);

      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;

      // Check if ink has blue/purple hue characteristic of ballpoint pen
      if (lum < avgBgLum - 30 && b > r + 15 && b > g + 10) {
        hasBlueInk = true;
      }
    }

    // Dynamic contrast range
    const effectiveBgLum = Math.max(avgBgLum, maxLum * 0.95);
    const contrastRange = Math.max(25, effectiveBgLum - minLum);

    // Bounding box trackers for auto-cropping
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let inkPixelsFound = 0;

    // 2. Process every pixel: calculate alpha transparency and enhance ink
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = getLuminance(r, g, b);

        // Relative darkness compared to paper background
        // 0.0 = pure paper background, 1.0 = darkest ink stroke
        const darkness = Math.max(0, (effectiveBgLum - lum) / contrastRange);

        // Color distance to background paper
        const colorDiff =
          Math.sqrt(
            Math.pow(r - avgBgR, 2) +
            Math.pow(g - avgBgG, 2) +
            Math.pow(b - avgBgB, 2)
          ) / 255;

        // Combined ink strength metric
        const inkStrength = Math.max(darkness, colorDiff * 1.5);

        // Thresholding with smooth anti-aliased edge transition
        const lowCut = sensitivity; // Below this: 100% transparent paper
        const highCut = sensitivity + 0.28; // Above this: 100% solid ink stroke

        let alpha = 0;
        if (inkStrength <= lowCut) {
          alpha = 0;
        } else if (inkStrength >= highCut) {
          alpha = 255;
        } else {
          // Smooth cosine interpolation for crisp, anti-aliased edges
          const t = (inkStrength - lowCut) / (highCut - lowCut);
          alpha = Math.round(t * 255);
        }

        if (alpha > 20) {
          inkPixelsFound++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }

        // Apply Ink Color Enhancement
        if (alpha > 0) {
          if (inkColorMode === 'black' || (inkColorMode === 'auto' && !hasBlueInk)) {
            // Clean dark slate/black ink
            data[idx] = 15;     // R
            data[idx + 1] = 23; // G
            data[idx + 2] = 42; // B
          } else if (inkColorMode === 'blue' || (inkColorMode === 'auto' && hasBlueInk)) {
            // Crisp deep royal/navy blue ballpoint pen ink
            data[idx] = 29;     // R: #1d4ed8
            data[idx + 1] = 78;  // G
            data[idx + 2] = 216; // B
          } else {
            // Original: remove paper tint by subtracting background luminance
            const darkenFactor = Math.min(1, darkness * 1.4);
            data[idx] = Math.round(r * (1 - (1 - darkenFactor) * 0.4));
            data[idx + 1] = Math.round(g * (1 - (1 - darkenFactor) * 0.4));
            data[idx + 2] = Math.round(b * (1 - (1 - darkenFactor) * 0.4));
          }
        }

        data[idx + 3] = alpha;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // 3. Auto-crop transparent boundaries if enabled and ink was found
    if (autoCrop && inkPixelsFound > 0 && maxX > minX && maxY > minY) {
      const pad = Math.max(4, cropPadding);
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(width - cropX, maxX - minX + pad * 2);
      const cropH = Math.min(height - cropY, maxY - minY + pad * 2);

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropW;
      croppedCanvas.height = cropH;
      const croppedCtx = croppedCanvas.getContext('2d');
      if (croppedCtx) {
        croppedCtx.drawImage(
          canvas,
          cropX, cropY, cropW, cropH,
          0, 0, cropW, cropH
        );
        return croppedCanvas.toDataURL('image/png');
      }
    }

    return canvas.toDataURL('image/png');
  } finally {
    if (isObjectUrl) {
      URL.revokeObjectURL(srcUrl);
    }
  }
}
