import { useId, type PropsWithChildren, type ReactNode } from 'react';
import { useModal } from '../../hooks/useModal';
import { Button } from './Button';
import { Icon } from './Icon';
import styles from './Modal.module.css';
export function Modal({ open, title, onClose, children, footer, busy = false }: PropsWithChildren<{ open: boolean; title: string; onClose: () => void; footer: ReactNode; busy?: boolean }>) {
  const ref = useModal(open, onClose);
  const id = useId();
  return <dialog ref={ref} className={styles.modal} aria-modal="true" aria-labelledby={`${id}-title`}>
    <div className={styles.heading}><h2 id={`${id}-title`}>{title}</h2><Button variant="ghost" onClick={onClose} disabled={busy} aria-label="关闭对话框"><Icon name="close" size={18}/></Button></div>
    <div className={styles.content}>{children}</div>
    <div className={styles.footer}>{footer}</div>
  </dialog>;
}
