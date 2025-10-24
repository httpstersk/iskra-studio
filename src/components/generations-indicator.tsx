"use client";

import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

interface GenerationsIndicatorProps {
  className?: string;
  isAnimating?: boolean;
  outputType?: "image" | "video";
  isSuccess?: boolean;
  speed?: number;
  statusMessage: string;
  successMessage?: string;
}

const VARIANT_STYLES = {
  image: {
    container: "",
    fill: "#EC0648",
    shimmerHighlight: "[--color-background:theme(colors.rose.300)]",
  },
  video: {
    container: "",
    fill: "#A855F7",
    shimmerHighlight: "[--color-background:theme(colors.purple.300)]",
  },
  success: {
    container: "border-emerald-500/40 text-emerald-400",
    fill: "#22c55e",
    shimmerHighlight: "",
  },
} as const;

type VariantKey = keyof typeof VARIANT_STYLES;

export function GenerationsIndicator({
  className,
  isAnimating = true,
  outputType = "image",
  isSuccess = false,
  speed = 150,
  statusMessage,
  successMessage = "Done",
}: GenerationsIndicatorProps) {
  const variant: VariantKey = isSuccess ? "success" : outputType;
  const styles = VARIANT_STYLES[variant];
  const accentColor = VARIANT_STYLES[outputType].fill;

  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-3 rounded-xl border border-border/60 px-3 py-2",
        "bg-card/90 text-sm font-medium text-foreground backdrop-blur-md",
        styles.container,
        className
      )}
      role="status"
    >
      {!isSuccess && (
        <StatusOrb
          color={accentColor}
          isAnimating={isAnimating}
          speed={speed}
        />
      )}

      {isSuccess ? (
        <span className="flex items-center gap-2 text-sm font-medium">
          <svg
            aria-hidden
            className="h-4 w-4 text-emerald-300"
            fill="none"
            viewBox="0 0 19 19"
          >
            <path
              d="M3 10L7 14L16 5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          {successMessage}
        </span>
      ) : isAnimating ? (
        <Shimmer
          as="span"
          className={cn(
            "whitespace-nowrap text-sm font-medium",
            "[--color-muted-foreground:theme(colors.zinc.500)]",
            styles.shimmerHighlight
          )}
          duration={1.5}
        >
          {statusMessage}
        </Shimmer>
      ) : (
        <span className="whitespace-nowrap text-sm font-medium text-foreground/80">
          {statusMessage}
        </span>
      )}
    </div>
  );
}

type ShaderContext = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  vertexShader: WebGLShader;
  fragmentShader: WebGLShader;
  uniforms: {
    time: WebGLUniformLocation | null;
    tint: WebGLUniformLocation | null;
    resolution: WebGLUniformLocation | null;
  };
};

