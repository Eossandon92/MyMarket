import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Package, BarChart2, User } from 'lucide-react-native';
import { colors } from '../theme/colors';

// Placeholder Screens (las crearemos después)
import LoginScreen from '../screens/LoginScreen';
import SalesScreen from '../screens/SalesScreen';
import InventoryScreen from '../screens/InventoryScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CartScreen from '../screens/CartScreen';
import ReceiptScreen from '../screens/ReceiptScreen';
import ScannerScreen from '../screens/ScannerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let Icon;
          if (route.name === 'Ventas') Icon = ShoppingBag;
          else if (route.name === 'Inventario') Icon = Package;
          else if (route.name === 'Reportes') Icon = BarChart2;
          else if (route.name === 'Perfil') Icon = User;
          return <Icon color={color} size={size} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { height: 60, paddingBottom: 10 },
        headerStyle: { backgroundColor: colors.white },
        headerTitleStyle: { fontWeight: 'bold', color: colors.text },
      })}
    >
      <Tab.Screen name="Ventas" component={SalesScreen} options={{ title: 'Ventas POS' }} />
      <Tab.Screen name="Inventario" component={InventoryScreen} />
      <Tab.Screen name="Reportes" component={ReportsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null; // O una pantalla de Splash

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen 
              name="Inicio" 
              component={MainTabs} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Cart" 
              component={CartScreen} 
              options={{ 
                title: 'Mi Carrito',
                headerBackTitle: 'Inicio'
              }} 
            />
            <Stack.Screen 
              name="Receipt" 
              component={ReceiptScreen} 
              options={{ 
                headerShown: false,
                gestureEnabled: false 
              }} 
            />
            <Stack.Screen 
              name="Scanner" 
              component={ScannerScreen} 
              options={{ 
                headerShown: false,
                animation: 'slide_from_bottom'
              }} 
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
