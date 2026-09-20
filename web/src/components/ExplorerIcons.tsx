import type { CSSProperties } from "react";

export function Mark() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 25 25"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 4h8.5a8.5 8.5 0 0 1 0 17H4V4Z"
        stroke="currentColor"
        strokeWidth="2.3"
      />
      <path d="M9 8.5h3.5a4 4 0 0 1 0 8H9v-8Z" fill="currentColor" />
    </svg>
  );
}

export type IconName =
  | "search"
  | "arrow"
  | "back"
  | "play"
  | "pause"
  | "expand"
  | "download"
  | "close"
  | "grid"
  | "link"
  | "chevron"
  | "check"
  | "refresh";
export function Icon({
  name,
  size = 18,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    back: <path d="M19 12H5m5-5-5 5 5 5" />,
    play: <path d="m9 5 11 7-11 7V5Z" fill="currentColor" strokeWidth="0" />,
    pause: (
      <>
        <path d="M8 5v14M16 5v14" strokeWidth="3" />
      </>
    ),
    expand: <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" />,
    download: <path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
    link: (
      <>
        <path
          d="m10 14 4-4m-6 5-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m2 2 1-1a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0"
          transform="translate(2 -1)"
        />
      </>
    ),
    chevron: <path d="m8 10 4 4 4-4" />,
    check: <path d="m5 12 4 4L19 6" />,
    refresh: <path d="M20 10a8 8 0 1 0-1 7M20 4v6h-6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
