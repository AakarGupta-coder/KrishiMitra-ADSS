import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useUnitStore, unitSignature } from '../lib/units';
import { useFarmStore, farmLabel } from '../store/useFarmStore';
import { Icon } from './ui';
import Sidebar from './Sidebar';
import TopNavBar from './TopNavBar';
import DataOrchestrator from './DataOrchestrator';

const Layout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [navOpen, setNavOpen] = useState(false);
  const units = useUnitStore();
  const farm = useFarmStore((s) => s.selectedFarm);
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    else window.scrollTo({ top: 0 });
  }, [hash, pathname]);
  return (
    <div className="min-h-screen bg-canvas">
      <DataOrchestrator />
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="lg:ml-64 flex flex-col min-w-0 min-h-screen">
        <TopNavBar onMenu={() => setNavOpen(true)} />
        {farm?.locationSource === 'default' && (
          <div className="flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-2 bg-[#FFFBEB] border-b border-[#FDE68A] text-body-sm text-[#B45309]">
            <Icon name="info" className="!text-[16px]" />
            Device location was unavailable, so the default location {farmLabel(farm)} (geographic centre of India) is shown. Choose your farm location from the top bar.
          </div>
        )}
        <main key={unitSignature(units)} className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0">{children}</main>
        <footer className="px-4 sm:px-6 lg:px-8 py-4 border-t border-hairline text-label-sm font-label-sm text-on-surface-variant flex flex-wrap justify-between gap-2">
          <span>KRISHIMITRA ADSS · Agricultural Decision Support System v2.1</span>
          <span>Decision support only. Verify recommendations with local agronomy experts.</span>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
