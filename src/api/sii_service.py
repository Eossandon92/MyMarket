import os
import requests
import json
import logging
from api.utils import decrypt_value

logger = logging.getLogger(__name__)

# Configuración del Endpoint de Tributum ( Gonzalo )
BILLING_API_URL = "https://tributum-production-934e.up.railway.app/api/v1/documents"

def emitir_documento_electronico(order, business_details, return_json=False):
    """
    Función de integración para enviar la venta a la API de facturación Tributum.
    
    order: Instancia de models.Order
    business_details: Instancia de models.Business
    """
    try:
        # 1. Obtener y desencriptar la API Key del negocio
        encrypted_key = business_details.billing_api_key
        api_key = decrypt_value(encrypted_key) if encrypted_key else None

        if not api_key:
            logger.warning(f"Negocio {business_details.name} no tiene API Key de facturación configurada.")
            return {
                "success": False,
                "message": "Falta configuración de API Key en el negocio."
            }

        # 2. Construir el payload JSON para Tributum
        from datetime import datetime, timedelta
        
        # 2. Construir los items primero para tener la suma exacta del Neto
        line_items = []
        sum_neto = 0
        for item in order.items:
            unit_price_net = round(item.price_at_time / 1.19)
            line_amount_net = round(unit_price_net * item.quantity)
            sum_neto += line_amount_net
            
            line_items.append({
                "itemName": item.product.name if item.product else "Producto",
                "description": item.product.name if item.product else "Descripción",
                "quantity": item.quantity,
                "unitOfMeasure": "UN",
                "unitPrice": unit_price_net,
                "amount": line_amount_net,
                "isExempt": False
            })

        # Cálculos de cabecera basados en la suma de los items
        total_final = round(order.total_price)
        neto_global = sum_neto
        iva_global = total_final - neto_global
        
        # 3. Construir el payload definitivo eliminando datos "en duro"
        full_address = business_details.address or ""
        comuna_detected = "SANTIAGO"
        if "," in full_address:
            comuna_detected = full_address.split(",")[-1].strip().upper()
        elif business_details.giro_comercial: # A veces la comuna está en el giro o podemos inferirla
            comuna_detected = "SANTIAGO"

        payload = {
            "documentType": "BoletaAfecta" if (order.sii_document_type or 39) == 39 else "Factura",
            "branchName": business_details.name,
            "branchAddress": full_address,
            "branchCommune": comuna_detected,
            "pointOfSaleName": business_details.billing_pos_name or "Caja Principal",
            "receiverName": "Consumidor Final",
            "receiverTaxId": "66666666-6",
            "receiverBusinessActivity": "Consumidor Final",
            "receiverAddress": comuna_detected,
            "receiverCommune": comuna_detected,
            "receiverCity": comuna_detected,
            "dueDate": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "netAmount": neto_global,
            "taxAmount": iva_global,
            "exemptAmount": 0,
            "totalAmount": total_final,
            "currency": "CLP",
            "externalReference": str(order.id),
            "idempotencyKey": f"id-{order.id}-{datetime.now().strftime('%H%M%S')}",
            "globalDiscountPercentage": None,
            "references": [],
            "lineItems": line_items
        }


        target_url = BILLING_API_URL

        print("\n" + "="*50)
        print(">>> INICIANDO ENVÍO A TRIBUTUM <<<")
        print(f"URL: {target_url}")
        print(f"API Key (decrypted): {api_key[:5]}***" if api_key else "API Key: MISSING")
        print(f"Payload JSON:\n{json.dumps(payload, indent=2)}")
        
        # 3. Realizar la petición HTTP
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        # Para el log, mostramos los headers de forma segura
        debug_headers = {
            "Authorization": f"Bearer {api_key[:5]}***",
            "Content-Type": headers["Content-Type"]
        }
        print(f"Headers: {debug_headers}")
        print("="*50 + "\n")
        
        response = requests.post(target_url, json=payload, headers=headers, timeout=15)
        print(f"[SII Service] Status Code: {response.status_code}")
        
        if not response.ok:
            print(f"[SII Service] Error Response: {response.text}")
            logger.error(f"Error Tributum ({response.status_code}): {response.text}")
            order.sii_status = "rejected"
            return {
                "success": False,
                "error": response.text,
                "message": "La API de facturación rechazó el documento."
            }

        api_data = response.json()
        doc_data = api_data.get("document", {})
        print(f">>> RESPUESTA EXITOSA DE TRIBUTUM: {api_data}")
        
        # 4. Actualizar la orden con los datos de éxito
        # Mapeo de tipos de documento (BoletaAfecta -> 39, etc.)
        doc_type_map = {
            "BoletaAfecta": 39,
            "BoletaExenta": 41,
            "FacturaAfecta": 33,
            "FacturaExenta": 34,
            "Factura": 33
        }
        
        raw_type = doc_data.get("type") or payload["documentType"]
        order.sii_document_type = doc_type_map.get(raw_type, 39)
        order.sii_status = "accepted"
        order.sii_folio = doc_data.get("folio")
        
        # Guardar XML legal y Timbre (TED) para impresión térmica
        order.sii_signed_xml = doc_data.get("signedXml")
        order.sii_ted_xml = doc_data.get("tedXml")
        
        # Algunos endpoints pueden devolver pdfUrl, lo guardamos si existe
        order.sii_pdf_url = doc_data.get("pdf_url") or doc_data.get("pdfUrl")
        
        logger.info(f"Documento emitido: Folio {order.sii_folio} para Negocio {business_details.name}")

        return {
            "success": True,
            "folio": order.sii_folio,
            "pdf_url": order.sii_pdf_url,
            "ted_xml": order.sii_ted_xml,
            "message": "Documento emitido correctamente"
        }

    except Exception as e:
        logger.error(f"Falla crítica en comunicación con Tributum: {str(e)}")
        order.sii_status = "offline"
        return {
            "success": False,
            "error": str(e),
            "message": "No se pudo comunicar con el servidor de facturación."
        }
