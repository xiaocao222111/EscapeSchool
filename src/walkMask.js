const maskCache = new WeakMap();

export function canFootBoxUseMask(footBox, level) {
  if (!level.walkMask) return true;

  const offsetY = level.walkMaskOffsetY || 0;
  const insetX = Math.min(3, footBox.w / 3);
  const insetY = Math.min(2, footBox.h / 3);
  const samples = [
    { x: footBox.x + footBox.w / 2, y: footBox.y + footBox.h - insetY - offsetY },
    { x: footBox.x + insetX, y: footBox.y + footBox.h - insetY - offsetY },
    { x: footBox.x + footBox.w - insetX, y: footBox.y + footBox.h - insetY - offsetY },
  ];

  return samples.every((point) => isWalkablePoint(point, level));
}

export function drawWalkMaskDebug(ctx, level) {
  if (!level.walkMask || !level.walkMask.complete || level.walkMask.naturalWidth <= 0) return;

  const world = level.world;
  const mask = getMask(level);
  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.drawImage(mask.canvas, 0, 0, world.width, world.height);
  ctx.restore();
}

function isWalkablePoint(point, level) {
  const mask = getMask(level);
  if (!mask) return true;

  const x = Math.floor(point.x / level.world.width * mask.width);
  const y = Math.floor(point.y / level.world.height * mask.height);
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;

  const pixel = mask.ctx.getImageData(x, y, 1, 1).data;
  return pixel[3] > 16;
}

function getMask(level) {
  const image = level.walkMask;
  if (!image.complete || image.naturalWidth <= 0) return null;

  const colorKey = level.walkMaskColor ? level.walkMaskColor.join(",") : "alpha";
  const cached = maskCache.get(image);
  if (cached && cached.width === image.naturalWidth && cached.height === image.naturalHeight && cached.colorKey === colorKey) {
    return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  if (level.walkMaskColor) isolateMaskColor(ctx, canvas, level.walkMaskColor);
  const mask = { canvas, ctx, width: canvas.width, height: canvas.height, colorKey };
  maskCache.set(image, mask);
  return mask;
}

function isolateMaskColor(ctx, canvas, target) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const distance = Math.abs(data[i] - target[0]) + Math.abs(data[i + 1] - target[1]) + Math.abs(data[i + 2] - target[2]);
    if (data[i + 3] > 16 && distance <= 48) {
      data[i] = target[0];
      data[i + 1] = target[1];
      data[i + 2] = target[2];
      data[i + 3] = 255;
    } else {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}
