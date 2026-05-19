import { bindInput } from "./input.js";
import { render } from "./render.js";
import { state } from "./state.js";
import { initLevel, update } from "./systems.js";

function loop(time) {
  const dt = Math.min(0.033, (time - state.lastTime) / 1000 || 0);
  state.lastTime = time;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

bindInput();
initLevel(0);
requestAnimationFrame(loop);
