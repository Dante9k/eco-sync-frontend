/** A precision gear with a circular hub for the manufacturing workspace. */
export function BrandMark({ size = 26 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false" data-brand="manufacturing">
    <path d="M26.91 13.08L30.32 13.73 30.32 18.27 26.91 18.92A11.3 11.3 0 0 1 25.79 21.65L27.73 24.52 24.52 27.73 21.65 25.79A11.3 11.3 0 0 1 18.92 26.91L18.27 30.32 13.73 30.32 13.08 26.91A11.3 11.3 0 0 1 10.35 25.79L7.48 27.73 4.27 24.52 6.21 21.65A11.3 11.3 0 0 1 5.09 18.92L1.68 18.27 1.68 13.73 5.09 13.08A11.3 11.3 0 0 1 6.21 10.35L4.27 7.48 7.48 4.27 10.35 6.21A11.3 11.3 0 0 1 13.08 5.09L13.73 1.68 18.27 1.68 18.92 5.09A11.3 11.3 0 0 1 21.65 6.21L24.52 4.27 27.73 7.48 25.79 10.35A11.3 11.3 0 0 1 26.91 13.08ZM22 16a6 6 0 1 0-12 0a6 6 0 1 0 12 0Z" fill="currentColor" fillRule="evenodd"/>
    <circle cx="16" cy="16" r="2.3" fill="currentColor"/>
  </svg>;
}
