/**
 * FAL AI provider icon component.
 */

const FAL_ICON_FILL = "#FF0000";
const ICON_SIZE = 12;

/**
 * Props for the FalIcon component.
 */
interface FalIconProps {
  /** Optional CSS class name */
  className?: string;
  /** Optional fill color override */
  fill?: string;
  /** Optional icon size override */
  size?: number;
}

/**
 * SVG icon for the FAL AI provider.
 *
 * @param props - Component props
 * @returns FAL icon SVG element
 */
export function FalIcon({
  className,
  fill = FAL_ICON_FILL,
  size = ICON_SIZE,
}: FalIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={fill}
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="M15.4767 0C15.8923 0 16.2256 0.338042 16.2655 0.751966C16.6199 4.44335 19.558 7.38124 23.2498 7.73568C23.6637 7.77553 24.0017 8.10861 24.0017 8.52445V15.4756C24.0017 15.8914 23.6637 16.2245 23.2498 16.2643C19.558 16.6188 16.6199 19.5567 16.2655 23.2482C16.2256 23.662 15.8923 24 15.4767 24H8.52511C8.10932 24 7.77608 23.662 7.73633 23.2482C7.38178 19.5567 4.44377 16.6188 0.751985 16.2643C0.338099 16.2245 0 15.8914 0 15.4756V8.52445C0 8.10861 0.338099 7.77553 0.751985 7.73568C4.44377 7.38124 7.38178 4.44335 7.73633 0.751966C7.77608 0.338042 8.10932 0 8.52511 0H15.4767ZM4.81912 11.9798C4.81912 15.973 8.05283 19.21 12.0418 19.21C16.031 19.21 19.2646 15.973 19.2646 11.9798C19.2646 7.9864 16.031 4.74936 12.0418 4.74936C8.05283 4.74936 4.81912 7.9864 4.81912 11.9798Z" />
    </svg>
  );
}
