import { BUILD_INFO } from "../constants.js";
import {
  ActivityIcon,
  BookIcon,
  CloseIcon,
  DashboardIcon,
  ListIcon,
  LogoMark,
  RocketIcon,
} from "./Icons.jsx";

const NAV = [
  { href: "#overview", label: "Overview", icon: DashboardIcon },
  { href: "#tasks", label: "Tasks", icon: ListIcon },
  { href: "#activity", label: "Activity", icon: ActivityIcon },
  { href: "#pipeline", label: "Pipeline", icon: RocketIcon },
];

const PROJECTS = [
  { name: "Capstone launch", color: "#7c7cf0" },
  { name: "Infrastructure", color: "#f59f4c" },
  { name: "Observability", color: "#3fb68b" },
];

export default function Sidebar({ open, onClose, active, onNavigate, taskCount }) {
  return (
    <>
      <div className={`sidebar-scrim ${open ? "is-visible" : ""}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? "is-open" : ""}`} aria-label="Workspace navigation">
        <div className="sidebar__brand">
          <LogoMark />
          <span>TaskBoard</span>
          <button className="icon-btn sidebar__close" onClick={onClose} aria-label="Close navigation">
            <CloseIcon />
          </button>
        </div>

        <div className="workspace">
          <span className="workspace__avatar">PT</span>
          <span className="workspace__text">
            <strong>Platform Team</strong>
            <small>DevOps capstone</small>
          </span>
        </div>

        <nav className="sidebar__section">
          <p className="sidebar__label">Workspace</p>
          <ul className="nav">
            {NAV.map(({ href, label, icon: NavIcon }) => (
              <li key={href}>
                <a
                  href={href}
                  className={`nav__link ${active === href ? "is-active" : ""}`}
                  aria-current={active === href ? "page" : undefined}
                  onClick={() => onNavigate(href)}
                >
                  <NavIcon />
                  <span>{label}</span>
                  {href === "#tasks" && taskCount > 0 && <span className="nav__count">{taskCount}</span>}
                </a>
              </li>
            ))}
            <li>
              <a className="nav__link" href="/docs" target="_blank" rel="noreferrer">
                <BookIcon />
                <span>API docs</span>
                <span className="nav__ext">↗</span>
              </a>
            </li>
          </ul>
        </nav>

        <div className="sidebar__section">
          <p className="sidebar__label">Projects</p>
          <ul className="projects">
            {PROJECTS.map((project) => (
              <li key={project.name}>
                <span className="projects__dot" style={{ background: project.color }} />
                {project.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar__footer">
          <div className="env-chip">
            <span className="env-chip__dot" />
            env: {BUILD_INFO.environment}
          </div>
          <code className="sidebar__build">build {BUILD_INFO.commit.slice(0, 7)}</code>
        </div>
      </aside>
    </>
  );
}
