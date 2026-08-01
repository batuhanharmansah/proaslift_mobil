// 📈 ENTERPRISE CHART COMPONENT
// Interaktif grafikler, çoklu chart türleri, responsive design

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { COLORS, DIMENSIONS as APP_DIMENSIONS } from '../../constants';
import { ChartData, MonthlyTrendData } from '../../types';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - (APP_DIMENSIONS.SCREEN_PADDING * 2) - 32;

interface ChartCardProps {
  title: string;
  data: ChartData | MonthlyTrendData[] | any;
  type: 'line' | 'bar' | 'pie';
  height?: number;
  showLegend?: boolean;
  color?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  data,
  type,
  height = 200,
  showLegend = true,
  color = COLORS.primary[500],
}) => {
  // ==================== CHART CONFIG ====================
  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'white',
    backgroundGradientTo: 'white',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Primary blue
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`, // Gray
    style: {
      borderRadius: APP_DIMENSIONS.BORDER_RADIUS,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: color,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: COLORS.gray[200],
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: 12,
      fontWeight: '600',
    },
  };

  // ==================== DATA PROCESSING ====================
  const processLineData = (trendData: MonthlyTrendData[]): any => {
    return {
      labels: trendData.map((_, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (trendData.length - 1 - index));
        return date.toLocaleDateString('tr-TR', { month: 'short' });
      }),
      datasets: [
        {
          data: trendData.map(item => item.income),
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Green for income
          strokeWidth: 3,
        },
        {
          data: trendData.map(item => item.expense),
          color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // Red for expense
          strokeWidth: 3,
        },
      ],
      legend: ['Gelir', 'Gider'],
    };
  };

  const processBarData = (chartData: ChartData): any => {
    return {
      labels: chartData.labels,
      datasets: [
        {
          data: chartData.data,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        },
      ],
    };
  };

  const processPieData = (chartData: any): any => {
    return chartData.map((item: any, index: number) => ({
      name: item.label,
      population: item.value,
      color: COLORS.primary[500 + (index * 100)],
      legendFontColor: COLORS.gray[600],
      legendFontSize: 12,
    }));
  };

  // ==================== RENDER METHODS ====================
  const renderChart = () => {
    try {
      switch (type) {
        case 'line':
          const lineData = processLineData(data as MonthlyTrendData[]);
          return (
            <LineChart
              data={lineData}
              width={chartWidth}
              height={height}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withDots={true}
              withShadow={false}
              withInnerLines={true}
              withOuterLines={false}
            />
          );

        case 'bar':
          const barData = processBarData(data as ChartData);
          return (
            <BarChart
              data={barData}
              width={chartWidth}
              height={height}
              chartConfig={chartConfig}
              style={styles.chart}
              showValuesOnTopOfBars={true}
              withInnerLines={false}
            />
          );

        case 'pie':
          const pieData = processPieData(data);
          return (
            <PieChart
              data={pieData}
              width={chartWidth}
              height={height}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          );

        default:
          return (
            <View style={[styles.errorContainer, { height }]}>
              <Text style={styles.errorText}>Desteklenmeyen grafik türü</Text>
            </View>
          );
      }
    } catch (error) {
      console.error('Chart render error:', error);
      return (
        <View style={[styles.errorContainer, { height }]}>
          <Text style={styles.errorText}>Grafik yüklenemedi</Text>
        </View>
      );
    }
  };

  // ==================== MAIN RENDER ====================
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      
      <View style={styles.chartContainer}>
        {renderChart()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: APP_DIMENSIONS.BORDER_RADIUS,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  title: {
    fontSize: APP_DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  chartContainer: {
    padding: 16,
    alignItems: 'center',
  },
  chart: {
    borderRadius: APP_DIMENSIONS.BORDER_RADIUS,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: APP_DIMENSIONS.BORDER_RADIUS,
  },
  errorText: {
    fontSize: APP_DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[500],
  },
});

export default ChartCard;
