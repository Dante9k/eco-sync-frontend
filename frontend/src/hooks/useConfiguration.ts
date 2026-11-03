import { useCallback, useEffect, useRef, useState } from 'react';
import { getConfig, saveConfig } from '../api/exo';
import { ApiError } from '../api/client';
import type { BusinessConfig, ConfigSection } from '../api/types';
import { toUserMessage } from '../utils/format';
import { validateConfigDraft } from '../utils/configValidation';
import { useLatestRequest } from './useLatestRequest';

export function useConfiguration(onSaved: () => void) {
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [draft, setDraft] = useState<BusinessConfig | null>(null);
  const [editor, setEditor] = useState<ConfigSection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const locked = useRef(false);
  const { run: read, cancel: cancelRead } = useLatestRequest();
  const { run: write } = useLatestRequest();
  const refresh = useCallback(() => {
    setLoading(true);
    return read(getConfig, value => { setConfig(value); setError(null); setLoading(false); }, failure => { setError(toUserMessage(failure)); setLoading(false); });
  }, [read]);
  useEffect(() => { void refresh(); }, [refresh]);
  const open = (section: ConfigSection) => {
    if (!config || locked.current) return;
    setDraft(structuredClone(config)); setEditor(section); setSaveError(null); setNotice('');
  };
  const close = () => {
    if (locked.current) return;
    setDraft(null); setEditor(null); setSaveError(null);
  };
  const change = <S extends ConfigSection>(section: S, value: BusinessConfig[S]) => setDraft(previous => previous ? { ...previous, [section]: value } : previous);
  const persist = async <S extends ConfigSection>(section: S, value: BusinessConfig[S], version: number) => {
    if (locked.current) return;
    locked.current = true; setSaving(true); setSaveError(null); setNotice(''); cancelRead(); setLoading(false);
    await write(signal => saveConfig(section, value, version, signal), saved => {
      setConfig(saved); setError(null); setEditor(null); setDraft(null); setSaving(false);
      setNotice(section === 'notifications' ? (saved.notifications.enabled ? '飞书提醒已开启。后续同步有预警时，会发送提醒。' : '飞书提醒已关闭。数据同步和预警检查仍会正常进行。') : '设置已保存，将用于后续同步。'); onSaved();
    }, failure => {
      setSaveError(failure instanceof ApiError && failure.code === 'CONFIG_CONFLICT' ? '配置已被更新，请取消后重新打开弹窗，再保存你的修改。' : toUserMessage(failure));
      setSaving(false); void refresh();
    });
    locked.current = false;
  };
  const validationError = validateConfigDraft(draft, editor);
  return { validationError, config, draft, editor, error, saveError, saving, loading, notice, refresh, open, close, change,
    save: () => { if (draft && editor && !validationError) void persist(editor, draft[editor], draft.version); },
    toggleNotifications: () => { if (config) void persist('notifications', { enabled: !config.notifications.enabled }, config.version); },
  };
}
