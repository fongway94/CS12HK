interface BrandLogoProps {
  className?: string
}

// Public assets must use Vite's configured base path. A root-relative URL works
// locally, but requests `/CS12_Logo_transparent.png` on GitHub Pages instead of
// `/CS12HK/CS12_Logo_transparent.png`, leaving the header logo blank.
const logoSrc = `${import.meta.env.BASE_URL}CS12_Logo_transparent.png`

export function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <img
      src={logoSrc}
      alt="CS12 Skin Experts"
      className={className}
      loading="eager"
      decoding="async"
    />
  )
}
