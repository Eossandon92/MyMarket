import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { useCart } from '../context/CartContext';
import { useAuth, API } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { Trash2, Plus, Minus, CreditCard, FileText, Camera } from 'lucide-react-native';
import { colors } from '../theme/colors';
import * as Linking from 'expo-linking';

export default function CartScreen({ navigation }) {
  const { cart, updateQuantity, removeFromCart, totalPrice, clearCart } = useCart();
  const { token, businessId } = useAuth();
  const { refreshAll } = useInventory();
  const [loading, setLoading] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('Scanner')}
          style={{ marginRight: 15 }}
        >
          <Camera color={colors.primary} size={24} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setLoading(true);
    try {
      const orderData = {
        business_id: businessId,
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          is_promotion: false
        })),
        payment_method: 'cash'
      };

      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      const result = await res.json();

      if (res.ok) {
        clearCart();
        refreshAll();
        // Navegamos inmediatamente a la boleta
        navigation.navigate('Receipt', { order: result });
      } else {
        Alert.alert('Error', result.msg || 'No se pudo procesar la venta');
      }
    } catch (e) {
      Alert.alert('Error', 'Problema de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${item.price.toLocaleString()} c/u</Text>
      </View>
      
      <View style={styles.quantityControls}>
        <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtn}>
          <Minus color={colors.text} size={18} />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtn}>
          <Plus color={colors.text} size={18} />
        </TouchableOpacity>
      </View>

      <Text style={styles.itemTotal}>${(item.price * item.quantity).toLocaleString()}</Text>
      
      <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.deleteBtn}>
        <Trash2 color={colors.error} size={20} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={cart}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tu carrito está vacío</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total a Cobrar:</Text>
          <Text style={styles.totalValue}>${totalPrice.toLocaleString()}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.checkoutBtn, (cart.length === 0 || loading) && styles.disabledBtn]} 
          onPress={handleCheckout}
          disabled={cart.length === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <CreditCard color="white" size={24} style={{ marginRight: 10 }} />
              <Text style={styles.checkoutText}>Finalizar y Cobrar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: 15 },
  cartItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.white, 
    padding: 15, 
    borderRadius: 15, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  itemInfo: { flex: 1.5 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  itemPrice: { fontSize: 12, color: colors.textMuted },
  quantityControls: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  qtyBtn: { padding: 5, backgroundColor: '#F3F4F6', borderRadius: 5 },
  qtyText: { marginHorizontal: 10, fontSize: 16, fontWeight: 'bold' },
  itemTotal: { flex: 1, textAlign: 'right', fontWeight: 'bold', color: colors.primary, fontSize: 16 },
  deleteBtn: { marginLeft: 15 },
  footer: { backgroundColor: colors.white, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  totalLabel: { fontSize: 18, color: colors.textMuted },
  totalValue: { fontSize: 26, fontWeight: 'bold', color: colors.text },
  checkoutBtn: { 
    backgroundColor: colors.primary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 18, 
    borderRadius: 15 
  },
  disabledBtn: { backgroundColor: '#A7F3D0' },
  checkoutText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  emptyContainer: { marginTop: 100, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 16 }
});
