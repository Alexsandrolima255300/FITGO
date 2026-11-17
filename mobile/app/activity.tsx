import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { MAP_HTML } from '../src/map-html';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActiveRoute, calculateDistance, FitgoActivity, formatDuration, formatPace, getActiveRoute, saveActivity, setActiveRoute, SportType, TrackPoint } from '../src/storage';
import { FITGO_LOCATION_TASK } from '../src/location-task';
import { theme } from '../src/theme';

const sportOptions: { type: SportType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'run', label: 'Corrida', icon: 'walk' },
  { type: 'walk', label: 'Caminhada', icon: 'footsteps' },
  { type: 'bike', label: 'Bicicleta', icon: 'bicycle' }
];

export default function ActivityScreen() {
  const map = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const watch = useRef<Location.LocationSubscription | null>(null);
  const routeRef = useRef<ActiveRoute | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const elapsedBeforeRef = useRef(0);
  const [sport, setSport] = useState<SportType>('run');
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [gps, setGps] = useState('GPS desligado');
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);

  const distance = calculateDistance(points);
  const pace = distance > 0 ? seconds / (distance / 1000) : 0;
  const speed = seconds > 0 ? (distance / 1000) / (seconds / 3600) : 0;

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      const elapsed = elapsedBeforeRef.current + (sessionStartedAtRef.current ? Date.now() - sessionStartedAtRef.current : 0);
      setSeconds(Math.floor(elapsed / 1000));
    }, 1000);
    const sync = setInterval(async () => {
      if (!backgroundEnabled) return;
      const route = await getActiveRoute();
      if (route) {
        routeRef.current = route;
        setPoints(route.points);
        const last = route.points[route.points.length - 1];
        if (last && mapReady) map.current?.injectJavaScript('window.updateRoute(' + JSON.stringify(route.points.map((point) => [point.latitude, point.longitude])) + '); true;');
      }
    }, 2500);
    return () => { clearInterval(timer); clearInterval(sync); };
  }, [active, backgroundEnabled]);

  useEffect(() => () => { watch.current?.remove(); }, []);

  useEffect(() => {
    if (!mapReady || !points.length) return;
    map.current?.injectJavaScript('window.updateRoute(' + JSON.stringify(points.map((point) => [point.latitude, point.longitude])) + '); true;');
  }, [mapReady, points]);

  const startForegroundWatch = async () => {
    watch.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
      async (location) => {
        const point: TrackPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
          accuracy: location.coords.accuracy,
          speed: location.coords.speed
        };
        const current = routeRef.current;
        if (!current) return;
        const next = { ...current, points: [...current.points, point] };
        routeRef.current = next;
        setPoints(next.points);
        await setActiveRoute(next);
        // O mapa recebe a rota pelo efeito associado ao estado de pontos.
      }
    );
  };

  const start = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Localização necessária', 'Permita o acesso à localização para registrar sua atividade.');
        return;
      }
      Alert.alert(
        'Permitir GPS com a tela bloqueada?',
        'Para continuar registrando seu percurso enquanto você usa outros aplicativos ou bloqueia a tela, o FITGO precisa da permissão de localização em segundo plano. Você também pode continuar apenas com o aplicativo aberto.',
        [
          { text: 'Só com o app aberto', style: 'cancel', onPress: () => begin(false) },
          { text: 'Permitir em segundo plano', onPress: async () => {
            const background = await Location.requestBackgroundPermissionsAsync();
            begin(background.granted);
          } }
        ]
      );
    } catch {
      Alert.alert('Não foi possível iniciar', 'Verifique as permissões de localização do aparelho e tente novamente.');
    }
  };

  const begin = async (allowBackground: boolean) => {
    try {
      const route: ActiveRoute = { type: sport, startedAt: new Date().toISOString(), points: [] };
      routeRef.current = route;
      await setActiveRoute(route);
      setPoints([]);
      setSeconds(0);
      elapsedBeforeRef.current = 0;
      sessionStartedAtRef.current = Date.now();
      setPaused(false);
      setBackgroundEnabled(allowBackground);
      if (allowBackground) {
        try {
          await Location.startLocationUpdatesAsync(FITGO_LOCATION_TASK, {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 3,
            foregroundService: {
              notificationTitle: 'FITGO está registrando sua atividade',
              notificationBody: 'Seu percurso continua sendo salvo. Toque para voltar ao FITGO.',
              killServiceOnDestroy: false
            }
          });
          setGps('GPS ativo · segundo plano habilitado');
        } catch {
          setBackgroundEnabled(false);
          await startForegroundWatch();
          setGps('GPS ativo · mantenha o FITGO aberto');
        }
      } else {
        await startForegroundWatch();
        setGps('GPS ativo · mantenha o FITGO aberto');
      }
      setActive(true);
    } catch {
      Alert.alert('Falha ao iniciar GPS', 'Não foi possível iniciar o rastreamento. Tente novamente em uma área aberta.');
    }
  };

  const pause = async () => {
    if (!active) return;
    const elapsed = elapsedBeforeRef.current + (sessionStartedAtRef.current ? Date.now() - sessionStartedAtRef.current : 0);
    elapsedBeforeRef.current = elapsed;
    sessionStartedAtRef.current = null;
    setSeconds(Math.floor(elapsed / 1000));
    watch.current?.remove();
    watch.current = null;
    if (await TaskManager.isTaskRegisteredAsync(FITGO_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(FITGO_LOCATION_TASK);
    }
    setActive(false);
    setPaused(true);
    setGps('Atividade pausada');
  };

  const resume = async () => {
    try {
      if (backgroundEnabled) {
        if (await TaskManager.isTaskRegisteredAsync(FITGO_LOCATION_TASK)) {
          await Location.stopLocationUpdatesAsync(FITGO_LOCATION_TASK);
        }
        await Location.startLocationUpdatesAsync(FITGO_LOCATION_TASK, {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 3,
          foregroundService: {
            notificationTitle: 'FITGO está registrando sua atividade',
            notificationBody: 'Seu percurso continua sendo salvo. Toque para voltar ao FITGO.',
            killServiceOnDestroy: false
          }
        });
      } else {
        await startForegroundWatch();
      }
      sessionStartedAtRef.current = Date.now();
      setPaused(false);
      setActive(true);
      setGps(backgroundEnabled ? 'GPS ativo · segundo plano habilitado' : 'GPS ativo · mantenha o FITGO aberto');
    } catch {
      Alert.alert('Não foi possível retomar', 'Verifique a localização e tente novamente.');
    }
  };

  const finish = async () => {
    try {
      watch.current?.remove();
      watch.current = null;
      if (await TaskManager.isTaskRegisteredAsync(FITGO_LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(FITGO_LOCATION_TASK);
      }
      const route = (await getActiveRoute()) ?? routeRef.current;
      if (!route) return;
      const endedAt = new Date().toISOString();
      const finalPoints = route.points;
      const meters = calculateDistance(finalPoints);
      const elapsed = elapsedBeforeRef.current + (sessionStartedAtRef.current ? Date.now() - sessionStartedAtRef.current : 0);
      const duration = Math.max(1, Math.floor(elapsed / 1000));
      const km = meters / 1000;
      const activity: FitgoActivity = {
        id: String(Date.now()),
        type: route.type,
        startedAt: route.startedAt,
        endedAt,
        durationSeconds: duration,
        distanceMeters: meters,
        averageSpeedKmh: km / (duration / 3600),
        paceSecondsPerKm: km > 0 ? duration / km : 0,
        points: finalPoints
      };
      await saveActivity(activity);
      await setActiveRoute(null);
      routeRef.current = null;
      sessionStartedAtRef.current = null;
      elapsedBeforeRef.current = 0;
      setActive(false);
      setPaused(false);
      setPoints(finalPoints);
      setGps('Atividade salva com sucesso');
      Alert.alert('Atividade concluída!', 'Seu registro foi salvo no histórico. Compartilhe sua conquista na aba Evolução.', [{ text: 'Ver evolução', onPress: () => router.push('/progress') }, { text: 'Continuar aqui', style: 'cancel' }]);
    } catch {
      Alert.alert('Não foi possível salvar', 'O FITGO encontrou um problema ao finalizar. Tente novamente.');
    }
  };

  const recenter = () => {
    const last = points[points.length - 1];
    if (last) map.current?.injectJavaScript('window.centerOn(' + last.latitude + ',' + last.longitude + '); true;');
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}><View><Text style={styles.kicker}>REGISTRE SEU MOVIMENTO</Text><Text style={styles.title}>Atividade GPS</Text></View><View style={styles.livePill}><View style={[styles.dot, active && styles.dotLive]} /><Text style={styles.liveText}>{active ? 'AO VIVO' : 'PRONTO'}</Text></View></View>
      <View style={styles.sports}>{sportOptions.map((option) => <Pressable key={option.type} disabled={active} onPress={() => setSport(option.type)} style={[styles.sport, sport === option.type && styles.sportSelected]}><Ionicons name={option.icon} size={18} color={sport === option.type ? theme.bg : theme.muted} /><Text style={[styles.sportText, sport === option.type && styles.sportTextSelected]}>{option.label}</Text></Pressable>)}</View>
      <View style={styles.mapWrap}>
        <WebView
          ref={map}
          style={styles.map}
          source={{ html: MAP_HTML }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onMessage={(event) => {
            if (event.nativeEvent.data === 'ready') setMapReady(true);
          }}
        />
        <View style={styles.mapTag}><Ionicons name="navigate" color={theme.lime} size={12} /><Text style={styles.mapTagText}>MAPA DO PERCURSO</Text></View>
        <Pressable style={styles.recenter} onPress={recenter}><Ionicons name="locate" color={theme.text} size={19} /></Pressable>
        <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
      </View>
      <View style={styles.mainMetric}><Text style={styles.metricLabel}>DISTÂNCIA PERCORRIDA</Text><Text style={styles.distance}>{(distance / 1000).toFixed(2)}<Text style={styles.distanceUnit}> km</Text></Text><View style={styles.metrics}><View style={styles.metric}><Text style={styles.metricValue}>{formatDuration(seconds)}</Text><Text style={styles.metricCaption}>TEMPO</Text></View><View style={styles.metric}><Text style={styles.metricValue}>{formatPace(pace)}</Text><Text style={styles.metricCaption}>RITMO / KM</Text></View><View style={styles.metric}><Text style={styles.metricValue}>{speed.toFixed(1)}</Text><Text style={styles.metricCaption}>KM/H</Text></View></View></View>
      <Text style={styles.status}>{gps}</Text>
      {!active && !paused ? <Pressable style={styles.startButton} onPress={start}><Ionicons name="play" color={theme.bg} size={17} /><Text style={styles.startText}>INICIAR {sport === 'run' ? 'CORRIDA' : sport === 'walk' ? 'CAMINHADA' : 'PEDAL'}</Text></Pressable> : active ? <View style={styles.actionRow}><Pressable style={styles.pauseButton} onPress={pause}><Ionicons name="pause" color={theme.text} size={17} /><Text style={styles.stopText}>PAUSAR</Text></Pressable><Pressable style={styles.stopButton} onPress={finish}><Ionicons name="stop" color={theme.text} size={17} /><Text style={styles.stopText}>FINALIZAR</Text></Pressable></View> : <View style={styles.actionRow}><Pressable style={styles.startButton} onPress={resume}><Ionicons name="play" color={theme.bg} size={17} /><Text style={styles.startText}>CONTINUAR</Text></Pressable><Pressable style={styles.stopButton} onPress={finish}><Ionicons name="stop" color={theme.text} size={17} /><Text style={styles.stopText}>FINALIZAR</Text></Pressable></View>}
      <Text style={styles.footnote}>Mantenha o GPS ativado. O registro em segundo plano depende das permissões do Android e das configurações de bateria do aparelho. O mapa usa dados do OpenStreetMap.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 18, paddingBottom: 35, gap: 13 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  kicker: { color: theme.lime, fontSize: 8, letterSpacing: 1.6, fontWeight: '900' },
  title: { color: theme.text, fontSize: 27, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.surface2, borderRadius: 99, paddingVertical: 8, paddingHorizontal: 10 },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: theme.muted },
  dotLive: { backgroundColor: theme.lime },
  liveText: { color: theme.text, fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  sports: { flexDirection: 'row', gap: 8 },
  sport: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 13, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  sportSelected: { backgroundColor: theme.lime, borderColor: theme.lime },
  sportText: { color: theme.muted, fontSize: 9, fontWeight: '800' },
  sportTextSelected: { color: theme.bg },
  mapWrap: { height: 330, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, backgroundColor: '#17201D' },
  map: { flex: 1 },
  mapTag: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(8,10,11,0.88)', borderRadius: 9, paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapTagText: { color: theme.text, fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  recenter: { position: 'absolute', right: 12, bottom: 24, width: 39, height: 39, borderRadius: 13, backgroundColor: 'rgba(8,10,11,0.9)', alignItems: 'center', justifyContent: 'center' },
  attribution: { position: 'absolute', bottom: 5, left: 8, color: '#333', backgroundColor: 'rgba(255,255,255,.7)', fontSize: 7, paddingHorizontal: 4 },
  mainMetric: { backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, padding: 18, alignItems: 'center' },
  metricLabel: { color: theme.muted, fontSize: 8, letterSpacing: 1.4, fontWeight: '900' },
  distance: { color: theme.text, fontSize: 53, fontWeight: '900', letterSpacing: -2.5, marginTop: 3 },
  distanceUnit: { color: theme.lime, fontSize: 18 },
  metrics: { flexDirection: 'row', width: '100%', marginTop: 14, paddingTop: 15, borderTopWidth: 1, borderTopColor: theme.border },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { color: theme.text, fontSize: 16, fontWeight: '900' },
  metricCaption: { color: theme.muted, fontSize: 7, letterSpacing: .8, marginTop: 5, fontWeight: '800' },
  status: { color: theme.muted, fontSize: 9, textAlign: 'center' },
  startButton: { backgroundColor: theme.lime, borderRadius: 16, padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  startText: { color: theme.bg, fontSize: 11, fontWeight: '900', letterSpacing: .7 },
  actionRow: { flexDirection: 'row', gap: 9 },
  pauseButton: { flex: 1, backgroundColor: '#292F30', borderWidth: 1, borderColor: '#59605E', borderRadius: 16, padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  stopButton: { flex: 1, backgroundColor: '#292F30', borderWidth: 1, borderColor: '#59605E', borderRadius: 16, padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  stopText: { color: theme.text, fontSize: 11, fontWeight: '900', letterSpacing: .7 },
  footnote: { color: '#74807D', fontSize: 8, lineHeight: 14, textAlign: 'center', paddingHorizontal: 5 }
});