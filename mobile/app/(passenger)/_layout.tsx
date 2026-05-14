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
        tabBarInactiveTintColor: colors.ink4,
        tabBarStyle: {
          backgroundColor: colors.bg0,
          borderTopColor: colors.line,
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
        tabBarIcon: ({ color }) => <Glyph k="pin" size={22} color={color} />,
      }} />
      <Tabs.Screen name="trips" options={{
        title: 'My Trips',
        tabBarIcon: ({ color }) => <Glyph k="route" size={22} color={color} />,
      }} />
      <Tabs.Screen name="my-trip" options={{ href: null }} />
      <Tabs.Screen name="inbox" options={{
        title: 'Inbox',
        tabBarIcon: ({ color }) => <Glyph k="inbox" size={22} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Me',
        tabBarIcon: ({ color }) => <Glyph k="user" size={22} color={color} />,
      }} />
    </Tabs>
  );
}
