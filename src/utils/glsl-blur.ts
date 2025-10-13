const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform vec2 u_direction;
  uniform float u_resolution;
  uniform float u_sigma;

  float gaussian(float x, float sigma) {
    return exp(-(x * x) / (2.0 * sigma * sigma));
  }

  void main() {
    vec2 texOffset = u_direction / max(u_resolution, 0.0001);
    vec4 color = texture2D(u_image, v_texCoord) * gaussian(0.0, u_sigma);
    float total = gaussian(0.0, u_sigma);

    for (int i = 1; i <= 15; i++) {
      float f = float(i);
      float weight = gaussian(f, u_sigma);
      vec2 offset = texOffset * f;
      color += texture2D(u_image, v_texCoord + offset) * weight;
      color += texture2D(u_image, v_texCoord - offset) * weight;
      total += 2.0 * weight;
    }

    gl_FragColor = color / total;
  }
`;

const DEFAULT_SIGMA = 20;
const DOWNSAMPLE_SCALE = 0.5;

interface BlurResources {
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  texCoordBuffer: WebGLBuffer;
  attributeLocations: {
    position: number;
    texCoord: number;
  };
  uniformLocations: {
    image: WebGLUniformLocation | null;
    direction: WebGLUniformLocation | null;
    resolution: WebGLUniformLocation | null;
    sigma: WebGLUniformLocation | null;
  };
}

const compileShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Failed to create shader");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? "unknown";
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${info}`);
  }
  return shader;
};

const createProgram = (gl: WebGLRenderingContext): BlurResources => {
  const vertexShader = compileShader(
    gl,
    gl.VERTEX_SHADER,
    VERTEX_SHADER_SOURCE,
  );
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    FRAGMENT_SHADER_SOURCE,
  );

  const program = gl.createProgram();
  if (!program) {
    throw new Error("Failed to create program");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? "unknown";
    gl.deleteProgram(program);
    throw new Error(`Program link failed: ${info}`);
  }

  const positionBuffer = gl.createBuffer();
  const texCoordBuffer = gl.createBuffer();

  if (!positionBuffer || !texCoordBuffer) {
    throw new Error("Failed to allocate buffers");
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const attributeLocations = {
    position: gl.getAttribLocation(program, "a_position"),
    texCoord: gl.getAttribLocation(program, "a_texCoord"),
  };

  if (
    attributeLocations.position === -1 ||
    attributeLocations.texCoord === -1
  ) {
    throw new Error("Failed to resolve shader attributes");
  }

  const uniformLocations = {
    image: gl.getUniformLocation(program, "u_image"),
    direction: gl.getUniformLocation(program, "u_direction"),
    resolution: gl.getUniformLocation(program, "u_resolution"),
    sigma: gl.getUniformLocation(program, "u_sigma"),
  };

  return {
    program,
    positionBuffer,
    texCoordBuffer,
    attributeLocations,
    uniformLocations,
  };
};

const configureTexture = (
  gl: WebGLRenderingContext,
  texture: WebGLTexture | null,
  width: number,
  height: number,
  source?: TexImageSource,
) => {
  if (!texture) {
    throw new Error("Failed to create texture");
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  if (source) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  } else {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
  }
};

const createFramebuffer = (
  gl: WebGLRenderingContext,
  texture: WebGLTexture | null,
): WebGLFramebuffer => {
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer || !texture) {
    throw new Error("Failed to create framebuffer");
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );
  return framebuffer;
};

const drawFullscreenQuad = (
  gl: WebGLRenderingContext,
  resources: BlurResources,
) => {
  gl.bindBuffer(gl.ARRAY_BUFFER, resources.positionBuffer);
  gl.enableVertexAttribArray(resources.attributeLocations.position);
  gl.vertexAttribPointer(
    resources.attributeLocations.position,
    2,
    gl.FLOAT,
    false,
    0,
    0,
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, resources.texCoordBuffer);
  gl.enableVertexAttribArray(resources.attributeLocations.texCoord);
  gl.vertexAttribPointer(
    resources.attributeLocations.texCoord,
    2,
    gl.FLOAT,
    false,
    0,
    0,
  );

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

const runBlurPass = (
  gl: WebGLRenderingContext,
  resources: BlurResources,
  inputTexture: WebGLTexture | null,
  targetFramebuffer: WebGLFramebuffer | null,
  direction: [number, number],
  resolution: number,
  sigma: number,
) => {
  gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer);
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.useProgram(resources.program);

  if (resources.uniformLocations.image) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    gl.uniform1i(resources.uniformLocations.image, 0);
  }

  if (resources.uniformLocations.direction) {
    gl.uniform2f(
      resources.uniformLocations.direction,
      direction[0],
      direction[1],
    );
  }

  if (resources.uniformLocations.resolution) {
    gl.uniform1f(resources.uniformLocations.resolution, resolution);
  }

  if (resources.uniformLocations.sigma) {
    gl.uniform1f(resources.uniformLocations.sigma, sigma);
  }

  drawFullscreenQuad(gl, resources);
};

