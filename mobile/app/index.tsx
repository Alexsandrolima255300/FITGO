import { useCallback, useState } from 'react';
import { ScrollView, Text, View, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FitgoActivity, getActivities } from '../src/storage';
import { theme } from '../src/theme';

export default function HomeScreen() {
  const [activities, setActivities] = useState<FitgoActivity[]>([]);
  useFocusEffect(useCallback(() => {
    getActivities().then(setActivities);
  }, []));
  const totalKm = activities.reduce((sum, item) => sum + item.distanceMeters, 0) / 1000;
  const latest = activities[0];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <View><Text style={styles.kicker}>SEU RITMO. SUA CONQUISTA.</Text><Text style={styles.logo}>FIT<Text style={{ color: theme.lime }}>GO</Text></Text></View>
        <View style={styles.avatar}><Text style={styles.avatarText}>FG</Text></View>
      </View>

      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>BEM-VINDO DE VOLTA</Text>
          <Text style={styles.title}>Um passo de cada vez.</Text>
          <Text style={styles.subtitle}>Seu progresso começa com a próxima escolha.</Text>
          <Pressable style={styles.cta} onPress={() => router.push('/activity')}>
            <Ionicons name="play" size={16} color={theme.bg} />
            <Text style={styles.ctaText}>COMEÇAR ATIVIDADE</Text>
          </Pressable>
        </View>
        <View style={styles.heroMark}><Ionicons name="fitness" size={42} color={theme.lime} /></View>
      </View>

      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>SEU RESUMO</Text><Text style={styles.sectionHint}>TOTAL REGISTRADO</Text></View>
      <View style={styles.stats}>
        <View style={styles.stat}><Ionicons name="navigate-outline" color={theme.lime} size={19} /><Text style={styles.statValue}>{totalKm.toFixed(1)}</Text><Text style={styles.statLabel}>QUILÔMETROS</Text></View>
        <View style={styles.stat}><Ionicons name="footsteps-outline" color={theme.lime} size={19} /><Text style={styles.statValue}>{activities.length}</Text><Text style={styles.statLabel}>ATIVIDADES</Text></View>
      </View>

      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>SEU DIA, DO SEU JEITO</Text></View>
      <View style={styles.shortcuts}>
        <Pressable style={styles.shortcut} onPress={() => router.push('/workouts')}><View style={styles.shortcutIcon}><Ionicons name="barbell-outline" color={theme.lime} size={21} /></View><View style={{ flex: 1 }}><Text style={styles.shortcutTitle}>Plano de treino</Text><Text style={styles.shortcutSub}>Veja o treino de hoje</Text></View><Ionicons name="chevron-forward" color={theme.muted} size={18} /></Pressable>
        <Pressable style={styles.shortcut} onPress={() => router.push('/hydration')}><View style={styles.shortcutIcon}><Ionicons name="water-outline" color={theme.lime} size={21} /></View><View style={{ flex: 1 }}><Text style={styles.shortcutTitle}>Hidratação</Text><Text style={styles.shortcutSub}>Cuide da sua meta de água</Text></View><Ionicons name="chevron-forward" color={theme.muted} size={18} /></Pressable>
        <Pressable style={styles.shortcut} onPress={() => router.push('/nutrition')}><View style={styles.shortcutIcon}><Ionicons name="restaurant-outline" color={theme.lime} size={21} /></View><View style={{ flex: 1 }}><Text style={styles.shortcutTitle}>Alimentação</Text><Text style={styles.shortcutSub}>Registre suas refeições</Text></View><Ionicons name="chevron-forward" color={theme.muted} size={18} /></Pressable>
      </View>

      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>ÚLTIMA ATIVIDADE</Text><Pressable onPress={() => router.push('/progress')}><Text style={styles.seeAll}>VER TUDO</Text></Pressable></View>
      <View style={styles.latest}>
        {latest ? <><Text style={styles.latestType}>{latest.type === 'run' ? 'CORRIDA' : latest.type === 'walk' ? 'CAMINHADA' : 'CICLISMO'}</Text><Text style={styles.latestDistance}>{(latest.distanceMeters / 1000).toFixed(2)} <Text style={styles.km}>KM</Text></Text><Text style={styles.latestDate}>{new Date(latest.startedAt).toLocaleDateString('pt-BR')} · {Math.round(latest.durationSeconds / 60)} min</Text></> : <><Text style={styles.emptyTitle}>Sua primeira conquista espera por você.</Text><Text style={styles.emptySub}>Registre uma caminhada, corrida ou pedal para começar seu histórico.</Text></>}
      </View>
      <Text style={styles.footer}>FEITO PARA A SUA EVOLUÇÃO.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 22, paddingBottom: 36, gap: 22 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { color: theme.muted, fontSize: 9, letterSpacing: 2, fontWeight: '800' },
  logo: { color: theme.text, fontSize: 29, fontWeight: '900', letterSpacing: -1.5, marginTop: 3 },
  avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.lime, fontWeight: '900', fontSize: 12 },
  hero: { backgroundColor: theme.surface, borderRadius: 25, borderWidth: 1, borderColor: theme.border, padding: 22, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  eyebrow: { color: theme.lime, fontSize: 9, letterSpacing: 1.5, fontWeight: '900' },
  title: { color: theme.text, fontSize: 26, fontWeight: '900', letterSpacing: -1, marginTop: 9, maxWidth: 230 },
  subtitle: { color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: 8, maxWidth: 230 },
  cta: { backgroundColor: theme.lime, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 15, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 19 },
  ctaText: { color: theme.bg, fontSize: 10, fontWeight: '900', letterSpacing: .5 },
  heroMark: { width: 76, height: 76, borderRadius: 25, backgroundColor: '#202A1A', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: -12 },
  sectionTitle: { color: theme.text, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  sectionHint: { color: theme.muted, fontSize: 8, letterSpacing: 1 },
  stats: { flexDirection: 'row', gap: 11 },
  stat: { flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 18, padding: 17 },
  statValue: { color: theme.text, fontSize: 29, fontWeight: '900', marginTop: 10 },
  statLabel: { color: theme.muted, fontSize: 8, letterSpacing: 1, marginTop: 3, fontWeight: '800' },
  shortcuts: { gap: 9 },
  shortcut: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 17 },
  shortcutIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#202A1A', alignItems: 'center', justifyContent: 'center' },
  shortcutTitle: { color: theme.text, fontSize: 12, fontWeight: '800' },
  shortcutSub: { color: theme.muted, fontSize: 10, marginTop: 4 },
  seeAll: { color: theme.lime, fontSize: 9, fontWeight: '900', letterSpacing: .8 },
  latest: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 18, padding: 19 },
  latestType: { color: theme.lime, fontSize: 9, letterSpacing: 1.5, fontWeight: '900' },
  latestDistance: { color: theme.text, fontSize: 39, fontWeight: '900', marginTop: 7 },
  km: { color: theme.muted, fontSize: 13 },
  latestDate: { color: theme.muted, fontSize: 10, marginTop: 5 },
  emptyTitle: { color: theme.text, fontWeight: '800', fontSize: 14 },
  emptySub: { color: theme.muted, fontSize: 11, lineHeight: 17, marginTop: 7 },
  footer: { color: '#53605D', fontSize: 8, letterSpacing: 2, textAlign: 'center', fontWeight: '800' }
});