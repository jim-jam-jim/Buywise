'use client';
import {
  Check,
  TriangleAlert,
  X,
  HelpCircle,
  ArrowUpRight,
  Monitor,
  Headphones,
  Armchair,
  Tablet,
  Backpack,
  Lamp,
  Bookmark,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { money } from '@/lib/engine';
export function Badge({ value }: { value: string }) {
  const status = value.toUpperCase();
  const labels: Record<string, string> = {
    ALLOW: 'Allowed',
    REVIEW: 'Review required',
    BLOCK: 'Blocked by your rule',
    UNKNOWN: 'Unknown',
    DEMO: 'Demo data',
    IMPORTED: 'Imported',
    LIVE: 'Live data',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    PENDING: 'Pending',
    SWITCHED: 'Alternative selected',
  };
  const Icon =
    status === 'BLOCK'
      ? X
      : status === 'REVIEW'
        ? TriangleAlert
        : status === 'ALLOW' || status === 'APPROVED'
          ? Check
          : status === 'UNKNOWN'
            ? HelpCircle
            : null;
  return (
    <span className={`badge badge-${value.toLowerCase()}`}>
      {Icon && <Icon size={12} />} {labels[status] ?? value}
    </span>
  );
}
export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-symbol">
        <Bookmark size={22} />
      </div>
      <h3>{title}</h3>
      <div className="muted">{children ?? 'Your saved activity will appear here.'}</div>
    </div>
  );
}
export function ProductArt({
  product,
  small = false,
}: {
  product: Pick<Product, 'category' | 'name'>;
  small?: boolean;
}) {
  const category = product.category;
  const Icon =
    category === 'Audio'
      ? Headphones
      : category === 'Electronics'
        ? Monitor
        : category === 'Tablets'
          ? Tablet
          : category === 'Lifestyle'
            ? Backpack
            : product.name.includes('Chair')
              ? Armchair
              : Lamp;
  return (
    <div
      className={`product-art ${small ? 'art-small' : ''} art-${category.toLowerCase()}`}
      aria-hidden="true"
    >
      <div className="art-halo" />
      {category === 'Electronics' ? (
        <div className="laptop">
          <div className="laptop-screen">
            <div className="screen-glow" />
            <span />
          </div>
          <div className="laptop-base" />
        </div>
      ) : (
        <Icon size={small ? 30 : 100} strokeWidth={0.9} />
      )}
    </div>
  );
}
export function ProductCard({
  product: p,
  saved,
  selected,
  onSave,
  onCompare,
}: {
  product: Product;
  saved: boolean;
  selected: boolean;
  onSave: () => void;
  onCompare: () => void;
}) {
  return (
    <article className="product-card">
      <div className="product-visual">
        <Link href={`/product/${p.id}`} aria-label={`View ${p.name}`}>
          <ProductArt product={p} />
        </Link>
        <button
          className={`save-icon ${saved ? 'active' : ''}`}
          aria-label={saved ? `${p.name} is saved` : `Save ${p.name}`}
          onClick={onSave}
          disabled={saved}
        >
          <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <Badge value={p.dataMode} />
      </div>
      <div className="product-card-body">
        <span className="eyebrow">
          {p.brand} · {p.category}
        </span>
        <Link href={`/product/${p.id}`}>
          <h3>{p.name}</h3>
        </Link>
        <p className="product-meta">
          {p.warrantyMonths !== null
            ? `${p.warrantyMonths}-month warranty`
            : 'Warranty not provided'}
          <span>·</span>
          {p.returnDays === null
            ? 'Returns not provided'
            : p.returnDays === 0
              ? 'Non-returnable'
              : `${p.returnDays}-day returns`}
        </p>
        <div className="product-price">
          <strong>{money(p.price + p.fees, p.currency)}</strong>
          <button className={`text-button ${selected ? 'selected' : ''}`} onClick={onCompare}>
            {selected ? <Check size={14} /> : <Plus size={14} />}Compare
          </button>
        </div>
        <Link className="product-link" href={`/product/${p.id}`}>
          View details <ArrowUpRight size={15} />
        </Link>
      </div>
    </article>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label>
      {label}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <dialog
        open
        className="modal"
        ref={(node) => {
          if (node && !node.dataset.focused) {
            node.dataset.focused = 'true';
            node.focus();
          }
        }}
        tabIndex={-1}
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Tab') {
            const elements = e.currentTarget.querySelectorAll<HTMLElement>(
              'button:not([disabled]),input,select,textarea,a[href]',
            );
            const first = elements[0],
              last = elements[elements.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="modal-title">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </dialog>
    </div>
  );
}
export function date(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}
