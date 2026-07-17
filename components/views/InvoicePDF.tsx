import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import type { Invoice, CompanyProfile, Client } from '../../types';

// Register fonts
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 }
  ]
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    fontFamily: 'Roboto',
    backgroundColor: '#FFFFFF',
    height: '100%',
  },
  leftColumn: {
    width: '38%',
    backgroundColor: '#1B4E82',
    color: '#FFFFFF',
    padding: 30,
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
  },
  rightColumn: {
    width: '62%',
    padding: 40,
    flexDirection: 'column',
  },
  
  // Left Column Styles
  sectionTitleLeft: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  dividerLeft: {
    borderBottomWidth: 1,
    borderBottomColor: '#FFFFFF',
    marginBottom: 15,
    opacity: 0.5,
  },
  companyLogoName: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 700,
  },
  textLeft: {
    fontSize: 9,
    marginBottom: 4,
    lineHeight: 1.4,
  },
  textLeftBold: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 10,
    textTransform: 'uppercase',
  },

  // Right Column Styles
  headerRight: {
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 5,
    color: '#1a1a1a',
  },
  invoiceDate: {
    fontSize: 9,
    textTransform: 'uppercase',
    color: '#4a4a4a',
    marginBottom: 15,
  },
  paymentMethodsBlock: {
    alignItems: 'flex-end',
  },
  paymentTitle: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 4,
  },
  paymentText: {
    fontSize: 9,
    color: '#4a4a4a',
    textAlign: 'right',
  },
  paymentBold: {
    fontSize: 9,
    fontWeight: 700,
  },

  // Table Styles
  table: {
    width: '100%',
    marginTop: 40,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 5,
    marginBottom: 10,
  },
  thDesc: { width: '45%', fontSize: 9, fontWeight: 700 },
  thQty: { width: '15%', fontSize: 9, fontWeight: 700, textAlign: 'center' },
  thPrice: { width: '20%', fontSize: 9, fontWeight: 700, textAlign: 'right' },
  thTotal: { width: '20%', fontSize: 9, fontWeight: 700, textAlign: 'right' },
  
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  tdDesc: { width: '45%', fontSize: 9, color: '#333' },
  tdQty: { width: '15%', fontSize: 9, color: '#333', textAlign: 'center' },
  tdPrice: { width: '20%', fontSize: 9, color: '#333', textAlign: 'right' },
  tdTotal: { width: '20%', fontSize: 9, color: '#333', textAlign: 'right' },

  // Totals
  totalsContainer: {
    marginTop: 30,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    marginBottom: 8,
    width: '45%',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: 700,
  },
  totalValue: {
    fontSize: 9,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontWeight: 700,
  },
  grandTotalValue: {
    fontSize: 10,
    fontWeight: 700,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
  },
  conditionRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  conditionLabel: {
    fontSize: 9,
    fontWeight: 700,
  },
  conditionText: {
    fontSize: 9,
    color: '#4a4a4a',
  }
});

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'MZN';
};

const formatDateToPT = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} DE ${month} DE ${year}`;
};

interface InvoicePDFProps {
  invoice: Omit<Invoice, 'id' | 'estado'>;
  company: CompanyProfile;
  client: Client;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, company, client }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* LEFT COLUMN */}
        <View style={styles.leftColumn}>
          <View>
            <Text style={styles.sectionTitleLeft}>EMPRESA</Text>
            <View style={styles.dividerLeft}></View>
            
            <View style={styles.companyLogoName}>
              {company.logo_url && <Image src={company.logo_url} style={styles.logo} />}
              <Text style={styles.companyName}>{company.nome}</Text>
            </View>
            
            <Text style={styles.textLeft}>{company.contacto}</Text>
            <Text style={styles.textLeft}>{company.endereco}</Text>
            {company.instagram && <Text style={styles.textLeft}>{company.instagram}</Text>}
            <Text style={styles.textLeftBold}>NUIT: {company.nuit}</Text>
          </View>
          
          <View>
            <Text style={styles.sectionTitleLeft}>CLIENTE</Text>
            <View style={styles.dividerLeft}></View>
            
            <Text style={styles.clientName}>{client.name}</Text>
            {client.phone && <Text style={styles.textLeft}>{client.phone}</Text>}
            {client.location && <Text style={styles.textLeft}>{client.location}</Text>}
            {client.email && <Text style={styles.textLeft}>{client.email}</Text>}
            {client.nuit && <Text style={styles.textLeftBold}>NUIT: {client.nuit}</Text>}
          </View>
        </View>

        {/* RIGHT COLUMN */}
        <View style={styles.rightColumn}>
          
          {/* Header */}
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>FACTURA {invoice.codigo}</Text>
            <Text style={styles.invoiceDate}>{formatDateToPT(invoice.data_emissao)}</Text>
            
            {(company.forma_pagamento_titulo || company.banco || company.nib) && (
              <View style={styles.paymentMethodsBlock}>
                <Text style={styles.paymentTitle}>FORMAS DE PAGAMENTO</Text>
                {company.forma_pagamento_titulo && <Text style={styles.paymentText}>{company.forma_pagamento_titulo}</Text>}
                {company.banco && <Text style={styles.paymentText}>{company.banco}</Text>}
                {company.nib && (
                  <Text style={styles.paymentText}>
                    NIB: <Text style={styles.paymentBold}>{company.nib}</Text>
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.thDesc}>DESCRIÇÃO</Text>
              <Text style={styles.thQty}>QTD</Text>
              <Text style={styles.thPrice}>PREÇO</Text>
              <Text style={styles.thTotal}>TOTAL</Text>
            </View>
            
            {(invoice.items || []).map((item, index) => (
              <View style={styles.tableRow} key={index}>
                <Text style={styles.tdDesc}>{item.descricao.toUpperCase()}</Text>
                <Text style={styles.tdQty}>{String(item.quantidade).padStart(2, '0')}</Text>
                <Text style={styles.tdPrice}>{formatCurrency(item.preco_unitario)}</Text>
                <Text style={styles.tdTotal}>{formatCurrency(item.total_linha)}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>SUBTOTAL</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.iva)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.grandTotalLabel}>TOTAL</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total)}</Text>
            </View>
          </View>

          {/* Footer Conditions */}
          <View style={styles.footer}>
            {invoice.forma_pagamento && (
              <View style={styles.conditionRow}>
                <Text style={styles.conditionLabel}>• Forma de Pagamento: </Text>
                <Text style={styles.conditionText}>{invoice.forma_pagamento}</Text>
              </View>
            )}
            {invoice.validade_dias && (
              <View style={styles.conditionRow}>
                <Text style={styles.conditionLabel}>• Validade: </Text>
                <Text style={styles.conditionText}>{invoice.validade_dias} dias</Text>
              </View>
            )}
          </View>

        </View>
      </Page>
    </Document>
  );
};
