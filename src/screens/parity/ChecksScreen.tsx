import React, { useCallback } from 'react';
import ResourceListScreen from './ResourceListScreen';
import { API_ENDPOINTS } from '../../constants';

const ChecksScreen: React.FC = () => {
  const mapItem = useCallback((raw: any) => ({
    id: raw.id,
    title: raw.counterparty_name || `${raw.type_label} #${raw.id}`,
    subtitle: [raw.type_label, raw.direction_label, raw.due_date, raw.bank_name].filter(Boolean).join(' · '),
    amount: raw.amount,
    badge: raw.status_label,
  }), []);

  return (
    <ResourceListScreen
      title="Çek & Senet"
      endpoint={API_ENDPOINTS.CHECKS}
      mapItem={mapItem}
      emptyTitle="Kayıt yok"
      emptySubtitle="Çek ve senet kayıtları web panelinden eklenir."
    />
  );
};

export default ChecksScreen;
