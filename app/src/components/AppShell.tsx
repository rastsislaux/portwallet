import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Home', end: true },
  { to: '/activity', label: 'Activity', end: false },
  { to: '/exchange', label: 'Exchange', end: false },
  { to: '/accounts', label: 'Accounts', end: false },
] as const;

export function AppShell() {
  return (
    <div className="app-root">
      <div className="app-column">
        <Outlet />
      </div>
      <nav className="bottom-nav" aria-label="Primary">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => (isActive ? 'is-active' : undefined)}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
