import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  TextInput,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { useInventory } from '../context/InventoryContext';
import { useCart } from '../context/CartContext';
import { 
  Search, 
  ShoppingCart, 
  Camera, 
  LayoutGrid, 
  List as ListIcon,
  Plus 
} from 'lucide-react-native';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - 40) / COLUMN_COUNT;

export default function SalesScreen({ navigation }) {
  const { products, categories, isLoading, refreshAll } = useInventory();
  const { cart, addToCart, totalItems, totalPrice } = useCart();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isGridView, setIsGridView] = useState(true);

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const renderProduct = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => addToCart(item)}
    >
      <Image 
        source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} 
        style={styles.productImage} 
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productPrice}>${item.price.toLocaleString()}</Text>
      </View>
      <View style={styles.addButton}>
        <Plus color="white" size={20} />
      </View>
    </TouchableOpacity>
  );

  if (isLoading && products.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search color={colors.textMuted} size={20} style={{ marginRight: 10 }} />
          <TextInput 
            placeholder="Buscar productos..." 
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity 
            style={styles.viewBtn} 
            onPress={() => setIsGridView(!isGridView)}
          >
            {isGridView ? <ListIcon color={colors.primary} size={24} /> : <LayoutGrid color={colors.primary} size={24} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.scannerBtn}
            onPress={() => navigation.navigate('Scanner')}
          >
            <Camera color={colors.primary} size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['Todos', ...categories.map(c => c.name)].map((cat) => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive
              ]}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === cat && styles.categoryTextActive
              ]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        key={isGridView ? 'grid' : 'list'}
        data={filteredProducts}
        numColumns={isGridView ? 2 : 1}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={isGridView ? styles.productCard : styles.productListItem}
            onPress={() => addToCart(item)}
            activeOpacity={0.7}
          >
            {isGridView ? (
              <>
                <Image 
                  source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} 
                  style={styles.productImage} 
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.productPrice}>${item.price.toLocaleString()}</Text>
                </View>
                <View style={styles.addButton}>
                  <Plus color="white" size={16} />
                </View>
              </>
            ) : (
              <View style={styles.listItemContainer}>
                <Image 
                  source={{ uri: item.image_url || 'https://via.placeholder.com/80' }} 
                  style={styles.productListImage} 
                />
                <View style={styles.productListInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.productPrice}>${item.price.toLocaleString()}</Text>
                </View>
                <View style={styles.listAddBtn}>
                  <Plus color="white" size={20} />
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={isGridView ? styles.columnWrapper : null}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshAll} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No se encontraron productos</Text>
        }
      />

      {cart.length > 0 && (
        <TouchableOpacity 
          style={styles.cartFloatingButton}
          onPress={() => navigation.navigate('Cart')}
        >
          <ShoppingCart color="white" size={24} />
          <Text style={styles.cartButtonText}>
            Ver Carrito ({totalItems}) - ${totalPrice.toLocaleString()}
          </Text>
        </TouchableOpacity>
      )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F3F4F6', 
    paddingHorizontal: 15, 
    borderRadius: 12,
    height: 50
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.text },
  viewBtn: { padding: 5, marginLeft: 10 },
  scannerBtn: { padding: 5, marginLeft: 10 },
  categoriesContainer: { paddingVertical: 15, backgroundColor: colors.white },
  categoryChip: { 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: '#F3F4F6', 
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.textMuted, fontWeight: '600' },
  categoryTextActive: { color: 'white' },
  listContent: { padding: 15, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between' },
  productCard: { 
    backgroundColor: colors.white, 
    width: ITEM_WIDTH, 
    borderRadius: 15, 
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative'
  },
  productImage: { width: '100%', height: 120, backgroundColor: '#F3F4F6' },
  productInfo: { padding: 12 },
  productName: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  productPrice: { fontSize: 16, color: colors.primary, fontWeight: '700' },
  addButton: { 
    position: 'absolute', 
    bottom: 10, 
    right: 10, 
    backgroundColor: colors.primary, 
    borderRadius: 8, 
    padding: 5 
  },
  // Estilos de Lista
  productListItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  productListImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#F3F4F6'
  },
  productListInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center'
  },
  productCategory: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2
  },
  listAddBtn: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 10
  },
  emptyText: { textAlign: 'center', marginTop: 50, color: colors.textMuted, fontSize: 16 },
  cartFloatingButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cartButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18, marginLeft: 10 }
});
