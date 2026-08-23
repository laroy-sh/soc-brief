// The signal field behind the masthead: a slow GPU-rendered drift of banded
// noise, brightest where the pointer is, settling back to a near-still baseline
// a few seconds after the pointer stops. Ambience, never a foreground.
//
// It renders only when it can do so cheaply and politely: WebGL2 present, wide
// viewport, motion not reduced, tab visible, canvas on screen. Any of those
// missing and the page keeps the flat background it ships with.

const canvas = document.querySelector("[data-field]");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const narrow = matchMedia("(max-width: 700px)");

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision mediump float;
uniform vec2 uSize;
uniform vec2 uPointer;   // pixels; off-canvas when the pointer has left
uniform float uTime;     // seconds
uniform float uEnergy;   // 0 at rest, 1 just after the pointer moved
out vec4 fragColor;

float hash(vec2 v) { return fract(sin(dot(v, vec2(41.3, 289.1))) * 43758.5453); }

float noise(vec2 v) {
  vec2 i = floor(v), f = fract(v);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

float fbm(vec2 v) {
  float sum = 0.0, amp = 0.5;
  for (int i = 0; i < 4; i++) { sum += amp * noise(v); v *= 2.02; amp *= 0.5; }
  return sum;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 sk = vec2(uv.x * 3.2, uv.y * 1.6);

  // Two drifting octaves plus a slow horizontal band: the field reads as signal
  // moving left to right rather than as static fog.
  float drift = fbm(sk + vec2(uTime * 0.035, uTime * -0.012));
  float band = fbm(sk * vec2(1.0, 6.0) + vec2(uTime * 0.09, 0.0));
  float f = mix(drift, band, 0.35);

  // The pointer lifts the field locally, and everything relaxes when it stops.
  float d = distance(gl_FragCoord.xy, uPointer) / max(uSize.x * 0.42, 1.0);
  float lift = exp(-d * d * 3.0) * uEnergy;
  float v = smoothstep(0.34, 0.92, f + lift * 0.30);

  // Strongest at the top, gone before the reading column begins.
  float fade = smoothstep(0.0, 0.55, uv.y) * smoothstep(1.0, 0.72, uv.y);
  vec3 tint = mix(vec3(0.11, 0.42, 0.47), vec3(0.36, 0.83, 0.87), v);
  float a = v * fade * (0.20 + 0.16 * uEnergy);
  fragColor = vec4(tint * a, a);
}`;

function compile(gl, kind, src) {
  const sh = gl.createShader(kind);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("[field]", gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

function start() {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: true, depth: false });
  if (!gl) return;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const uSize = gl.getUniformLocation(prog, "uSize");
  const uPointer = gl.getUniformLocation(prog, "uPointer");
  const uTime = gl.getUniformLocation(prog, "uTime");
  const uEnergy = gl.getUniformLocation(prog, "uEnergy");

  let width = 0;
  let height = 0;
  const resize = () => {
    // Half resolution, capped: the field is all low frequencies, so the pixels
    // saved here cost nothing visible.
    const dpr = Math.min(devicePixelRatio || 1, 1.5) * 0.5;
    width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  };
  resize();
  addEventListener("resize", resize, { passive: true });

  let pointer = [-1e4, -1e4];
  let energy = 0;
  let target = 0;
  addEventListener("pointermove", (e) => {
    const box = canvas.getBoundingClientRect();
    const dpr = width / Math.max(canvas.clientWidth, 1);
    pointer = [(e.clientX - box.left) * dpr, (box.height - (e.clientY - box.top)) * dpr];
    target = e.clientY < box.bottom ? 1 : 0;
    settle();
  }, { passive: true });

  let idle;
  const settle = () => {
    clearTimeout(idle);
    idle = setTimeout(() => { target = 0; }, 2200);
  };

  let running = true;
  let frame = 0;
  const t0 = performance.now();
  const draw = (now) => {
    if (!running) return;
    // Exponential approach in both directions — the lift arrives quickly and
    // the settle is slower, which is what makes it read as relaxing.
    energy += (target - energy) * (target > energy ? 0.06 : 0.02);
    gl.uniform2f(uSize, width, height);
    gl.uniform2f(uPointer, pointer[0], pointer[1]);
    gl.uniform1f(uTime, (now - t0) / 1000);
    gl.uniform1f(uEnergy, energy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    frame = requestAnimationFrame(draw);
  };

  const play = () => {
    if (running) return;
    running = true;
    frame = requestAnimationFrame(draw);
  };
  const pause = () => {
    running = false;
    cancelAnimationFrame(frame);
  };

  frame = requestAnimationFrame(draw);
  canvas.dataset.on = "";

  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));
  // Scrolled past: nothing to render, so render nothing.
  new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : pause()))
    .observe(canvas);
}

if (canvas && !reduced.matches && !narrow.matches) start();
