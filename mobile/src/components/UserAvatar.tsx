import React, {useState} from 'react';
import {Image, StyleSheet, View, ViewStyle} from 'react-native';
import {User} from '../types';
import {AppText} from './ui/AppText';
import {colors} from '../theme';
import {resolveMediaUrl} from '../utils/propertyImage';

interface Props {
  user?: Pick<User, 'firstName' | 'lastName' | 'profileImage'> | null;
  size?: number;
  style?: ViewStyle;
  active?: boolean;
}

export function UserAvatar({user, size = 28, style, active}: Props) {
  const [failed, setFailed] = useState(false);
  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '?'
    : '?';

  const ring = active ? {borderWidth: 2, borderColor: colors.accent} : undefined;
  const uri = resolveMediaUrl(user?.profileImage);

  if (uri && !failed) {
    return (
      <Image
        source={{uri}}
        onError={() => setFailed(true)}
        style={[
          styles.img,
          {width: size, height: size, borderRadius: size / 2},
          ring,
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {width: size, height: size, borderRadius: size / 2},
        ring,
        style,
      ]}>
      <AppText
        variant="caption"
        color={colors.white}
        weight="bold"
        style={{fontSize: Math.max(10, size * 0.38)}}>
        {initials}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  img: {
    backgroundColor: colors.border,
  },
  fallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
