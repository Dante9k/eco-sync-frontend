import type { PropsWithChildren, ReactNode } from 'react';
import { useModal } from '../../hooks/useModal';
import { Button } from './Button';
import { Icon } from './Icon';
import styles from './Modal.module.css';
export function Modal({ open, title, onClose, children, footer }: PropsWithChildren<{ open: boolean; title: string; onClose: () => void; footer: ReactNode }>) {
  const ref = useModal(open, onClose);
  return <dialog ref={ref} className={styles.modal} aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-description">
    <div className={styles.heading}><h2 id="modal-title">{title}</h2><Button variant="ghost" onClick={onClose} aria-label="关闭对话框"><Icon name="close" /></Button></div>
    <div id="modal-description" className={styles.content}>{children}</div>
    <div className={styles.footer}>{footer}</div>
  </dialog>;
}
