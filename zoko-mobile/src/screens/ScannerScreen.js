import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Vibration, TextInput, Animated } from 'react-native';
import { Camera } from 'expo-camera';
import { useInventory } from '../context/InventoryContext';
import { useCart } from '../context/CartContext';
import { X, Keyboard, CheckCircle2, AlertCircle, Zap, ZapOff } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function ScannerScreen({ navigation }) {
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flash, setFlash] = useState(false); 
  const isScanning = useRef(false);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  
  const fadeAnim = useState(new Animated.Value(0))[0];
  const { products } = useInventory();
  const { addToCart } = useCart();

  useEffect(() => {
    if (!permission) requestPermission();
    
    // Encender flash con un pequeño delay para que la cámara esté lista
    const timer = setTimeout(() => {
      setFlash(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [permission]);

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToast({ show: false, msg: '', type });
        setScanned(false);
        isScanning.current = false; // Reactivar después de 1.8 segundos
      });
    }, 1500);
  };

  const onScan = useCallback(({ data }) => {
    if (isScanning.current || !data) return;
    
    isScanning.current = true;
    setScanned(true);
    Vibration.vibrate(100);
    processCode(data);
  }, [products]);

  const handleManualInput = (text) => {
    setManualCode(text);
    // Búsqueda automática si el código tiene una longitud estándar de barras
    if (text.length === 8 || text.length === 12 || text.length === 13) {
      processCode(text);
    }
  };

  const processCode = (code) => {
    if (!code) return;
    const cleanCode = String(code).trim();
    const product = products.find(p => String(p.barcode).trim() === cleanCode);

    if (product) {
      addToCart(product);
      Vibration.vibrate([0, 100, 50, 100]);
      navigation.navigate('Cart');
    } else if (code.length >= 8 && !showManual) {
      // Si fue escaneado por cámara y no existe
      showToast(`Código [${cleanCode}] no encontrado`, 'error');
      setScanned(false);
      isScanning.current = false;
    }
  };

  if (!permission) return <View style={styles.container}><Text>Cargando...</Text></View>;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Sin acceso a la cámara</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}><Text style={styles.btnText}>Permitir</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!showManual ? (
        <Camera
          style={StyleSheet.absoluteFillObject}
          onBarCodeScanned={scanned ? undefined : onScan}
          zoom={0.12} 
          flashMode={flash ? Camera.Constants.FlashMode.torch : Camera.Constants.FlashMode.off} 
          autoFocus={Camera.Constants.AutoFocus.on} 
          barCodeScannerSettings={{
            barCodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"],
          }}
        />
      ) : (
        <View style={styles.manualContainer}>
          <Text style={styles.manualTitle}>Ingreso Manual</Text>
          <TextInput
            style={styles.input}
            placeholder="Escribe el código..."
            placeholderTextColor="#888"
            value={manualCode}
            onChangeText={handleManualInput}
            keyboardType="numeric"
            autoFocus
          />
          <TouchableOpacity 
            style={styles.btn} 
            onPress={() => processCode(manualCode)}
          >
            <Text style={styles.btnText}>Buscar y Agregar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Interface Overlay */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Toast Notification */}
        <Animated.View style={[styles.toast, { opacity: fadeAnim, backgroundColor: toast.type === 'success' ? '#10B981' : '#EF4444' }]}>
          {toast.type === 'success' ? <CheckCircle2 color="white" size={20} /> : <AlertCircle color="white" size={20} />}
          <Text style={styles.toastText}>{toast.msg}</Text>
        </Animated.View>

        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeBtn} 
            onPress={() => navigation.pop()}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <X color="white" size={32} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Escáner</Text>
          <View style={{ flex: 1 }} />
          {!showManual && (
            <TouchableOpacity 
              style={styles.flashBtn} 
              onPress={() => setFlash(!flash)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {flash ? <Zap color="#FBBF24" size={26} /> : <ZapOff color="white" size={26} />}
            </TouchableOpacity>
          )}
        </View>

        {!showManual && (
          <View style={styles.focusArea}>
            <TouchableOpacity 
              style={styles.focusFrame} 
              activeOpacity={0.8}
              onPress={() => {
                Vibration.vibrate(50);
                // No hay API directa de foco, pero al tocar podemos forzar un re-render o destello
                setFlash(f => f); 
              }}
            >
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
            </TouchableOpacity>
            <Text style={{ color: 'white', marginTop: 15, fontWeight: 'bold' }}>
              Toca el cuadro para enfocar
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.toggleBtn} 
            onPress={() => setShowManual(!showManual)}
          >
            <Keyboard color="white" size={20} style={{ marginRight: 10 }} />
            <Text style={styles.btnText}>
              {showManual ? "Usar Cámara" : "Teclado"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  text: { color: 'white', textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' },
  overlay: { ...StyleSheet.absoluteFillObject, padding: 30 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 15 },
  flashBtn: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 25 },
  focusArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  focusFrame: { width: 260, height: 160, borderRadius: 15, position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: colors.primary, borderWidth: 4 },
  tl: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0 },
  footer: { alignItems: 'center', marginBottom: 20 },
  toggleBtn: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25, flexDirection: 'row', alignItems: 'center' },
  manualContainer: { flex: 1, justifyContent: 'center', padding: 25, backgroundColor: '#111' },
  manualTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20, fontSize: 20, textAlign: 'center' },
  toast: { 
    position: 'absolute', 
    top: 60, 
    left: 30, 
    right: 30, 
    padding: 15, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 10
  },
  toastText: { color: 'white', fontWeight: 'bold', marginLeft: 10, fontSize: 16 },
  closeBtn: { padding: 5 }
});
