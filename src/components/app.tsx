'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  ShieldCheck,
  Wallet,
  SlidersHorizontal,
  Bookmark,
  History,
  ChartNoAxesCombined,
  Settings,
  HelpCircle,
  Bell,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  ArrowRight,
  Plus,
} from 'lucide-react';
import type { State } from '@/lib/types';
import { authClient } from './auth-screen';
import {
  Dashboard,
  Shop,
  ProductPage,
  ComparePage,
  ReviewPage,
  HistoryPage,
  WatchlistPage,
  InsightsPage,
} from './workspace';
import {
  BudgetsPage,
  RulesPage,
  SettingsPage,
  Onboarding,
  ManualProposal,
  HelpPage,
} from './forms';
import { Empty, Modal, date } from './primitives';
export async function api<T = Record<string, unknown>>(
  path: string,
  data?: unknown,
  method = 'POST',
): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method: data === undefined ? 'GET' : method,
    headers: data === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Something went wrong. Please try again.');
  return body;
}
type Context = {
  state: State;
  refresh: () => Promise<void>;
  act: <T = Record<string, unknown>>(
    path: string,
    data: unknown,
    message?: string,
    method?: string,
  ) => Promise<T | undefined>;
  busy: boolean;
  compareIds: string[];
  toggleCompare: (id: string) => void;
  setCompareIds: (ids: string[]) => void;
  notify: (message: string) => void;
};
const Ctx = createContext<Context | null>(null);
export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('Workspace context required.');
  return c;
}
const nav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/shop', label: 'Discover', icon: Search },
  { href: '/budgets', label: 'Budgets', icon: Wallet },
  { href: '/rules', label: 'Purchase rules', icon: SlidersHorizontal },
  { href: '/watchlist', label: 'Watchlist', icon: Bookmark },
  { href: '/history', label: 'Decision history', icon: History },
  { href: '/insights', label: 'Insights', icon: ChartNoAxesCombined },
];
export function App() {
  const path = usePathname();
  const router = useRouter();
  const [state, setState] = useState<State | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [manual, setManual] = useState(false),
    [compareIds, setSelection] = useState<string[]>([]);
  const refresh = useCallback(async () => {
    const s = await api<State>('state');
    setState(s);
    document.documentElement.dataset.theme = s.preference.theme;
  }, []);
  useEffect(() => {
    let active = true;
    api<State>('state')
      .then((s) => {
        if (active) {
          setState(s);
          try {
            const stored: unknown = JSON.parse(
              sessionStorage.getItem(`buywise:comparison:${s.user.id}`) ?? '[]',
            );
            if (Array.isArray(stored))
              setSelection(
                stored
                  .filter(
                    (id): id is string =>
                      typeof id === 'string' && s.products.some((p) => p.id === id),
                  )
                  .slice(0, 4),
              );
          } catch {
            /* Storage may be unavailable; no private data is required to render. */
          }
          document.documentElement.dataset.theme = s.preference.theme;
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  async function act<T = Record<string, unknown>>(
    endpoint: string,
    data: unknown,
    message = 'Saved.',
    method = 'POST',
  ): Promise<T | undefined> {
    setBusy(true);
    setError('');
    try {
      const result = await api<T>(endpoint, data, method);
      await refresh();
      if (message) setNotice(message);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save. Try again.');
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  function setCompareIds(ids: string[]) {
    setSelection(ids);
    if (state)
      try {
        sessionStorage.setItem(`buywise:comparison:${state.user.id}`, JSON.stringify(ids));
      } catch {
        setNotice('Browser storage is unavailable. Save a comparison before leaving this page.');
      }
  }
  function toggleCompare(id: string) {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter((x) => x !== id));
      return;
    }
    if (compareIds.length === 4) {
      setNotice('Compare up to four products. Remove one to add another.');
      return;
    }
    setCompareIds([...compareIds, id]);
  }
  if (!state)
    return (
      <main className="standalone">
        <ShieldCheck size={32} />
        <h2>{error ? 'We couldn’t load your workspace.' : 'Getting your workspace ready.'}</h2>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button onClick={() => refresh().catch((e) => setError(e.message))}>Try again</button>
            <Link href="/login">Sign in</Link>
          </>
        ) : (
          <p className="muted" role="status">
            Loading your preferences and decisions…
          </p>
        )}
      </main>
    );
  const ctx: Context = {
    state,
    refresh,
    act,
    busy,
    compareIds,
    toggleCompare,
    setCompareIds,
    notify: setNotice,
  };
  const unread = state.notifications.filter((n) => !n.readAt).length;
  let content: React.ReactNode;
  if (path === '/dashboard') content = <Dashboard onReview={() => setManual(true)} />;
  else if (path === '/shop') content = <Shop />;
  else if (path.startsWith('/product/')) content = <ProductPage id={path.split('/')[2]} />;
  else if (path === '/compare') content = <ComparePage />;
  else if (path.startsWith('/review/')) content = <ReviewPage id={path.split('/')[2]} />;
  else if (path === '/budgets') content = <BudgetsPage />;
  else if (path === '/rules') content = <RulesPage />;
  else if (path === '/watchlist') content = <WatchlistPage />;
  else if (path === '/history') content = <HistoryPage />;
  else if (path === '/insights') content = <InsightsPage />;
  else if (path.startsWith('/settings')) content = <SettingsPage />;
  else if (path === '/onboarding') content = <Onboarding />;
  else if (path === '/help') content = <HelpPage />;
  else if (path === '/notifications')
    content = (
      <>
        <PageHead
          eyebrow="YOUR INBOX"
          title="Worth your attention."
          description="Updates from your rules, reviews, and saved products."
          action={<button onClick={() => act('notifications', {})}>Mark all as read</button>}
        />
        <section className="panel">
          {state.notifications.length ? (
            state.notifications.map((n) => (
              <div className={`notification ${n.readAt ? '' : 'unread'}`} key={n.id}>
                <Bell size={18} />
                <div>
                  <Link href={n.link} onClick={() => act(`notifications/${n.id}`, {}, '')}>
                    <h3>{n.title}</h3>
                  </Link>
                  <p>{n.description}</p>
                  <small>{date(n.createdAt)}</small>
                </div>
                {!n.readAt && (
                  <button
                    className="text-button"
                    onClick={() => act(`notifications/${n.id}`, {}, 'Marked as read.')}
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))
          ) : (
            <Empty title="All quiet for now">
              Purchase reviews and optional alerts will appear here.
            </Empty>
          )}
        </section>
      </>
    );
  else
    content = (
      <Empty title="This page isn’t here">
        <Link href="/dashboard">Return to overview</Link>
      </Empty>
    );
  return (
    <Ctx.Provider value={ctx}>
      <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
          <Link href="/dashboard" className="brand">
            <span className="brand-mark">
              <ShieldCheck size={21} />
            </span>
            <span className="nav-label">
              BUYWISE<span className="brand-dot">®</span>
            </span>
          </Link>
          <button
            className="sidebar-collapse icon-button"
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <button
            className="mobile-close icon-button"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
          <div className="nav-heading nav-label">YOUR WORKSPACE</div>
          <nav aria-label="Main navigation">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`nav-item ${path === n.href ? 'current' : ''}`}
                aria-current={path === n.href ? 'page' : undefined}
                onClick={() => setMobile(false)}
                title={n.label}
              >
                <n.icon size={19} />
                <span className="nav-label">{n.label}</span>
                {n.href === '/watchlist' && state.watches.length > 0 && (
                  <span className="nav-count nav-label">{state.watches.length}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="shield-note nav-label">
              <ShieldCheck size={23} />
              <h4>You’re in control.</h4>
              <p>
                We check your rules.
                <br />
                You make the decision.
              </p>
              <Link href="/help">
                How BUYWISE works <ArrowUpRight size={13} />
              </Link>
            </div>
            <Link
              className={`nav-item ${path.startsWith('/settings') ? 'current' : ''}`}
              href="/settings/profile"
            >
              <Settings size={19} />
              <span className="nav-label">Settings</span>
            </Link>
            <Link className="nav-item" href="/help">
              <HelpCircle size={19} />
              <span className="nav-label">Help & guidance</span>
            </Link>
            <button
              className="account-button"
              onClick={async () => {
                await authClient.signOut();
                router.push('/login');
                router.refresh();
              }}
              title="Sign out"
            >
              <span className="avatar">{state.user.name.slice(0, 1).toUpperCase()}</span>
              <span className="nav-label">
                <strong>{state.user.name}</strong>
                <small>Personal workspace</small>
              </span>
              <LogOut size={16} className="nav-label" />
            </button>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                const q = new FormData(e.currentTarget).get('q');
                router.push(`/shop?q=${encodeURIComponent(String(q))}`);
              }}
            >
              <Search size={17} />
              <input
                name="q"
                aria-label="Search products"
                placeholder="Find something worth buying"
              />
              <kbd>↵</kbd>
            </form>
            <div className="topbar-right">
              <span className="demo-indicator">
                <span />
                Demo catalogue available
              </span>
              <Link
                className="icon-button notification-button"
                aria-label={`Notifications, ${unread} unread`}
                href="/notifications"
              >
                <Bell size={19} />
                {unread > 0 && <i />}
              </Link>
              <span className="topbar-divider" />
              <Link href="/settings/profile" className="avatar" aria-label="Your profile">
                {state.user.name.slice(0, 1).toUpperCase()}
              </Link>
            </div>
          </header>
          <main id="main" className="main-content">
            {error && (
              <div className="error-banner" role="alert">
                <span>{error}</span>
                <button aria-label="Dismiss error" onClick={() => setError('')}>
                  <X size={16} />
                </button>
              </div>
            )}
            {content}
            <footer className="page-footer">
              <ShieldCheck size={14} />
              <span>Considered decisions. On your terms.</span>
              <span>BUYWISE records decisions. It never places or blocks external orders.</span>
            </footer>
          </main>
        </div>
        <nav className="bottom-nav" aria-label="Mobile navigation">
          {nav.slice(0, 5).map((n) => (
            <Link key={n.href} href={n.href} aria-current={path === n.href ? 'page' : undefined}>
              <n.icon size={19} />
              <span>
                {n.href === '/dashboard' ? 'Home' : n.href === '/rules' ? 'Rules' : n.label}
              </span>
            </Link>
          ))}
        </nav>
        {notice && (
          <div className="toast" role="status">
            {notice}
            <button onClick={() => setNotice('')} aria-label="Dismiss notification">
              <X size={16} />
            </button>
          </div>
        )}
        {compareIds.length > 0 && path !== '/compare' && (
          <div className="compare-tray">
            <span>
              <strong>{compareIds.length}</strong> selected
            </span>
            <button className="text-button" onClick={() => setCompareIds([])}>
              Clear
            </button>
            <Link className="button primary" href="/compare">
              Compare <ArrowRight size={15} />
            </Link>
          </div>
        )}
        {manual && (
          <Modal title="Review a purchase" onClose={() => setManual(false)}>
            <ManualProposal onDone={() => setManual(false)} />
          </Modal>
        )}
      </div>
    </Ctx.Provider>
  );
}
export function PageHead({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function NewButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className="primary" onClick={onClick}>
      <Plus size={16} />
      {children}
    </button>
  );
}
