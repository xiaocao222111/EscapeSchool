import { canvas } from "./ui.js?v=20260608-success-button-2";

const baseWidth = 960;
const baseHeight = 540;

export function resizeViewport() {
  if (canvas.width === baseWidth && canvas.height === baseHeight) return false;

  canvas.width = baseWidth;
  canvas.height = baseHeight;
  return true;
}
