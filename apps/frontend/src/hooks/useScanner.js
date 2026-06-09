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
    cameras: store.cameras,
    bbox: store.bbox,
    stats: store.stats,
    loading: store.loading,
    progress: store.progress,
    error: store.error,
    filter: store.filter,
    hoveredPoint: store.hoveredPoint,
    selectedPoint: store.selectedPoint,
    showCameras: store.showCameras,
    setSource: store.setSource,
    setShowCameras: store.setShowCameras,
    maxResults: store.maxResults,
    setArea: store.setArea,
    setCategories: store.setCategories,
    setMaxResults: store.setMaxResults,
    addPoint: store.addPoint,
    removePoint: store.removePoint,
    runScan: store.runScan,
    resetResults: store.resetResults,
    setFilter: store.setFilter,
    setHoveredPoint: store.setHoveredPoint,
    setSelectedPoint: store.setSelectedPoint,
    intersectionOverrides: store.intersectionOverrides,
    setIntersectionOverride: store.setIntersectionOverride,
    sessionFileName: store.sessionFileName,
    saveSession: store.saveSession,
    saveSessionAs: store.saveSessionAs,
    loadSession: store.loadSession,
  };
}
