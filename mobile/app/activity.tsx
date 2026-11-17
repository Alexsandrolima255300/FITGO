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

const NativeWebView: any = WebView;

const sportOptions: { type: SportType; label: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'run', label: 'Corrida', subtitle: 'Correr', icon: 'walk' },
  { type: 'walk', label: 'Caminhada', subtitle: 'Caminhar', icon: 'footsteps' },
  { type: 'bike', label: 'Ciclismo', subtitle: 'Pedalar', icon: 'bicycle' }
];

export default function ActivityScreen() {
  const map = useRef<any>(null);
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
  const gpsIsOn = gps.startsWith('GPS ativo');
  const selectedSport = sportOptions.find((option) => option.type === sport) ?? sportOptions[0];

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
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}><Ionicons name="navigate" size={19} color={theme.bg} /></View>
          <View>
            <Text style={styles.kicker}>FITGO / MOVIMENTO</Text>
            <Text style={styles.title}>GPS Tracker</Text>
          </View>
        </View>
        <View style={styles.readyPill}>
          <View style={[styles.statusDot, gpsIsOn && styles.statusDotLive, paused && styles.statusDotPaused]} />
          <Text style={styles.readyText}>{active ? 'AO VIVO' : paused ? 'PAUSADO' : 'PRONTO'}</Text>
        </View>
      </View>

      <Text style={styles.intro}>Cada passo conta. Escolha como você quer se movimentar hoje.</Text>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>TIPO DE ATIVIDADE</Text>
        <Text style={styles.sectionHint}>ESCOLHA UMA OPÇÃO</Text>
      </View>
      <View style={styles.sports}>
        {sportOptions.map((option) => {
          const selected = sport === option.type;
          return (
            <Pressable key={option.type} disabled={active || paused} onPress={() => setSport(option.type)} style={[styles.sport, selected && styles.sportSelected, (active || paused) && !selected && styles.sportDisabled]}>
              <View style={[styles.sportIcon, selected && styles.sportIconSelected]}>
                <Ionicons name={option.icon} size={20} color={selected ? theme.bg : theme.muted} />
              </View>
              <Text style={[styles.sportText, selected && styles.sportTextSelected]}>{option.label}</Text>
              <Text style={[styles.sportSubtitle, selected && styles.sportSubtitleSelected]}>{option.subtitle}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.mapSection}>
        <View style={styles.mapTopBar}>
          <View style={styles.mapTitleGroup}>
            <Ionicons name="map-outline" size={15} color={theme.lime} />
            <Text style={styles.mapTitle}>SEU PERCURSO</Text>
          </View>
          <View style={styles.mapLive}>
            <View style={[styles.miniDot, gpsIsOn && styles.statusDotLive]} />
            <Text style={styles.mapLiveText}>{gpsIsOn ? 'RASTREANDO' : 'MAPA'}</Text>
          </View>
        </View>
        <View style={styles.mapWrap}>
          <NativeWebView
            ref={map}
            style={styles.map}
            source={{ html: MAP_HTML }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            onMessage={(event: { nativeEvent: { data: string } }) => {
              if (event.nativeEvent.data === 'ready') setMapReady(true);
            }}
          />
          <View style={styles.mapGpsBadge}>
            <Ionicons name="radio-outline" color={gpsIsOn ? theme.lime : theme.muted} size={13} />
            <Text style={styles.mapGpsText}>{gps}</Text>
          </View>
          <Pressable style={styles.recenter} onPress={recenter}>
            <Ionicons name="locate" color={theme.text} size={19} />
          </Pressable>
          {!points.length && (
            <View pointerEvents="none" style={styles.mapEmptyHint}>
              <View style={styles.mapEmptyIcon}><Ionicons name="navigate" color={theme.lime} size={17} /></View>
              <Text style={styles.mapEmptyTitle}>Seu caminho começa aqui</Text>
              <Text style={styles.mapEmptyText}>Inicie uma atividade para desenhar sua rota no mapa.</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SEU DESEMPENHO</Text>
        <Text style={styles.sectionHint}>{active ? 'ATUALIZANDO AO VIVO' : 'RESUMO DA ATIVIDADE'}</Text>
      </View>
      <View style={styles.distanceCard}>
        <View style={styles.distanceCardTop}>
          <View style={styles.distanceLabelRow}>
            <View style={styles.metricIcon}><Ionicons name="navigate" color={theme.lime} size={15} /></View>
            <Text style={styles.metricLabel}>DISTÂNCIA PERCORRIDA</Text>
          </View>
          <View style={styles.activityTypeTag}><Text style={styles.activityTypeText}>{selectedSport.label.toUpperCase()}</Text></View>
        </View>
        <View style={styles.distanceLine}>
          <Text style={styles.distance}>{(distance / 1000).toFixed(2)}</Text>
          <Text style={styles.distanceUnit}>KM</Text>
        </View>
        <View style={styles.distanceDivider} />
        <View style={styles.distanceFoot}>
          <Ionicons name="trending-up" color={theme.lime} size={14} />
          <Text style={styles.distanceFootText}>{points.length ? points.length + ' pontos registrados no percurso' : 'Sua distância aparecerá aqui quando começar'}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metricCard}>
          <View style={styles.metricCardIcon}><Ionicons name="time-outline" color={theme.lime} size={16} /></View>
          <Text style={styles.metricValue}>{formatDuration(seconds)}</Text>
          <Text style={styles.metricCaption}>TEMPO</Text>
        </View>
        <View style={styles.metricCard}>
          <View style={styles.metricCardIcon}><Ionicons name="speedometer-outline" color={theme.lime} size={16} /></View>
          <Text style={styles.metricValue}>{formatPace(pace)}</Text>
          <Text style={styles.metricCaption}>RITMO / KM</Text>
        </View>
        <View style={styles.metricCard}>
          <View style={styles.metricCardIcon}><Ionicons name="flash-outline" color={theme.lime} size={16} /></View>
          <Text style={styles.metricValue}>{speed.toFixed(1)}</Text>
          <Text style={styles.metricCaption}>KM/H</Text>
        </View>
      </View>

      <View style={styles.controlCard}>
        {!active && !paused ? (
          <>
            <View style={styles.controlIntro}>
              <Text style={styles.controlTitle}>Pronto para sair?</Text>
              <Text style={styles.controlSubtitle}>O FITGO registra seu caminho enquanto você se movimenta.</Text>
            </View>
            <Pressable style={styles.startButton} onPress={start}>
              <View style={styles.startIcon}><Ionicons name="play" color={theme.bg} size={17} /></View>
              <Text style={styles.startText}>INICIAR {sport === 'run' ? 'CORRIDA' : sport === 'walk' ? 'CAMINHADA' : 'PEDAL'}</Text>
              <Ionicons name="arrow-forward" color={theme.bg} size={17} />
            </Pressable>
          </>
        ) : active ? (
          <>
            <View style={styles.controlIntro}>
              <Text style={styles.controlTitle}>Você está em movimento!</Text>
              <Text style={styles.controlSubtitle}>Seu percurso está sendo registrado pelo GPS.</Text>
            </View>
            <View style={styles.actionRow}>
              <Pressable style={styles.pauseButton} onPress={pause}>
                <Ionicons name="pause" color={theme.text} size={17} />
                <Text style={styles.secondaryButtonText}>PAUSAR</Text>
              </Pressable>
              <Pressable style={styles.stopButton} onPress={finish}>
                <Ionicons name="stop" color={theme.text} size={17} />
                <Text style={styles.secondaryButtonText}>FINALIZAR</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.controlIntro}>
              <Text style={styles.controlTitle}>Recupere o fôlego.</Text>
              <Text style={styles.controlSubtitle}>Sua atividade está pausada. Continue quando estiver pronto.</Text>
            </View>
            <View style={styles.actionRow}>
              <Pressable style={styles.startButton} onPress={resume}>
                <Ionicons name="play" color={theme.bg} size={17} />
                <Text style={styles.startText}>CONTINUAR</Text>
              </Pressable>
              <Pressable style={styles.stopButton} onPress={finish}>
                <Ionicons name="stop" color={theme.text} size={17} />
                <Text style={styles.secondaryButtonText}>FINALIZAR</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <View style={styles.footnoteRow}>
        <Ionicons name="information-circle-outline" color={theme.muted} size={14} />
        <Text style={styles.footnote}>O registro em segundo plano depende das permissões de localização do Android e das configurações de bateria do aparelho. O mapa utiliza dados do OpenStreetMap e CARTO.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 18, paddingTop: 17, paddingBottom: 38, gap: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.lime, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: theme.muted, fontSize: 8, letterSpacing: 1.7, fontWeight: '900' },
  title: { color: theme.text, fontSize: 23, fontWeight: '900', letterSpacing: -0.8, marginTop: 2 },
  readyPill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 99, paddingVertical: 8, paddingHorizontal: 11 },
  statusDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: theme.muted },
  statusDotLive: { backgroundColor: theme.lime },
  statusDotPaused: { backgroundColor: '#FFB84D' },
  readyText: { color: theme.text, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  intro: { color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: -5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
  sectionTitle: { color: theme.text, fontSize: 10, fontWeight: '900', letterSpacing: 1.15 },
  sectionHint: { color: theme.muted, fontSize: 7, letterSpacing: 0.8, fontWeight: '800' },
  sports: { flexDirection: 'row', gap: 9 },
  sport: { flex: 1, minHeight: 91, borderRadius: 17, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, paddingVertical: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', gap: 4 },
  sportSelected: { backgroundColor: '#1B2614', borderColor: theme.lime },
  sportDisabled: { opacity: 0.55 },
  sportIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  sportIconSelected: { backgroundColor: theme.lime },
  sportText: { color: theme.text, fontSize: 10, fontWeight: '900' },
  sportTextSelected: { color: theme.lime },
  sportSubtitle: { color: theme.muted, fontSize: 8 },
  sportSubtitleSelected: { color: '#B6D77A' },
  mapSection: { backgroundColor: theme.surface, borderRadius: 22, borderWidth: 1, borderColor: theme.border, padding: 9, gap: 9 },
  mapTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5, paddingTop: 2 },
  mapTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  mapTitle: { color: theme.text, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  mapLive: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.surface2, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 5 },
  miniDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.muted },
  mapLiveText: { color: theme.muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  mapWrap: { height: 345, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111817', position: 'relative' },
  map: { flex: 1, backgroundColor: '#111817' },
  mapGpsBadge: { position: 'absolute', left: 10, bottom: 10, maxWidth: '78%', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(8,10,11,0.88)', borderWidth: 1, borderColor: 'rgba(199,255,61,0.18)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  mapGpsText: { color: theme.text, fontSize: 8, fontWeight: '700' },
  recenter: { position: 'absolute', right: 10, bottom: 10, width: 37, height: 37, borderRadius: 12, backgroundColor: 'rgba(8,10,11,0.92)', borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  mapEmptyHint: { position: 'absolute', alignSelf: 'center', top: '34%', alignItems: 'center', width: '72%', backgroundColor: 'rgba(8,10,11,0.82)', borderWidth: 1, borderColor: 'rgba(199,255,61,0.16)', borderRadius: 17, paddingVertical: 14, paddingHorizontal: 13 },
  mapEmptyIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#26351A', alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  mapEmptyTitle: { color: theme.text, fontSize: 11, fontWeight: '900' },
  mapEmptyText: { color: theme.muted, fontSize: 8, lineHeight: 13, textAlign: 'center', marginTop: 4 },
  distanceCard: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 21, padding: 17 },
  distanceCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  distanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricIcon: { width: 29, height: 29, borderRadius: 10, backgroundColor: '#26351A', alignItems: 'center', justifyContent: 'center' },
  metricLabel: { color: theme.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  activityTypeTag: { backgroundColor: theme.surface2, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  activityTypeText: { color: theme.lime, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  distanceLine: { flexDirection: 'row', alignItems: 'baseline', marginTop: 5 },
  distance: { color: theme.text, fontSize: 58, fontWeight: '900', letterSpacing: -3 },
  distanceUnit: { color: theme.lime, fontSize: 14, fontWeight: '900', marginLeft: 8 },
  distanceDivider: { height: 1, backgroundColor: theme.border, marginTop: 7, marginBottom: 10 },
  distanceFoot: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  distanceFootText: { color: theme.muted, fontSize: 8, fontWeight: '700' },
  metrics: { flexDirection: 'row', gap: 9 },
  metricCard: { flex: 1, minHeight: 91, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  metricCardIcon: { width: 29, height: 29, borderRadius: 10, backgroundColor: '#26351A', alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  metricValue: { color: theme.text, fontSize: 15, fontWeight: '900' },
  metricCaption: { color: theme.muted, fontSize: 7, letterSpacing: 0.8, marginTop: 4, fontWeight: '900' },
  controlCard: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 21, padding: 15, gap: 13 },
  controlIntro: { gap: 4 },
  controlTitle: { color: theme.text, fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  controlSubtitle: { color: theme.muted, fontSize: 10, lineHeight: 15 },
  startButton: { flex: 1, minHeight: 54, backgroundColor: theme.lime, borderRadius: 15, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  startIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: 'rgba(8,10,11,0.10)', alignItems: 'center', justifyContent: 'center' },
  startText: { color: theme.bg, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, flex: 1, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 9 },
  pauseButton: { flex: 1, minHeight: 52, backgroundColor: theme.surface2, borderWidth: 1, borderColor: '#465047', borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  stopButton: { flex: 1, minHeight: 52, backgroundColor: '#2B1A1B', borderWidth: 1, borderColor: '#66383A', borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { color: theme.text, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  footnoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: 3 },
  footnote: { flex: 1, color: theme.muted, fontSize: 8, lineHeight: 13 }
});