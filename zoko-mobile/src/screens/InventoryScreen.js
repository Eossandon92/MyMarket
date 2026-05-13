import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useInventory } from '../context/InventoryContext';
import { Search, AlertTriangle, Package, ChevronRight } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function InventoryScreen() {
  const { products, isLoading, refreshAll } = useInventory();
  const [search, setSearch] = useState('');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = products.filter(p => p.stock <= (p.min_stock || 5)).length;

  const renderProduct = ({ item }) => {
    const isLowStock = item.stock <= (item.min_stock || 5);

    return (
      <TouchableOpacity style={styles.productItem}>
        <Image 
          source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} 
          style={styles.productImage} 
        />
        <View style={styles.productDetails}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <View style={styles.stockContainer}>
            <Text style={[
              styles.stockText, 
              isLowStock ? { color: colors.error } : { color: colors.success }
            ]}>
              Stock: {item.stock}
            </Text>
            {isLowStock && <AlertTriangle size={14} color={colors.error} style={{ marginLeft: 5 }} />}
          </View>
        </View>
        <ChevronRight color={colors.border} size={20} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Package color={colors.primary} size={24} />
          <Text style={styles.statValue}>{products.length}</Text>
          <Text style={styles.statLabel}>Productos</Text>
        </View>
        <View style={[styles.statCard, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
          <AlertTriangle color={colors.warning} size={24} />
          <Text style={[styles.statValue, { color: colors.warning }]}>{lowStockCount}</Text>
          <Text style={styles.statLabel}>Bajo Stock</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search color={colors.textMuted} size={20} />
          <TextInput 
            placeholder="Buscar en inventario..." 
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshAll} />
        }
        ListEmptyComponent={isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <Text style={styles.emptyText}>No hay productos registrados</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  statsContainer: { 
    flexDirection: 'row', 
    backgroundColor: colors.white, 
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginVertical: 5 },
  statLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  searchContainer: { padding: 15, backgroundColor: colors.white },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F3F4F6', 
    paddingHorizontal: 15, 
    borderRadius: 12,
    height: 45
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  listContent: { padding: 15 },
  productItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.white, 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  productImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#F3F4F6' },
  productDetails: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  productCategory: { fontSize: 12, color: colors.textMuted },
  stockContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  stockText: { fontSize: 14, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 50, color: colors.textMuted }
});
