import { NavLink } from 'react-router-dom';
import {
  HiOutlineChartBar,
  HiOutlineShieldCheck,
  HiOutlineExclamationTriangle,
  HiOutlineBell,
  HiOutlineBeaker,
} from 'react-icons/hi2';

const navItems = [
  { path: '/', label: 'Dashboard', icon: HiOutlineChartBar },
  { path: '/rules', label: 'Rate Limit Rules', icon: HiOutlineShieldCheck },
  { path: '/breaches', label: 'Breach Logs', icon: HiOutlineExclamationTriangle },
  { path: '/notifications', label: 'Notifications', icon: HiOutlineBell },
  { path: '/test', label: 'Test API', icon: HiOutlineBeaker },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        <div>
          <h1>Rate Limiter</h1>
          <span>API Protection System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
            end={item.path === '/'}
          >
            <item.icon className="nav-icon" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
