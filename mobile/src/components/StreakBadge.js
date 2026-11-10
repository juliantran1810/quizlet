import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StreakBadge({ count = 0, style }) {
  const active = count > 0;
  return (
    <View style={[styles.container, active ? styles.activeContainer : styles.inactiveContainer, style]}>
      <Text style={styles.icon}>🔥</Text>
      <Text style={[styles.text, active ? styles.activeText : styles.inactiveText]}>
        {count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 22,
    borderWidth: 1.5,
    borderBottomWidth: 3,
  },
  activeContainer: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderBottomColor: '#FB923C',
  },
  inactiveContainer: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderBottomColor: '#CBD5E1',
  },
  icon: {
    fontSize: 15,
    marginRight: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: '800',
  },
  activeText: {
    color: '#EA580C',
  },
  inactiveText: {
    color: '#94A3B8',
  },
});

