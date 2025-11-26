export const MedicalCross = ({ className, size = 24 }: { className?: string; size?: number }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Horizontal bar - bold medical cross style */}
      <rect x="2" y="9" width="20" height="6" rx="0" fill="currentColor" />
      {/* Vertical bar - bold medical cross style */}
      <rect x="9" y="2" width="6" height="20" rx="0" fill="currentColor" />
    </svg>
  )
}

