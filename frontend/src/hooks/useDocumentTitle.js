import { useEffect } from 'react';

export const useDocumentTitle = (title) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} | AtlasCare` : 'AtlasCare';
    
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
};

export default useDocumentTitle;
