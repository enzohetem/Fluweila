export default function StatCard({
  label,
  value,
  tone = "neutral",
  onClick,
  href,
}) {
  const Component = href ? "a" : onClick ? "button" : "article";
  const props = {
    className: `stat-card tone-${tone} ${onClick || href ? "stat-card-clickable" : ""}`,
  };

  if (href) {
    props.href = href;
  }

  if (onClick) {
    props.type = "button";
    props.onClick = onClick;
  }

  return (
    <Component {...props}>
      <span>{label}</span>
      <strong>{value}</strong>
    </Component>
  );
}
