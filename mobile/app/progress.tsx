import { useCallback, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Svg, { Circle, Polyline as SvgPolyline } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { FitgoActivity, formatDuration, formatPace, getActivities, sportLabel } from '../src/storage';
import { theme } from '../src/theme';

export default function ProgressScreen() {
  const [activities, setActivities] = useState<FitgoActivity[]>([]);
  const [selected, setSelected] = useState<FitgoActivity | null>(null);
  const [weight, setWeight] = useState('');
  const [weights, setWeights] = useState<{ id: string; date: string; kg: number }[]>([]);
  const shareRef = useRef<ViewShot>(null);
  useFocusEffect(useCallback(() => {
    getActivities().then((items) => { setActivities(items); setSelected(items[0] ?? null); });
    AsyncStorage.getItem('fitgo:body-weight:v1').then((value) => setWeights(value ? JSON.parse(value) : []));
  }, []));
  const saveWeight = async () => {
    const value = Number(weight.replace(',', '.'));
    if (!Number.isFinite(value) || value < 20 || value > 400) {
      Alert.alert('Peso inválido', 'Digite um peso válido em quilogramas.');
      return;
    }
    const entry = { id: String(Date.now()), date: new Date().toISOString(), kg: value };
    const next = [entry, ...weights].slice(0, 100);
    setWeights(next);
    setWeight('');
    await AsyncStorage.setItem('fitgo:body-weight:v1', JSON.stringify(next));
  };
  const routeSource = selected?.points ?? [];
  const routeSampleStep = Math.max(1, Math.floor(routeSource.length / 120));
  const routeSample = routeSource.filter((_, index) => index % routeSampleStep === 0 || index === routeSource.length - 1);
  const latitudes = routeSample.map((point) => point.latitude);
  const longitudes = routeSample.map((point) => point.longitude);
  const minLat = latitudes.length ? Math.min(...latitudes) : 0;
  const maxLat = latitudes.length ? Math.max(...latitudes) : 1;
  const minLng = longitudes.length ? Math.min(...longitudes) : 0;
  const maxLng = longitudes.length ? Math.max(...longitudes) : 1;
  const routeXY = routeSample.map((point) => [
    12 + ((point.longitude - minLng) / Math.max(maxLng - minLng, 0.000001)) * 276,
    8 + ((maxLat - point.latitude) / Math.max(maxLat - minLat, 0.000001)) * 70
  ]);
  const routePath = routeXY.map((point) => point[0].toFixed(1) + ',' + point[1].toFixed(1)).join(' ');
  const firstRoutePoint = routeXY[0] ?? [12, 43];
  const lastRoutePoint = routeXY[routeXY.length - 1] ?? [288, 43];
  const totalDistance = activities.reduce((sum, item) => sum + item.distanceMeters, 0);
  const totalTime = activities.reduce((sum, item) => sum + item.durationSeconds, 0);
  const share = async () => {
    if (!selected || !shareRef.current) return;
    try {
      const uri = await shareRef.current.capture();
      if (!uri) throw new Error('Imagem não gerada');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhe sua evolução FITGO' });
      else await Share.share({ message: 'Minha evolução com o FITGO. Um passo de cada vez!' });
    } catch {
      Alert.alert('Não foi possível gerar a imagem', 'Tente novamente em instantes.');
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>CADA PASSO CONTA</Text>
      <Text style={styles.title}>Sua evolução.</Text>
      <Text style={styles.subtitle}>Veja o caminho que você já percorreu. Seus registros ficam salvos neste aparelho nesta versão inicial.</Text>
      <View style={styles.weightCard}>
        <View style={styles.weightTop}><View><Text style={styles.weightLabel}>PESO CORPORAL</Text><Text style={styles.weightValue}>{weights[0] ? weights[0].kg.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' kg' : '--'}</Text><Text style={styles.weightDate}>{weights[0] ? 'Último registro · ' + new Date(weights[0].date).toLocaleDateString('pt-BR') : 'Registre seu primeiro peso'}</Text></View><View style={styles.weightIcon}><Ionicons name="scale-outline" size={22} color={theme.lime} /></View></View>
        <View style={styles.weightForm}><TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Peso em kg" placeholderTextColor={theme.muted} style={styles.weightInput} /><Pressable style={styles.weightButton} onPress={saveWeight}><Text style={styles.weightButtonText}>SALVAR</Text></Pressable></View>
        {weights.length > 1 && <Text style={styles.weightHistory}>Variação desde o primeiro registro: {(weights[0].kg - weights[weights.length - 1].kg) > 0 ? '+' : ''}{(weights[0].kg - weights[weights.length - 1].kg).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</Text>}
      </View>
      <View style={styles.summary}>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{(totalDistance / 1000).toFixed(1)}</Text><Text style={styles.summaryLabel}>KM PERCORRIDOS</Text></View>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{activities.length}</Text><Text style={styles.summaryLabel}>ATIVIDADES</Text></View>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{Math.round(totalTime / 60)}</Text><Text style={styles.summaryLabel}>MINUTOS ATIVOS</Text></View>
      </View>

      <Text style={styles.section}>COMPARTILHE SUA CONQUISTA</Text>
      {selected ? <>
        <View style={styles.sharePreview}>
          <ViewShot ref={shareRef} options={{ format: 'png', quality: 1, result: 'tmpfile' }} style={styles.exportCanvas}>
            <View style={styles.exportCard}>
              <View style={styles.exportTop}><Text style={styles.exportLogo}>FIT<Text style={{ color: theme.lime }}>GO</Text></Text><Text style={styles.exportTag}>MINHA EVOLUÇÃO</Text></View>
              <Text style={styles.exportSport}>{sportLabel(selected.type).toUpperCase()}</Text>
              <Text style={styles.exportDistance}>{(selected.distanceMeters / 1000).toFixed(2)}<Text style={styles.exportKm}> KM</Text></Text>
              <View style={styles.routeGraphic}>
                <Svg width="100%" height={86} viewBox="0 0 300 86">
                  {routePath.length > 0 && <SvgPolyline points={routePath} fill="none" stroke={theme.lime} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />}
                  {routeXY.length > 0 && <Circle cx={firstRoutePoint[0]} cy={firstRoutePoint[1]} r={5} fill="#FFFFFF" />}
                  {routeXY.length > 0 && <Circle cx={lastRoutePoint[0]} cy={lastRoutePoint[1]} r={5} fill={theme.lime} stroke="#101516" strokeWidth={2} />}
                </Svg>
              </View>
              <View style={styles.exportDivider} />
              <View style={styles.exportStats}><View><Text style={styles.exportValue}>{formatDuration(selected.durationSeconds)}</Text><Text style={styles.exportLabel}>TEMPO</Text></View><View><Text style={styles.exportValue}>{formatPace(selected.paceSecondsPerKm)}</Text><Text style={styles.exportLabel}>RITMO / KM</Text></View><View><Text style={styles.exportValue}>{selected.averageSpeedKmh.toFixed(1)}</Text><Text style={styles.exportLabel}>KM/H</Text></View></View>
              <Text style={styles.exportDate}>{new Date(selected.startedAt).toLocaleDateString('pt-BR')}  ·  UM PASSO DE CADA VEZ.</Text>
              <Text style={styles.exportBrand}>FITGO.APP</Text>
            </View>
          </ViewShot>
        </View>
        <Pressable style={styles.shareButton} onPress={share}><Ionicons name="share-social" color={theme.bg} size={17} /><Text style={styles.shareText}>GERAR PNG E COMPARTILHAR</Text></Pressable>
      </> : <View style={styles.empty}><Ionicons name="trophy-outline" color={theme.lime} size={29} /><Text style={styles.emptyTitle}>Sua primeira conquista está esperando.</Text><Text style={styles.emptySub}>Registre uma corrida, caminhada ou pedal na aba GPS.</Text></View>}

      <Text style={styles.section}>HISTÓRICO DE ATIVIDADES</Text>
      {activities.length === 0 ? <Text style={styles.noHistory}>Ainda não há atividades registradas.</Text> : activities.map((item) => (
        <Pressable key={item.id} onPress={() => setSelected(item)} style={[styles.activity, selected?.id === item.id && styles.activitySelected]}>
          <View style={styles.activityIcon}><Ionicons name={item.type === 'run' ? 'walk' : item.type === 'walk' ? 'footsteps' : 'bicycle'} color={theme.lime} size={19} /></View>
          <View style={{ flex: 1 }}><Text style={styles.activityName}>{sportLabel(item.type)}</Text><Text style={styles.activityDate}>{new Date(item.startedAt).toLocaleDateString('pt-BR')} · {formatDuration(item.durationSeconds)}</Text></View>
          <View style={{ alignItems: 'flex-end' }}><Text style={styles.activityDistance}>{(item.distanceMeters / 1000).toFixed(2)} km</Text><Text style={styles.activityPace}>{formatPace(item.paceSecondsPerKm)} /km</Text></View>
        </Pressable>
      ))}
      <Text style={styles.privacy}>A imagem compartilhada não inclui o mapa nem as coordenadas do seu percurso. Sua privacidade vem primeiro.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 22, paddingBottom: 40, gap: 15 },
  kicker: { color: theme.lime, fontSize: 9, letterSpacing: 1.8, fontWeight: '900', marginTop: 7 },
  title: { color: theme.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.2, marginTop: -7 },
  subtitle: { color: theme.muted, fontSize: 11, lineHeight: 18, marginTop: -8 },
  weightCard: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 19, padding: 17, gap: 13, marginTop: 4 },
  weightTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weightLabel: { color: theme.lime, fontSize: 8, letterSpacing: 1.2, fontWeight: '900' },
  weightValue: { color: theme.text, fontSize: 27, fontWeight: '900', marginTop: 5 },
  weightDate: { color: theme.muted, fontSize: 8, marginTop: 3 },
  weightIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: '#202A1A', alignItems: 'center', justifyContent: 'center' },
  weightForm: { flexDirection: 'row', gap: 8 },
  weightInput: { flex: 1, backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 11, paddingHorizontal: 12, color: theme.text, fontSize: 11 },
  weightButton: { backgroundColor: theme.lime, borderRadius: 11, paddingHorizontal: 17, justifyContent: 'center' },
  weightButtonText: { color: theme.bg, fontSize: 9, fontWeight: '900' },
  weightHistory: { color: theme.muted, fontSize: 9 },
  summary: { flexDirection: 'row', gap: 8, marginTop: 4 },
  summaryItem: { flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 15, padding: 13 },
  summaryValue: { color: theme.text, fontSize: 23, fontWeight: '900' },
  summaryLabel: { color: theme.muted, fontSize: 7, letterSpacing: .6, marginTop: 5, fontWeight: '800' },
  section: { color: theme.text, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginTop: 8 },
  sharePreview: { alignItems: 'center', paddingVertical: 9 },
  exportCanvas: { width: '100%', backgroundColor: 'transparent' },
  exportCard: { backgroundColor: '#101516', borderRadius: 22, borderWidth: 1, borderColor: '#36412B', padding: 22, overflow: 'hidden' },
  exportTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exportLogo: { color: theme.text, fontSize: 23, fontWeight: '900', letterSpacing: -1 },
  exportTag: { color: theme.lime, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  exportSport: { color: theme.muted, fontSize: 9, letterSpacing: 2, fontWeight: '900', marginTop: 31 },
  exportDistance: { color: theme.text, fontSize: 58, fontWeight: '900', letterSpacing: -3, marginTop: 3 },
  exportKm: { color: theme.lime, fontSize: 17 },
  routeGraphic: { marginTop: 8, marginBottom: 4, paddingHorizontal: 2, borderRadius: 12, backgroundColor: '#151D1A' },
  exportDivider: { height: 1, backgroundColor: '#354039', marginVertical: 20 },
  exportStats: { flexDirection: 'row', justifyContent: 'space-between' },
  exportValue: { color: theme.text, fontSize: 16, fontWeight: '900' },
  exportLabel: { color: theme.muted, fontSize: 7, letterSpacing: .7, marginTop: 5, fontWeight: '800' },
  exportDate: { color: theme.muted, fontSize: 8, marginTop: 25 },
  exportBrand: { color: theme.lime, fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginTop: 7 },
  shareButton: { backgroundColor: theme.lime, borderRadius: 15, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  shareText: { color: theme.bg, fontSize: 10, fontWeight: '900', letterSpacing: .5 },
  empty: { alignItems: 'center', backgroundColor: theme.surface, borderRadius: 19, borderWidth: 1, borderColor: theme.border, padding: 25 },
  emptyTitle: { color: theme.text, fontSize: 13, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  emptySub: { color: theme.muted, fontSize: 10, textAlign: 'center', lineHeight: 16, marginTop: 6 },
  noHistory: { color: theme.muted, fontSize: 10, padding: 12 },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderRadius: 15, borderWidth: 1, borderColor: theme.border, padding: 13 },
  activitySelected: { borderColor: theme.limeDark },
  activityIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#202A1A', alignItems: 'center', justifyContent: 'center' },
  activityName: { color: theme.text, fontSize: 11, fontWeight: '800' },
  activityDate: { color: theme.muted, fontSize: 9, marginTop: 4 },
  activityDistance: { color: theme.text, fontSize: 12, fontWeight: '900' },
  activityPace: { color: theme.muted, fontSize: 8, marginTop: 4 },
  privacy: { color: '#77817F', fontSize: 8, lineHeight: 14, textAlign: 'center', marginTop: 5 }
});