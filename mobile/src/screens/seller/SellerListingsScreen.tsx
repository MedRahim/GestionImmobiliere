import React, {useCallback, useState} from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {propertiesApi} from '../../api/properties';
import {useAppAlert} from '../../context/AlertContext';
import {PropertyCard} from '../../components/PropertyCard';
import {EmptyState} from '../../components/EmptyState';
import {LoadingView} from '../../components/LoadingView';
import {Button} from '../../components/ui/Button';
import {ScreenShell} from '../../components/ScreenShell';
import {Property} from '../../types';
import {colors} from '../../theme';
import {MainStackParamList} from '../../navigation/types';

export function SellerListingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {alert} = useAppAlert();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await propertiesApi.getMine();
      setProperties(res.data || res.properties || []);
    } catch (err: any) {
      setProperties([]);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Impossible de charger vos annonces.';
      alert('Erreur', String(msg));
    }
  }, [alert]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const onDelete = (property: Property) => {
    const id = property.id || property.propertyId;
    if (!id) {
      alert('Erreur', 'Identifiant du bien manquant.');
      return;
    }
    alert('Supprimer', `Supprimer "${property.title}" ?`, [
      {text: 'Annuler', style: 'cancel'},
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await propertiesApi.delete(id);
            setProperties(prev =>
              prev.filter(p => (p.id || p.propertyId) !== id),
            );
          } catch (err: any) {
            const msg =
              err?.response?.data?.message ||
              err?.message ||
              'Impossible de supprimer cette annonce.';
            alert('Erreur', String(msg));
          }
        },
      },
    ], 'confirm');
  };

  if (loading) {
    return (
      <ScreenShell title="Mes annonces" subtitle="Vos biens" showBack>
        <LoadingView />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Mes annonces"
      subtitle={`${properties.length} bien(s) publié(s)`}
      showBack>
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          title="+ Publier une annonce"
          onPress={() => navigation.navigate('AddProperty')}
          style={styles.addBtn}
        />
      </View>

      <FlatList
        data={properties}
        keyExtractor={item => String(item.id || item.propertyId)}
        renderItem={({item}) => (
          <View>
            <PropertyCard
              property={item}
              showStatus
              showStats
              onPress={() =>
                navigation.navigate('PropertyDetail', {
                  propertyId: item.id || item.propertyId,
                  property: item,
                })
              }
            />
            <View style={styles.actions}>
              <Pressable
                style={styles.actionBtn}
                onPress={() =>
                  navigation.navigate('AddProperty', {
                    property: item,
                    editMode: true,
                  })
                }>
                <Text style={styles.actionText}>Modifier</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => onDelete(item)}>
                <Text style={[styles.actionText, styles.deleteText]}>Supprimer</Text>
              </Pressable>
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }} />
        }
        ListEmptyComponent={
          <EmptyState message="Aucune annonce. Publiez votre premier bien !" />
        }
        contentContainerStyle={properties.length === 0 ? styles.empty : styles.list}
      />
    </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {padding: 16, paddingBottom: 8},
  addBtn: {paddingVertical: 12},
  list: {paddingHorizontal: 16, paddingBottom: 24},
  empty: {flexGrow: 1},
  actions: {flexDirection: 'row', gap: 10, marginTop: -8, marginBottom: 16, paddingHorizontal: 4},
  actionBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  deleteBtn: {backgroundColor: colors.errorSoft},
  actionText: {fontWeight: '600', color: colors.primary, fontSize: 13},
  deleteText: {color: colors.error},
});
