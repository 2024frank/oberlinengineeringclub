export function MachineFirstFrame() {
  return <picture className="machine-first-frame">
    <source media="(max-width: 759px)" srcSet="/brand/machine/first-frame-mobile.webp"/>
    <img src="/brand/machine/first-frame-desktop.webp" width={1440} height={800} alt="" fetchPriority="high" loading="eager" decoding="async"/>
  </picture>
}
