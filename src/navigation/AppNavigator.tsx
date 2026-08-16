// 🧭 ENTERPRISE NAVIGATION SYSTEM
// Type-safe navigation, authentication guards, deep linking

import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Stores
import { useAuth } from '../store/authStore';
import { locationService } from '../services/location/LocationService';
import { realtimeService } from '../services/realtime/RealtimeService';
import { pushNotificationService } from '../services/notifications/PushNotificationService';
import { useDashboardStore } from '../store/dashboardStore';
import { useEmployeeDashboardStore } from '../store/employeeDashboardStore';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import ConsentScreen, { CONSENT_STORAGE_KEY } from '../screens/legal/ConsentScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import EmployeeDashboardScreen from '../screens/dashboard/EmployeeDashboardScreen';
import BuildingsScreen from '../screens/buildings/BuildingsScreen';
import BuildingDetailScreen from '../screens/buildings/BuildingDetailScreen';
import BuildingCreateScreen from '../screens/buildings/BuildingCreateScreen';
import BuildingEditScreen from '../screens/buildings/BuildingEditScreen';
import DepotScreen from '../screens/depot/DepotScreen';
import ProductDetailScreen from '../screens/depot/ProductDetailScreen';
import ProductCreateScreen, { ProductEditScreen } from '../screens/depot/ProductFormScreens';
import LocationMapScreen from '../screens/location/LocationMapScreen';
import QuotationsScreen from '../screens/parity/QuotationsScreen';
import QuotationDetailScreen from '../screens/parity/QuotationDetailScreen';
import ReportsHubScreen from '../screens/parity/ReportsHubScreen';
import RoutePlannerScreen from '../screens/parity/RoutePlannerScreen';
import BulkMaintenanceScreen from '../screens/parity/BulkMaintenanceScreen';
import ChecksScreen from '../screens/parity/ChecksScreen';
import HrFleetScreen from '../screens/parity/HrFleetScreen';
import ComplianceListScreen from '../screens/parity/ComplianceListScreen';
import GuideScreen from '../screens/parity/GuideScreen';
import ChecklistSettingsScreen from '../screens/parity/ChecklistSettingsScreen';
import EmployeesScreen from '../screens/employees/EmployeesScreen';
import EmployeeDetailScreen from '../screens/employees/EmployeeDetailScreen';
import MaintenanceScreen from '../screens/maintenance/MaintenanceScreen';
import MaintenanceDetailScreen from '../screens/maintenance/MaintenanceDetailScreen';
import MaintenanceEditScreen from '../screens/maintenance/MaintenanceEditScreen';
import MaintenanceCreateScreen from '../screens/maintenance/MaintenanceCreateScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import FinancialScreen from '../screens/financial/FinancialScreen';
import AccountsScreen from '../screens/financial/AccountsScreen';
import TransactionsScreen from '../screens/financial/TransactionsScreen';
import ReceivablesScreen from '../screens/financial/ReceivablesScreen';
import PayablesScreen from '../screens/financial/PayablesScreen';
import RecurringPaymentsScreen from '../screens/financial/RecurringPaymentsScreen';
import DayEndScreen from '../screens/financial/DayEndScreen';
import UnifiedTransactionsScreen from '../screens/financial/UnifiedTransactionsScreen';
import TodayJobsScreen from '../screens/location/TodayJobsScreen';
import CreateMaintenanceReportScreen from '../screens/maintenance/CreateMaintenanceReportScreen';
import MaintenanceReportDetailScreen from '../screens/maintenance/MaintenanceReportDetailScreen';
import QRScannerScreen from '../screens/qr/QRScannerScreen';
import ActiveJobScreen from '../screens/maintenance/ActiveJobScreen';
import IssuesScreen from '../screens/issues/IssuesScreen';
import IssueDetailScreen from '../screens/issues/IssueDetailScreen';
import IssueCreateScreen from '../screens/issues/IssueCreateScreen';
import CompanyProfileScreen from '../screens/company/CompanyProfileScreen';
import ElevatorLabelsScreen from '../screens/elevator-labels/ElevatorLabelsScreen';
import ElevatorLabelDetailScreen from '../screens/elevator-labels/ElevatorLabelDetailScreen';
import KvkkScreen from '../screens/legal/KvkkScreen';

