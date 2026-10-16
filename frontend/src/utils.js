import { STATUS_LABEL } from "./constants.js";

// "2026-10-18" -> Date at local midnight (avoids the UTC shift of new Date("2026-10-18")).
export function parseDay(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isOverdue(task) {
  const due = parseDay(task.due_date);
  return Boolean(due) && task.status !== "done" && due < startOfToday();
}

export function formatDue(value) {
  const due = parseDay(value);
  if (!due) return "No date";
  const days = Math.round((due - startOfToday()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  const sameYear = due.getFullYear() === new Date().getFullYear();
  return due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function timeAgo(value) {
  if (!value) return "";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

export function initials(name) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

// Stable pastel color per person, so the same assignee always gets the same avatar.
export function avatarHue(name = "") {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

export function buildActivity(tasks, limit = 7) {
  return [...tasks]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, limit)
    .map((task) => {
      const justCreated =
        Math.abs(new Date(task.updated_at) - new Date(task.created_at)) < 2000;
      let action;
      if (justCreated) action = "Created";
      else if (task.status === "done") action = "Completed";
      else action = `Moved to ${STATUS_LABEL[task.status]}`;
      return { id: task.id, title: task.title, assignee: task.assignee, status: task.status, action, at: task.updated_at };
    });
}
