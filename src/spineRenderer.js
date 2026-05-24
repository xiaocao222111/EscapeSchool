import { spineCharacters, spineRuntimeUrl } from "./config.js";
import { getFeetPoint } from "./math.js";

const assetCache = new Map();
let runtimePromise = null;

export function drawSpineActor(ctx, role, entity, animation, options = {}) {
  const spec = spineCharacters[role];
  if (!spec) return false;

  const asset = ensureAsset(spec, ctx);
  if (!asset.ready || !asset.createInstance) return false;

  const instance = getInstance(asset, entity);
  if (!instance) return false;

  const animationName = pickAnimation(instance, spec, animation);
  if (instance.currentAnimation !== animationName) {
    instance.currentAnimation = animationName;
    instance.state.setAnimation(0, animationName, animationName !== spec.animations.attack && animationName !== spec.animations.hurt);
  }

  const feet = getFeetPoint(entity);
  const facing = options.facing || (entity.dir >= 0 ? "right" : "left");
  const flip = facing !== spec.naturalFacing;

  instance.state.update(options.dt || 1 / 60);
  instance.state.apply(instance.skeleton);
  instance.skeleton.x = feet.x + (spec.offsetX || 0);
  instance.skeleton.y = feet.y + (spec.offsetY || 0);
  instance.skeleton.scaleX = (flip ? -1 : 1) * (spec.scale || 1);
  instance.skeleton.scaleY = -(spec.scale || 1);
  instance.skeleton.updateWorldTransform(instance.physics);

  ctx.save();
  try {
    asset.renderer.draw(instance.skeleton);
  } catch (error) {
    asset.failed = true;
    console.warn("Spine draw failed:", role, error);
    return false;
  } finally {
    ctx.restore();
  }

  return true;
}

function ensureAsset(spec, ctx) {
  const key = spec.basePath;
  if (!assetCache.has(key)) {
    const asset = {
      spec,
      checked: false,
      failed: false,
      ready: false,
      createInstance: null,
      instances: new WeakMap(),
      renderer: null,
    };
    assetCache.set(key, asset);
    loadAsset(asset, ctx);
  }
  return assetCache.get(key);
}

async function loadAsset(asset, ctx) {
  try {
    const jsonUrl = asset.spec.basePath + asset.spec.json;
    const atlasUrl = asset.spec.basePath + asset.spec.atlas;
    const [jsonResponse, atlasResponse] = await Promise.all([
      fetch(jsonUrl, { cache: "no-store" }),
      fetch(atlasUrl, { cache: "no-store" }),
    ]);
    asset.checked = true;
    if (!jsonResponse.ok || !atlasResponse.ok) {
      asset.failed = true;
      return;
    }

    const [jsonData, atlasText] = await Promise.all([
      jsonResponse.json(),
      atlasResponse.text(),
    ]);
    const spine = await loadRuntime();
    const atlas = await createAtlas(spine, asset.spec.basePath, atlasText);
    const skeletonJson = new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas));
    skeletonJson.scale = asset.spec.skeletonScale || 1;
    const skeletonData = skeletonJson.readSkeletonData(jsonData);
    const animationData = new spine.AnimationStateData(skeletonData);

    asset.renderer = new spine.SkeletonRenderer(ctx);
    asset.renderer.triangleRendering = true;
    asset.createInstance = () => {
      const skeleton = new spine.Skeleton(skeletonData);
      const state = new spine.AnimationState(animationData);
      skeleton.setToSetupPose();
      return {
        skeleton,
        state,
        physics: spine.Physics.update,
        currentAnimation: "",
        animationNames: new Set(skeletonData.animations.map((animation) => animation.name)),
      };
    };
    asset.ready = true;
  } catch (error) {
    asset.checked = true;
    asset.failed = true;
    console.warn("Spine asset unavailable, falling back:", asset.spec.basePath, error);
  }
}

function getInstance(asset, entity) {
  if (!asset.instances.has(entity)) {
    asset.instances.set(entity, asset.createInstance());
  }
  return asset.instances.get(entity);
}

function pickAnimation(instance, spec, wanted) {
  const preferred = spec.animations[wanted] || spec.animations.idle || "idle";
  if (instance.animationNames.has(preferred)) return preferred;
  if (spec.animations.idle && instance.animationNames.has(spec.animations.idle)) return spec.animations.idle;
  return instance.animationNames.values().next().value || preferred;
}

function loadRuntime() {
  if (window.spine) return Promise.resolve(window.spine);
  if (!runtimePromise) {
    runtimePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = spineRuntimeUrl;
      script.async = true;
      script.onload = () => window.spine ? resolve(window.spine) : reject(new Error("Spine runtime did not expose window.spine"));
      script.onerror = () => reject(new Error("Unable to load Spine runtime"));
      document.head.appendChild(script);
    });
  }
  return runtimePromise;
}

async function createAtlas(spine, basePath, atlasText) {
  const imageCache = new Map();
  const atlas = new spine.TextureAtlas(atlasText, (path) => {
    const image = new Image();
    image.src = basePath + path;
    const texture = new spine.CanvasTexture(image);
    imageCache.set(path, image);
    return texture;
  });
  await Promise.all([...imageCache.values()].map(waitForImage));
  return atlas;
}

function waitForImage(image) {
  if (image.complete && image.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Unable to load Spine texture: ${image.src}`));
  });
}
