import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Cyber Communications` : 'IT Solution Builder | Cyber Communications';
  }, [title]);
}
