import { PRIORITY_LABEL, STATUS_LABEL } from "../constants.js";
import { avatarHue, initials } from "../utils.js";

export function PriorityBadge({ priority }) {
  return (
    <span className={`badge badge--${priority}`}>
      <span className="badge__dot" />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function StatusPill({ status }) {
  return <span className={`pill status-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function Avatar({ name, size = 28 }) {
  const style = name
    ? { "--hue": avatarHue(name), width: size, height: size }
    : { width: size, height: size };
  return (
    <span className={`avatar ${name ? "" : "avatar--empty"}`} style={style} title={name || "Unassigned"}>
      {name ? initials(name) : "–"}
    </span>
  );
}
