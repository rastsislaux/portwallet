import { NavLink, Outlet } from 'react-router-dom';
import {
  IconCards,
  IconExchange,
  IconHistory,
  IconHome,
} from './icons';

const tabs = [
  { to: '/', label: 'Home', end: true, icon: IconHome },
  { to: '/activity', label: 'History', end: false, icon: IconHistory },
  { to: '/cards', label: 'Cards', end: false, icon: IconCards },
  { to: '/exchange', label: 'Exchange', end: false, icon: IconExchange },
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
              <Icon size={24} strokeWidth={1.75} />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
