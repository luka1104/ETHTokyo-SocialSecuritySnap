export const SnapLogo = ({ color, size }: { color: string; size: number }) => (
  <img
    width={size}
    height={size}
    src="/assets/SocialSecuritySnap.png"
    alt="SocialSecuritySnap"
    style={{ fill: color }}
  />
);
