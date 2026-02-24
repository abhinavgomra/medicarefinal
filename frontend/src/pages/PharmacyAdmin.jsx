import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { PageTransition } from '../components/PageTransition';
import { useToast } from '../components/Toast';
import {
  createPharmacyProduct,
  getAdminPharmacyProducts,
  getPharmacyOrdersAdmin,
  updatePharmacyOrderStatus,
  updatePharmacyProduct
} from '../utils/api';
import {
  ArrowPathIcon,
  CubeIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const ORDER_STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];

const EMPTY_PRODUCT_FORM = {
  name: '',
  description: '',
  category: 'General',
  price: '',
  stock: '',
  image: '',
  prescriptionRequired: false,
  active: true
};

function toProductEdit(product) {
  return {
    name: String(product.name || ''),
    description: String(product.description || ''),
    category: String(product.category || 'General'),
    price: String(Number(product.price || 0)),
    stock: String(Number(product.stock || 0)),
    image: String(product.image || ''),
    prescriptionRequired: Boolean(product.prescriptionRequired),
    active: Boolean(product.active)
  };
}

const PharmacyAdmin = () => {
  const { addToast } = useToast();
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [savingProductId, setSavingProductId] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState('');

  const [products, setProducts] = useState([]);
  const [productEdits, setProductEdits] = useState({});
  const [productSearch, setProductSearch] = useState('');
  const [productActiveFilter, setProductActiveFilter] = useState('all');

  const [orders, setOrders] = useState([]);
  const [orderDraftStatus, setOrderDraftStatus] = useState({});
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderEmailFilter, setOrderEmailFilter] = useState('');

  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT_FORM);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const active =
        productActiveFilter === 'all'
          ? undefined
          : productActiveFilter === 'true';
      const res = await getAdminPharmacyProducts({
        page: 1,
        limit: 200,
        q: productSearch || undefined,
        active
      });
      const list = Array.isArray(res?.items) ? res.items : [];
      setProducts(list);
      setProductEdits(Object.fromEntries(list.map((p) => [String(p.id), toProductEdit(p)])));
    } catch (e) {
      addToast({ title: 'Failed to load products', description: e.message, variant: 'error' });
    } finally {
      setLoadingProducts(false);
    }
  }, [addToast, productActiveFilter, productSearch]);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await getPharmacyOrdersAdmin({
        page: 1,
        limit: 100,
        status: orderStatusFilter || undefined,
        userEmail: orderEmailFilter || undefined
      });
      const list = Array.isArray(res?.items) ? res.items : [];
      setOrders(list);
      setOrderDraftStatus((prev) => {
        const next = { ...prev };
        for (const order of list) {
          if (!next[order.id]) next[order.id] = order.status;
        }
        return next;
      });
    } catch (e) {
      addToast({ title: 'Failed to load orders', description: e.message, variant: 'error' });
    } finally {
      setLoadingOrders(false);
    }
  }, [addToast, orderStatusFilter, orderEmailFilter]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadProducts(), loadOrders()]);
  }, [loadProducts, loadOrders]);

  React.useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.active).length;
    const lowStockProducts = products.filter((p) => Number(p.stock || 0) <= 5).length;
    const deliveredRevenue = orders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    return {
      totalProducts,
      activeProducts,
      lowStockProducts,
      deliveredRevenue
    };
  }, [orders, products]);

  const handleCreateProduct = async () => {
    const price = Number(newProduct.price);
    const stock = Number(newProduct.stock);
    if (!String(newProduct.name || '').trim()) {
      addToast({ title: 'Name is required', variant: 'error' });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      addToast({ title: 'Valid price is required', variant: 'error' });
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      addToast({ title: 'Valid stock is required', variant: 'error' });
      return;
    }

    setCreatingProduct(true);
    try {
      await createPharmacyProduct({
        ...newProduct,
        name: String(newProduct.name).trim(),
        description: String(newProduct.description || '').trim(),
        category: String(newProduct.category || 'General').trim(),
        image: String(newProduct.image || '').trim(),
        price: Number(price.toFixed(2)),
        stock: Math.floor(stock)
      });
      setNewProduct(EMPTY_PRODUCT_FORM);
      addToast({ title: 'Product created', variant: 'success' });
      await loadProducts();
    } catch (e) {
      addToast({ title: 'Create failed', description: e.message, variant: 'error' });
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleSaveProduct = async (productId) => {
    const edit = productEdits[String(productId)];
    if (!edit) return;
    const payload = {
      name: String(edit.name || '').trim(),
      description: String(edit.description || '').trim(),
      category: String(edit.category || '').trim(),
      image: String(edit.image || '').trim(),
      price: Number(Number(edit.price).toFixed(2)),
      stock: Math.max(0, Math.floor(Number(edit.stock))),
      prescriptionRequired: Boolean(edit.prescriptionRequired),
      active: Boolean(edit.active)
    };

    if (!payload.name) {
      addToast({ title: 'Product name cannot be empty', variant: 'error' });
      return;
    }
    if (!Number.isFinite(payload.price) || payload.price < 0) {
      addToast({ title: 'Invalid product price', variant: 'error' });
      return;
    }
    if (!Number.isFinite(payload.stock) || payload.stock < 0) {
      addToast({ title: 'Invalid product stock', variant: 'error' });
      return;
    }

    setSavingProductId(String(productId));
    try {
      await updatePharmacyProduct(productId, payload);
      addToast({ title: `Saved product #${productId}`, variant: 'success' });
      await loadProducts();
    } catch (e) {
      addToast({ title: 'Update failed', description: e.message, variant: 'error' });
    } finally {
      setSavingProductId('');
    }
  };

  const handleUpdateOrderStatus = async (order) => {
    const nextStatus = orderDraftStatus[order.id] || order.status;
    setUpdatingOrderId(order.id);
    try {
      await updatePharmacyOrderStatus(order.id, nextStatus);
      addToast({ title: `Order ${order.id.slice(-6)} updated`, variant: 'success' });
      await Promise.all([loadOrders(), loadProducts()]);
    } catch (e) {
      addToast({ title: 'Order update failed', description: e.message, variant: 'error' });
    } finally {
      setUpdatingOrderId('');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Pharmacy Admin Portal</h1>
            <p className="text-slate-600 mt-1">Manage inventory, orders, and fulfillment status.</p>
          </div>
          <Button
            onClick={refreshAll}
            disabled={loadingProducts || loadingOrders}
            className="inline-flex items-center gap-2"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Products</CardTitle>
                <CubeIcon className="h-5 w-5 text-primary-600" />
              </div>
              <div className="text-2xl font-bold mt-2">{stats.totalProducts}</div>
              <div className="text-xs text-gray-500">Total inventory rows</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <CardTitle className="text-sm">Active Products</CardTitle>
              <div className="text-2xl font-bold mt-2">{stats.activeProducts}</div>
              <div className="text-xs text-gray-500">Currently sellable</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Low Stock</CardTitle>
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
              </div>
              <div className="text-2xl font-bold mt-2">{stats.lowStockProducts}</div>
              <div className="text-xs text-gray-500">Stock at 5 or below</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Delivered Revenue</CardTitle>
                <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold mt-2">${stats.deliveredRevenue.toFixed(2)}</div>
              <div className="text-xs text-gray-500">From delivered orders</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <Card className="xl:col-span-2">
            <CardContent className="p-5 space-y-4">
              <CardTitle>Add Product</CardTitle>
              <input
                value={newProduct.name}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Product name"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description"
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={newProduct.category}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Category"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  value={newProduct.image}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, image: e.target.value }))}
                  placeholder="Image URL"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="Price"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, stock: e.target.value }))}
                  placeholder="Stock"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newProduct.prescriptionRequired}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, prescriptionRequired: e.target.checked }))}
                  />
                  Prescription Required
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newProduct.active}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, active: e.target.checked }))}
                  />
                  Active
                </label>
              </div>
              <Button onClick={handleCreateProduct} loading={creatingProduct} disabled={creatingProduct}>
                Create Product
              </Button>
            </CardContent>
          </Card>

          <Card className="xl:col-span-3">
            <CardContent className="p-5">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-4">
                <CardTitle>Inventory</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <select
                    value={productActiveFilter}
                    onChange={(e) => setProductActiveFilter(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="all">All</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  <Button onClick={loadProducts} disabled={loadingProducts}>
                    Apply
                  </Button>
                </div>
              </div>

              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {loadingProducts && <div className="text-sm text-gray-500">Loading products...</div>}
                {!loadingProducts && products.length === 0 && (
                  <div className="text-sm text-gray-500">No products found.</div>
                )}
                {products.map((p) => {
                  const edit = productEdits[String(p.id)] || toProductEdit(p);
                  return (
                    <div key={p.id} className="border rounded-xl p-3 space-y-2 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">
                          #{p.id} {p.name}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {p.active ? 'active' : 'inactive'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          value={edit.name}
                          onChange={(e) => setProductEdits((prev) => ({
                            ...prev,
                            [String(p.id)]: { ...edit, name: e.target.value }
                          }))}
                          className="px-3 py-2 border rounded-lg text-sm"
                        />
                        <input
                          value={edit.category}
                          onChange={(e) => setProductEdits((prev) => ({
                            ...prev,
                            [String(p.id)]: { ...edit, category: e.target.value }
                          }))}
                          className="px-3 py-2 border rounded-lg text-sm"
                        />
                        <input
                          value={edit.price}
                          onChange={(e) => setProductEdits((prev) => ({
                            ...prev,
                            [String(p.id)]: { ...edit, price: e.target.value }
                          }))}
                          className="px-3 py-2 border rounded-lg text-sm"
                        />
                        <input
                          value={edit.stock}
                          onChange={(e) => setProductEdits((prev) => ({
                            ...prev,
                            [String(p.id)]: { ...edit, stock: e.target.value }
                          }))}
                          className="px-3 py-2 border rounded-lg text-sm"
                        />
                        <input
                          value={edit.image}
                          onChange={(e) => setProductEdits((prev) => ({
                            ...prev,
                            [String(p.id)]: { ...edit, image: e.target.value }
                          }))}
                          placeholder="Image URL"
                          className="md:col-span-2 px-3 py-2 border rounded-lg text-sm"
                        />
                        <textarea
                          value={edit.description}
                          onChange={(e) => setProductEdits((prev) => ({
                            ...prev,
                            [String(p.id)]: { ...edit, description: e.target.value }
                          }))}
                          rows={2}
                          className="md:col-span-2 px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-4 text-xs">
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={edit.prescriptionRequired}
                              onChange={(e) => setProductEdits((prev) => ({
                                ...prev,
                                [String(p.id)]: { ...edit, prescriptionRequired: e.target.checked }
                              }))}
                            />
                            Prescription
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={edit.active}
                              onChange={(e) => setProductEdits((prev) => ({
                                ...prev,
                                [String(p.id)]: { ...edit, active: e.target.checked }
                              }))}
                            />
                            Active
                          </label>
                        </div>
                        <Button
                          onClick={() => handleSaveProduct(p.id)}
                          loading={savingProductId === String(p.id)}
                          disabled={savingProductId === String(p.id)}
                          className="text-sm px-3 py-2"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-4">
              <CardTitle>Orders</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={orderEmailFilter}
                  onChange={(e) => setOrderEmailFilter(e.target.value)}
                  placeholder="Filter by patient email"
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">All statuses</option>
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <Button onClick={loadOrders} disabled={loadingOrders}>Apply</Button>
              </div>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {loadingOrders && <div className="text-sm text-gray-500">Loading orders...</div>}
              {!loadingOrders && orders.length === 0 && (
                <div className="text-sm text-gray-500">No orders found for current filters.</div>
              )}
              {orders.map((order) => (
                <div key={order.id} className="border rounded-xl p-3 bg-white">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">
                        Order #{order.id.slice(-6)} • {order.userEmail}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleString()} • Items: {order.items.length}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">${Number(order.total || 0).toFixed(2)}</div>
                  </div>

                  <div className="mt-2 text-xs text-gray-600">
                    {order.items.map((item) => `${item.name} x${item.qty}`).join(', ')}
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <select
                      value={orderDraftStatus[order.id] || order.status}
                      onChange={(e) => setOrderDraftStatus((prev) => ({ ...prev, [order.id]: e.target.value }))}
                      className="px-3 py-2 border rounded-lg text-sm"
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <Button
                      onClick={() => handleUpdateOrderStatus(order)}
                      loading={updatingOrderId === order.id}
                      disabled={updatingOrderId === order.id}
                      className="text-sm px-3 py-2"
                    >
                      Update Status
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default PharmacyAdmin;
