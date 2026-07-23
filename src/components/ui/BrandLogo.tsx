interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <img
      src="/cs12-logo.png"
      alt="CS12"
      className={className}
      loading="eager"
      decoding="async"
    />
  )
}
