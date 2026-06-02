import { useScanStore } from '../store/scanStore.js';

export function useScanner() {
  const {
    source, area, categories,
    points, roads, bbox, stats, loading, progress, error, filter,
    setSource, setArea, setCategories, setFilter,
    runScan, resetResults,
  } = useScanStore();

  return {
    source, area, categories,
    points, roads, bbox, stats, loading, progress, error, filter,
    setSource, setArea, setCategories, setFilter,
    runScan, resetResults,
  };
}
