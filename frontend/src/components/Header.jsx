import { MenuIcon, PlusIcon, RefreshIcon, SearchIcon } from "./Icons.jsx";

export default function Header({ search, onSearch, onCreate, onRefresh, refreshing, onOpenNav }) {
  return (
    <header className="page-header" id="overview">
      <div className="page-header__title">
        <button className="icon-btn menu-btn" onClick={onOpenNav} aria-label="Open navigation">
          <MenuIcon />
        </button>
        <div>
          <p className="breadcrumb">
            Platform Team <span aria-hidden="true">/</span> Capstone launch
          </p>
          <h1>Sprint dashboard</h1>
        </div>
      </div>

      <div className="page-header__actions">
        <label className="search">
          <SearchIcon />
          <span className="sr-only">Search tasks</span>
          <input
            type="search"
            placeholder="Search tasks, people…"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </label>
        <button
          className={`icon-btn icon-btn--bordered ${refreshing ? "is-spinning" : ""}`}
          onClick={onRefresh}
          aria-label="Refresh"
          title="Refresh"
        >
          <RefreshIcon />
        </button>
        <button className="btn btn--primary" onClick={onCreate}>
          <PlusIcon />
          <span>New task</span>
        </button>
      </div>
    </header>
  );
}
