/**
 * Replicate AI provider icon component.
 */

const ICON_SIZE = 12;
const REPLICATE_ICON_FILL = "#666";

/**
 * Props for the ReplicateIcon component.
 */
interface ReplicateIconProps {
  /** Optional CSS class name */
  className?: string;
  /** Optional fill color override */
  fill?: string;
  /** Optional icon size override */
  size?: number;
}

/**
 * SVG icon for the Replicate AI provider.
 *
 * @param props - Component props
 * @returns Replicate icon SVG element
 */
export function ReplicateIcon({
  className,
  fill = REPLICATE_ICON_FILL,
  size = ICON_SIZE,
}: ReplicateIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={fill}
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="M24 10.2624V12.9744H14.4816V24H11.448V10.2624H24Z" />
      <path d="M24 5.1312V7.848H8.7552V24H5.7216V5.1312H24Z" />
      <path d="M24 0V2.7168H3.0336V24H0V0H24Z" />
    </svg>
  );
}
