async function testStorefronts() {
  const storeRes = await fetch('http://localhost:3000/api/products?businessId=biz_annapurna&sourceType=store');
  const storeData = await storeRes.json();
  console.log('Store products count:', storeData.products.length);

  const menuRes = await fetch('http://localhost:3000/api/products?businessId=biz_annapurna&sourceType=menu');
  const menuData = await menuRes.json();
  console.log('Menu products count:', menuData.products.length);

  // Place Store Order
  const storeOrderRes = await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessId: 'biz_annapurna',
      sourceType: 'store',
      fulfillmentType: 'takeaway',
      customer: { name: 'Live Store Shopper', phone: '+91 91111 22222' },
      items: [{
        productId: storeData.products[0].id,
        productName: storeData.products[0].name,
        price: storeData.products[0].price,
        quantity: 1,
        itemTotal: storeData.products[0].price
      }],
      subtotal: storeData.products[0].price,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      total: storeData.products[0].price,
      paymentMethod: 'upi',
      paymentStatus: 'paid'
    })
  });
  const storeOrderData = await storeOrderRes.json();
  console.log('Store Order Created:', {
    token: storeOrderData.order.tokenNumber,
    trackingId: storeOrderData.order.trackingId,
    sourceType: storeOrderData.order.sourceType
  });

  // Place Menu Order
  const menuOrderRes = await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessId: 'biz_annapurna',
      sourceType: 'menu',
      fulfillmentType: 'dine_in',
      tableNumber: 'Table 9',
      customer: { name: 'Live Diner', phone: '+91 93333 44444' },
      items: [{
        productId: menuData.products[0].id,
        productName: menuData.products[0].name,
        price: menuData.products[0].price,
        quantity: 2,
        itemTotal: menuData.products[0].price * 2
      }],
      subtotal: menuData.products[0].price * 2,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      total: menuData.products[0].price * 2,
      paymentMethod: 'counter',
      paymentStatus: 'pay_at_counter'
    })
  });
  const menuOrderData = await menuOrderRes.json();
  console.log('Menu Order Created:', {
    token: menuOrderData.order.tokenNumber,
    trackingId: menuOrderData.order.trackingId,
    sourceType: menuOrderData.order.sourceType
  });

  // Verify Tracking API
  const trackRes = await fetch(`http://localhost:3000/api/orders/track/${menuOrderData.order.trackingId}`);
  const trackData = await trackRes.json();
  console.log('Track API verified:', {
    found: trackData.success,
    token: trackData.order.tokenNumber,
    status: trackData.order.orderStatus
  });

  // Verify Store and Menu order separation
  const verifyStoreRes = await fetch('http://localhost:3000/api/orders?businessId=biz_annapurna&sourceType=store');
  const verifyStoreData = await verifyStoreRes.json();
  const menuOrderInStore = verifyStoreData.orders.some(o => o.sourceType === 'menu');
  console.log('Strict isolation check: Are any Menu orders in Store orders?', menuOrderInStore ? 'VIOLATION DETECTED' : 'PASSED (0 Menu orders in Store list)');

  const verifyMenuRes = await fetch('http://localhost:3000/api/orders?businessId=biz_annapurna&sourceType=menu');
  const verifyMenuData = await verifyMenuRes.json();
  const storeOrderInMenu = verifyMenuData.orders.some(o => o.sourceType === 'store');
  console.log('Strict isolation check: Are any Store orders in Menu orders?', storeOrderInMenu ? 'VIOLATION DETECTED' : 'PASSED (0 Store orders in Menu list)');
}

testStorefronts();
