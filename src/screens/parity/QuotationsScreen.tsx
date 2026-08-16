import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ResourceListScreen from './ResourceListScreen';
import { API_ENDPOINTS } from '../../constants';
import { RootStackParamList } from '../../types';

const QuotationsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const mapItem = useCallback((raw: any) => ({
    id: raw.id,
    title: raw.quote_no || `Teklif #${raw.id}`,
    subtitle: [raw.customer_name, raw.building_name, raw.type_label].filter(Boolean).join(' · '),
    amount: raw.grand_total,
    badge: raw.status_label,
  }), []);

  return (
    <ResourceListScreen
      title="Teklifler"
      endpoint={API_ENDPOINTS.QUOTATIONS}
      mapItem={mapItem}
      emptyTitle="Teklif yok"
      emptySubtitle="Web panelinden yeni teklif oluşturabilirsiniz."
      onPressItem={(item) => navigation.navigate('QuotationDetail', { quotationId: item.id })}
    />
  );
};

export default QuotationsScreen;
