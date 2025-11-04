/**
 * Image Processing Service
 * Handles background removal, image trimming, and other image processing operations
 */

export interface ProcessedImage {
  src: string;
  width: number;
  height: number;
  trimmedWidth?: number;
  trimmedHeight?: number;
  originalWidth?: number;
  originalHeight?: number;
  dpi?: number;
}

const isColorSimilar = (color1: number[], color2: number[], tolerance = 30): boolean => {
  return (
    Math.abs(color1[0] - color2[0]) <= tolerance &&
    Math.abs(color1[1] - color2[1]) <= tolerance &&
    Math.abs(color1[2] - color2[2]) <= tolerance
  );
};

const getDominantEdgeColor = (imageData: ImageData): Uint8ClampedArray => {
  const { data, width, height } = imageData;
  const colorCounts = new Map<string, { count: number; color: Uint8ClampedArray }>();

  // Sample edges
  for (let x = 0; x < width; x++) {
    const topIdx = (x + 0 * width) * 4;
    const topColor = data.slice(topIdx, topIdx + 4);
    const topKey = Array.from(topColor).join(',');
    if (!colorCounts.has(topKey)) {
      colorCounts.set(topKey, { count: 0, color: topColor });
    }
    colorCounts.get(topKey)!.count++;

    const bottomIdx = (x + (height - 1) * width) * 4;
    const bottomColor = data.slice(bottomIdx, bottomIdx + 4);
    const bottomKey = Array.from(bottomColor).join(',');
    if (!colorCounts.has(bottomKey)) {
      colorCounts.set(bottomKey, { count: 0, color: bottomColor });
    }
    colorCounts.get(bottomKey)!.count++;
  }

  for (let y = 0; y < height; y++) {
    const leftIdx = (0 + y * width) * 4;
    const leftColor = data.slice(leftIdx, leftIdx + 4);
    const leftKey = Array.from(leftColor).join(',');
    if (!colorCounts.has(leftKey)) {
      colorCounts.set(leftKey, { count: 0, color: leftColor });
    }
    colorCounts.get(leftKey)!.count++;

    const rightIdx = ((width - 1) + y * width) * 4;
    const rightColor = data.slice(rightIdx, rightIdx + 4);
    const rightKey = Array.from(rightColor).join(',');
    if (!colorCounts.has(rightKey)) {
      colorCounts.set(rightKey, { count: 0, color: rightColor });
    }
    colorCounts.get(rightKey)!.count++;
  }

  let maxCount = 0;
  let dominantColor: Uint8ClampedArray = new Uint8ClampedArray([255, 255, 255, 255]);
  for (const { count, color } of colorCounts.values()) {
    if (count > maxCount) {
      maxCount = count;
      dominantColor = new Uint8ClampedArray(color);
    }
  }

  return dominantColor;
};

const checkForSolidBackground = (imageData: ImageData): boolean => {
  const { data, width, height } = imageData;
  const edgePixels: number[][] = [];

  // Sample edge pixels to determine background color
  for (let x = 0; x < width; x++) {
    // Top edge
    const topIdx = (x + 0 * width) * 4;
    edgePixels.push([
      data[topIdx],
      data[topIdx + 1],
      data[topIdx + 2],
      data[topIdx + 3],
    ]);

    // Bottom edge
    const bottomIdx = (x + (height - 1) * width) * 4;
    edgePixels.push([
      data[bottomIdx],
      data[bottomIdx + 1],
      data[bottomIdx + 2],
      data[bottomIdx + 3],
    ]);
  }

  for (let y = 0; y < height; y++) {
    // Left edge
    const leftIdx = (0 + y * width) * 4;
    edgePixels.push([
      data[leftIdx],
      data[leftIdx + 1],
      data[leftIdx + 2],
      data[leftIdx + 3],
    ]);

    // Right edge
    const rightIdx = ((width - 1) + y * width) * 4;
    edgePixels.push([
      data[rightIdx],
      data[rightIdx + 1],
      data[rightIdx + 2],
      data[rightIdx + 3],
    ]);
  }

  // Find the most common edge color
  const colorCounts = new Map<string, number>();
  edgePixels.forEach((pixel) => {
    const key = `${pixel[0]},${pixel[1]},${pixel[2]}`;
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
  });

  let maxCount = 0;
  let dominantColor: number[] | null = null;
  for (const [color, count] of colorCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      dominantColor = color.split(',').map(Number);
    }
  }

  // If the dominant edge color represents more than 60% of edge pixels, consider it a solid background
  const edgePixelCount = edgePixels.length;
  const backgroundRatio = maxCount / edgePixelCount;

  if (backgroundRatio > 0.6 && dominantColor) {
    // Check if the dominant color is actually used throughout the image
    let backgroundPixelCount = 0;
    const totalPixels = width * height;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a > 200 && isColorSimilar([r, g, b], dominantColor, 40)) {
        backgroundPixelCount++;
      }
    }

    // If more than 40% of the image is the background color, don't trim
    const backgroundCoverage = backgroundPixelCount / totalPixels;
    return backgroundCoverage > 0.4;
  }

  return false;
};

