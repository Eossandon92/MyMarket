import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { colors } from '../theme/colors';
import { CheckCircle, Printer, X, FileText } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { WebView } from 'react-native-webview';
import PrinterService from '../services/PrinterService';

const { width } = Dimensions.get('window');

export default function ReceiptScreen({ route, navigation }) {
  const { order } = route.params;

  // Formatear fecha
  const date = new Date(order.created_at).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Success Header */}
        <View style={styles.successHeader}>
          <CheckCircle color={colors.primary} size={40} />
          <Text style={styles.successTitle}>Venta Completada</Text>
        </View>

        {/* Paper Receipt Simulation */}
        <View style={styles.receiptContainer}>
          <View style={styles.receiptPaper}>
            
            {/* Header SII Style */}
            <View style={styles.siiHeader}>
              <Text style={styles.businessRut}>R.U.T.: 76.123.456-7</Text>
              <Text style={styles.documentType}>BOLETA ELECTRÓNICA</Text>
              <Text style={styles.folioNumber}>N° {order.sii_folio || '1026'}</Text>
              <Text style={styles.siiRegion}>S.I.I. - SANTIAGO</Text>
            </View>

            <Text style={styles.storeName}>{order.business_name || 'MI MINIMARKET'}</Text>
            <Text style={styles.storeDetail}>Venta de Abarrotes y Bebidas</Text>
            <Text style={styles.storeDetail}>Comandante Bartolomé Vivar 02525</Text>
            
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha:</Text>
              <Text style={styles.infoValue}>{date}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cajero:</Text>
              <Text style={styles.infoValue}>{order.user_id ? `Usuario #${order.user_id}` : 'Caja Principal'}</Text>
            </View>

            <View style={styles.divider} />

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.col, { flex: 2 }]}>Producto</Text>
              <Text style={[styles.col, { textAlign: 'center' }]}>Cant.</Text>
              <Text style={[styles.col, { textAlign: 'right' }]}>Total</Text>
            </View>

            {/* Items */}
            {order.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={[styles.itemName, { flex: 2 }]}>{item.product?.name || 'Producto'}</Text>
                <Text style={[styles.itemText, { textAlign: 'center' }]}>{item.quantity}</Text>
                <Text style={[styles.itemText, { textAlign: 'right', fontWeight: 'bold' }]}>
                  ${(item.price_at_time * item.quantity).toLocaleString()}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

            {/* Totals */}
            <View style={styles.totalContainer}>
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Neto:</Text>
                <Text style={styles.subtotalValue}>${Math.round(order.total_price / 1.19).toLocaleString()}</Text>
              </View>
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>IVA (19%):</Text>
                <Text style={styles.subtotalValue}>${(order.total_price - Math.round(order.total_price / 1.19)).toLocaleString()}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalAmount}>${order.total_price.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* TED / Timbre Area */}
            <View style={styles.tedArea}>
              <Text style={styles.tedTitle}>Timbre Electrónico SII</Text>
              <View style={styles.barcodeContainer}>
                <WebView
                  originWhitelist={['*']}
                  source={{ html: `
                    <html>
                      <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                        <script src="https://cdn.jsdelivr.net/npm/bwip-js/dist/bwip-js-min.js"></script>
                        <style>
                          body { margin: 0; display: flex; justify-content: center; align-items: center; background: white; }
                          canvas { max-width: 100%; height: auto; }
                        </style>
                      </head>
                      <body>
                        <canvas id="barcode"></canvas>
                        <script>
                          try {
                            bwipjs.toCanvas('barcode', {
                              bcid: 'pdf417',
                              text: ${JSON.stringify(order.sii_ted_xml || '')},
                              scale: 3,
                              height: 50,
                              includetext: false
                            });
                          } catch (e) {
                            document.body.innerHTML = '<p style="font-size:10px; color:red">Error generando timbre</p>';
                          }
                        </script>
                      </body>
                    </html>
                  ` }}
                  style={{ width: width * 0.8, height: 160 }}
                  scrollEnabled={false}
                />
              </View>
              <Text style={styles.tedFooter}>Res. 80 de 2014. Verifique documento: www.sii.cl</Text>
            </View>

          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.footerActions}>
          <TouchableOpacity 
            style={styles.closeBtn} 
            onPress={() => navigation.navigate('Inicio')}
          >
            <X color={colors.text} size={20} />
            <Text style={styles.closeBtnText}>Nueva Venta</Text>
          </TouchableOpacity>

          {order.sii_pdf_url ? (
            <TouchableOpacity 
              style={styles.printBtn}
              onPress={() => Linking.openURL(order.sii_pdf_url)}
            >
              <FileText color="white" size={20} />
              <Text style={styles.printBtnText}>Ver PDF</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.printBtn}
              onPress={() => PrinterService.printReceipt(order)}
            >
              <Printer color="white" size={20} />
              <Text style={styles.printBtnText}>Imprimir</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  scrollContent: { paddingBottom: 40 },
  successHeader: { alignItems: 'center', paddingVertical: 20 },
  successTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginTop: 8 },
  receiptContainer: { paddingHorizontal: 20, alignItems: 'center' },
  receiptPaper: { 
    backgroundColor: 'white', 
    width: '100%', 
    padding: 20, 
    borderRadius: 2,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  siiHeader: { 
    borderWidth: 2, 
    borderColor: colors.error, 
    padding: 10, 
    alignItems: 'center',
    marginBottom: 20 
  },
  businessRut: { color: colors.error, fontWeight: 'bold', fontSize: 16 },
  documentType: { color: colors.error, fontWeight: 'bold', fontSize: 14 },
  folioNumber: { color: colors.error, fontWeight: 'bold', fontSize: 20, marginVertical: 2 },
  siiRegion: { color: colors.error, fontWeight: 'bold', fontSize: 12 },
  storeName: { textAlign: 'center', fontWeight: 'bold', fontSize: 18, textTransform: 'uppercase' },
  storeDetail: { textAlign: 'center', fontSize: 12, color: '#666' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  infoLabel: { fontSize: 12, color: '#888' },
  infoValue: { fontSize: 12, color: '#333', fontWeight: '600' },
  tableHeader: { flexDirection: 'row', marginBottom: 10 },
  col: { fontSize: 12, fontWeight: 'bold', color: '#444', flex: 1 },
  itemRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'center' },
  itemName: { fontSize: 13, color: '#333' },
  itemText: { fontSize: 13, color: '#333', flex: 1 },
  totalContainer: { marginTop: 5 },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  subtotalLabel: { fontSize: 14, color: '#666' },
  subtotalValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  totalAmount: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  tedArea: { alignItems: 'center', marginTop: 10 },
  tedTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
  barcodeContainer: { 
    width: '100%', 
    height: 170, 
    backgroundColor: 'white', 
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  tedXmlPreview: { fontSize: 8, color: '#999', textAlign: 'center' },
  tedXmlPreview: { fontSize: 8, color: '#999', textAlign: 'center' },
  tedFooter: { fontSize: 9, color: '#aaa', marginTop: 5 },
  footerActions: { flexDirection: 'row', padding: 20, justifyContent: 'space-between' },
  closeBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10
  },
  closeBtnText: { marginLeft: 8, fontWeight: 'bold', color: colors.text },
  printBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12
  },
  printBtnText: { marginLeft: 8, fontWeight: 'bold', color: 'white' }
});
