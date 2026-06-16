import { SVGProps } from "react";

interface AppleLogoProps extends Omit<SVGProps<SVGSVGElement>, "size"> {
  size?: number | string;
}

/**
 * Official Apple Inc. silhouette logo (filled), used wherever the App Store
 * / Apple platform is referenced. Replaces the Lucide `Apple` (fruit) icon.
 */
export default function AppleLogo({ size = 24, color = "currentColor", ...rest }: AppleLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 384 512"
      fill={color}
      aria-hidden="true"
      {...rest}
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM248.5 92.6c19.7-24.4 28.4-55.8 26.3-90.6-30.4 1.6-67.6 19.7-89.4 47.5-19.6 24.4-31.4 54.6-26.3 89.5 32.4 2.8 67.6-15.3 89.4-46.4z" />
    </svg>
  );
}
