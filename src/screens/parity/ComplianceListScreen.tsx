import React, { useCallback } from 'react';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import ResourceListScreen from './ResourceListScreen';
import { API_ENDPOINTS } from '../../constants';
import { RootStackParamList } from '../../types';

const ComplianceListScreen: React.FC = () => {
  const { documentType, title } = useRoute<RouteProp<RootStackParamList, 'ComplianceList'>>().params;
  const mapItem = useCallback((raw: any) => ({
    id: raw.id,
    title: raw.building_name || raw.document_type_label || `#${raw.id}`,
    subtitle: [raw.event_date, raw.inspector_or_technician_name, raw.description].filter(Boolean).join(' · '),
    badge: raw.status_label,
  }), []);

  return (
    <ResourceListScreen
      title={title}
      endpoint={`${API_ENDPOINTS.COMPLIANCE}?type=${documentType}`}
      mapItem={mapItem}
      emptyTitle="Kayıt yok"
      emptySubtitle="Bu belgeler web panelinden oluşturulur."
    />
  );
};

export default ComplianceListScreen;
