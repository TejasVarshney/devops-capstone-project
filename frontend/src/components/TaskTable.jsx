import { PRIORITIES, STATUSES } from "../constants.js";
import { formatDue, isOverdue } from "../utils.js";
import { Avatar, PriorityBadge } from "./Badges.jsx";
import { ClockIcon, EditIcon, PlusIcon, TrashIcon } from "./Icons.jsx";

const FILTERS = [{ value: "all", label: "All" }, ...STATUSES];

export function StatusFilter({ value, counts, onChange }) {
  return (
    <div className="segmented" role="tablist" aria-label="Filter by status">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          role="tab"
          aria-selected={value === filter.value}
          className={`segmented__item ${value === filter.value ? "is-active" : ""}`}
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
          <span className="segmented__count">{counts[filter.value] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

export function TaskToolbar({ priority, onPriority, sort, onSort }) {
  return (
    <div className="toolbar">
      <label className="select-field">
        <span>Priority</span>
        <select value={priority} onChange={(event) => onPriority(event.target.value)}>
          <option value="all">All</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="select-field">
        <span>Sort</span>
        <select value={sort} onChange={(event) => onSort(event.target.value)}>
          <option value="newest">Newest</option>
          <option value="due">Due date</option>
          <option value="priority">Priority</option>
        </select>
      </label>
    </div>
  );
}

export default function TaskTable({ tasks, totalCount, onEdit, onDelete, onStatusChange, onCreate, onClearFilters }) {
  if (tasks.length === 0) {
    return totalCount === 0 ? (
      <div className="empty">
        <p className="empty__title">No tasks yet</p>
        <p className="empty__text">Create the first task for this sprint.</p>
        <button className="btn btn--primary" onClick={onCreate}>
          <PlusIcon /> New task
        </button>
      </div>
    ) : (
      <div className="empty">
        <p className="empty__title">No tasks match these filters</p>
        <p className="empty__text">Try another status, priority or search term.</p>
        <button className="btn btn--ghost" onClick={onClearFilters}>
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="task-table">
        <thead>
          <tr>
            <th scope="col">Task</th>
            <th scope="col">Status</th>
            <th scope="col">Priority</th>
            <th scope="col">Assignee</th>
            <th scope="col">Due</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const overdue = isOverdue(task);
            return (
              <tr key={task.id} className={task.status === "done" ? "is-done" : ""}>
                <td className="task-cell">
                  <button className="task-cell__title" onClick={() => onEdit(task)}>
                    {task.title}
                  </button>
                  {task.description && <p className="task-cell__desc">{task.description}</p>}
                  <span className="task-cell__id">TB-{task.id}</span>
                </td>
                <td data-label="Status">
                  <select
                    className={`status-select status-${task.status}`}
                    value={task.status}
                    onChange={(event) => onStatusChange(task, event.target.value)}
                    aria-label={`Status of ${task.title}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td data-label="Priority">
                  <PriorityBadge priority={task.priority} />
                </td>
                <td data-label="Assignee">
                  <span className="assignee">
                    <Avatar name={task.assignee} size={26} />
                    <span className="assignee__name">{task.assignee || "Unassigned"}</span>
                  </span>
                </td>
                <td data-label="Due">
                  <span className={`due ${overdue ? "due--overdue" : ""} ${task.due_date ? "" : "due--none"}`}>
                    {overdue && <ClockIcon size={14} />}
                    {formatDue(task.due_date)}
                  </span>
                </td>
                <td className="row-actions">
                  <button className="icon-btn" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`} title="Edit">
                    <EditIcon size={16} />
                  </button>
                  <button
                    className="icon-btn icon-btn--danger"
                    onClick={() => onDelete(task)}
                    aria-label={`Delete ${task.title}`}
                    title="Delete"
                  >
                    <TrashIcon size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