/**
 * Remove background from an image
 */
export const removeBackground = async (src: string): Promise<ProcessedImage> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        ctx.drawImage(img, 0, 0);

        let imageData: ImageData;
        try {
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (corsError) {
          // If CORS error occurs, return the original image without processing
          console.warn('CORS error during background removal, returning original:', corsError);
          resolve({
            src: src,
            width: canvas.width,
            height: canvas.height,
            dpi: Math.min(Math.max(Math.round((canvas.width / 10) * 72), 72), 300),
          });
          return;
        }

        const { data } = imageData;
        const backgroundColor = getDominantEdgeColor(imageData);
        let hasTransparency = false;

        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 250) {
            hasTransparency = true;
            break;
          }
        }

        if (!hasTransparency) {
          for (let i = 0; i < data.length; i += 4) {
            const pixelColor = data.slice(i, i + 4);
            if (isColorSimilar(Array.from(pixelColor), Array.from(backgroundColor), 35)) {
              data[i + 3] = 0; // Set alpha to 0
            } else {
              const x = (i / 4) % canvas.width;
              const y = Math.floor(i / 4 / canvas.width);

              if (x > 0 && x < canvas.width - 1 && y > 0 && y < canvas.height - 1) {
                const leftPixel = data.slice(i - 4, i);
                const rightPixel = data.slice(i + 4, i + 8);
                const topPixel = data.slice(i - canvas.width * 4, i - canvas.width * 4 + 4);
                const bottomPixel = data.slice(i + canvas.width * 4, i + canvas.width * 4 + 4);

                const surroundingTransparent =
                  leftPixel[3] === 0 ||
                  rightPixel[3] === 0 ||
                  topPixel[3] === 0 ||
                  bottomPixel[3] === 0;

                if (surroundingTransparent) {
                  data[i + 3] = Math.max(0, data[i + 3] - 40);
                }
              }
            }
          }
          ctx.putImageData(imageData, 0, 0);
        }

        const processedDataUrl = canvas.toDataURL('image/png');
        const effectiveDpi = Math.round((img.width / 10) * 72);

        resolve({
          src: processedDataUrl,
          width: canvas.width,
          height: canvas.height,
          dpi: Math.min(Math.max(effectiveDpi, 72), 300),
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
};

/**
 * Rasterize and trim image
 */
export const rasterizeAndTrimImage = async (
  src: string,
  dpi = 300,
): Promise<ProcessedImage> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const originalWidth = img.width;
      const originalHeight = img.height;
      canvas.width = originalWidth;
      canvas.height = originalHeight;

      ctx.drawImage(img, 0, 0);

      let imageData: ImageData;
      try {
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (corsError) {
        // If CORS error occurs, return the original image without trimming
        console.warn('CORS error during image processing, returning original:', corsError);
        resolve({
          src: src,
          width: originalWidth,
          height: originalHeight,
          trimmedWidth: originalWidth,
          trimmedHeight: originalHeight,
          originalWidth,
          originalHeight,
          dpi: dpi,
        });
        return;
      }

      // Check if image has a solid background that should be preserved
      const hasSolidBackground = checkForSolidBackground(imageData);

      // If image has a solid background, don't trim it
      if (hasSolidBackground) {
        resolve({
          src: src,
          width: originalWidth,
          height: originalHeight,
          trimmedWidth: originalWidth,
          trimmedHeight: originalHeight,
          originalWidth,
          originalHeight,
          dpi: dpi,
        });
        return;
      }

      const data = imageData.data;
      let minX = originalWidth;
      let minY = originalHeight;
      let maxX = 0;
      let maxY = 0;
      let isEmpty = true;
      const alphaThreshold = 10;

      // More conservative trimming - only trim if there's significant content variation
      for (let y = 0; y < originalHeight; y++) {
        for (let x = 0; x < originalWidth; x++) {
          const index = (y * originalWidth + x) * 4;
          const alpha = data[index + 3];
          if (alpha > alphaThreshold) {
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            // More conservative threshold - only consider pixels with significant color variation
            if (r > 15 || g > 15 || b > 15) {
              minX = Math.min(x, minX);
              minY = Math.min(y, minY);
              maxX = Math.max(x, maxX);
              maxY = Math.max(y, maxY);
              isEmpty = false;
            }
          }
        }
      }

      // Only trim if the trimmed area is significantly smaller than original
      const trimmedWidth = maxX - minX + 1;
      const trimmedHeight = maxY - minY + 1;
      const originalArea = originalWidth * originalHeight;
      const trimmedArea = trimmedWidth * trimmedHeight;
      const trimRatio = trimmedArea / originalArea;

      // If trimming would remove less than 20% of the image, don't trim
      if (trimRatio > 0.8) {
        resolve({
          src: src,
          width: originalWidth,
          height: originalHeight,
          trimmedWidth: originalWidth,
          trimmedHeight: originalHeight,
          originalWidth,
          originalHeight,
          dpi: dpi,
        });
        return;
      }

      const padding = 2;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(originalWidth - 1, maxX + padding);
      maxY = Math.min(originalHeight - 1, maxY + padding);

      if (isEmpty) {
        resolve({
          src: src,
          width: originalWidth,
          height: originalHeight,
          trimmedWidth: originalWidth,
          trimmedHeight: originalHeight,
          originalWidth,
          originalHeight,
          dpi: dpi,
        });
        return;
      }

      const finalTrimmedWidth = maxX - minX + 1;
      const finalTrimmedHeight = maxY - minY + 1;
      const trimmedCanvas = document.createElement('canvas');
      trimmedCanvas.width = finalTrimmedWidth;
      trimmedCanvas.height = finalTrimmedHeight;
      const trimmedCtx = trimmedCanvas.getContext('2d', { willReadFrequently: true });

      if (!trimmedCtx) {
        reject(new Error('Could not get trimmed canvas context'));
        return;
      }

      trimmedCtx.drawImage(
        canvas,
        minX,
        minY,
        finalTrimmedWidth,
        finalTrimmedHeight,
        0,
        0,
        finalTrimmedWidth,
        finalTrimmedHeight,
      );

      const trimmedDataUrl = trimmedCanvas.toDataURL('image/png', 1.0);

      resolve({
        src: trimmedDataUrl,
        width: finalTrimmedWidth,
        height: finalTrimmedHeight,
        trimmedWidth: finalTrimmedWidth,
        trimmedHeight: finalTrimmedHeight,
        originalWidth,
        originalHeight,
        dpi: dpi,
      });
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
};

/**
 * Process image with specified operation
 */
export const processImage = async (
  src: string,
  operation: 'removeBackground' | 'rasterizeAndTrim',
  dpi = 300,
): Promise<ProcessedImage> => {
  try {
    let result: ProcessedImage;

    if (operation === 'removeBackground') {
      result = await removeBackground(src);
    } else if (operation === 'rasterizeAndTrim') {
      result = await rasterizeAndTrimImage(src, dpi);
    } else {
      throw new Error(`Unknown operation: ${operation}`);
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

