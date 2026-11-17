import AsyncStorage from '@react-native-async-storage/async-storage';

export type SportType = 'run' | 'walk' | 'bike';
export type TrackPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number | null;
  speed?: number | null;
};

export type ActiveRoute = {
  type: SportType;
  startedAt: string;
  points: TrackPoint[];
};

export type FitgoActivity = {
  id: string;
  type: SportType;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  averageSpeedKmh: number;
  paceSecondsPerKm: number;
  points: TrackPoint[];
};

const ACTIVITY_KEY = 'fitgo:activities:v1';
const ACTIVE_ROUTE_KEY = 'fitgo:active-route:v1';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function getActivities(): Promise<FitgoActivity[]> {
  return readJson<FitgoActivity[]>(ACTIVITY_KEY, []);
}

export async function saveActivity(activity: FitgoActivity): Promise<void> {
  const activities = await getActivities();
  await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify([activity, ...activities].slice(0, 300)));
}

export async function getActiveRoute(): Promise<ActiveRoute | null> {
  return readJson<ActiveRoute | null>(ACTIVE_ROUTE_KEY, null);
}

export async function setActiveRoute(route: ActiveRoute | null): Promise<void> {
  if (!route) {
    await AsyncStorage.removeItem(ACTIVE_ROUTE_KEY);
    return;
  }
  await AsyncStorage.setItem(ACTIVE_ROUTE_KEY, JSON.stringify(route));
}

export async function appendActiveRoutePoints(points: TrackPoint[]): Promise<void> {
  if (!points.length) return;
  const route = await getActiveRoute();
  if (!route) return;
  const last = route.points[route.points.length - 1];
  const fresh = points.filter((point) => {
    if (!last) return true;
    return point.timestamp > last.timestamp;
  });
  if (!fresh.length) return;
  await setActiveRoute({ ...route, points: [...route.points, ...fresh] });
}

export function haversineMeters(a: TrackPoint, b: TrackPoint): number {
  const radians = (value: number) => (value * Math.PI) / 180;
  const earth = 6371000;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(h));
}

export function calculateDistance(points: TrackPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const distance = haversineMeters(a, b);
    const accuracy = Math.max(a.accuracy ?? 0, b.accuracy ?? 0);
    if (distance >= 2 && distance < 100 && accuracy < 60) total += distance;
  }
  return total;
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return hours > 0
    ? [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':')
    : [minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

export function formatPace(secondsPerKm: number): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return '--:--';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return minutes + ':' + String(seconds).padStart(2, '0');
}

export function sportLabel(type: SportType): string {
  return type === 'run' ? 'Corrida' : type === 'walk' ? 'Caminhada' : 'Ciclismo';
}