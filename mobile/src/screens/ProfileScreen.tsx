import React, {useEffect, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuth} from '../context/AuthContext';
import {useLanguage} from '../context/LanguageContext';
import {useAppAlert} from '../context/AlertContext';
import {authApi} from '../api/auth';
import {uploadApi} from '../api/upload';
import {GuestPrompt} from '../components/GuestPrompt';
import {ProfilePhotoPicker} from '../components/ProfilePhotoPicker';
import {UserAvatar} from '../components/UserAvatar';
import {Button} from '../components/ui/Button';
import {Input} from '../components/ui/Input';
import {AppIcon} from '../components/ui/AppIcon';
import {AppText} from '../components/ui/AppText';
import {ScreenShell} from '../components/ScreenShell';
import {isLocalImageUri} from '../utils/imageUri';
import {LOCALES} from '../i18n/translations';
import {MainStackParamList} from '../navigation/types';
import {colors, radius, shadow} from '../theme';

const formatDate = (value: string | undefined, locale: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale === 'ar' ? 'ar-TN' : locale === 'fr' ? 'fr-FR' : locale, {
    month: 'long',
    year: 'numeric',
  });
};

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {user, isGuest, updateUser, logout} = useAuth();
  const {alert} = useAppAlert();
  const {t, locale} = useLanguage();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [photoUri, setPhotoUri] = useState<string | null>(user?.profileImage || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setPhone(user.phone || '');
    setBio(user.bio || '');
    setPhotoUri(user.profileImage || null);
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let profileImage = user?.profileImage;
      if (photoUri && isLocalImageUri(photoUri)) {
        const uploaded = await uploadApi.uploadImage(photoUri);
        profileImage = uploaded.fullUrl;
      } else if (photoUri === null) {
        profileImage = undefined;
      } else if (photoUri) {
        profileImage = photoUri;
      }

      const response = await authApi.updateProfile({
        firstName,
        lastName,
        phone,
        bio,
        profileImage,
      });
      updateUser(response.user);
      setPhotoUri(response.user.profileImage || null);
      setEditing(false);
      alert(t('common.success'), t('profile.success'), undefined, 'success');
    } catch (error: any) {
      alert(
        t('common.error'),
        error?.response?.data?.message || t('profile.updateError'),
        undefined,
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    alert(t('profile.logoutTitle'), t('profile.logoutConfirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {text: t('profile.logout'), style: 'destructive', onPress: logout},
    ], 'confirm');
  };

  if (isGuest) {
    return (
      <ScreenShell title={t('profile.title')} subtitle={t('profile.subtitle')} tabScreen>
        <GuestPrompt
          emoji="👤"
          title={t('profile.guest.title')}
          message={t('profile.guest.message')}
        />
      </ScreenShell>
    );
  }

  if (!user) {
    return null;
  }

  const isGoogle = user.authProvider === 'google';
  const displayPhoto = photoUri || user.profileImage;

  return (
    <ScreenShell title={t('profile.title')} subtitle={t('profile.subtitle')} tabScreen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.avatarRing}>
            {editing ? (
              <ProfilePhotoPicker
                imageUri={displayPhoto}
                onChange={setPhotoUri}
                size={96}
                label=""
              />
            ) : displayPhoto ? (
              <UserAvatar user={{...user, profileImage: displayPhoto}} size={96} />
            ) : (
              <UserAvatar user={user} size={96} />
            )}
          </View>
          <AppText variant="h2" style={styles.name}>
            {user.firstName} {user.lastName}
          </AppText>
          <AppText variant="bodySm" color="rgba(255,255,255,0.85)">
            {user.email}
          </AppText>
          <View style={styles.badges}>
            {isGoogle && (
              <View style={[styles.badge, styles.badgeGoogle]}>
                <AppText variant="caption" color={colors.text} weight="bold">
                  Google
                </AppText>
              </View>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard label={t('profile.memberSince')} value={formatDate(user.createdAt, locale)} />
          <StatCard label={t('profile.account')} value={isGoogle ? t('profile.accountGoogle') : t('profile.accountEmail')} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AppText variant="h3">{t('profile.info')}</AppText>
            {!editing && (
              <Pressable style={styles.editChip} onPress={() => setEditing(true)}>
                <AppIcon name="profile" size={16} color={colors.accent} />
                <AppText variant="bodySm" color={colors.accent} weight="bold">
                  {t('profile.edit')}
                </AppText>
              </Pressable>
            )}
          </View>

          {editing ? (
            <>
              <Input label={t('profile.firstName')} value={firstName} onChangeText={setFirstName} />
              <Input label={t('profile.lastName')} value={lastName} onChangeText={setLastName} />
              <Input label={t('profile.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Input
                label={t('profile.bio')}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                style={styles.bioInput}
              />
              <View style={styles.editActions}>
                <Button title={t('profile.cancel')} variant="outline" onPress={() => {
                  setEditing(false);
                  setPhotoUri(user.profileImage || null);
                }} style={styles.actionBtn} />
                <Button
                  title={saving ? t('profile.saving') : t('profile.save')}
                  onPress={handleSave}
                  loading={saving}
                  style={styles.actionBtn}
                />
              </View>
            </>
          ) : (
            <>
              <InfoRow icon="profile" label={t('profile.fullName')} value={`${user.firstName} ${user.lastName}`} />
              <InfoRow icon="messages" label={t('profile.email')} value={user.email} />
              <InfoRow icon="location" label={t('profile.phone')} value={user.phone || t('profile.notSet')} />
              <InfoRow icon="listings" label={t('profile.bio')} value={user.bio || t('profile.noBio')} />
              <Pressable style={styles.langRow} onPress={() => navigation.navigate('Language')}>
                <View style={styles.infoIcon}>
                  <AppIcon name="filter" size={18} color={colors.accent} filled />
                </View>
                <View style={styles.infoText}>
                  <AppText variant="caption" color={colors.textMuted}>
                    {t('profile.language')}
                  </AppText>
                  <AppText variant="body" style={styles.infoValue}>
                    {LOCALES.find(l => l.code === locale)?.label || locale}
                  </AppText>
                </View>
                <AppText variant="bodySm" color={colors.textMuted}>›</AppText>
              </Pressable>
            </>
          )}
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <AppIcon name="back" size={18} color={colors.error} />
          <AppText variant="button" color={colors.error}>
            {t('profile.logout')}
          </AppText>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

function StatCard({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.statCard}>
      <AppText variant="caption" color={colors.textMuted}>{label}</AppText>
      <AppText variant="bodySm" weight="bold" style={styles.statValue}>{value}</AppText>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: 'profile' | 'messages' | 'location' | 'listings';
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoIcon}>
        <AppIcon name={icon} size={18} color={colors.accent} filled />
      </View>
      <View style={styles.infoText}>
        <AppText variant="caption" color={colors.textMuted}>{label}</AppText>
        <AppText variant="body" style={styles.infoValue}>{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {flex: 1, backgroundColor: colors.background},
  content: {paddingBottom: 32},
  hero: {
    backgroundColor: colors.gradientMid,
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    ...shadow.header,
  },
  avatarRing: {marginBottom: 12},
  name: {color: colors.white, marginBottom: 4},
  badges: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center'},
  badge: {backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full},
  badgeGoogle: {backgroundColor: colors.white},
  statsRow: {flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: -18, marginBottom: 8},
  statCard: {flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, ...shadow.card},
  statValue: {marginTop: 4, color: colors.text},
  card: {marginHorizontal: 16, marginTop: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, ...shadow.card},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14},
  editChip: {flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full},
  bioInput: {minHeight: 88, textAlignVertical: 'top'},
  editActions: {flexDirection: 'row', gap: 10, marginTop: 4},
  actionBtn: {flex: 1},
  infoRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14},
  infoRowBorder: {borderBottomWidth: 1, borderBottomColor: colors.border},
  infoIcon: {width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center'},
  infoText: {flex: 1},
  infoValue: {marginTop: 2, color: colors.text},
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: colors.surface,
  },
});
