import { formatJod, parseJodToFils } from '@pscenter/shared';
import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';
import type { ProductDto } from '../lib/types';

export function ProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [editing, setEditing] = useState<ProductDto | null | 'new'>(null);

  async function load() {
    const result = await api<{ products: ProductDto[] }>('/api/products?all=1');
    setProducts(result.products);
  }

  useEffect(() => {
    void load().catch((error: unknown) =>
      toast.push(error instanceof Error ? error.message : 'Could not load products', 'err'),
    );
  }, [toast]);

  async function remove(product: ProductDto) {
    if (!window.confirm(`Delete ${product.name}? Historical transactions will not be affected.`)) return;
    try {
      await api(`/api/products/${product.id}`, { method: 'DELETE' });
      await load();
      toast.push('Product removed');
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : 'Could not remove product', 'err');
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-content">Products & extras</h2>
          <p className="text-sm text-content-muted">Quick-sale catalog and optional stock</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Icon name="plus" /> Add product
        </Button>
      </header>
      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface">
        <table className="nexus-table">
          <thead>
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="bg-surface transition-colors hover:bg-surface-high">
                <td className="p-3 font-medium">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-highest text-primary">
                      <Icon name="products" size={17} />
                    </span>
                    {product.name}
                  </div>
                </td>
                <td className="p-3">{product.category}</td>
                <td className="p-3 font-mono">{formatJod(product.priceFils)}</td>
                <td className="p-3">{product.stockQuantity ?? 'Not tracked'}</td>
                <td className="p-3">{product.active ? 'Active' : 'Inactive'}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setEditing(product)}>
                      <Icon name="edit" size={15} /> Edit
                    </Button>
                    <Button variant="ghost" onClick={() => void remove(product)}>
                      <Icon name="trash" size={15} /> Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
            toast.push('Product saved');
          }}
        />
      )}
    </div>
  );
}

function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product: ProductDto | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? 'General');
  const [price, setPrice] = useState(product ? formatJod(product.priceFils, { withUnit: false }) : '0.50');
  const [stock, setStock] = useState(product?.stockQuantity?.toString() ?? '');
  const [active, setActive] = useState(product?.active ?? true);

  async function save() {
    try {
      const body = {
        name,
        category,
        priceFils: parseJodToFils(price),
        stockQuantity: stock === '' ? null : Number(stock),
        active,
      };
      await api(product ? `/api/products/${product.id}` : '/api/products', {
        method: product ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      await onSaved();
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : 'Enter valid product details', 'err');
    }
  }

  return (
    <Modal title={product ? `Edit ${product.name}` : 'Add product'} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Category" value={category} onChange={setCategory} />
        <Field label="Price (JD)" value={price} onChange={setPrice} />
        <Field label="Stock (blank = not tracked)" value={stock} onChange={setStock} type="number" />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!name.trim()} onClick={() => void save()}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="nexus-label">{label}</span>
      <input
        type={type}
        min={type === 'number' ? 0 : undefined}
        className="nexus-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
