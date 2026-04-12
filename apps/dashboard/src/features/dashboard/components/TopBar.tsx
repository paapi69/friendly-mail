export function TopBar() {
  return (
    <header className="top-bar">
      <div className="top-bar__left">
        <div className="top-bar__title">Friendly Mail Dashboard</div>
        <div className="top-bar__search">
          <span className="material-symbols-outlined top-bar__search-icon">search</span>
          <input
            className="top-bar__search-input"
            type="text"
            placeholder="Search tasks, teams, projects..."
            readOnly
          />
        </div>
      </div>

      <div className="top-bar__right">
        <div className="top-bar__actions">
          <button type="button" className="top-bar__icon-button" aria-label="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button type="button" className="top-bar__icon-button" aria-label="Settings">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
        <button type="button" className="top-bar__primary-button">
          Create Task
        </button>
      </div>
    </header>
  );
}
