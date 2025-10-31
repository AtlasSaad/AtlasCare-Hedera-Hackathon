import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Optimized Medicine Search Hook
 * 
 * Features:
 * - Debounced search (300ms delay after typing stops)
 * - Limited results (max 20 for performance)
 * - Fuzzy matching (handles typos)
 * - Caches previous searches
 * 
 * Usage:
 *   const { query, setQuery, results, isSearching } = useMedicineSearch(medicines);
 */

// Simple debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Fuzzy match helper (simple implementation)
function fuzzyMatch(str, query) {
  str = str.toLowerCase();
  query = query.toLowerCase();
  
  // Exact match
  if (str.includes(query)) return true;
  
  // Character-by-character fuzzy match
  let strIndex = 0;
  let queryIndex = 0;
  
  while (strIndex < str.length && queryIndex < query.length) {
    if (str[strIndex] === query[queryIndex]) {
      queryIndex++;
    }
    strIndex++;
  }
  
  return queryIndex === query.length;
}

// Search cache (simple in-memory cache)
const searchCache = new Map();

export function useMedicineSearch(medicines = [], options = {}) {
  const {
    debounceMs = 300,
    maxResults = 20,
    minQueryLength = 2,
    cacheEnabled = true
  } = options;
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Memoized search function
  const searchMedicines = useMemo(() => 
    debounce((searchQuery) => {
      setIsSearching(true);
      
      // Check cache first
      if (cacheEnabled && searchCache.has(searchQuery)) {
        setResults(searchCache.get(searchQuery));
        setIsSearching(false);
        return;
      }
      
      // Perform search
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = medicines
        .filter(med => {
          // Search in name and code
          return med.name.toLowerCase().includes(lowerQuery) ||
                 (med.code && med.code.includes(searchQuery)) ||
                 fuzzyMatch(med.name, searchQuery);
        })
        .slice(0, maxResults); // Limit results
      
      // Cache result
      if (cacheEnabled) {
        searchCache.set(searchQuery, filtered);
        
        // Limit cache size to 100 entries
        if (searchCache.size > 100) {
          const firstKey = searchCache.keys().next().value;
          searchCache.delete(firstKey);
        }
      }
      
      setResults(filtered);
      setIsSearching(false);
    }, debounceMs),
    [medicines, debounceMs, maxResults, cacheEnabled]
  );
  
  // Effect to trigger search when query changes
  useEffect(() => {
    if (!query || query.length < minQueryLength) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    searchMedicines(query);
  }, [query, searchMedicines, minQueryLength]);
  
  // Clear search function
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsSearching(false);
  }, []);
  
  // Clear cache function
  const clearCache = useCallback(() => {
    searchCache.clear();
    console.log('[MedicineSearch] Cache cleared');
  }, []);
  
  return { 
    query, 
    setQuery, 
    results, 
    isSearching,
    clearSearch,
    clearCache
  };
}

// Hook for virtual scrolling (for large result sets)
export function useVirtualScroll(items = [], itemHeight = 50, containerHeight = 300) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
    
    return {
      items: items.slice(startIndex, endIndex + 1),
      startIndex,
      offsetY: startIndex * itemHeight
    };
  }, [items, scrollTop, itemHeight, containerHeight]);
  
  const totalHeight = items.length * itemHeight;
  
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);
  
  return {
    visibleItems,
    totalHeight,
    handleScroll
  };
}

export default useMedicineSearch;

