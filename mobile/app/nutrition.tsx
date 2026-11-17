import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../src/theme';

type MealPeriod = 'Café da manhã' | 'Almoço' | 'Lanche' | 'Jantar';
type MealEntry = { id: string; period: MealPeriod; description: string; time: string };

const periods: MealPeriod[] = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar'];
const dateKey = () => {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};
const key = () => 'fitgo:meals:' + dateKey();

export default function NutritionScreen() {
  const [period, setPeriod] = useState<MealPeriod>('Café da manhã');
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState<MealEntry[]>([]);
  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem(key()).then((value) => setEntries(value ? JSON.parse(value) : []));
  }, []));
  const persist = async (next: MealEntry[]) => {
    setEntries(next);
    await AsyncStorage.setItem(key(), JSON.stringify(next));
  };
  const addMeal = async () => {
    const value = description.trim();
    if (!value) {
      Alert.alert('Descreva sua refeição', 'Digite o que você comeu antes de registrar.');
      return;
    }
    const entry: MealEntry = { id: String(Date.now()), period, description: value, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
    await persist([entry, ...entries]);
    setDescription('');
  };
  const removeMeal = (id: string) => {
    Alert.alert('Excluir refeição?', 'Esse registro será removido do diário de hoje.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => persist(entries.filter((entry) => entry.id !== id)) }
    ]);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>ROTINA ALIMENTAR</Text>
      <Text style={styles.title}>Alimentação.</Text>
      <Text style={styles.subtitle}>Registre suas refeições e observe seus hábitos com o tempo. Sem julgamentos, um dia de cada vez.</Text>

      <View style={styles.form}>
        <Text style={styles.formTitle}>O QUE VOCÊ COMEU?</Text>
        <View style={styles.periods}>{periods.map((item) => <Pressable key={item} onPress={() => setPeriod(item)} style={[styles.period, period === item && styles.periodActive]}><Text style={[styles.periodText, period === item && styles.periodTextActive]}>{item}</Text></Pressable>)}</View>
        <TextInput value={description} onChangeText={setDescription} placeholder="Ex.: arroz, feijão, frango e salada..." placeholderTextColor={theme.muted} multiline style={styles.input} />
        <Pressable style={styles.addButton} onPress={addMeal}><Ionicons name="add" color={theme.bg} size={17} /><Text style={styles.addText}>REGISTRAR REFEIÇÃO</Text></Pressable>
      </View>

      <View style={styles.sectionHead}><Text style={styles.section}>DIÁRIO DE HOJE</Text><Text style={styles.count}>{entries.length} registros</Text></View>
      {entries.length === 0 ? <View style={styles.empty}><Ionicons name="restaurant-outline" size={27} color={theme.lime} /><Text style={styles.emptyTitle}>Seu diário começa aqui.</Text><Text style={styles.emptyText}>Anote suas refeições para acompanhar sua rotina alimentar.</Text></View> : entries.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <View style={styles.entryIcon}><Ionicons name="restaurant" size={17} color={theme.lime} /></View>
          <View style={{ flex: 1 }}><Text style={styles.entryPeriod}>{entry.period.toUpperCase()} · {entry.time}</Text><Text style={styles.entryDescription}>{entry.description}</Text></View>
          <Pressable onPress={() => removeMeal(entry.id)} hitSlop={10}><Ionicons name="trash-outline" size={17} color={theme.muted} /></Pressable>
        </View>
      ))}

      <Text style={styles.section}>IDEIAS SIMPLES PARA O DIA</Text>
      <View style={styles.idea}><Text style={styles.ideaTitle}>Monte um prato variado</Text><Text style={styles.ideaText}>Combine uma fonte de energia, uma proteína e legumes ou verduras, respeitando suas preferências e necessidades.</Text></View>
      <View style={styles.idea}><Text style={styles.ideaTitle}>Tenha opções práticas</Text><Text style={styles.ideaText}>Frutas, ovos, feijão, arroz, aveia e vegetais podem ajudar a montar refeições simples e acessíveis.</Text></View>
      <Text style={styles.note}>O diário não calcula calorias nem substitui a orientação de nutricionista. As sugestões são gerais e devem ser adaptadas às suas necessidades.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 22, paddingBottom: 40, gap: 15 },
  kicker: { color: theme.lime, fontSize: 9, letterSpacing: 1.8, fontWeight: '900', marginTop: 7 },
  title: { color: theme.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.2, marginTop: -7 },
  subtitle: { color: theme.muted, fontSize: 11, lineHeight: 18, marginTop: -8 },
  form: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 21, padding: 17, gap: 13, marginTop: 4 },
  formTitle: { color: theme.text, fontSize: 9, letterSpacing: 1.1, fontWeight: '900' },
  periods: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  period: { paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10, backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border },
  periodActive: { backgroundColor: theme.lime, borderColor: theme.lime },
  periodText: { color: theme.muted, fontSize: 8, fontWeight: '800' },
  periodTextActive: { color: theme.bg },
  input: { minHeight: 88, textAlignVertical: 'top', color: theme.text, backgroundColor: theme.surface2, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 13, fontSize: 11 },
  addButton: { backgroundColor: theme.lime, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  addText: { color: theme.bg, fontSize: 9, fontWeight: '900', letterSpacing: .6 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
  section: { color: theme.text, fontSize: 10, letterSpacing: 1.1, fontWeight: '900' },
  count: { color: theme.muted, fontSize: 9 },
  empty: { alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 18, padding: 22 },
  emptyTitle: { color: theme.text, fontSize: 12, fontWeight: '800', marginTop: 9 },
  emptyText: { color: theme.muted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 5 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 15, padding: 13 },
  entryIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#202A1A', alignItems: 'center', justifyContent: 'center' },
  entryPeriod: { color: theme.lime, fontSize: 8, letterSpacing: .8, fontWeight: '900' },
  entryDescription: { color: theme.text, fontSize: 10, lineHeight: 15, marginTop: 4 },
  idea: { backgroundColor: theme.surface, borderRadius: 15, borderWidth: 1, borderColor: theme.border, padding: 15, gap: 5 },
  ideaTitle: { color: theme.text, fontSize: 11, fontWeight: '800' },
  ideaText: { color: theme.muted, fontSize: 10, lineHeight: 16 },
  note: { color: '#77817F', fontSize: 8, lineHeight: 14, textAlign: 'center' }
});