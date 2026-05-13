import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity 
} from 'react-native';
import { useAuth, API } from '../context/AuthContext';
import { DollarSign, TrendingUp, CreditCard, Calendar } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function ReportsScreen() {
  const { token, businessId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('today'); // today, week, month

  const fetchReports = async (selectedPeriod) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/reports/sales?period=${selectedPeriod}&business_id=${businessId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await res.json();
      setData(result);
    } catch (e) {
      console.error("Error fetching reports", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && businessId) {
      fetchReports(period);
    }
  }, [period, token, businessId]);

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <View style={styles.card}>
      <View style={[styles.iconBadge, { backgroundColor: color + '20' }]}>
        <Icon color={color} size={24} />
      </View>
      <View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Panel de Ventas</Text>
        
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {['today', 'week', 'month'].map((p) => (
            <TouchableOpacity 
              key={p} 
              onPress={() => setPeriod(p)}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === 'today' ? 'Hoy' : p === 'week' ? 'Semana' : 'Mes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : data ? (
        <View style={styles.content}>
          <StatCard 
            title="Ventas Totales" 
            value={`$${data.total_revenue?.toLocaleString() || 0}`} 
            icon={DollarSign} 
            color={colors.primary} 
          />
          <StatCard 
            title="Transacciones" 
            value={data.total_orders || 0} 
            icon={CreditCard} 
            color="#3B82F6" 
          />
          <StatCard 
            title="Ticket Promedio" 
            value={`$${Math.round(data.avg_ticket || 0).toLocaleString()}`} 
            icon={TrendingUp} 
            color="#8B5CF6" 
          />

          <Text style={styles.sectionTitle}>Productos Más Vendidos</Text>
          {Object.values(data.top_products || {}).map((item, index) => (
            <View key={index} style={styles.topProductItem}>
              <View style={styles.rankBadge}><Text style={styles.rankText}>{index + 1}</Text></View>
              <Text style={styles.topProductName}>{item.name}</Text>
              <Text style={styles.topProductQty}>{item.qty} un.</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>No hay datos disponibles</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, backgroundColor: colors.white },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 20 },
  periodSelector: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 4 },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  periodBtnActive: { backgroundColor: colors.white, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
  periodText: { color: colors.textMuted, fontWeight: '600', textTransform: 'capitalize' },
  periodTextActive: { color: colors.primary },
  content: { padding: 20 },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.white, 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border
  },
  iconBadge: { padding: 12, borderRadius: 12, marginRight: 15 },
  cardTitle: { fontSize: 14, color: colors.textMuted, marginBottom: 4 },
  cardValue: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 20, marginBottom: 15 },
  topProductItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.white, 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  rankBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rankText: { fontSize: 12, fontWeight: 'bold', color: colors.textMuted },
  topProductName: { flex: 1, fontWeight: '600', color: colors.text },
  topProductQty: { fontWeight: 'bold', color: colors.primary },
  emptyText: { textAlign: 'center', marginTop: 50, color: colors.textMuted }
});
