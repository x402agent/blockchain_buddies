import Link from "next/link";

type PetdexLogoProps = {
  href?: string;
  showWordmark?: boolean;
  className?: string;
  markClassName?: string;
  ariaLabel?: string;
};

export function PetdexLogo({
  href,
  showWordmark = true,
  className = "",
  markClassName = "size-10",
  ariaLabel = "OpenClawd Buddies home",
}: PetdexLogoProps) {
  const content = (
    <>
      <PetdexMark className={markClassName} />
      {showWordmark ? (
        <span className="text-xl font-semibold tracking-normal">
          OpenClawd Buddies
        </span>
      ) : null}
    </>
  );

  const classes = `inline-flex items-center gap-3 text-foreground ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}

function PetdexMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="openclawd-body"
          x1="8"
          y1="8"
          x2="56"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ff7a1a" />
          <stop offset="1" stopColor="#1a1d2e" />
        </linearGradient>
      </defs>

      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="16"
        fill="url(#openclawd-body)"
      />

      <g fill="#ffffff">
        <rect x="14" y="14" width="6" height="22" />
        <rect x="26" y="14" width="6" height="22" />
        <rect x="38" y="14" width="6" height="22" />
        <rect x="14" y="36" width="6" height="6" />
        <rect x="26" y="36" width="6" height="6" />
        <rect x="38" y="36" width="6" height="6" />
        <rect x="20" y="42" width="24" height="6" />
      </g>
    </svg>
  );
}
