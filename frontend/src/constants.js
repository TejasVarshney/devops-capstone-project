export const STATUSES = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

export const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]));
export const PRIORITY_LABEL = Object.fromEntries(PRIORITIES.map((p) => [p.value, p.label]));
export const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

export const BUILD_INFO = {
  commit: import.meta.env.VITE_GIT_SHA || "dev",
  environment: import.meta.env.VITE_APP_ENV || "local",
};
