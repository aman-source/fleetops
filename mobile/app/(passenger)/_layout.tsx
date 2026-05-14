import { Tabs } from 'expo-router';
import { Glyph } from '../../src/components/ui/glyph';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';

export default function PassengerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink0,
        tabBarInactiveTintColor: '#9a9389',
        tabBarStyle: {
          backgroundColor: '#f6f5f1',
          borderTopColor: 'rgba(0,0,0,0.06)',
          borderTopWidth: 1,
          paddingBottom: 28,
          height: 80,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.mono500,
          fontSize: 10,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen name="home" options={{
        title: 'Home',
        tabBarIcon: ({ color }) => <Glyph k="pin" size={20} stroke={1.8} color={color} />,
      }} />
      <Tabs.Screen name="trips" options={{
        title: 'My Trips',
        tabBarIcon: ({ color }) => <Glyph k="route" size={20} stroke={1.8} color={color} />,
      }} />
      <Tabs.Screen name="my-trip" options={{ href: null }} />
      <Tabs.Screen name="inbox" options={{
        title: 'Inbox',
        tabBarIcon: ({ color }) => <Glyph k="inbox" size={20} stroke={1.8} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Me',
        tabBarIcon: ({ color }) => <Glyph k="user" size={20} stroke={1.8} color={color} />,
      }} />
    </Tabs>
  );
}
