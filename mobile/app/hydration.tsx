import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { theme } from '../src/theme';

const todayKey = () => {
  const date = new Date();
  const localDate = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  return 'fitgo:water:' + localDate;
};
const GOAL_KEY = 'fitgo:water-goal';
const REMINDER_KEY = 'fitgo:water-reminder';

export default function HydrationScreen() {
  const [amount, setAmount] = useState(0);
  const [goal, setGoal] = useState(2000);
  const [reminders, setReminders] = useState(false);
  useFocusEffect(useCallback(() => {
    AsyncStorage.multiGet([todayKey(), GOAL_KEY, REMINDER_KEY]).then((values) => {
      setAmount(Number(values[0][1] || 0));
      setGoal(Number(values[1][1] || 2000));
      setReminders(values[2][1] === 'true');
    });
  }, []));
  const progress = Math.min(amount / goal, 1);
  const addWater = async (ml: number) => {
    const next = amount + ml;
    setAmount(next);
    await AsyncStorage.setItem(todayKey(), String(next));
  };
  const toggleReminders = async (enabled: boolean) => {
    setReminders(enabled);
    await AsyncStorage.setItem(REMINDER_KEY, String(enabled));
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      setReminders(false);
      await AsyncStorage.setItem(REMINDER_KEY, 'false');
      Alert.alert('Notificações desativadas', 'Ative as notificações do FITGO nas configurações do celular para receber lembretes.');
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Hora de se hidratar 💧', body: 'Faça uma pausa e registre sua água no FITGO.', sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 * 60 * 60, repeats: true }
    });
  };
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>CUIDADO DIÁRIO</Text>
      <Text style={styles.title}>Hidratação.</Text>
      <Text style={styles.subtitle}>Pequenos hábitos fazem parte da sua evolução. Registre o que beber ao longo do dia.</Text>
      <View style={styles.waterCard}>
        <View style={styles.waterIcon}><Ionicons name="water" size={28} color={theme.lime} /></View>
        <Text style={styles.amount}>{(amount / 1000).toFixed(2)}<Text style={styles.unit}> L</Text></Text>
        <Text style={styles.goal}>DE {goal.toLocaleString('pt-BR')} ML DA META DIÁRIA</Text>
        <View style={styles.track}><View style={[styles.fill, { width: (progress * 100) + '%' }]} /></View>
        <Text style={styles.percent}>{Math.round(progress * 100)}% concluído</Text>
        <View style={styles.addButtons}>
          <Pressable style={styles.addButton} onPress={() => addWater(150)}><Text style={styles.addValue}>+150 ml</Text><Text style={styles.addLabel}>COPO PEQUENO</Text></Pressable>
          <Pressable style={styles.addButton} onPress={() => addWater(250)}><Text style={styles.addValue}>+250 ml</Text><Text style={styles.addLabel}>COPO</Text></Pressable>
          <Pressable style={styles.addButton} onPress={() => addWater(500)}><Text style={styles.addValue}>+500 ml</Text><Text style={styles.addLabel}>GARRAFA</Text></Pressable>
        </View>
        <Pressable style={styles.undo} onPress={() => addWater(-Math.min(250, amount))}><Text style={styles.undoText}>DESFAZER 250 ML</Text></Pressable>
      </View>
      <View style={styles.setting}>
        <View style={styles.settingIcon}><Ionicons name="notifications-outline" color={theme.lime} size={21} /></View>
        <View style={{ flex: 1 }}><Text style={styles.settingTitle}>Lembretes de água</Text><Text style={styles.settingSub}>Notificação a cada 2 horas</Text></View>
        <Switch value={reminders} onValueChange={toggleReminders} trackColor={{ false: '#303A3A', true: '#647D2A' }} thumbColor={reminders ? theme.lime : '#9AA3A0'} />
      </View>
      <Text style={styles.note}>A meta exibida é ilustrativa. A necessidade de água varia conforme a pessoa, clima, alimentação e atividade física. Ajuste sua meta com orientação profissional quando necessário.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 22, paddingBottom: 40, gap: 16 },
  kicker: { color: theme.lime, fontSize: 9, letterSpacing: 1.8, fontWeight: '900', marginTop: 7 },
  title: { color: theme.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.2, marginTop: -7 },
  subtitle: { color: theme.muted, fontSize: 11, lineHeight: 18, marginTop: -8 },
  waterCard: { backgroundColor: theme.surface, borderRadius: 24, borderWidth: 1, borderColor: theme.border, padding: 22, alignItems: 'center', marginTop: 6 },
  waterIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: '#202A1A', alignItems: 'center', justifyContent: 'center' },
  amount: { color: theme.text, fontSize: 52, fontWeight: '900', letterSpacing: -2, marginTop: 13 },
  unit: { color: theme.lime, fontSize: 19 },
  goal: { color: theme.muted, fontSize: 8, letterSpacing: 1.2, fontWeight: '800', marginTop: 4 },
  track: { height: 9, width: '100%', borderRadius: 9, backgroundColor: '#29312E', overflow: 'hidden', marginTop: 24 },
  fill: { height: '100%', borderRadius: 9, backgroundColor: theme.lime },
  percent: { color: theme.lime, fontSize: 10, fontWeight: '800', marginTop: 9 },
  addButtons: { flexDirection: 'row', gap: 8, width: '100%', marginTop: 25 },
  addButton: { flex: 1, borderRadius: 13, backgroundColor: theme.surface2, paddingVertical: 13, alignItems: 'center' },
  addValue: { color: theme.text, fontSize: 12, fontWeight: '900' },
  addLabel: { color: theme.muted, fontSize: 7, letterSpacing: .5, marginTop: 5 },
  undo: { padding: 10, marginTop: 8 },
  undoText: { color: theme.muted, fontSize: 8, letterSpacing: 1, fontWeight: '800' },
  setting: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 17, padding: 15 },
  settingIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#202A1A', alignItems: 'center', justifyContent: 'center' },
  settingTitle: { color: theme.text, fontSize: 11, fontWeight: '800' },
  settingSub: { color: theme.muted, fontSize: 9, marginTop: 4 },
  note: { color: '#77817F', fontSize: 9, lineHeight: 15 }
});