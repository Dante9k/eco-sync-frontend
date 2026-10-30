import { Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { EmptyState } from '../components/feedback/EmptyState';
export function NotFoundPage() {
  return <AppShell><EmptyState title="404 · 页面不存在" description="这个页面可能已移动，请返回同步控制台。" action={<Link to="/">返回控制台 →</Link>}/></AppShell>;
}
