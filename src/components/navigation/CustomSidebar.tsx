// 🎨 CUSTOM MODAL SIDEBAR
// Expo Go uyumlu basit sidebar - worklets gerektirmez

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

// Hooks & Services
import { useAuth } from '../../store/authStore';
import { hapticFeedback } from '../../utils';
import { COLORS, DIMENSIONS, APP_CONFIG, API_ENDPOINTS } from '../../constants';
import { apiClient } from '../../services/api/client';

const { width: screenWidth } = Dimensions.get('window');
const SIDEBAR_WIDTH = 280;

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: number;
  color: string;
}

interface CustomSidebarProps {
  visible: boolean;
  onClose: () => void;
}

const CustomSidebar: React.FC<CustomSidebarProps> = ({ visible, onClose }) => {
  // ==================== HOOKS ====================
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { user, logout, isEmployee } = useAuth();
  const [notificationsUnreadCount, setNotificationsUnreadCount] = React.useState(0);

  const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  // ==================== EFFECTS ====================
  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -SIDEBAR_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  // Sidebar açıldığında bildirim okunmamış sayısını API'den al
  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const fetchUnreadCount = async () => {
      try {
        const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT) as { success?: boolean; data?: { total_unread?: number } };
        if (cancelled) return;
        const count = response?.data?.total_unread ?? 0;
        setNotificationsUnreadCount(typeof count === 'number' ? count : 0);
      } catch {
        if (!cancelled) setNotificationsUnreadCount(0);
      }
    };
    fetchUnreadCount();
    return () => { cancelled = true; };
  }, [visible]);

  // ==================== MENU ITEMS ====================
  const menuItems: MenuItem[] = React.useMemo(() => {
    const items: MenuItem[] = [
      {
        id: 'dashboard',
        title: 'Ana Sayfa',
        icon: 'home',
        route: isEmployee ? 'EmployeeDashboard' : 'Main',
        color: COLORS.primary[500],
      },
      {
        id: 'buildings',
        title: 'Binalar',
        icon: 'business',
        route: 'Buildings',
        color: COLORS.success[500],
      },
      {
        id: 'employees',
        title: 'Personel',
        icon: 'people',
        route: 'Employees',
        color: COLORS.warning[500],
      },
      {
        id: 'maintenance',
        title: 'Bakım',
        icon: 'construct',
        route: 'Maintenance',
        color: COLORS.error[500],
      },
      ...(isEmployee ? [] : [{
        id: 'issues',
        title: 'Arıza Bildirimi',
        icon: 'warning',
        route: 'Issues',
        color: COLORS.error[600],
      }]),
      {
        id: 'notifications',
        title: 'Bildirimler',
        icon: 'notifications',
        route: 'Notifications',
        badge: notificationsUnreadCount > 0 ? notificationsUnreadCount : undefined,
        color: COLORS.warning[600],
      },
      // Depo (ürün stokları) sadece admin için - web’deki depo
      ...(isEmployee ? [] : [{
        id: 'depot',
        title: 'Depo',
        icon: 'cube',
        route: 'Depot',
        color: COLORS.primary[500],
      }]),
      // Finansal yönetim sadece admin için
      ...(isEmployee ? [] : [{
        id: 'financial',
        title: 'Finansal Yönetim',
        icon: 'wallet',
        route: 'Financial',
        color: COLORS.success[600],
      }]),
      ...(isEmployee ? [] : [{
        id: 'elevatorLabels',
        title: 'Etiket Takibi',
        icon: 'pricetag',
        route: 'ElevatorLabels',
        color: COLORS.success[600],
      }]),
      ...(isEmployee ? [] : [{
        id: 'companyProfile',
        title: 'Firma Profili',
        icon: 'business',
        route: 'CompanyProfile',
        color: COLORS.gray[700],
      }]),
      {
        id: 'profile',
        title: 'Profil',
        icon: 'person',
        route: 'Profile',
        color: COLORS.primary[600],
      },
    ];

    return items;
  }, [isEmployee, notificationsUnreadCount]);

  // ==================== HANDLERS ====================
  const handleMenuPress = async (item: MenuItem) => {
    await hapticFeedback.light();
    navigation.navigate(item.route);
    onClose();
  };

  const handleLogout = async () => {
    await hapticFeedback.medium();
    onClose();
    await logout();
  };

  // ==================== RENDER ====================
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Overlay */}
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1}
          onPress={onClose}
        />
        
        {/* Sidebar */}
        <Animated.View 
          style={[
            styles.sidebar,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.userSection}>
              <View style={styles.userAvatar}>
                <Text style={styles.userInitials}>
                  {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.name || 'Kullanıcı'}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {user?.email || ''}
                </Text>
                <Text style={styles.userRole} numberOfLines={1}>
                  {isEmployee ? 'Çalışan' : 'Admin'}
                </Text>
                <Text style={styles.companyName} numberOfLines={1}>
                  {user?.company?.name || 'Firma'}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.gray[600]} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>Menü</Text>
              {menuItems.length > 0 ? (
                menuItems
                  .filter(item => {
                    // Finansal menüyü sadece admin için göster
                    if (item.id === 'financial' && isEmployee) {
                      return false;
                    }
                    return true;
                  })
                  .map((item) => {
                const isActive = route.name === item.route;
                
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    onPress={() => handleMenuPress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[
                        styles.menuIcon,
                        isActive && { backgroundColor: `${item.color}20` }
                      ]}>
                        <Ionicons
                          name={item.icon}
                          size={22}
                          color={isActive ? item.color : COLORS.gray[600]}
                        />
                      </View>
                      
                      <Text style={[
                        styles.menuText,
                        isActive && { color: item.color, fontWeight: '600' }
                      ]}>
                        {item.title}
                      </Text>
                      
                      {item.badge && item.badge > 0 && (
                        <View style={[styles.badge, { backgroundColor: COLORS.error[500] }]}>
                          <Text style={styles.badgeText}>
                            {item.badge > 99 ? '99+' : item.badge.toString()}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    {isActive && (
                      <View style={[styles.activeIndicator, { backgroundColor: item.color }]} />
                    )}
                  </TouchableOpacity>
                );
              })              ) : (
                <Text style={styles.emptyMenuText}>Menü öğesi bulunamadı</Text>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.error[500]} />
              <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>
            
            <View style={styles.appInfo}>
              <Text style={styles.appName}>{APP_CONFIG.NAME}</Text>
              <Text style={styles.appVersion}>v{APP_CONFIG.VERSION}</Text>
              <Text style={styles.companyInfo}>{APP_CONFIG.COMPANY}</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: DIMENSIONS.SCREEN_PADDING,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.primary[500],
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitials: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: 'white',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 2,
  },
  userEmail: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginBottom: 2,
  },
  userRole: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
    fontWeight: '500',
    marginTop: 2,
  },
  companyName: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.primary[600],
    fontWeight: '600',
    marginTop: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  content: {
    flex: 1,
  },
  menuSection: {
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },

  // Menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: COLORS.gray[50],
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[700],
    flex: 1,
  },
  emptyMenuText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[400],
    textAlign: 'center',
    paddingVertical: 20,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: 'bold',
    color: 'white',
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -12,
    width: 4,
    height: 24,
    borderRadius: 2,
  },

  // Footer
  footer: {
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    backgroundColor: COLORS.error[50],
    marginBottom: 16,
  },
  logoutText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.error[500],
    fontWeight: '600',
    marginLeft: 8,
  },
  appInfo: {
    alignItems: 'center',
  },
  appName: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 2,
  },
  appVersion: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
    marginBottom: 2,
  },
  companyInfo: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.primary[600],
    fontWeight: '600',
  },
});

export default CustomSidebar;
