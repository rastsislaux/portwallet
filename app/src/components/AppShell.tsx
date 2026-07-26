import { NavLink, Outlet } from 'react-router-dom';
import {
  IconAccounts,
  IconActivity,
  IconExchange,
  IconHome,
} from './icons';

const tabs = [
  { to: '/', label: 'Home', end: true, icon: IconHome },
  { to: '/activity', label: 'Activity', end: false, icon: IconActivity },
  { to: '/exchange', label: 'Exchange', end: false, icon: IconExchange },
  { to: '/accounts', label: 'Accounts', end: false, icon: IconAccounts },
] as const;

export function AppShell() {
  return (
    <div className="app-root">
      <div className="app-column">
        <Outlet />
      </div>
      <nav className="bottom-nav" aria-label="Primary">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              <Icon size={20} />
              {tab.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
