interface EngineeringCopilotMarkProps {
  className?: string;
}

export function EngineeringCopilotMark({ className = 'h-14 w-14' }: EngineeringCopilotMarkProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-[22px] bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.38),_transparent_54%),linear-gradient(135deg,_rgba(30,41,59,0.96),_rgba(15,23,42,0.98))] text-white shadow-[0_20px_40px_-22px_rgba(37,99,235,0.65)] ${className}`}
    >
      <div className="absolute inset-[1px] rounded-[21px] border border-white/10 bg-[linear-gradient(180deg,_rgba(30,41,59,0.3),_rgba(15,23,42,0))]" />
      <svg
        aria-hidden="true"
        className="relative z-10 h-[70%] w-[70%]"
        fill="none"
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M32 8 48 14v16c0 11.2-6.7 21.2-16 26-9.3-4.8-16-14.8-16-26V14L32 8Z"
          fill="url(#shieldFill)"
          stroke="rgba(191,219,254,0.9)"
          strokeWidth="2"
        />
        <path d="M32 22v19" stroke="rgba(224,231,255,0.95)" strokeLinecap="round" strokeWidth="2.4" />
        <path d="M32 28h-8" stroke="rgba(224,231,255,0.95)" strokeLinecap="round" strokeWidth="2.4" />
        <path d="M32 28h8" stroke="rgba(224,231,255,0.95)" strokeLinecap="round" strokeWidth="2.4" />
        <path d="M32 39h-6" stroke="rgba(224,231,255,0.95)" strokeLinecap="round" strokeWidth="2.4" />
        <circle cx="24" cy="28" fill="#93C5FD" r="2.8" />
        <circle cx="40" cy="28" fill="#93C5FD" r="2.8" />
        <circle cx="32" cy="42" fill="#BFDBFE" r="2.6" />
        <circle cx="28.5" cy="23.5" fill="#E0E7FF" r="1.6" />
        <circle cx="35.5" cy="23.5" fill="#E0E7FF" r="1.6" />
        <path d="M27 34.5c1.7 1.6 3.4 2.4 5 2.4s3.3-.8 5-2.4" stroke="#BFDBFE" strokeLinecap="round" strokeWidth="2" />
        <defs>
          <linearGradient id="shieldFill" x1="32" x2="32" y1="10" y2="56">
            <stop stopColor="#1D4ED8" />
            <stop offset="0.55" stopColor="#312E81" />
            <stop offset="1" stopColor="#0F172A" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
