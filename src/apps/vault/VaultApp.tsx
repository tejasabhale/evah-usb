import React, { useState, useEffect } from 'react';
import { 
  Shield, KeyRound, Key, FileText, Lock, Unlock, Eye, EyeOff, 
  Copy, Plus, Trash2, Edit3, Star, Search, Check, ExternalLink, RefreshCw, X, ShieldAlert, Server 
} from 'lucide-react';
import { VaultCategory, VaultItem } from '@/types/vault';
import { useVaultStore } from '@/stores/useVaultStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { SearchInput, Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';

export const VaultApp: React.FC = () => {
  const {
    isConfigured,
    isUnlocked,
    items,
    selectedCategory,
    searchQuery,
    isBusy,
    error,
    checkConfigured,
    setup,
    unlock,
    changePassword,
    lock,
    setCategory,
    setSearchQuery,
    addItem,
    updateItem,
    deleteItem,
    copySecret,
  } = useVaultStore();

  const user = useSessionStore((s) => s.user);
  const lifecycle = useSessionStore((s) => s.lifecycle);

  // Setup state (first boot/open)
  const [setupPassword, setSetupPassword] = useState('');
  const [confirmSetupPassword, setConfirmSetupPassword] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);

  // Unlock state
  const [unlockPassword, setUnlockPassword] = useState('');

  // Change password modal state
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [curPassword, setCurPassword] = useState('');
  const [newVaultPassword, setNewVaultPassword] = useState('');
  const [confirmNewVaultPassword, setConfirmNewVaultPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    checkConfigured();
  }, [checkConfigured]);

  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modal form state
  const [editId, setEditId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<VaultCategory>('passwords');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formTags, setFormTags] = useState('');

  const selectedItem = items.find((it) => it.id === selectedItemId) || null;

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = (text: string, label: string, fieldKey: string) => {
    copySecret(text, label);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setFormTitle('');
    setFormCategory('passwords');
    setFormUsername('');
    setFormPassword(generateSecurePassword());
    setFormUrl('');
    setFormNotes('');
    setFormTags('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: VaultItem) => {
    setEditId(item.id);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormUsername(item.username || '');
    setFormPassword(item.password || '');
    setFormUrl(item.url || '');
    setFormNotes(item.notes || '');
    setFormTags(item.tags?.join(', ') || '');
    setIsModalOpen(true);
  };

  const generateSecurePassword = (length = 20): string => {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+';
    const randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);
    return Array.from(randomValues, (x) => charset[x % charset.length]).join('');
  };

  const calculatePasswordStrength = (pass: string): { label: string; color: string; score: number } => {
    if (!pass) return { label: 'Empty', color: 'bg-slate-600', score: 0 };
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (pass.length >= 16) score += 25;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score += 25;

    if (score <= 25) return { label: 'Weak', color: 'bg-rose-500', score };
    if (score <= 50) return { label: 'Fair', color: 'bg-amber-500', score };
    if (score <= 75) return { label: 'Good', color: 'bg-sky-500', score };
    return { label: 'Strong', color: 'bg-emerald-500', score };
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) return;

    const tags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editId) {
      await updateItem(editId, {
        title: formTitle,
        category: formCategory,
        username: formUsername,
        password: formPassword,
        url: formUrl,
        notes: formNotes,
        tags,
      });
    } else {
      await addItem({
        title: formTitle,
        category: formCategory,
        username: formUsername,
        password: formPassword,
        url: formUrl,
        notes: formNotes,
        tags,
        isFavorite: false,
      });
    }

    setIsModalOpen(false);
  };

  const categories: { id: VaultCategory | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: 'All Items', icon: Shield },
    { id: 'passwords', label: 'Logins & Passwords', icon: KeyRound },
    { id: 'api-keys', label: 'API Keys & Tokens', icon: Key },
    { id: 'recovery-phrases', label: 'Recovery Seeds', icon: ShieldAlert },
    { id: 'notes', label: 'Secure Notes', icon: FileText },
    { id: 'secrets', label: 'Server & SSH Secrets', icon: Server },
  ];

  const filteredItems = items.filter((it) => {
    const matchesCat = selectedCategory === 'all' || it.category === selectedCategory;
    const matchesQuery =
      it.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (it.username && it.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (it.tags && it.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCat && matchesQuery;
  });

  // State 1: Vault is Locked or Unconfigured
  if (!isUnlocked) {
    if (!isConfigured) {
      // First-time Vault Setup Flow
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-evah-surface p-6 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4 shadow-xl">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-white tracking-wide">
            Set Up Vault
          </h2>
          <p className="text-xs text-evah-text-muted max-w-sm mt-1 mb-6 leading-relaxed">
            Create a Vault password to protect your private credentials and encrypted keys on this USB.
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSetupError(null);
              if (setupPassword.length < 6) {
                setSetupError('Password must be at least 6 characters.');
                return;
              }
              if (setupPassword !== confirmSetupPassword) {
                setSetupError('Passwords do not match.');
                return;
              }
              const ok = await setup(setupPassword);
              if (ok) {
                setSetupPassword('');
                setConfirmSetupPassword('');
              }
            }}
            className="w-full max-w-xs space-y-3"
          >
            <div className="text-left space-y-1">
              <label className="text-[11px] font-medium text-zinc-300">Password</label>
              <input
                type="password"
                autoFocus
                required
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                placeholder="Create Vault password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-evah-border text-white text-xs focus:outline-none focus:border-teal-400 transition-colors allow-select"
              />
            </div>

            <div className="text-left space-y-1">
              <label className="text-[11px] font-medium text-zinc-300">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmSetupPassword}
                onChange={(e) => setConfirmSetupPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-evah-border text-white text-xs focus:outline-none focus:border-teal-400 transition-colors allow-select"
              />
            </div>

            {(setupError || error) && (
              <p className="text-rose-400 text-xs bg-rose-950/40 p-2 rounded-lg border border-rose-500/20 text-left">
                {setupError || error}
              </p>
            )}

            <Button
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isBusy}
              type="submit"
            >
              Create Vault
            </Button>
          </form>
        </div>
      );
    }

    // Future Vault Access: Unlock Vault Flow
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-evah-surface p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4 shadow-xl">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-white tracking-wide">
          Unlock Vault
        </h2>
        <p className="text-xs text-evah-text-muted max-w-sm mt-1 mb-6 leading-relaxed">
          Enter your Vault password to decrypt your credentials into isolated RAM.
        </p>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await unlock(unlockPassword);
            setUnlockPassword('');
          }}
          className="w-full max-w-xs space-y-3"
        >
          <div className="text-left space-y-1">
            <label className="text-[11px] font-medium text-zinc-300">Password</label>
            <input
              type="password"
              autoFocus
              required
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              placeholder="Enter Vault password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-evah-border text-white text-xs focus:outline-none focus:border-teal-400 transition-colors allow-select"
            />
          </div>

          {error && (
            <p className="text-rose-400 text-xs bg-rose-950/40 p-2 rounded-lg border border-rose-500/20 text-left">
              {error}
            </p>
          )}

          <Button
            variant="primary"
            size="md"
            className="w-full mt-2"
            isLoading={isBusy}
            type="submit"
          >
            Unlock
          </Button>
        </form>
      </div>
    );
  }

  // State 2: Vault is Unlocked
  return (
    <div className="flex h-full w-full bg-evah-surface text-evah-text select-none overflow-hidden">
      {/* Category Navigation Sidebar */}
      <div className="w-52 border-r border-evah-border bg-black/15 flex flex-col p-3 gap-1 shrink-0">
        <div className="flex items-center justify-between px-2 py-1 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-evah-text-muted">
            Categories
          </span>
          <button
            onClick={lock}
            className="p-1 rounded text-evah-text-muted hover:text-rose-400 transition-colors"
            title="Lock Vault Now"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>

        {categories.map((cat) => {
          const Icon = cat.icon;
          const count = cat.id === 'all' ? items.length : items.filter((i) => i.category === cat.id).length;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition-colors ${
                isActive
                  ? 'bg-evah-accent-subtle text-evah-accent font-semibold border border-evah-accent/20'
                  : 'text-evah-text-secondary hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Icon className="w-4 h-4 shrink-0 text-evah-accent" />
                <span className="truncate">{cat.label}</span>
              </div>
              <span className="text-[10px] font-mono opacity-60 ml-1">{count}</span>
            </button>
          );
        })}

        <div className="mt-auto p-2.5 rounded-xl bg-white/[0.02] border border-evah-border text-[11px] text-evah-text-muted">
          <div className="flex items-center gap-1.5 text-evah-accent font-semibold mb-0.5">
            <Shield className="w-3.5 h-3.5" />
            <span>RAM Isolation</span>
          </div>
          Keys are dropped immediately on inactivity, panic lock, or USB removal.
        </div>
      </div>

      {/* Main Vault Center Pane & Detail Inspector */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Action Toolbar */}
        <div className="h-11 border-b border-evah-border px-3 flex items-center justify-between gap-3 bg-white/[0.02] shrink-0">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search credentials..."
            className="max-w-sm flex-1"
          />

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<KeyRound className="w-3.5 h-3.5" />}
              onClick={() => {
                setChangePasswordError(null);
                setCurPassword('');
                setNewVaultPassword('');
                setConfirmNewVaultPassword('');
                setIsChangePasswordOpen(true);
              }}
            >
              Change Password
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleOpenAdd}
            >
              New Secret
            </Button>
          </div>
        </div>

        {/* Content Split: Items List & Detail Inspector */}
        <div className="flex-1 flex min-h-0">
          {/* Items List */}
          <div className="w-72 border-r border-evah-border overflow-y-auto p-2 space-y-1 shrink-0">
            {filteredItems.length === 0 ? (
              <EmptyState
                icon={<KeyRound className="w-6 h-6 text-evah-accent" />}
                title="No Secrets Stored"
                description="Add credentials or tokens to this category."
                actionLabel="Create Secret"
                onAction={handleOpenAdd}
              />
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedItemId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-evah-accent-subtle border-evah-accent text-white shadow-sm'
                        : 'border-transparent hover:bg-white/[0.03] text-evah-text-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate text-white">
                        {item.title}
                      </span>
                      {item.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                    </div>
                    {item.username && (
                      <p className="text-[11px] text-evah-text-muted truncate mt-0.5 font-mono">
                        {item.username}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Details Inspector */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedItem ? (
              <div className="max-w-lg space-y-5">
                <div className="flex items-start justify-between border-b border-evah-border pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedItem.title}</h3>
                    <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 uppercase tracking-wider text-evah-accent">
                      {selectedItem.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IconButton
                      icon={<Edit3 className="w-4 h-4" />}
                      label="Edit Secret"
                      size="sm"
                      onClick={() => handleOpenEdit(selectedItem)}
                    />
                    <IconButton
                      icon={<Trash2 className="w-4 h-4" />}
                      label="Delete Secret"
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (window.confirm('Delete this entry permanently?')) {
                          deleteItem(selectedItem.id);
                          setSelectedItemId(null);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Username Field */}
                {selectedItem.username && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-evah-text-muted uppercase tracking-wider">
                      Username / Account
                    </span>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-evah-border">
                      <span className="text-xs font-mono select-all text-white">
                        {selectedItem.username}
                      </span>
                      <IconButton
                        icon={copiedField === 'user' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        label="Copy Username"
                        size="sm"
                        onClick={() => handleCopy(selectedItem.username!, 'Username', 'user')}
                      />
                    </div>
                  </div>
                )}

                {/* Password / Secret Field */}
                {selectedItem.password && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-evah-text-muted uppercase tracking-wider">
                      Secret Key / Password
                    </span>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-evah-border">
                      <span className="text-xs font-mono tracking-wider select-all text-white">
                        {revealedIds.has(selectedItem.id) ? selectedItem.password : '••••••••••••••••••••'}
                      </span>
                      <div className="flex items-center gap-1">
                        <IconButton
                          icon={revealedIds.has(selectedItem.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          label="Reveal / Mask"
                          size="sm"
                          onClick={() => toggleReveal(selectedItem.id)}
                        />
                        <IconButton
                          icon={copiedField === 'pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          label="Copy (Auto-Clears Clipboard in 15s)"
                          size="sm"
                          onClick={() => handleCopy(selectedItem.password!, 'Password', 'pass')}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Target URL */}
                {selectedItem.url && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-evah-text-muted uppercase tracking-wider">
                      Target Domain / URL
                    </span>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-evah-border text-xs text-sky-400">
                      <a href={selectedItem.url} target="_blank" rel="noreferrer" className="truncate hover:underline flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span>{selectedItem.url}</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedItem.notes && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-evah-text-muted uppercase tracking-wider">
                      Encrypted Notes
                    </span>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-evah-border text-xs text-slate-300 whitespace-pre-wrap allow-select leading-relaxed">
                      {selectedItem.notes}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedItem.tags && selectedItem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {selectedItem.tags.map((t) => (
                      <span key={t} className="px-2.5 py-0.5 rounded-full text-[10px] bg-white/[0.06] text-evah-text-secondary border border-evah-border">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-xs text-evah-text-muted gap-2">
                <Shield className="w-8 h-8 opacity-20 text-evah-accent" />
                <span>Select an entry to view decrypted details</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-evah-surface border border-evah-border rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-evah-border pb-3">
              <h3 className="text-sm font-bold text-white">
                {editId ? 'Edit Secret Entry' : 'Create New Secret'}
              </h3>
              <IconButton icon={<X className="w-4 h-4" />} label="Close" size="sm" onClick={() => setIsModalOpen(false)} />
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3">
              <Input
                label="Title / Account Name"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Production AWS Access"
              />

              <div>
                <label className="block text-[11px] font-medium text-evah-text-secondary mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as VaultCategory)}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-evah-border text-xs text-white focus:outline-none focus:border-evah-accent"
                >
                  <option value="passwords">Passwords & Accounts</option>
                  <option value="api-keys">API Keys & Tokens</option>
                  <option value="recovery-phrases">Recovery Phrase / Seed</option>
                  <option value="notes">Private Note</option>
                  <option value="secrets">Server & SSH Secrets</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Username / Identifier"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Optional"
                />

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-evah-text-secondary">
                      Secret Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormPassword(generateSecurePassword())}
                      className="text-[10px] text-evah-accent hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Gen
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-evah-border text-xs font-mono text-white focus:outline-none focus:border-evah-accent allow-select"
                  />
                  {/* Strength Bar */}
                  {formPassword && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="flex-1 bg-white/10 h-1 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${calculatePasswordStrength(formPassword).color}`}
                          style={{ width: `${calculatePasswordStrength(formPassword).score}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-evah-text-muted">
                        {calculatePasswordStrength(formPassword).label}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Input
                label="Target URL"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
              />

              <div>
                <label className="block text-[11px] font-medium text-evah-text-secondary mb-1">
                  Notes
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-evah-border text-xs text-white focus:outline-none focus:border-evah-accent resize-none allow-select"
                />
              </div>

              <Input
                label="Tags (comma-separated)"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="prod, server, 2fa"
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-evah-border">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save to Vault
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Vault Password Modal */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Change Vault Password</h3>
              <IconButton icon={<X className="w-4 h-4" />} label="Close" size="sm" onClick={() => setIsChangePasswordOpen(false)} />
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setChangePasswordError(null);
                if (newVaultPassword.length < 6) {
                  setChangePasswordError('New password must be at least 6 characters.');
                  return;
                }
                if (newVaultPassword !== confirmNewVaultPassword) {
                  setChangePasswordError('New passwords do not match.');
                  return;
                }
                setIsChangingPassword(true);
                const ok = await changePassword(curPassword, newVaultPassword);
                setIsChangingPassword(false);
                if (ok) {
                  setIsChangePasswordOpen(false);
                  setCurPassword('');
                  setNewVaultPassword('');
                  setConfirmNewVaultPassword('');
                } else {
                  setChangePasswordError(useVaultStore.getState().error || 'Failed to change password');
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Current Vault Password</label>
                <input
                  type="password"
                  required
                  value={curPassword}
                  onChange={(e) => setCurPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-500 allow-select"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newVaultPassword}
                  onChange={(e) => setNewVaultPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-500 allow-select"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmNewVaultPassword}
                  onChange={(e) => setConfirmNewVaultPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-500 allow-select"
                />
              </div>

              {changePasswordError && (
                <p className="text-rose-400 text-xs bg-rose-950/40 p-2 rounded-lg border border-rose-500/20">
                  {changePasswordError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsChangePasswordOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={isChangingPassword}>
                  Change Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
