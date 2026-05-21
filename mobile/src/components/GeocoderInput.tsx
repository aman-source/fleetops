import { useState, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii } from '../theme/tokens';

export interface GeoResult {
  name: string;
  fullAddress: string;
  lat: number;
  lon: number;
}

interface Props {
  placeholder?: string;
  onSelect: (r: GeoResult) => void;
  proximityLon?: number;
  proximityLat?: number;
  label?: string;
}

export function GeocoderInput({
  placeholder = 'Search location\u2026',
  onSelect,
  proximityLon,
  proximityLat,
  label,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { q: val };
        if (proximityLon != null) params.lon = String(proximityLon);
        if (proximityLat != null) params.lat = String(proximityLat);
        const qs = new URLSearchParams(params).toString();
        const res = await api.get<{ data: GeoResult[] }>(`/mapbox/geocode?${qs}`);
        setResults(res.data?.data ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleSelect(r: GeoResult) {
    setQuery(r.fullAddress);
    setResults([]);
    onSelect(r);
  }

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          value={query}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.ink4}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading ? <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} /> : null}
      </View>
      {results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(_, i) => String(i)}
          style={styles.dropdown}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => handleSelect(item)}
              style={[styles.resultItem, index < results.length - 1 && styles.resultBorder]}
            >
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultAddress} numberOfLines={1}>
                {item.fullAddress}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.mono500,
    fontSize: 10,
    color: colors.ink3,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontFamily: fonts.sans400,
    fontSize: 14,
    color: colors.ink0,
  },
  spinner: { marginLeft: 8 },
  dropdown: {
    backgroundColor: colors.bg1,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 4,
    maxHeight: 200,
  },
  resultItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  resultName: {
    fontFamily: fonts.sans500,
    fontSize: 13,
    color: colors.ink0,
  },
  resultAddress: {
    fontFamily: fonts.mono400,
    fontSize: 11,
    color: colors.ink3,
    marginTop: 2,
  },
});
