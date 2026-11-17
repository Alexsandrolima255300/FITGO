import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { appendActiveRoutePoints, TrackPoint } from './storage';

export const FITGO_LOCATION_TASK = 'FITGO_BACKGROUND_ACTIVITY_LOCATION';

if (!TaskManager.isTaskDefined(FITGO_LOCATION_TASK)) {
  TaskManager.defineTask(FITGO_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const locations = (data as { locations?: Location.LocationObject[] }).locations ?? [];
    const points: TrackPoint[] = locations.map((location) => ({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp,
      accuracy: location.coords.accuracy,
      speed: location.coords.speed
    }));
    await appendActiveRoutePoints(points);
  });
}