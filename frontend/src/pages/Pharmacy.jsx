import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import {
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  TruckIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { PageTransition } from '../components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../components/Toast';
import {
  getPharmacyProducts,
  createPharmacyOrder,
  getMyPharmacyOrders,
  cancelPharmacyOrder
} from '../utils/api';

const Pharmacy = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState('');
  const { addToast } = useToast();

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const list = await getPharmacyProducts({ inStock: true });
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      addToast({ title: 'Failed to load products', description: e.message, variant: 'error' });
    } finally {
      setLoadingProducts(false);
    }
  }, [addToast]);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await getMyPharmacyOrders({ page: 1, limit: 10 });
      setOrders(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      addToast({ title: 'Failed to load orders', description: e.message, variant: 'error' });
    } finally {
      setLoadingOrders(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, [loadProducts, loadOrders]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) =>
      String(p.name || '').toLowerCase().includes(term) ||
      String(p.category || '').toLowerCase().includes(term) ||
      String(p.description || '').toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const addToCart = (product) => {
    const stock = Number(product.stock || 0);
    const existing = cart.find((item) => item.id === product.id);
    if (existing && existing.qty >= stock) {
      addToast({ title: 'Stock limit reached', description: `Only ${stock} available`, variant: 'error' });
      return;
    }

    if (existing) {
      setCart((prev) => prev.map((item) => (
        item.id === product.id ? { ...item, qty: item.qty + 1 } : item
      )));
    } else {
      setCart((prev) => [...prev, { ...product, qty: 1 }]);
    }
    addToast({ title: 'Added to Cart', description: `${product.name} added.`, variant: 'success' });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQty = (id, change) => {
    setCart((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const nextQty = Math.max(0, item.qty + change);
      const stock = Number(item.stock || 0);
      if (nextQty > stock) {
        addToast({ title: 'Stock limit reached', description: `Only ${stock} available`, variant: 'error' });
        return item;
      }
      return nextQty === 0 ? null : { ...item, qty: nextQty };
    }).filter(Boolean));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setPlacingOrder(true);
    try {
      await createPharmacyOrder({
        items: cart.map((item) => ({ productId: item.id, qty: item.qty })),
        notes,
        deliveryAddress
      });
      addToast({ title: 'Order Placed!', description: 'Your order has been placed successfully.', variant: 'success' });
      setCart([]);
      setNotes('');
      setDeliveryAddress('');
      await Promise.all([loadProducts(), loadOrders()]);
    } catch (e) {
      addToast({ title: 'Checkout failed', description: e.message, variant: 'error' });
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    setCancellingOrderId(orderId);
    try {
      await cancelPharmacyOrder(orderId);
      addToast({ title: 'Order cancelled', variant: 'success' });
      await Promise.all([loadProducts(), loadOrders()]);
    } catch (e) {
      addToast({ title: 'Cancel failed', description: e.message, variant: 'error' });
    } finally {
      setCancellingOrderId('');
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * item.qty), 0);
  const deliveryFee = subtotal >= 20 || subtotal === 0 ? 0 : 2.99;
  const total = subtotal + deliveryFee;

  return (
    <PageTransition>
      <div className="min-h-screen py-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-100/30 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary-100/30 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-primary-600 mb-4"
            >
              Online Pharmacy
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600"
            >
              Genuine medicines, real inventory, and tracked orders.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="relative max-w-2xl mx-auto group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-green-400 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300 pointer-events-none"></div>
              <div className="relative bg-white rounded-xl shadow-sm border border-gray-200 flex items-center overflow-hidden">
                <MagnifyingGlassIcon className="h-6 w-6 text-gray-400 ml-4" />
                <input
                  type="text"
                  placeholder="Search for medicines, health products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-4 outline-none text-gray-700 text-lg placeholder-gray-400"
                />
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Available Products</h2>
                <span className="text-sm text-gray-500">
                  {loadingProducts ? 'Loading...' : `${filteredProducts.length} items found`}
                </span>
              </div>

              {loadingProducts ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="h-64 rounded-2xl bg-white animate-pulse border border-gray-100" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatePresence>
                    {filteredProducts.map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.04 }}
                        layout
                      >
                        <Card className="h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 shadow-md overflow-hidden group">
                          <div className="relative aspect-video overflow-hidden bg-gray-100">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold text-gray-600 shadow-sm">
                              {product.category}
                            </div>
                            {product.prescriptionRequired && (
                              <div className="absolute top-2 left-2 bg-amber-100 text-amber-800 px-2 py-1 rounded-md text-xs font-semibold">
                                Rx
                              </div>
                            )}
                          </div>
                          <CardContent className="p-5 flex flex-col flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-bold text-xl text-gray-900">{product.name}</h3>
                              <span className="font-bold text-primary-600 text-lg">${Number(product.price || 0).toFixed(2)}</span>
                            </div>
                            <p className="text-gray-500 text-sm mb-2 flex-1">{product.description}</p>
                            <p className="text-xs text-gray-500 mb-4">Stock: {product.stock}</p>
                            <Button
                              onClick={() => addToCart(product)}
                              disabled={Number(product.stock || 0) <= 0}
                              className="w-full flex items-center justify-center gap-2 group-hover:bg-primary-600 transition-colors"
                            >
                              <ShoppingCartIcon className="h-5 w-5" />
                              {Number(product.stock || 0) <= 0 ? 'Out of Stock' : 'Add to Cart'}
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {!loadingProducts && filteredProducts.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <p>No products found matching "{searchTerm}"</p>
                </div>
              )}
            </div>

            <motion.div
              className="lg:sticky lg:top-24 space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card variant="glass" className="border-t-4 border-t-primary-500 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                    <CardTitle className="text-xl">Your Cart</CardTitle>
                    <div className="relative">
                      <ShoppingCartIcon className="h-7 w-7 text-gray-700" />
                      {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                          {cart.reduce((a, b) => a + b.qty, 0)}
                        </span>
                      )}
                    </div>
                  </div>

                  {cart.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                      <ShoppingCartIcon className="h-16 w-16 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500">Your cart is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                      {cart.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center justify-between bg-white/50 p-2 rounded-lg"
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-gray-800">{item.name}</h4>
                            <p className="text-xs text-gray-500">${Number(item.price || 0).toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:text-red-500"><MinusIcon className="h-3 w-3" /></button>
                            <span className="text-sm font-semibold w-6 text-center">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:text-green-500"><PlusIcon className="h-3 w-3" /></button>
                            <button onClick={() => removeFromCart(item.id)} className="p-1 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    <input
                      type="text"
                      placeholder="Delivery address (optional)"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      placeholder="Order notes (optional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="text-gray-600">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-3">
                      <span className="text-gray-600">Delivery</span>
                      <span>${deliveryFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-gray-700 font-semibold">Total</span>
                      <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                        <TruckIcon className="h-5 w-5" />
                        <span className="font-medium">Free delivery above $20</span>
                      </div>
                      <Button
                        onClick={handleCheckout}
                        loading={placingOrder}
                        disabled={cart.length === 0 || placingOrder}
                        className="w-full py-3 text-lg shadow-lg hover:shadow-xl transition-all"
                      >
                        Checkout Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-lg">Recent Orders</CardTitle>
                    <ClockIcon className="h-5 w-5 text-gray-500" />
                  </div>

                  {loadingOrders ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} className="h-12 bg-gray-100 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <p className="text-sm text-gray-500">No pharmacy orders yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {orders.map((order) => (
                        <div key={order.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold">#{order.id.slice(-6)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            {new Date(order.createdAt).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-700">Items: {order.items.length}</div>
                          <div className="text-sm font-semibold">Total: ${Number(order.total || 0).toFixed(2)}</div>
                          {['placed', 'processing'].includes(order.status) && (
                            <button
                              className="mt-2 text-xs text-red-600 hover:underline disabled:opacity-50"
                              disabled={cancellingOrderId === order.id}
                              onClick={() => handleCancelOrder(order.id)}
                            >
                              {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel order'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Pharmacy;
