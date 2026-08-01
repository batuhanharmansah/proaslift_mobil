// 🛡️ ERROR BOUNDARY COMPONENT
// Catches JavaScript errors anywhere in the child component tree

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { MonitoringService } from '../services/monitoring/MonitoringService';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    MonitoringService.reportError(error.message || error.toString(), {
      type: 'mobile_crash',
      severity: 'critical',
      stack: `${error.stack ?? ''}\n${errorInfo.componentStack ?? ''}`,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle" size={64} color={COLORS.error[500]} />
            </View>
            
            <Text style={styles.title}>Bir Hata Oluştu</Text>
            <Text style={styles.message}>
              Uygulama beklenmeyen bir hata ile karşılaştı. Lütfen uygulamayı yeniden başlatın.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Hata Detayları:</Text>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                {this.state.errorInfo && (
                  <>
                    <Text style={styles.errorTitle}>Stack Trace:</Text>
                    <Text style={styles.errorText}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  </>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReset}
            >
              <Ionicons name="refresh" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Yeniden Dene</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  errorDetails: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: COLORS.gray[100],
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.gray[700],
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
