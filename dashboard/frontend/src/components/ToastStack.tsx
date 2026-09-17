import { useApp } from '../context/AppContext'
import styles from './ToastStack.module.css'

export function ToastStack() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className={styles.stack}>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.kind]}`} onClick={() => dismissToast(t.id)}>
          {t.text}
        </div>
      ))}
    </div>
  )
}
