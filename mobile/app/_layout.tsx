import '../src/location-task';
import { Stack, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { theme } from '../src/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.bg },
          tabBarStyle: {
            backgroundColor: '#101516',
            borderTopColor: theme.border,
            height: 76,
            paddingTop: 9,
            paddingBottom: 10
          },
          tabBarActiveTintColor: theme.lime,
          tabBarInactiveTintColor: theme.muted,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '700' }
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Hoje', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }} />
        <Tabs.Screen name="workouts" options={{ title: 'Treinos', tabBarIcon: ({ color, size }) => <Ionicons name="barbell" color={color} size={size} /> }} />
        <Tabs.Screen name="activity" options={{ title: 'GPS', tabBarIcon: ({ color, size }) => <Ionicons name="navigate" color={color} size={size} /> }} />
        <Tabs.Screen name="hydration" options={{ title: 'Água', tabBarIcon: ({ color, size }) => <Ionicons name="water" color={color} size={size} /> }} />
        <Tabs.Screen name="progress" options={{ title: 'Evolução', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size} /> }} />
      </Tabs>
    </>
  );
}