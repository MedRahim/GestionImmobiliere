import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppText} from './ui/AppText';
import {AvailabilityRange} from '../types';
import {colors, radius, shadow} from '../theme';

interface Props {
  ranges: AvailabilityRange[];
  selectable?: boolean;
  selectedDays?: string[];
  onToggleDay?: (dayKey: string) => void;
}

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayKey() {
  return toDateKey(new Date());
}

function dayStatus(
  day: Date,
  ranges: AvailabilityRange[],
): AvailabilityRange['status'] | null {
  const key = toDateKey(day);
  let found: AvailabilityRange['status'] | null = null;
  for (const range of ranges) {
    const start = String(range.startDate).slice(0, 10);
    const end = String(range.endDate).slice(0, 10);
    if (key < start || key > end) continue;
    if (range.status === 'booked') return 'booked';
    if (range.status === 'blocked') found = 'blocked';
    else if (range.status === 'available' && found !== 'blocked') found = 'available';
  }
  return found;
}

function isSelectableDay(day: Date, ranges: AvailabilityRange[]) {
  if (toDateKey(day) < todayKey()) return false;
  return dayStatus(day, ranges) === 'available';
}

export function AvailabilityCalendar({
  ranges,
  selectable = false,
  selectedDays = [],
  onToggleDay,
}: Props) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const selectedSet = useMemo(() => new Set(selectedDays), [selectedDays]);
  const today = todayKey();

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leading = (firstDow + 6) % 7;
    const list: ({day: number; date: Date} | null)[] = [];
    for (let i = 0; i < leading; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      list.push({day: d, date: new Date(year, month, d)});
    }
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [cursor]);

  const title = cursor.toLocaleDateString('fr-FR', {month: 'long', year: 'numeric'});

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          }
          style={styles.navBtn}
          hitSlop={8}>
          <AppText variant="body" weight="bold" color={colors.primary}>
            ‹
          </AppText>
        </Pressable>
        <View style={styles.headerCenter}>
          <AppText variant="body" weight="bold" style={styles.title}>
            {title}
          </AppText>
          {selectable ? (
            <AppText variant="caption" color={colors.textMuted}>
              {selectedDays.length === 0
                ? 'Choisissez jour par jour (touchez chaque date)'
                : `${selectedDays.length} jour${selectedDays.length > 1 ? 's' : ''} choisi${selectedDays.length > 1 ? 's' : ''}`}
            </AppText>
          ) : null}
        </View>
        <Pressable
          onPress={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          }
          style={styles.navBtn}
          hitSlop={8}>
          <AppText variant="body" weight="bold" color={colors.primary}>
            ›
          </AppText>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
          <AppText key={d} variant="caption" color={colors.textMuted} style={styles.week}>
            {d}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, idx) => {
          if (!cell) return <View key={`e-${idx}`} style={styles.cellSlot} />;
          const key = toDateKey(cell.date);
          const past = key < today;
          const isToday = key === today;
          const status = past ? null : dayStatus(cell.date, ranges);
          const selected = !past && selectedSet.has(key);
          const canTap = selectable && isSelectableDay(cell.date, ranges);

          return (
            <View key={key} style={styles.cellSlot}>
              <Pressable
                disabled={!selectable || !canTap}
                onPress={() => onToggleDay?.(key)}
                style={[
                  styles.cell,
                  past && styles.past,
                  !past && status === 'available' && styles.available,
                  !past && status === 'blocked' && styles.blocked,
                  !past && status === 'booked' && styles.booked,
                  selected && styles.selected,
                  isToday && !selected && !past && styles.todayRing,
                ]}>
                <AppText
                  variant="caption"
                  weight={selected || isToday ? 'bold' : undefined}
                  color={
                    past
                      ? '#9AA5AD'
                      : selected
                        ? colors.white
                        : status
                          ? colors.white
                          : colors.text
                  }>
                  {cell.day}
                </AppText>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <Legend color="#C5CED4" label="Passé" />
        <Legend color={colors.success} label="Libre" />
        <Legend color={colors.warning} label="Réservé" />
        <Legend color={colors.error} label="Bloqué" />
        {selectable ? <Legend color={colors.accent} label="Choisi" /> : null}
      </View>
    </View>
  );
}

function Legend({color, label}: {color: string; label: string}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, {backgroundColor: color}]} />
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerCenter: {flex: 1, alignItems: 'center'},
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {textTransform: 'capitalize', letterSpacing: 0.2},
  weekRow: {flexDirection: 'row', marginBottom: 8},
  week: {flex: 1, textAlign: 'center', fontSize: 11},
  grid: {flexDirection: 'row', flexWrap: 'wrap'},
  cellSlot: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    padding: 3,
  },
  cell: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  past: {
    backgroundColor: '#E8ECEF',
  },
  available: {backgroundColor: '#2BBBAD'},
  blocked: {backgroundColor: '#E57373'},
  booked: {backgroundColor: '#F0A04B'},
  selected: {
    backgroundColor: colors.accent,
    ...shadow.float,
  },
  todayRing: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
  dot: {width: 8, height: 8, borderRadius: 4},
});
