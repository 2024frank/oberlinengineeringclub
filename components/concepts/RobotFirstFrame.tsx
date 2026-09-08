export function RobotFirstFrame() {
  return <picture className="robot-first-frame">
    <source media="(max-width: 759px)" srcSet="/brand/robot/first-frame-mobile.webp"/>
    {/* Art direction uses separate camera framing for mobile, before JavaScript loads. */}
    <img src="/brand/robot/first-frame-desktop.webp" width={1440} height={838} alt="" fetchPriority="high" loading="eager" decoding="async"/>
  </picture>
}
