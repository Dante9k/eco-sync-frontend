import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useHelp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);
  const legacyLink = location.hash === '#usage-guide';
  return {
    open: opened || legacyLink,
    show: () => setOpened(true),
    close: () => {
      setOpened(false);
      if (legacyLink) navigate({ pathname: location.pathname, search: location.search, hash: '' }, { replace: true, state: location.state });
    },
  };
}
