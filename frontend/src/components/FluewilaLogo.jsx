export default function FluewilaLogo({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="fluewilaGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#8a3ffc" />
          <stop offset="40%" stopColor="#1f6fff" />
          <stop offset="100%" stopColor="#00c8ff" />
        </linearGradient>
      </defs>

      {/* Upper curved shape */}
      <path
        d="M 4 8 Q 4 4 8 4 Q 16 4 18 10 Q 18 8 20 8 Q 22 8 22 10 L 22 14 Q 22 16 20 16 Q 16 16 12 12 Q 8 16 4 16 Q 2 16 2 14 L 2 10 Q 2 8 4 8 Z"
        fill="url(#fluewilaGradient)"
        opacity="0.9"
      />

      {/* Lower curved shape */}
      <path
        d="M 6 18 Q 6 16 10 16 Q 14 16 18 20 Q 22 16 22 18 L 22 20 Q 22 22 20 22 Q 12 22 8 18 Q 4 22 2 22 Q 0 22 0 20 L 0 18 Q 0 16 2 16 Q 4 16 6 18 Z"
        fill="url(#fluewilaGradient)"
        opacity="0.8"
      />

      {/* Dot accent */}
      <circle
        cx="14"
        cy="22"
        r="2"
        fill="url(#fluewilaGradient)"
        opacity="0.95"
      />
    </svg>
  );
}
