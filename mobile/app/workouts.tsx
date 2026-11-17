import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../src/theme';

const exercises = [
  { name: 'Agachamento livre', detail: 'Pernas e glúteos', sets: '3 séries · 10 repetições' },
  { name: 'Flexão inclinada', detail: 'Peito e braços', sets: '3 séries · 8 repetições' },
  { name: 'Remada com halteres', detail: 'Costas', sets: '3 séries · 12 repetições' },
  { name: 'Elevação pélvica', detail: 'Glúteos', sets: '3 séries · 12 repetições' },
  { name: 'Prancha', detail: 'Core', sets: '3 séries · 20 segundos' },
  { name: 'Caminhada leve', detail: 'Cardio e recuperação', sets: '10 a 20 minutos' }
];

export default function WorkoutsScreen() {
  const [done, setDone] = useState<number[]>([]);
  useEffect(() => { AsyncStorage.getItem('fitgo:workout:today').then((v) => v && setDone(JSON.parse(v))); }, []);
  const toggle = async (index: number) => {
    const next = done.includes(index) ? done.filter((n) => n !== index) : [...done, index];
    setDone(next);
    await AsyncStorage.setItem('fitgo:workout:today', JSON.stringify(next));
    if (next.length === exercises.length) Alert.alert('Treino concluído!', 'Parabéns por respeitar seu ritmo e concluir sua sessão.');
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>PLANO DE TREINO</Text>
      <Text style={styles.title}>Treine com intenção.</Text>
      <Text style={styles.subtitle}>Um plano inicial equilibrado. Ajuste a intensidade à sua condição e respeite seus limites.</Text>
      <View style={styles.banner}><View><Text style={styles.bannerLabel}>SESSÃO DO DIA</Text><Text style={styles.bannerTitle}>Corpo inteiro</Text><Text style={styles.bannerMeta}>6 exercícios · iniciante</Text></View><View style={styles.progressCircle}><Text style={styles.progressValue}>{Math.round((done.length / exercises.length) * 100)}%</Text></View></View>
      <View style={styles.rowHead}><Text style={styles.section}>SUA SESSÃO</Text><Text style={styles.count}>{done.length}/{exercises.length} concluídos</Text></View>
      {exercises.map((exercise, index) => (
        <Pressable key={exercise.name} style={[styles.exercise, done.includes(index) && styles.exerciseDone]} onPress={() => toggle(index)}>
          <View style={[styles.number, done.includes(index) && styles.numberDone]}><Text style={[styles.numberText, done.includes(index) && { color: theme.bg }]}>{String(index + 1).padStart(2, '0')}</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseDetail}>{exercise.detail}</Text><Text style={styles.exerciseSets}>{exercise.sets}</Text></View>
          <Ionicons name={done.includes(index) ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={done.includes(index) ? theme.lime : theme.muted} />
        </Pressable>
      ))}
      <Pressable style={styles.reset} onPress={() => Alert.alert('Reiniciar sessão?', 'As marcações deste treino serão apagadas.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Reiniciar', style: 'destructive', onPress: async () => { setDone([]); await AsyncStorage.removeItem('fitgo:workout:today'); } }])}><Text style={styles.resetText}>REINICIAR TREINO</Text></Pressable>
      <Text style={styles.disclaimer}>Este é um modelo demonstrativo de treino geral, não uma prescrição individual. Em caso de dor, tontura ou desconforto, interrompa a atividade e procure orientação profissional.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 22, paddingBottom: 38, gap: 15 },
  kicker: { color: theme.lime, fontSize: 9, letterSpacing: 1.8, fontWeight: '900', marginTop: 7 },
  title: { color: theme.text, fontSize: 29, fontWeight: '900', letterSpacing: -1.2, marginTop: -7 },
  subtitle: { color: theme.muted, fontSize: 11, lineHeight: 18, marginTop: -8 },
  banner: { backgroundColor: theme.surface, borderRadius: 21, borderWidth: 1, borderColor: theme.border, padding: 19, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  bannerLabel: { color: theme.lime, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  bannerTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginTop: 7 },
  bannerMeta: { color: theme.muted, fontSize: 10, marginTop: 5 },
  progressCircle: { width: 63, height: 63, borderRadius: 32, borderWidth: 3, borderColor: theme.lime, alignItems: 'center', justifyContent: 'center' },
  progressValue: { color: theme.text, fontSize: 14, fontWeight: '900' },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 },
  section: { color: theme.text, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  count: { color: theme.muted, fontSize: 9 },
  exercise: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 14 },
  exerciseDone: { borderColor: '#526A2A', backgroundColor: '#111A0B' },
  number: { width: 35, height: 35, borderRadius: 11, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' },
  numberDone: { backgroundColor: theme.lime },
  numberText: { color: theme.muted, fontSize: 10, fontWeight: '900' },
  exerciseName: { color: theme.text, fontSize: 12, fontWeight: '800' },
  exerciseDetail: { color: theme.muted, fontSize: 9, marginTop: 4 },
  exerciseSets: { color: theme.lime, fontSize: 9, marginTop: 6, fontWeight: '700' },
  reset: { alignItems: 'center', padding: 13, borderWidth: 1, borderColor: theme.border, borderRadius: 13 },
  resetText: { color: theme.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  disclaimer: { color: '#77817F', fontSize: 9, lineHeight: 15, marginTop: 2 }
});