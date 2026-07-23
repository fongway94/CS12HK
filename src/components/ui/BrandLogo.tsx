interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <img
      src="/CS12_Logo_transparent.png"
      alt=""
      className={className}
      loading="eager"
      decoding="async"
    />
  )
}
