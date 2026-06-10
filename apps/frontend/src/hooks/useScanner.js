import useScanStore from "../store/scanStore.js";

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
    maxResults: store.maxResults,
    sessionFilename: store.sessionFilename,
    sessionDisplayName: store.sessionDisplayName,

    // Actions
    setSource: store.setSource,
    setShowCameras: store.setShowCameras,
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

    // Session management
    sessions: store.sessions,
    sessionsLoading: store.sessionsLoading,
    refreshSessions: store.refreshSessions,
    saveToSystem: store.saveToSystem,
    loadFromSystem: store.loadFromSystem,
    deleteFromSystem: store.deleteFromSystem,
    renameInSystem: store.renameInSystem,
    exportFromSystem: store.exportFromSystem,
    loadExternalFile: store.loadExternalFile,
  };
}
