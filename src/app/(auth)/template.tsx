// Re-mounts on every navigation, so each page gets a soft fade + lift.
// Plain CSS (not JS) so server-rendered pages are visible before scripts load.
export default function AuthTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fade-up">{children}</div>;
}
