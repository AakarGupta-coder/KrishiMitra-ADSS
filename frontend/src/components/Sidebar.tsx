import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MODULES, UTILITIES, type NavItem } from '../lib/routes';
import { Icon } from './ui';

const Item: React.FC<{ item: NavItem }> = ({ item }) => (
  <NavLink
    to={item.path}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-md transition-colors border-l-4 ${
        isActive
          ? 'bg-surface-container text-forest font-semibold border-forest'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low border-transparent'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <Icon name={item.icon} fill={isActive} className={isActive ? 'text-forest' : ''} />
        {item.label}
      </>
    )}
  </NavLink>
);

const Sidebar: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { pathname } = useLocation();
  useEffect(() => { onClose(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-forest/35 backdrop-blur-[8px] lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-hairline flex flex-col transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0 shadow-xl' : '-translate-x-full'}`}
        aria-label="Primary"
      >
        <div className="h-16 flex items-center justify-between gap-2 px-4 border-b border-hairline">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="w-8 h-8 rounded-lg" />
            <div className="leading-tight">
              <div className="text-title-md font-bold tracking-tight text-forest">KRISHIMITRA</div>
              <div className="text-[10px] font-label-sm uppercase tracking-wider text-chlorophyll">Enterprise ADSS</div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-surface-container-low text-on-surface-variant border border-hairline">v2.1</span>
          <button className="lg:hidden p-1 text-on-surface-variant" onClick={onClose} aria-label="Close navigation">
            <Icon name="close" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-label-sm font-label-sm uppercase tracking-widest text-outline">Intelligence modules</div>
          {MODULES.map((m) => <Item key={m.path} item={m} />)}
        </nav>

        <div className="px-3 py-3 border-t border-hairline space-y-1">
          {UTILITIES.map((m) => <Item key={m.path} item={m} />)}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
