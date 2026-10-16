import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api.js";
import { PRIORITY_RANK } from "./constants.js";
import { parseDay } from "./utils.js";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import KpiCards from "./components/KpiCards.jsx";
import TaskTable, { StatusFilter, TaskToolbar } from "./components/TaskTable.jsx";
import ActivityFeed from "./components/ActivityFeed.jsx";
import PipelineCard from "./components/PipelineCard.jsx";
import TaskModal from "./components/TaskModal.jsx";
import { ConnectionBanner, DashboardSkeleton, ErrorState, Toast } from "./components/States.jsx";

const REFRESH_MS = 15_000;

const SORTERS = {
  newest: (a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id,
  due: (a, b) => (parseDay(a.due_date) ?? Infinity) - (parseDay(b.due_date) ?? Infinity),
  priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
};

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState({ open: false, task: null });
  const [toast, setToast] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("#overview");
  const toastTimer = useRef(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [taskList, statData] = await Promise.all([api.listTasks(), api.getStats()]);
      setTasks(taskList);
      setStats(statData);
      setError(null);
      setLastSynced(new Date().toISOString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const notify = useCallback((message, kind = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, kind });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const closeModal = useCallback(() => setModal({ open: false, task: null }), []);

  async function handleSave(values) {
    if (modal.task) {
      await api.updateTask(modal.task.id, values);
      notify("Task updated");
    } else {
      await api.createTask(values);
      notify("Task created");
    }
    closeModal();
    load();
  }

  async function handleStatusChange(task, status) {
    setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      await api.updateTask(task.id, { status });
      notify(`Moved "${task.title}"`);
    } catch (err) {
      notify(`Could not update task: ${err.message}`, "error");
    }
    load();
  }

  async function handleDelete(task) {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      await api.deleteTask(task.id);
      notify("Task deleted");
    } catch (err) {
      notify(`Could not delete task: ${err.message}`, "error");
    }
    load();
  }

  const statusCounts = useMemo(() => {
    const counts = { all: tasks.length, todo: 0, in_progress: 0, review: 0, done: 0 };
    for (const task of tasks) counts[task.status] += 1;
    return counts;
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks
      .filter((task) => statusFilter === "all" || task.status === statusFilter)
      .filter((task) => priorityFilter === "all" || task.priority === priorityFilter)
      .filter(
        (task) =>
          !term ||
          [task.title, task.description, task.assignee].some((field) => field?.toLowerCase().includes(term)),
      )
      .sort(SORTERS[sort]);
  }, [tasks, statusFilter, priorityFilter, search, sort]);

  function clearFilters() {
    setStatusFilter("all");
    setPriorityFilter("all");
    setSearch("");
  }

  const hasData = stats !== null;
  const apiStatus = error ? "down" : hasData ? "up" : "checking";

  return (
    <div className="app">
      <Sidebar
        open={navOpen}
        onClose={() => setNavOpen(false)}
        active={activeNav}
        onNavigate={(href) => {
          setActiveNav(href);
          setNavOpen(false);
        }}
        taskCount={tasks.length}
      />

      <main className="main">
        <Header
          search={search}
          onSearch={setSearch}
          onCreate={() => setModal({ open: true, task: null })}
          onRefresh={load}
          refreshing={refreshing}
          onOpenNav={() => setNavOpen(true)}
        />

        {loading && <DashboardSkeleton />}

        {!loading && !hasData && error && <ErrorState message={error} onRetry={load} />}

        {hasData && (
          <>
            {error && <ConnectionBanner message={error} onRetry={load} />}
            <KpiCards stats={stats} />

            <div className="content-grid">
              <section className="card tasks-card" id="tasks" aria-labelledby="tasks-title">
                <div className="card__head card__head--wrap">
                  <h2 id="tasks-title">Tasks</h2>
                  <TaskToolbar priority={priorityFilter} onPriority={setPriorityFilter} sort={sort} onSort={setSort} />
                </div>
                <div className="card__filters">
                  <StatusFilter value={statusFilter} counts={statusCounts} onChange={setStatusFilter} />
                </div>
                <TaskTable
                  tasks={visibleTasks}
                  totalCount={tasks.length}
                  onEdit={(task) => setModal({ open: true, task })}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onCreate={() => setModal({ open: true, task: null })}
                  onClearFilters={clearFilters}
                />
              </section>

              <div className="side-col">
                <PipelineCard apiStatus={apiStatus} lastSynced={lastSynced} />
                <ActivityFeed tasks={tasks} />
              </div>
            </div>
          </>
        )}
      </main>

      {modal.open && (
        <TaskModal key={modal.task?.id ?? "new"} task={modal.task} onClose={closeModal} onSave={handleSave} />
      )}
      <Toast toast={toast} />
    </div>
  );
}
