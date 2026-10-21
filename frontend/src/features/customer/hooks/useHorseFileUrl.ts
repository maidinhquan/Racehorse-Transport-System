import { useEffect, useState } from 'react';
import type { HorseUpload } from '../data/horseProfileStorage';

export function useHorseFileUrl(file?: HorseUpload) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!(file?.blob instanceof Blob)) { setUrl(''); return; }
    const next = URL.createObjectURL(file.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}
