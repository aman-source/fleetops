import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glyph } from '../../src/components/ui/glyph';
import { colors } from '../../src/theme/colors';
import { fonts, type as typ } from '../../src/theme/typography';
import { spacing } from '../../src/theme/tokens';

const NOTIFS = [
  { id: '1', type: 'check', color: colors.go, title: 'Trip approved', body: 'Your request Muscat → Marmul on 14 May has been approved.', time: '2 min ago', read: false },
  { id: '2', type: 'users', color: colors.info, title: 'Pooled with 2 others', body: 'H. Al-Lawati and F. Al-Amri will share your shuttle. ETA savings: 18 min.', time: '15 min ago', read: false },
  { id: '3', type: 'truck', color: colors.ink0, title: 'Driver assigned', body: 'Daoud A. (Toyota Coaster, 34-D-1129) will pick you up at 06:00.', time: '1h ago', read: true },
  { id: '4', type: 'flag', color: colors.neutral, title: 'Trip completed', body: 'Your trip Marmul → Muscat on 13 May has been marked completed.', time: 'Yesterday', read: true },
  { id: '5', type: 'bell', color: colors.cond, title: 'Upcoming trip tomorrow', body: 'Muscat HQ → Marmul Camp departing 06:00. Be at Building 4 lobby by 05:50.', time: '2 days ago', read: true },
];

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <View style={styles.hdr}>
        <Text style={styles.sub}>NOTIFICATIONS</Text>
        <Text style={styles.title}>Inbox</Text>
      </View>

      {NOTIFS.map((n) => (
        <Pressable key={n.id} style={[styles.card, !n.read && styles.cardUnread]}>
          <View style={[styles.iconCircle, { backgroundColor: n.read ? colors.bg3 : `${n.color}18` }]}>
            <Glyph k={n.type} size={16} color={n.read ? colors.ink4 : n.color} />
          </View>
          <View style={styles.notifText}>
            <View style={styles.notifHdr}>
              <Text style={[styles.notifTitle, !n.read && styles.notifTitleBold]}>{n.title}</Text>
              {!n.read && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>
            <Text style={styles.notifTime}>{n.time}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0 },
  content: { padding: spacing.screenH, gap: spacing.sectionGap, paddingBottom: 100 },
  hdr: { gap: 4 },
  sub: { fontFamily: fonts.mono500, fontSize: 11, color: colors.ink3, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { ...typ.title, color: colors.ink0 },
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14 },
  cardUnread: { borderColor: 'rgba(217,119,87,0.3)', backgroundColor: 'rgba(217,119,87,0.04)' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  notifText: { flex: 1, gap: 3 },
  notifHdr: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notifTitle: { fontFamily: fonts.sans500, fontSize: 13, color: colors.ink0 },
  notifTitleBold: { fontFamily: fonts.sans600 },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  notifBody: { fontFamily: fonts.sans400, fontSize: 12, color: colors.ink3, lineHeight: 17 },
  notifTime: { fontFamily: fonts.mono400, fontSize: 10, color: colors.ink4, marginTop: 2 },
});
