import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors} from '../../theme';

export type IconName =
  | 'home'
  | 'search'
  | 'messages'
  | 'profile'
  | 'listings'
  | 'inquiries'
  | 'notifications'
  | 'publish'
  | 'menu'
  | 'back'
  | 'location'
  | 'bed'
  | 'bath'
  | 'area'
  | 'price'
  | 'filter'
  | 'image'
  | 'check'
  | 'alert'
  | 'info'
  | 'confirm'
  | 'close'
  | 'heart'
  | 'myLocation'
  | 'guide'
  | 'share'
  | 'eye'
  | 'video'
  | 'play'
  | 'send'
  | 'shield'
  | 'phone'
  | 'calendar'
  | 'camera'
  | 'attach';

type Glyph = {outline: string; filled?: string};

const ICONS: Record<IconName, Glyph> = {
  home: {outline: 'map-outline', filled: 'map'},
  search: {outline: 'magnify'},
  messages: {outline: 'message-outline', filled: 'message'},
  profile: {outline: 'account-circle-outline', filled: 'account-circle'},
  listings: {outline: 'home-city-outline', filled: 'home-city'},
  inquiries: {outline: 'email-outline', filled: 'email'},
  notifications: {outline: 'bell-outline', filled: 'bell'},
  publish: {outline: 'plus-circle-outline', filled: 'plus-circle'},
  menu: {outline: 'menu'},
  back: {outline: 'arrow-left'},
  location: {outline: 'map-marker-outline', filled: 'map-marker'},
  bed: {outline: 'bed-king-outline', filled: 'bed-king'},
  bath: {outline: 'bathtub-outline', filled: 'bathtub'},
  area: {outline: 'floor-plan'},
  price: {outline: 'cash'},
  filter: {outline: 'tune-variant'},
  image: {outline: 'image-outline', filled: 'image'},
  check: {outline: 'check-circle-outline', filled: 'check-circle'},
  alert: {outline: 'alert-circle-outline', filled: 'alert-circle'},
  info: {outline: 'information-outline', filled: 'information'},
  confirm: {outline: 'help-circle-outline', filled: 'help-circle'},
  close: {outline: 'close'},
  heart: {outline: 'heart-outline', filled: 'heart'},
  myLocation: {outline: 'crosshairs-gps', filled: 'crosshairs-gps'},
  guide: {outline: 'robot-outline', filled: 'robot'},
  share: {outline: 'share-variant-outline', filled: 'share-variant'},
  eye: {outline: 'eye-outline', filled: 'eye'},
  video: {outline: 'play-box-outline', filled: 'play-box'},
  play: {outline: 'play-circle-outline', filled: 'play-circle'},
  send: {outline: 'send', filled: 'send'},
  shield: {outline: 'shield-check-outline', filled: 'shield-check'},
  phone: {outline: 'phone-outline', filled: 'phone'},
  calendar: {outline: 'calendar-month-outline', filled: 'calendar-month'},
  camera: {outline: 'camera-outline', filled: 'camera'},
  attach: {outline: 'paperclip'},
};

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
  /** Show rounded background chip (menu items, FAB) */
  boxed?: boolean;
  style?: ViewStyle;
}

export function AppIcon({
  name,
  size = 22,
  color = colors.text,
  filled = false,
  boxed = false,
  style,
}: Props) {
  const glyph = filled && ICONS[name].filled ? ICONS[name].filled : ICONS[name].outline;
  const iconColor = filled && boxed ? colors.white : color;

  const icon = (
    <MaterialCommunityIcons
      name={glyph}
      size={size}
      color={iconColor}
      style={styles.glyph}
    />
  );

  if (!boxed) {
    return (
      <View style={[styles.plain, {width: size + 4, height: size + 4}, style]}>
        {icon}
      </View>
    );
  }

  const pad = Math.max(6, Math.round(size * 0.28));
  const box = size + pad * 2;

  return (
    <View
      style={[
        styles.boxed,
        {
          width: box,
          height: box,
          borderRadius: box / 3.5,
          backgroundColor: filled ? colors.accent : colors.surfaceAlt,
          borderColor: filled ? colors.accent : colors.border,
        },
        style,
      ]}>
      {icon}
    </View>
  );
}

const styles = StyleSheet.create({
  plain: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxed: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  glyph: {
    textAlign: 'center',
  },
});
