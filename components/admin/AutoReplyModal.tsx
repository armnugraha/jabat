'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Bot,
  Plus,
  Trash2,
  Edit2,
  Check,
  Package,
  AlertCircle,
  Save,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from 'lucide-react';
import { Product, AutoReplyRule, AutoReplyConfig, DEFAULT_CHAT_OPENING_MESSAGE } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';

export const DEFAULT_OPENING_MESSAGE = DEFAULT_CHAT_OPENING_MESSAGE;

interface AutoReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export function AutoReplyModal({ isOpen, onClose, products }: AutoReplyModalProps) {
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<AutoReplyConfig>({
    enabled: true,
    fallback_enabled: false,
    fallback_message:
      'Baik Kak, terima kasih sudah berkonsultasi dengan Apotek Jabat. Apabila keluhan berlanjut lebih dari 3 hari atau bertambah berat, segera konsultasikan langsung ke dokter ya.',
    opening_message: DEFAULT_OPENING_MESSAGE,
    rules: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form for editing or adding a rule
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [formKeywords, setFormKeywords] = useState('');
  const [formReplyMessage, setFormReplyMessage] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch settings on open
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setSaveSuccess(false);
    setEditingRuleId(null);

    fetch('/api/chat/auto-replies')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setConfig(json.data);
        }
      })
      .catch((err) => console.error('Failed to load auto-replies config:', err))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleStartAdd = () => {
    setEditingRuleId('new');
    setFormKeywords('');
    setFormReplyMessage('');
    setFormProductId('');
    setFormIsActive(true);
  };

  const handleStartEdit = (rule: AutoReplyRule) => {
    setEditingRuleId(rule.id);
    setFormKeywords(rule.keywords.join(', '));
    setFormReplyMessage(rule.reply_message);
    setFormProductId(rule.recommended_product_id || '');
    setFormIsActive(rule.is_active);
  };

  const handleCancelEdit = () => {
    setEditingRuleId(null);
  };

  const handleSaveRule = () => {
    if (!formReplyMessage.trim()) return;

    const keywordsArray = formKeywords
      .split(',')
      .map((k) => k.toLowerCase().trim())
      .filter(Boolean);

    if (editingRuleId === 'new') {
      const newRule: AutoReplyRule = {
        id: `rule-${Date.now()}`,
        keywords: keywordsArray.length > 0 ? keywordsArray : ['konsultasi'],
        reply_message: formReplyMessage.trim(),
        recommended_product_id: formProductId || null,
        is_active: formIsActive,
      };
      setConfig((prev) => ({
        ...prev,
        rules: [...prev.rules, newRule],
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        rules: prev.rules.map((r) =>
          r.id === editingRuleId
            ? {
                ...r,
                keywords: keywordsArray.length > 0 ? keywordsArray : r.keywords,
                reply_message: formReplyMessage.trim(),
                recommended_product_id: formProductId || null,
                is_active: formIsActive,
              }
            : r
        ),
      }));
    }

    setEditingRuleId(null);
  };

  const handleDeleteRule = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      rules: prev.rules.filter((r) => r.id !== id),
    }));
  };

  const handleToggleRuleActive = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      rules: prev.rules.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r)),
    }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/chat/auto-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save auto-replies config:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 w-screen h-screen min-h-screen z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Kelola Pesan Pembuka & Balasan Otomatis
              </h3>
              <p className="text-[11px] text-slate-500">
                Atur salam pembuka pasien, kata kunci, & rekomendasi obat otomatis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 p-4 sm:p-6 space-y-5 overflow-y-auto">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
              <span className="text-xs">Memuat pengaturan...</span>
            </div>
          ) : (
            <>
              {/* Pesan Pembuka Konsultasi (Opening / Welcome Message) */}
              <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/50 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>Pesan Pembuka Sesi Chat (Welcome Message)</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                        Pesan Pertama
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Pesan salam yang otomatis dikirimkan apoteker saat pasien pertama kali membuka konsultasi.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        opening_message: DEFAULT_OPENING_MESSAGE,
                      }))
                    }
                    className="text-[10px] font-semibold text-sky-700 hover:text-sky-900 bg-white border border-sky-200 hover:border-sky-300 px-2.5 py-1 rounded-lg transition shrink-0 shadow-2xs cursor-pointer active:scale-95"
                    title="Kembalikan ke pesan pembuka default"
                  >
                    Reset Default
                  </button>
                </div>

                <div className="space-y-1">
                  <textarea
                    rows={3}
                    value={config.opening_message ?? DEFAULT_OPENING_MESSAGE}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, opening_message: e.target.value }))
                    }
                    className="w-full bg-white border border-sky-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 leading-relaxed shadow-2xs"
                    placeholder="Tuliskan pesan pembuka / sambutan hangat apoteker..."
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                    <span>Pesan ini langsung aktif di percakapan sesi konsultasi pasien.</span>
                    <span className="font-mono">{(config.opening_message ?? DEFAULT_OPENING_MESSAGE).length} karakter</span>
                  </div>
                </div>
              </div>

              {/* Master Switch */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>Status Balasan Otomatis Apoteker</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        config.enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {config.enabled ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Jika aktif, sistem akan langsung merespon pertanyaan pasien berdasarkan aturan kata kunci
                  </p>
                </div>

                <button
                  onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className="text-slate-700 hover:text-sky-600 transition"
                >
                  {config.enabled ? (
                    <ToggleRight className="w-9 h-9 text-sky-600" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Default Fallback Message with Dedicated ON/OFF Toggle */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>Pesan Default (Jika tidak ada kata kunci yang cocok)</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          config.fallback_enabled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {config.fallback_enabled ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {config.fallback_enabled
                        ? 'Bot otomatis membalas dengan teks berikut bila pesan pasien tidak cocok dengan kata kunci apapun.'
                        : 'Nonaktif: Bot diam saat tidak ada kata kunci yang cocok, sehingga tidak mengganggu percakapan pasien dengan apoteker asli.'}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        fallback_enabled: !prev.fallback_enabled,
                      }))
                    }
                    className="text-slate-700 hover:text-sky-600 transition shrink-0 ml-3"
                    title={
                      config.fallback_enabled
                        ? 'Nonaktifkan Pesan Default'
                        : 'Aktifkan Pesan Default'
                    }
                  >
                    {config.fallback_enabled ? (
                      <ToggleRight className="w-9 h-9 text-sky-600" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-slate-400" />
                    )}
                  </button>
                </div>

                {config.fallback_enabled && (
                  <div className="pt-2 border-t border-slate-200/80 animate-in fade-in">
                    <textarea
                      rows={2}
                      value={config.fallback_message}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, fallback_message: e.target.value }))
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      placeholder="Ketik pesan standar yang dikirim bila pasien menanyakan hal di luar kata kunci..."
                    />
                  </div>
                )}
              </div>

              {/* Rules List Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900">
                    Daftar Aturan Kata Kunci ({config.rules.length})
                  </h4>

                  {!editingRuleId && (
                    <button
                      onClick={handleStartAdd}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Aturan</span>
                    </button>
                  )}
                </div>

                {/* Add / Edit Form Inline */}
                {editingRuleId && (
                  <div className="p-4 rounded-2xl border-2 border-sky-400 bg-sky-50/50 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-900">
                        {editingRuleId === 'new' ? 'Tambah Aturan Kata Kunci Baru' : 'Edit Aturan'}
                      </span>
                      <button
                        onClick={handleCancelEdit}
                        className="text-[11px] text-slate-500 hover:text-slate-800"
                      >
                        Batal
                      </button>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Kata Kunci Pemicu (pisahkan dengan koma):
                      </label>
                      <input
                        type="text"
                        value={formKeywords}
                        onChange={(e) => setFormKeywords(e.target.value)}
                        placeholder="contoh: paracetamol, demam, panas"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Pesan Balasan Apoteker:
                      </label>
                      <textarea
                        rows={2}
                        value={formReplyMessage}
                        onChange={(e) => setFormReplyMessage(e.target.value)}
                        placeholder="Tuliskan petunjuk aturan pakai obat..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Lampirkan Produk Rekomendasi (Opsional):
                      </label>
                      <select
                        value={formProductId}
                        onChange={(e) => setFormProductId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">-- Tanpa Rekomendasi Obat --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatRupiah(p.variants?.[0]?.price || 0)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formIsActive}
                          onChange={(e) => setFormIsActive(e.target.checked)}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span>Aktifkan aturan ini</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-100"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleSaveRule}
                          disabled={!formReplyMessage.trim()}
                          className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold shadow-2xs"
                        >
                          Simpan Aturan
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* List of Rules */}
                <div className="space-y-2.5">
                  {config.rules.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                      Belum ada aturan kata kunci yang dibuat.
                    </div>
                  ) : (
                    config.rules.map((rule) => {
                      const linkedProduct = products.find((p) => p.id === rule.recommended_product_id);

                      return (
                        <div
                          key={rule.id}
                          className={`p-3.5 rounded-2xl border transition space-y-2 ${
                            rule.is_active
                              ? 'bg-white border-slate-200 hover:border-slate-300'
                              : 'bg-slate-50/80 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {rule.keywords.map((kw, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 text-[10px] font-bold border border-sky-200"
                                >
                                  #{kw}
                                </span>
                              ))}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleToggleRuleActive(rule.id)}
                                title={rule.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition ${
                                  rule.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                {rule.is_active ? 'Aktif' : 'Nonaktif'}
                              </button>
                              <button
                                onClick={() => handleStartEdit(rule)}
                                className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                            {rule.reply_message}
                          </p>

                          {linkedProduct && (
                            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700">
                              <Package className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <span className="font-bold truncate">{linkedProduct.name}</span>
                              <span className="text-sky-700 font-extrabold ml-auto shrink-0">
                                {formatRupiah(linkedProduct.variants?.[0]?.price || 0)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <Check className="w-4 h-4" /> Tersimpan!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
            >
              Tutup
            </button>

            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
