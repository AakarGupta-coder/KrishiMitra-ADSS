import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  anchor: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  align?: 'start' | 'end';
  width?: number;
  children: React.ReactNode;
  label: string;
}

const GAP = 8;
const MARGIN = 8;

export const Popover: React.FC<PopoverProps> = ({ anchor, open, onClose, align = 'end', width = 380, children, label }) => {
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      if (!a) return;
      const vw = window.innerWidth;
      const w = Math.min(width, vw - MARGIN * 2);
      let left = align === 'end' ? a.right - w : a.left;
      left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));
      const top = a.bottom + GAP;
      setPos({ top, left, width: w, maxHeight: window.innerHeight - top - MARGIN });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchor, align, width]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchor]);

  if (!open || !pos) return null;
  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-label={label}
      style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
      className="fixed z-[80] flex flex-col bg-white border border-field rounded-xl shadow-[0_8px_24px_-4px_rgba(17,66,50,0.08),0_2px_6px_-1px_rgba(17,66,50,0.04)] overflow-hidden"
    >
      {children}
    </div>,
    document.body,
  );
};

export default Popover;
