import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import styles from './ErrorBanner.module.css';
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className={styles.error} role="alert"><Icon name="alert" size={17}/><span>{message}</span>{onRetry && <Button variant="ghost" onClick={onRetry}>重试 <Icon name="sync" size={14}/></Button>}</div>;
}