// Types
import { RootStackParamList } from '../types';
import { COLORS } from '../constants';

const Stack = createNativeStackNavigator<RootStackParamList>();

// ==================== LOADING COMPONENT ====================
const LoadingScreen: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary[50] }}>
    <ActivityIndicator size="large" color={COLORS.primary[500]} />
  </View>
);

// ==================== ROOT NAVIGATOR ====================
interface RootNavigatorProps {
  consentAccepted: boolean;
}

const RootNavigator: React.FC<RootNavigatorProps> = ({ consentAccepted }) => {
  const { isAuthenticated, isEmployee } = useAuth();

  let initialRouteName: keyof RootStackParamList;
  if (!consentAccepted) {
    initialRouteName = 'Consent';
  } else if (isAuthenticated) {
    initialRouteName = isEmployee ? 'EmployeeDashboard' : 'Main';
  } else {
    initialRouteName = 'Login';
  }

  try {
    return (
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.primary[600] },
          headerTintColor: 'white',
          headerTitleStyle: { fontWeight: 'bold' },
          gestureEnabled: false,
        }}
      >
        <Stack.Screen
          name="Consent"
          component={ConsentScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="Kvkk"
          component={KvkkScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Main"
          component={DashboardScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="EmployeeDashboard"
          component={EmployeeDashboardScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="Buildings" component={BuildingsScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="BuildingDetail"
          component={BuildingDetailScreen}
          options={{ headerShown: true, title: 'Bina Detayı', headerBackTitle: 'Geri' }}
        />
        <Stack.Screen
          name="BuildingCreate"
          component={BuildingCreateScreen}
          options={{ headerShown: true, title: 'Yeni Bina Ekle', headerBackTitle: 'Geri' }}
        />
        <Stack.Screen
          name="BuildingEdit"
          component={BuildingEditScreen}
          options={{ headerShown: true, title: 'Binayı Düzenle', headerBackTitle: 'Geri' }}
        />
        <Stack.Screen name="Depot" component={DepotScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{ headerShown: true, title: 'Ürün Detayı', headerBackTitle: 'Geri' }}
        />
        <Stack.Screen
          name="ProductCreate"
          component={ProductCreateScreen}
          options={{ headerShown: true, title: 'Yeni Ürün', headerBackTitle: 'Geri' }}
        />
        <Stack.Screen
          name="ProductEdit"
          component={ProductEditScreen}
          options={{ headerShown: true, title: 'Ürünü Düzenle', headerBackTitle: 'Geri' }}
        />
        <Stack.Screen name="Quotations" component={QuotationsScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="QuotationDetail"
          component={QuotationDetailScreen}
          options={{ headerShown: true, title: 'Teklif Detayı', headerBackTitle: 'Geri' }}
        />
        <Stack.Screen name="ReportsHub" component={ReportsHubScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LocationMap" component={LocationMapScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RoutePlanner" component={RoutePlannerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BulkMaintenance" component={BulkMaintenanceScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Checks" component={ChecksScreen} options={{ headerShown: false }} />
        <Stack.Screen name="HrFleet" component={HrFleetScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="ComplianceList"
          component={ComplianceListScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Guide" component={GuideScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ChecklistSettings" component={ChecklistSettingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Employees" component={EmployeesScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="EmployeeDetail"
          component={EmployeeDetailScreen}
          options={{ headerShown: true, title: 'Personel Detayı', headerBackTitle: 'Geri' }}
        />
        <Stack.Screen name="Maintenance" component={MaintenanceScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MaintenanceDetail" component={MaintenanceDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MaintenanceEdit" component={MaintenanceEditScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MaintenanceCreate" component={MaintenanceCreateScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ActiveJob" component={ActiveJobScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CreateMaintenanceReport" component={CreateMaintenanceReportScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MaintenanceReportDetail" component={MaintenanceReportDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Financial" component={FinancialScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Accounts" component={AccountsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Receivables" component={ReceivablesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Payables" component={PayablesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RecurringPayments" component={RecurringPaymentsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DayEnd" component={DayEndScreen} options={{ headerShown: false }} />
        <Stack.Screen name="UnifiedTransactions" component={UnifiedTransactionsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TodayJobs" component={TodayJobsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Issues" component={IssuesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="IssueDetail" component={IssueDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="IssueCreate" component={IssueCreateScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CompanyProfile" component={CompanyProfileScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ElevatorLabels" component={ElevatorLabelsScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="ElevatorLabelDetail"
          component={ElevatorLabelDetailScreen}
          options={{ headerShown: true, title: 'Etiket Detayı', headerBackTitle: 'Geri' }}
        />
      </Stack.Navigator>
    );
  } catch (error) {
    return (
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }
};

// ==================== MAIN APP NAVIGATOR ====================
const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuthStatus, isEmployee, setLoading } = useAuth();
  const setupRealtimeUpdates = useDashboardStore((state) => state.setupRealtimeUpdates);
  const setupEmployeeRealtimeUpdates = useEmployeeDashboardStore((state) => state.setupRealtimeUpdates);
  const navigationRef = useNavigationContainerRef();
  const prevAuthState = useRef<{ isAuthenticated: boolean; isEmployee: boolean } | null>(null);

  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentLoaded, setConsentLoaded] = useState(false);

  // Consent kontrolü + auth check (ilk mount'ta)
  useEffect(() => {
    const initialize = async () => {
      try {
        const val = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
        setConsentAccepted(val === 'true');
      } catch {
        // Hata durumunda consent kabul edilmemiş sayılır
      } finally {
        setConsentLoaded(true);
        setLoading(false);
      }
    };
    initialize();
    checkAuthStatus().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auth state değiştiğinde navigation reset
  useEffect(() => {
    const currentAuthState = { isAuthenticated, isEmployee };

    if (prevAuthState.current === null) {
      prevAuthState.current = currentAuthState;
    } else if (
      prevAuthState.current.isAuthenticated !== isAuthenticated ||
      prevAuthState.current.isEmployee !== isEmployee
    ) {
      if (navigationRef.isReady()) {
        const targetRoute = isAuthenticated
          ? (isEmployee ? 'EmployeeDashboard' : 'Main')
          : 'Login';

        navigationRef.reset({
          index: 0,
          routes: [{ name: targetRoute as keyof RootStackParamList }],
        });
      }
      prevAuthState.current = currentAuthState;
    }
  }, [isAuthenticated, isEmployee, navigationRef]);

  // Realtime updates ve push notifications
  useEffect(() => {
    if (isAuthenticated) {
      let cleanupRealtimeUpdates: (() => void) | undefined;
      let unsubscribeNotificationCreated: (() => void) | undefined;

      const initializeRealtime = async () => {
        try {
          await pushNotificationService.initialize();
          await realtimeService.initialize();

          unsubscribeNotificationCreated = realtimeService.on('notification.created', (event) => {
            if (event.data) {
              pushNotificationService.setBadgeCount(event.data.unread_count || 0);
            }
          });

          cleanupRealtimeUpdates = isEmployee
            ? setupEmployeeRealtimeUpdates()
            : setupRealtimeUpdates();
        } catch (error) {
          console.error('❌ Failed to initialize real-time updates:', error);
        }
      };

      const timer = setTimeout(() => { initializeRealtime(); }, 1000);

      return () => {
        clearTimeout(timer);
        cleanupRealtimeUpdates?.();
        unsubscribeNotificationCreated?.();
        realtimeService.disconnect();
        pushNotificationService.cleanup();
      };
    } else {
      realtimeService.disconnect();
      pushNotificationService.cleanup();
      pushNotificationService.clearBadge();
    }
  }, [isAuthenticated, isEmployee, setupRealtimeUpdates, setupEmployeeRealtimeUpdates]);

  // Konum takibini durdur (logout)
  useEffect(() => {
    if (!isAuthenticated) {
      locationService.stopTracking();
    }
  }, [isAuthenticated]);

  if (isLoading || !consentLoaded) {
    return <LoadingScreen />;
  }

  try {
    return (
      <NavigationContainer ref={navigationRef}>
        <RootNavigator consentAccepted={consentAccepted} />
      </NavigationContainer>
    );
  } catch (error) {
    console.error('❌ AppNavigator: NavigationContainer error:', error);
    return <LoadingScreen />;
  }
};

export default AppNavigator;
