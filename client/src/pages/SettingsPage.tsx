import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';

type PaymentMethod = { id: string; code: string; name: string; enabled: boolean };

export function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  async function load() {
    const result = await api<{
      settings: Record<string, string>;
      paymentMethods: PaymentMethod[];
    }>('/api/settings');
    setSettings(result.settings);
    setMethods(result.paymentMethods);
  }

  useEffect(() => {
    void load().catch((error: unknown) =>
      toast.push(error instanceof Error ? error.message : 'Could not load settings', 'err'),
    );
  }, [toast]);

  async function save() {
    try {
      const result = await api<{ settings: Record<string, string> }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSettings(result.settings);
      toast.push('Settings saved');
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : 'Could not save settings', 'err');
    }
  }

  async function toggleMethod(item: PaymentMethod) {
    try {
      const result = await api<{ paymentMethods: PaymentMethod[] }>(
        `/api/settings/payment-methods/${item.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ enabled: !item.enabled }),
        },
      );
      setMethods(result.paymentMethods);
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : 'Could not update payment method', 'err');
    }
  }

  async function restore(file: File) {
    if (!window.confirm('Restoring a backup will replace current data. Continue?')) return;
    try {
      const base64 = await fileToBase64(file);
      const result = await api<{ message: string }>('/api/backup/restore', {
        method: 'POST',
        body: JSON.stringify({ base64 }),
      });
      toast.push(result.message);
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : 'Restore failed', 'err');
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <h2 className="text-2xl font-semibold text-content">Settings</h2>
        <p className="text-sm text-content-muted">Business defaults, receipt, notifications, and backups</p>
      </header>
      <section className="nexus-panel grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Business name" value={settings.businessName ?? ''} onChange={(value) => patch(setSettings, 'businessName', value)} />
        <Field label="Currency code" value={settings.currencyCode ?? 'JOD'} disabled onChange={() => undefined} />
        <Field label="Currency display" value={settings.currencyDisplay ?? 'JD'} disabled onChange={() => undefined} />
        <Field label="Timezone" value={settings.timezone ?? 'Asia/Amman'} onChange={(value) => patch(setSettings, 'timezone', value)} />
        <Field label="Receipt footer" value={settings.receiptFooter ?? ''} onChange={(value) => patch(setSettings, 'receiptFooter', value)} />
        <Field
          label="Low-time warnings (minutes)"
          value={settings.lowTimeWarningMinutes ?? '10,5'}
          onChange={(value) => patch(setSettings, 'lowTimeWarningMinutes', value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.soundNotifications !== 'false'}
            onChange={(event) => patch(setSettings, 'soundNotifications', String(event.target.checked))}
          />
          Sound notifications
        </label>
        <div className="sm:col-span-2">
          <Button onClick={() => void save()}>Save settings</Button>
        </div>
      </section>

      <section className="nexus-panel p-5">
        <h2 className="mb-3 font-semibold">Payment methods</h2>
        <div className="space-y-2">
          {methods.map((item) => (
            <label key={item.id} className="flex min-h-12 items-center justify-between rounded-lg bg-surface-low px-3 py-2 text-sm">
              <span>{item.name}</span>
              <input type="checkbox" checked={item.enabled} onChange={() => void toggleMethod(item)} />
            </label>
          ))}
        </div>
      </section>

      <section className="nexus-panel p-5">
        <h2 className="font-semibold">Database backup</h2>
        <p className="mb-4 mt-1 text-sm text-content-muted">
          Export the complete SQLite database regularly. Restore replaces current data after confirmation.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary-container bg-primary-container px-4 text-sm font-semibold text-white transition hover:border-primary"
            href="/api/backup"
          >
            <Icon name="download" /> Export backup
          </a>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-outline-variant bg-surface-high px-4 text-sm font-semibold text-content transition hover:border-outline">
            <Icon name="upload" /> Restore backup
            <input
              type="file"
              accept=".sqlite,.db"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void restore(file);
                event.target.value = '';
              }}
            />
          </label>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="nexus-label">{label}</span>
      <input
        disabled={disabled}
        className="nexus-input disabled:text-outline"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function patch(
  setSettings: Dispatch<SetStateAction<Record<string, string>>>,
  key: string,
  value: string,
) {
  setSettings((current) => ({ ...current, [key]: value }));
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read backup file'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(file);
  });
}
