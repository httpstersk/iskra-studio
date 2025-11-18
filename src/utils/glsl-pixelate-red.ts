import { CANVAS_GRID } from "@/constants/canvas";

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
  uniform vec2 u_resolution;
  uniform float u_pixelSize;

  void main() {
    // Calculate which pixel block this fragment belongs to
    vec2 pixelCoord = floor(v_texCoord * u_resolution / u_pixelSize);
    
    // Calculate the center of the pixel block in texture coordinates
    vec2 blockCenter = (pixelCoord * u_pixelSize + u_pixelSize * 0.5) / u_resolution;
    
    // Sample the texture at the block center
    vec4 color = texture2D(u_image, blockCenter);
    
    // Convert to luminance (grayscale)
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    
    // Map luminance to red spectrum (dark red to bright red)
    // Dark red for shadows, bright red for highlights
    gl_FragColor = vec4(luminance, luminance * 0.1, luminance * 0.1, color.a);
  }
`;

const DEFAULT_PIXEL_SIZE = CANVAS_GRID.PIXEL_SIZE;

interface PixelateResources {
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  texCoordBuffer: WebGLBuffer;
  attributeLocations: {
    position: number;
    texCoord: number;
  };
  uniformLocations: {
    image: WebGLUniformLocation | null;
    resolution: WebGLUniformLocation | null;
    pixelSize: WebGLUniformLocation | null;
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

const createProgram = (gl: WebGLRenderingContext): PixelateResources => {
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
    resolution: gl.getUniformLocation(program, "u_resolution"),
    pixelSize: gl.getUniformLocation(program, "u_pixelSize"),
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
  source: TexImageSource,
) => {
  if (!texture) {
    throw new Error("Failed to create texture");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
};

const drawFullscreenQuad = (
  gl: WebGLRenderingContext,
  resources: PixelateResources,
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

const createFallbackRedPixelateCanvas = (
  image: HTMLImageElement,
  width: number,
  height: number,
  pixelSize: number,
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (context) {
    context.imageSmoothingEnabled = false;

    const scaledWidth = Math.max(1, Math.floor(width / pixelSize));
    const scaledHeight = Math.max(1, Math.floor(height / pixelSize));

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = scaledWidth;
    tempCanvas.height = scaledHeight;
    const tempCtx = tempCanvas.getContext("2d");

    if (tempCtx) {
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.drawImage(image, 0, 0, scaledWidth, scaledHeight);

      context.drawImage(tempCanvas, 0, 0, width, height);

      // Apply red tint using canvas compositing
      const imageData = context.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const luminance =
          0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = luminance;
        data[i + 1] = luminance * 0.1;
        data[i + 2] = luminance * 0.1;
      }
      context.putImageData(imageData, 0, 0);
    }
  }
  return canvas;
};

export const createRedPixelatedCanvas = (
  image: HTMLImageElement,
  width: number,
  height: number,
  pixelSize: number = DEFAULT_PIXEL_SIZE,
): HTMLCanvasElement => {
  const targetWidth = Math.max(1, Math.round(width));
  const targetHeight = Math.max(1, Math.round(height));

  if (!targetWidth || !targetHeight) {
    return createFallbackRedPixelateCanvas(image, 1, 1, pixelSize);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const gl = canvas.getContext("webgl", {
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });

  if (!gl) {
    return createFallbackRedPixelateCanvas(
      image,
      targetWidth,
      targetHeight,
      pixelSize,
    );
  }

  try {
    const resources = createProgram(gl);

    const sourceTexture = gl.createTexture();
    configureTexture(gl, sourceTexture, image);

    gl.viewport(0, 0, targetWidth, targetHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(resources.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);

    if (resources.uniformLocations.image) {
      gl.uniform1i(resources.uniformLocations.image, 0);
    }

    if (resources.uniformLocations.resolution) {
      gl.uniform2f(
        resources.uniformLocations.resolution,
        targetWidth,
        targetHeight,
      );
    }

    if (resources.uniformLocations.pixelSize) {
      gl.uniform1f(resources.uniformLocations.pixelSize, pixelSize);
    }

    drawFullscreenQuad(gl, resources);

    return canvas;
  } catch (_error) {
    return createFallbackRedPixelateCanvas(
      image,
      targetWidth,
      targetHeight,
      pixelSize,
    );
  }
};