const createFallbackBlurCanvas = (
  image: HTMLImageElement,
  width: number,
  height: number,
  sigma: number,
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    // CSS blur radius is roughly sigma * 1.5 for Gaussian approximation
    const blurRadius = Math.max(Math.round(sigma * 1.5), 1);
    context.filter = `blur(${blurRadius}px)`;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);
  }
  return canvas;
};

export const createBlurredCloneCanvas = (
  image: HTMLImageElement,
  width: number,
  height: number,
  sigma = DEFAULT_SIGMA,
): HTMLCanvasElement => {
  const targetWidth = Math.max(1, Math.round(width));
  const targetHeight = Math.max(1, Math.round(height));

  if (!targetWidth || !targetHeight) {
    return createFallbackBlurCanvas(image, 1, 1, sigma);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const gl = canvas.getContext("webgl", {
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });

  if (!gl) {
    return createFallbackBlurCanvas(image, targetWidth, targetHeight, sigma);
  }

  try {
    const resources = createProgram(gl);

    // Downsample for better performance on large images
    const blurWidth = Math.max(1, Math.round(targetWidth * DOWNSAMPLE_SCALE));
    const blurHeight = Math.max(1, Math.round(targetHeight * DOWNSAMPLE_SCALE));

    // Temporary canvas for downsampling
    const downsampleCanvas = document.createElement("canvas");
    downsampleCanvas.width = blurWidth;
    downsampleCanvas.height = blurHeight;
    const downsampleCtx = downsampleCanvas.getContext("2d");
    if (downsampleCtx) {
      downsampleCtx.imageSmoothingEnabled = true;
      downsampleCtx.imageSmoothingQuality = "high";
      downsampleCtx.drawImage(image, 0, 0, blurWidth, blurHeight);
    }

    // Create textures at downsampled resolution
    const originalTexture = gl.createTexture();
    configureTexture(
      gl,
      originalTexture,
      blurWidth,
      blurHeight,
      downsampleCanvas,
    );

    const horizontalTexture = gl.createTexture();
    configureTexture(gl, horizontalTexture, blurWidth, blurHeight);
    const verticalTexture = gl.createTexture();
    configureTexture(gl, verticalTexture, blurWidth, blurHeight);

    const firstPassFbo = createFramebuffer(gl, horizontalTexture);
    const secondPassFbo = createFramebuffer(gl, verticalTexture);

    const effectiveSigma = Math.max(sigma * DOWNSAMPLE_SCALE, 0.5);

    // Two-pass blur at reduced resolution
    gl.viewport(0, 0, blurWidth, blurHeight);
    runBlurPass(
      gl,
      resources,
      originalTexture,
      firstPassFbo,
      [1, 0],
      blurWidth,
      effectiveSigma,
    );
    runBlurPass(
      gl,
      resources,
      horizontalTexture,
      secondPassFbo,
      [0, 1],
      blurHeight,
      effectiveSigma,
    );

    // Render final blurred result to full-resolution canvas with bilinear upscaling
    gl.viewport(0, 0, targetWidth, targetHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(resources.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, verticalTexture);
    if (resources.uniformLocations.image) {
      gl.uniform1i(resources.uniformLocations.image, 0);
    }
    if (resources.uniformLocations.direction) {
      gl.uniform2f(resources.uniformLocations.direction, 0, 0);
    }

    drawFullscreenQuad(gl, resources);

    return canvas;
  } catch (error) {
    console.error("GLSL blur failed, using 2D fallback", error);
    return createFallbackBlurCanvas(image, targetWidth, targetHeight, sigma);
  }
};
