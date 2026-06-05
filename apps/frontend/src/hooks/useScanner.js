import useScanStore from "../store/scanStore.js";

/**
 * useScanner — convenience hook exposing scan state and actions.
 */
export function useScanner() {
  const store = useScanStore();
  return {
    // State
    source: store.source,
    area: store.area,
    categories: store.categories,
    points: store.points,
    roads: store.roads,
    bbox: store.bbox,
    stats: store.stats,
    loading: store.loading,
    progress: store.progress,
    error: store.error,
    filter: store.filter,
    hoveredPoint: store.hoveredPoint,
    selectedPoint: store.selectedPoint,
    setSource: store.setSource,
    setArea: store.setArea,
    setCategories: store.setCategories,
    runScan: store.runScan,
    resetResults: store.resetResults,
    setFilter: store.setFilter,
    setHoveredPoint: store.setHoveredPoint,
    setSelectedPoint: store.setSelectedPoint,
  };
}
