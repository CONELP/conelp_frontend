
import { DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS, desktopScheduleService } from "@/features/desktop-schedule/services/desktop-schedule.service";


export function useDesktopScheduleZoomControls(deps: Record<string, any>) {
  const {
    dayWidth,
    chartScrollLeft,
    timeline,
    currentZoomIndex,
    maxZoomIndex,
    canZoomIn,
    canZoomOut,
    persistUiPreferences,
    closeContextMenu,
  } = deps;

  function setDayWidth(nextDayWidth: number, viewportWidth: number) {
    if (nextDayWidth === dayWidth.value) {
      return;
    }
  
    chartScrollLeft.value = desktopScheduleService.getScrollLeftForZoom(
      timeline.value,
      nextDayWidth,
      chartScrollLeft.value,
      viewportWidth,
    );
    dayWidth.value = nextDayWidth;
    persistUiPreferences({ zoomIndex: currentZoomIndex.value, zoomDayWidth: nextDayWidth });
    closeContextMenu();
  }
  
  function zoomIn(viewportWidth: number) {
    if (!canZoomIn.value) {
      return;
    }
    setDayWidth(DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS[currentZoomIndex.value + 1]!, viewportWidth);
  }
  
  function setZoomIndex(nextZoomIndex: number, viewportWidth: number) {
    const clampedZoomIndex = Math.min(Math.max(Math.round(nextZoomIndex), 0), maxZoomIndex.value);
    setDayWidth(DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS[clampedZoomIndex]!, viewportWidth);
  }
  
  function zoomOut(viewportWidth: number) {
    if (!canZoomOut.value) {
      return;
    }
    setDayWidth(DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS[currentZoomIndex.value - 1]!, viewportWidth);
  }
  
  
  return {
    setDayWidth,
    zoomIn,
    setZoomIndex,
    zoomOut,
  };
}
