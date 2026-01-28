import React, { useState } from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { MagnifyingGlassIcon, ShoppingCartIcon, TruckIcon, PlusIcon, MinusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { PageTransition } from '../components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../components/Toast';

const Pharmacy = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const { addToast } = useToast();

  const medications = [
    {
      id: 1,
      name: 'Aspirin Pro',
      price: 5.99,
      image: 'https://placeholder-image-service.onrender.com/image/200x200?prompt=White aspirin bottle minimalist packaging&id=aspirin',
      description: 'Advanced pain relief formula, 50 tablets',
      category: 'Pain Relief'
    },
    {
      id: 2,
      name: 'Amoxi-Care',
      price: 12.99,
      image: 'https://placeholder-image-service.onrender.com/image/200x200?prompt=Antibiotic box medicine packaging&id=amoxicillin',
      description: 'Prescription-grade antibiotic course',
      category: 'Antibiotics'
    },
    {
      id: 3,
      name: 'GlucoMet',
      price: 8.99,
      image: 'https://placeholder-image-service.onrender.com/image/200x200?prompt=Diabetes medication bottle blue label&id=metformin',
      description: 'Blood sugar regulation support',
      category: 'Diabetes Care'
    },
    {
      id: 4,
      name: 'VitaBoom C',
      price: 15.50,
      image: 'https://placeholder-image-service.onrender.com/image/200x200?prompt=Orange Vitamin C bottle vibrant&id=vitac',
      description: 'Immunity booster 1000mg',
      category: 'Vitamins'
    }
  ];

  const filteredMeds = medications.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (medication) => {
    const existing = cart.find(item => item.id === medication.id);
    if (existing) {
      setCart(cart.map(item => item.id === medication.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...medication, qty: 1 }]);
    }
    addToast({ title: 'Added to Cart', description: `${medication.name} added.`, variant: 'success' });
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQty = (id, change) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.qty + change);
        return newQty === 0 ? null : { ...item, qty: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    addToast({ title: 'Order Placed!', description: 'Your medications will arrive in 2-4 hours.', variant: 'success' });
    setCart([]);
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  return (
    <PageTransition>
      <div className="min-h-screen py-12 relative overflow-hidden">
        {/* Background Orbs */}
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
              Genuine medicines, fast delivery, right to your doorstep.
            </motion.p>
          </div>

          {/* Search Bar */}
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
            {/* Medications Grid */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Featured Products</h2>
                <span className="text-sm text-gray-500">{filteredMeds.length} items found</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence>
                  {filteredMeds.map((medication, index) => (
                    <motion.div
                      key={medication.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      layout
                    >
                      <Card className="h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 shadow-md overflow-hidden group">
                        <div className="relative aspect-video overflow-hidden bg-gray-100">
                          <img
                            src={medication.image}
                            alt={medication.name}
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold text-gray-600 shadow-sm">
                            {medication.category}
                          </div>
                        </div>
                        <CardContent className="p-5 flex flex-col flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-xl text-gray-900">{medication.name}</h3>
                            <span className="font-bold text-primary-600 text-lg">${medication.price}</span>
                          </div>
                          <p className="text-gray-500 text-sm mb-4 flex-1">{medication.description}</p>
                          <Button
                            onClick={() => addToCart(medication)}
                            className="w-full flex items-center justify-center gap-2 group-hover:bg-primary-600 transition-colors"
                          >
                            <ShoppingCartIcon className="h-5 w-5" />
                            Add to Cart
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {filteredMeds.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <p>No products found matching "{searchTerm}"</p>
                </div>
              )}
            </div>

            {/* Cart Sidebar */}
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
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
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
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
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
                            <p className="text-xs text-gray-500">${item.price} each</p>
                          </div>
                          <div className="flex items-center gap-2 bg-white rounded-lg px-2 py-1 shadow-sm border border-gray-100">
                            <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:text-red-500"><MinusIcon className="h-3 w-3" /></button>
                            <span className="text-sm font-semibold w-4 text-center">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:text-green-500"><PlusIcon className="h-3 w-3" /></button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-gray-600">Total Amount</span>
                      <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                        <TruckIcon className="h-5 w-5" />
                        <span className="font-medium">Free Delivery within 2 hours</span>
                      </div>
                      <Button
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                        className="w-full py-3 text-lg shadow-lg hover:shadow-xl transition-all"
                      >
                        Checkout Now
                      </Button>
                    </div>
                  </div>
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