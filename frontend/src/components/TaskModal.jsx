import { useEffect, useRef, useState } from "react";
import { PRIORITIES, STATUSES } from "../constants.js";
import { CloseIcon } from "./Icons.jsx";

const EMPTY = { title: "", description: "", status: "todo", priority: "medium", assignee: "", due_date: "" };

function toForm(task) {
  if (!task) return EMPTY;
  return {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    assignee: task.assignee ?? "",
    due_date: task.due_date ?? "",
  };
}

export default function TaskModal({ task, onClose, onSave }) {
  const [form, setForm] = useState(() => toForm(task));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const titleRef = useRef(null);
  const isEdit = Boolean(task);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [onClose]);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      titleRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...form, due_date: form.due_date || null });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
        <div className="modal__head">
          <div>
            <h2 id="task-modal-title">{isEdit ? "Edit task" : "Create task"}</h2>
            <p className="muted">{isEdit ? `TB-${task.id}` : "Add work to the current sprint."}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <CloseIcon />
          </button>
        </div>

        <form className="modal__body" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field__label">
              Title <span className="field__req">*</span>
            </span>
            <input
              ref={titleRef}
              value={form.title}
              onChange={update("title")}
              maxLength={200}
              placeholder="e.g. Configure the HPA for the backend"
              aria-invalid={error === "Title is required."}
            />
          </label>

          <label className="field">
            <span className="field__label">Description</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={update("description")}
              maxLength={5000}
              placeholder="What needs to happen, and how will we know it is done?"
            />
          </label>

          <fieldset className="field">
            <legend className="field__label">Priority</legend>
            <div className="priority-picker">
              {PRIORITIES.map((p) => (
                <label key={p.value} className={`priority-option priority-option--${p.value}`}>
                  <input
                    type="radio"
                    name="priority"
                    value={p.value}
                    checked={form.priority === p.value}
                    onChange={update("priority")}
                  />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field-row">
            <label className="field">
              <span className="field__label">Status</span>
              <select value={form.status} onChange={update("status")}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Due date</span>
              <input type="date" value={form.due_date} onChange={update("due_date")} />
            </label>
          </div>

          <label className="field">
            <span className="field__label">Assignee</span>
            <input value={form.assignee} onChange={update("assignee")} maxLength={100} placeholder="Name" />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="modal__foot">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
