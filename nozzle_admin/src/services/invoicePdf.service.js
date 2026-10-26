import apiClient from './api';

// Currency Formatter helper
const CurrencyFormatter = {
  format: (amount) => {
    return `${Number(amount || 0).toLocaleString()} د.ع`;
  }
};

// Date formatter
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
}

// Convert image url to Base64 string helper
async function getBase64FromUrl(url) {
  if (!url) return null;
  try {
    // Resolve relative URL to absolute backend URL
    let targetUrl = url;
    if (url.startsWith('http')) {
      targetUrl = url;
    } else if (url.startsWith('/')) {
      targetUrl = url;
    } else if (url.startsWith('static/')) {
      targetUrl = `/${url}`;
    }
    
    const response = await fetch(targetUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Failed to convert image to Base64: ${url}`, error);
    return null;
  }
}

// Default base64 placeholder for nozzle logo if fetch fails
const defaultLogoBase64 = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%237F77DD'/><text x='50%' y='55%' font-family='Arial' font-size='20' fill='white' text-anchor='middle'>NOZZLE</text></svg>";

export async function generateInvoicePDF(order) {
  // 1. Configure Cairo Arabic font in pdfMake
  if (window.pdfMake) {
    window.pdfMake.fonts = {
      Cairo: {
        normal: 'https://fonts.gstatic.com/s/cairo/v28/SLX91OOmF-vpiOtSGo7-Hw.ttf',
        bold: 'https://fonts.gstatic.com/s/cairo/v28/SLX91OOmF-vpiOtSGo7-Hw.ttf',
      }
    };
  }

  // 2. Fetch store logo Base64
  let storeLogoBase64 = await getBase64FromUrl('/logonozzle.png');
  if (!storeLogoBase64) {
    storeLogoBase64 = defaultLogoBase64;
  }

  // 3. Fetch product images Base64 in parallel
  const productImages = await Promise.all(
    order.items.map(async (item) => {
      const imgUrl = item.product?.image_url;
      if (imgUrl) {
        const base64 = await getBase64FromUrl(imgUrl);
        return base64 || defaultLogoBase64;
      }
      return defaultLogoBase64;
    })
  );

  // 4. Construct pdfMake Doc Definition
  const docDefinition = {
    pageDirection: 'RTL',
    defaultStyle: { font: 'Cairo', fontSize: 11 },
    content: [
      // Header: Store Logo + Invoice Metadata
      {
        columns: [
          { 
            image: storeLogoBase64, 
            width: 70,
            alignment: 'right'
          },
          {
            stack: [
              { text: `فاتورة رقم: ${order.invoice_number || 'INV-' + order.id}`, style: 'header', alignment: 'left' },
              { text: `التاريخ: ${formatDate(order.created_at)}`, alignment: 'left', margin: [0, 4, 0, 0] },
              { text: `طريقة الدفع: ${order.payment_method === 'cash' ? 'نقدًا عند الاستلام' : 'دفع إلكتروني'}`, alignment: 'left', margin: [0, 2, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 0, 20]
      },
      
      // Horizontal Line Divider
      {
        canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, strokeColor: '#E5E7EB' }],
        margin: [0, 0, 0, 15]
      },

      // Customer Details
      {
        table: {
          widths: ['*'],
          body: [[
            {
              stack: [
                { text: 'بيانات العميل والطلب', style: 'sectionTitle' },
                { text: `الاسم: ${order.customer?.name || order.customer_name}`, margin: [0, 2] },
                { text: `الهاتف: ${order.customer?.phone || order.customer_phone}`, margin: [0, 2] },
                { text: `العنوان: ${order.address || 'لا يوجد عنوان مسجل'}`, margin: [0, 2] },
                order.notes ? { text: `ملاحظات: ${order.notes}`, margin: [0, 2], color: '#DC2626' } : {},
              ],
              fillColor: '#F9FAFB',
              border: [false, false, false, false],
              padding: [10, 10, 10, 10]
            },
          ]],
        },
        margin: [0, 0, 0, 20]
      },

      // Products Table
      {
        table: {
          headerRows: 1,
          widths: [50, '*', 50, 80, 90],
          body: [
            // Header Row
            [
              { text: 'الصورة', style: 'tableHeader', alignment: 'center' },
              { text: 'المنتج', style: 'tableHeader', alignment: 'right' },
              { text: 'الكمية', style: 'tableHeader', alignment: 'center' },
              { text: 'السعر', style: 'tableHeader', alignment: 'center' },
              { text: 'الإجمالي', style: 'tableHeader', alignment: 'center' }
            ],
            // Data Rows
            ...order.items.map((item, i) => [
              { 
                image: productImages[i], 
                width: 32, 
                height: 32, 
                alignment: 'center',
                margin: [0, 4]
              },
              {
                stack: [
                  { text: item.product?.name || 'منتج غير معروف', bold: true, margin: [0, 4, 0, 2] },
                  (item.selected_size || item.selected_color) ? { 
                    text: `المقاس: ${item.selected_size || '-'} | اللون: ${item.selected_color || '-'}`, 
                    fontSize: 9, 
                    color: '#6B7280' 
                  } : {},
                ],
                alignment: 'right'
              },
              { text: item.quantity.toString(), alignment: 'center', margin: [0, 12] },
              { text: CurrencyFormatter.format(item.price), alignment: 'center', margin: [0, 12] },
              { text: CurrencyFormatter.format(item.price * item.quantity), alignment: 'center', margin: [0, 12] },
            ]),
          ],
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 1 : 1,
          vLineWidth: () => 0,
          hLineColor: () => '#E5E7EB',
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 20]
      },

      // Invoice Totals
      {
        columns: [
          { text: '', width: '*' }, // spacer
          {
            width: 220,
            table: {
              widths: ['*', 90],
              body: [
                [
                  { text: 'المجموع الفرعي', alignment: 'right', margin: [0, 3] },
                  { text: CurrencyFormatter.format(order.subtotal), alignment: 'left', margin: [0, 3] }
                ],
                [
                  { text: 'رسوم التوصيل', alignment: 'right', margin: [0, 3] },
                  { text: CurrencyFormatter.format(order.delivery_fee), alignment: 'left', margin: [0, 3] }
                ],
                order.coupon_discount > 0 ? [
                  { text: `خصم الكوبون (${order.coupon_code || 'كود'})`, alignment: 'right', margin: [0, 3], color: '#DC2626' },
                  { text: `- ${CurrencyFormatter.format(order.coupon_discount)}`, alignment: 'left', margin: [0, 3], color: '#DC2626' }
                ] : null,
                [
                  { text: 'الإجمالي النهائي', bold: true, fontSize: 13, alignment: 'right', margin: [0, 5] },
                  { text: CurrencyFormatter.format(order.total), bold: true, fontSize: 13, alignment: 'left', margin: [0, 5], color: '#4F46E5' }
                ],
              ].filter(Boolean),
            },
            layout: {
              hLineWidth: (i, node) => (i === node.table.body.length - 1) ? 1.5 : 1,
              vLineWidth: () => 0,
              hLineColor: (i, node) => (i === node.table.body.length - 1) ? '#4F46E5' : '#E5E7EB',
              paddingTop: () => 4,
              paddingBottom: () => 4,
            }
          }
        ],
        margin: [0, 0, 0, 30]
      },

      // Footer Notes
      {
        text: 'جميع الأسعار بالدينار العراقي (IQD)',
        style: 'footer',
        alignment: 'center',
        margin: [0, 0, 0, 4]
      },
      {
        text: 'شكراً لتعاملكم معنا ❤️',
        style: 'footerBold',
        alignment: 'center'
      }
    ],
    styles: {
      header: { fontSize: 16, bold: true, color: '#4F46E5' },
      sectionTitle: { fontSize: 12, bold: true, color: '#1F2937', margin: [0, 0, 0, 6] },
      tableHeader: { bold: true, fontSize: 10, fillColor: '#F3F4F6', color: '#374151', margin: [0, 4] },
      footer: { fontSize: 9, color: '#9CA3AF' },
      footerBold: { fontSize: 11, bold: true, color: '#4F46E5' }
    }
  };

  // 5. Generate and download PDF
  if (window.pdfMake) {
    window.pdfMake.createPdf(docDefinition).download(`فاتورة-${order.invoice_number || order.id}.pdf`);
  } else {
    console.error("pdfMake is not loaded on the window object.");
    alert("مكتبة pdfMake غير محملة حالياً، يرجى إعادة المحاولة.");
  }
}
