import type { PersonRef } from '../../api/types';
import { personColor } from '../../utils/board';
import styles from './Board.module.css';

export function PersonTag({ person, selectedId }: { person: PersonRef | null; selectedId: string }) {
  if (!person) return <span className={styles.muted}>未分配</span>;
  const selected = person.id === selectedId;
  return <span className={`${styles.personTag} ${selected ? styles.highlighted : ''}`} data-person-id={person.id} data-color={personColor(person.id)} data-highlighted={selected || undefined}>{person.name}</span>;
}