function StatusOrb({
  color,
  isAnimating,
  speed,
}: {
  color: string;
  isAnimating: boolean;
  speed: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<ShaderContext | null>(null);
  const frameRef = useRef<number>();
  const elapsedRef = useRef(0);
  const [isSupported, setIsSupported] = useState(true);

  const tint = useMemo(() => hexToVec3(color), [color]);
  const timeScale = useMemo(() => {
    const clampedSpeed = Math.max(speed, 16);
    return 150 / clampedSpeed;
  }, [speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
      });

      if (!gl) {
        setIsSupported(false);
        return;
      }

      const pixelRatio =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const logicalSize = 24;
      canvas.width = logicalSize * pixelRatio;
      canvas.height = logicalSize * pixelRatio;
      canvas.style.width = `${logicalSize}px`;
      canvas.style.height = `${logicalSize}px`;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const vertexSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision mediump float;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec3 u_tint;

      float gridMask(vec2 pos, float count, out vec2 cellIndex) {
        vec2 scaled = pos * count + vec2(0.5 * count);
        cellIndex = floor(scaled);
        vec2 cellUV = fract(scaled);
        vec2 inside = step(vec2(0.0), scaled) * step(scaled, vec2(count));
        float edge = step(max(abs(cellUV - 0.5).x, abs(cellUV - 0.5).y), 0.48);
        return inside.x * inside.y * edge;
      }

      float pulse(vec2 index, float mask, float time) {
        return mask * (0.6 + 0.4 * sin(time * 2.4 + (index.x + index.y) * 1.2));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 pos = uv - 0.5;

        float cycle = u_time * 0.75;
        float stage = floor(mod(cycle, 4.0));
        float progress = fract(cycle);
        float baseCount = stage + 1.0;
        float nextStage = mod(stage + 1.0, 4.0);
        float targetCount = nextStage + 1.0;
        float transition = smoothstep(0.25, 0.85, progress);

        vec2 baseIndex;
        float baseMask = gridMask(pos, baseCount, baseIndex);

        vec2 nextIndex;
        float nextMask = gridMask(pos, targetCount, nextIndex);

        float alpha = clamp(mix(baseMask, nextMask, transition), 0.0, 1.0);
        if (alpha <= 0.0) {
          discard;
        }

        float basePulse = pulse(baseIndex, baseMask, u_time);
        float nextPulse = pulse(nextIndex, nextMask, u_time);
        float energy = mix(basePulse, nextPulse, transition);

        vec3 baseColor = vec3(0.05, 0.06, 0.08);
        vec3 cellColor = u_tint * energy;

        vec3 color = mix(baseColor, cellColor, alpha);
        gl_FragColor = vec4(color, alpha);
      }
    `;

      const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
      const fragmentShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        fragmentSource
      );
      const program = createProgram(gl, vertexShader, fragmentShader);

      const buffer = gl.createBuffer();
      if (!buffer) {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        setIsSupported(false);
        return;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      const positionLocation = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      const uniforms = {
        time: gl.getUniformLocation(program, "u_time"),
        tint: gl.getUniformLocation(program, "u_tint"),
        resolution: gl.getUniformLocation(program, "u_resolution"),
      };

      gl.useProgram(program);
      if (uniforms.resolution) {
        gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      }

      contextRef.current = {
        gl,
        program,
        buffer,
        vertexShader,
        fragmentShader,
        uniforms,
      };
      setIsSupported(true);

      return () => {
        if (frameRef.current !== undefined) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = undefined;
        }

        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        contextRef.current = null;
      };
    } catch (error) {
      console.warn("StatusOrb initialization failed", error);
      setIsSupported(false);
      contextRef.current = null;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const { gl, program, uniforms } = context;
    gl.useProgram(program);

    const draw = (time: number) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (uniforms.time) {
        gl.uniform1f(uniforms.time, time);
      }
      if (uniforms.tint) {
        gl.uniform3fv(uniforms.tint, tint);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const start = performance.now() - (elapsedRef.current / timeScale) * 1000;

    const render = (now: number) => {
      const elapsedSeconds = ((now - start) / 1000) * timeScale;
      elapsedRef.current = elapsedSeconds;
      draw(elapsedSeconds);
      frameRef.current = requestAnimationFrame(render);
    };

    draw(elapsedRef.current);

    if (isAnimating) {
      frameRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
      }
    };
  }, [isAnimating, tint, timeScale]);

  if (!isSupported) {
    return (
      <span
        aria-hidden
        className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-foreground/30"
      >
        <span className="h-3 w-3 rounded-full bg-foreground/50" />
      </span>
    );
  }

  return (
    <canvas aria-hidden className="h-5 w-5 flex-shrink-0" ref={canvasRef} />
  );
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Unable to create shader");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? "Unknown error";
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${info}`);
  }

  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) {
  const program = gl.createProgram();
  if (!program) {
    throw new Error("Unable to create shader program");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? "Unknown error";
    gl.deleteProgram(program);
    throw new Error(`Program linking failed: ${info}`);
  }

  return program;
}

function hexToVec3(hex: string): Float32Array {
  const sanitized = hex.startsWith("#") ? hex.slice(1) : hex;
  const int = parseInt(sanitized, 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;

  return new Float32Array([r, g, b]);
}
