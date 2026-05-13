import { Linking, Platform } from 'react-native';

class PrinterService {
  constructor() {
    this.isConnected = true;
  }

  toBase64(str) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let encoded = '';
    for (let i = 0; i < str.length; i += 3) {
      let char1 = str.charCodeAt(i);
      let char2 = str.charCodeAt(i + 1);
      let char3 = str.charCodeAt(i + 2);
      let byte1 = char1 >> 2;
      let byte2 = ((char1 & 3) << 4) | (char2 >> 4);
      let byte3 = ((char2 & 15) << 2) | (char3 >> 6);
      let byte4 = char3 & 63;
      if (isNaN(char2)) byte3 = byte4 = 64;
      else if (isNaN(char3)) byte4 = 64;
      encoded += chars.charAt(byte1) + chars.charAt(byte2) + chars.charAt(byte3) + chars.charAt(byte4);
    }
    return encoded;
  }

  async printReceipt(order) {
    if (Platform.OS !== 'android') return;

    try {
      // FORMATO ORIGINAL DE 32 CARACTERES (NO TOCAR EL DISEÑO)
      let text = "";
      
      const name = (order.business_name || 'MI MINIMARKET').toUpperCase().substring(0, 32);
      const pad = Math.max(0, Math.floor((32 - name.length) / 2));
      text += " ".repeat(pad) + name + "\n";
      
      text += "      R.U.T.: 76.123.456-7\n";
      text += "       BOLETA ELECTRONICA\n";
      text += "            N° " + (order.sii_folio || '1026') + "\n";
      text += "================================\n";

      text += "PRODUCTO       CANT   TOTAL\n";
      text += "-------------- ---- --------\n";
      
      order.items.forEach(item => {
        const n = (item.product?.name || 'Prod').substring(0, 14).padEnd(14);
        const q = item.quantity.toString().padStart(4);
        const t = ("$" + (item.price_at_time * item.quantity).toLocaleString()).padStart(10);
        text += `${n} ${q} ${t}\n`;
      });

      text += "--------------------------------\n";

      const neto = "NETO: $" + Math.round(order.total_price / 1.19).toLocaleString();
      const iva = "IVA (19%): $" + (order.total_price - Math.round(order.total_price / 1.19)).toLocaleString();
      const total = "TOTAL: $" + order.total_price.toLocaleString();

      text += neto.padStart(32) + "\n";
      text += iva.padStart(32) + "\n";
      text += total.padStart(32) + "\n";

      text += "\n¡Gracias por su compra!\n";
      text += "Zoko POS - www.zoko.cl\n";

      // FOCO EXCLUSIVO EN EL TIMBRE (PDF417)
      if (order.sii_ted_xml) {
        text += "\nTimbre Electronico SII\n";
        const cleanTed = order.sii_ted_xml.replace(/[\n\r]/g, '');
        
        // Ajuste de dibujo: ancho 250 (mas angosto), alto 80 (mas bajo)
        // Esto ayuda a que las impresoras termicas no se saturen y no salga en blanco
        text += "[B:PDF417;250;80;1]" + cleanTed + "[/B]\n";
      }

      text += "\n\n\n\n";

      const base64Data = this.toBase64(text);
      const url = `rawbt:base64,${base64Data}`;
      await Linking.openURL(url);

    } catch (error) {
      console.error(error);
    }
  }
}

export default new PrinterService();
