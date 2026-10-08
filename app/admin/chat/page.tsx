'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  User,
  ShieldCheck,
  CheckCircle2,
  Package,
  Plus,
} from 'lucide-react';
import { mockInitialMessages, mockProducts, mockStoreSettings } from '@/lib/data/mock-data';
import { ChatMessage, Product } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';

export default function AdminChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockInitialMessages);
  const [replyText, setReplyText] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleSendPharmacistReply = () => {
    if (!replyText.trim() && !selectedProduct) return;

    const newMsg: ChatMessage = {
      id: `m-pharm-${Date.now()}`,
      conversation_id: 'conv-1',
      sender_id: 'pharm-siti',
      sender_role: 'pharmacist',
      sender_name: mockStoreSettings.pharmacist_name,
      message: replyText.trim() || 'Berikut rekomendasi obat dari apoteker:',
      recommended_product: selectedProduct || undefined,
      is_read: true,
      created_at: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB',
    };

    setMessages((prev) => [...prev, newMsg]);
    setReplyText('');
    setSelectedProduct(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">
          Meja Konsultasi Apoteker (Live Chat)
        </h2>
        <p className="text-xs text-slate-500">
          Layanan edukasi pasien terkait penggunaan obat, dosis, dan kontraindikasi
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3">
          <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Daftar Konsultasi Masuk</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              1 Aktif
            </span>
          </h3>

          <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-300 space-y-1 cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Budi Santoso
              </span>
              <span className="text-[10px] text-sky-700 font-bold">10:19 WIB</span>
            </div>
            <p className="text-[11px] text-slate-600 line-clamp-1">
              Pagi Bu Apoteker, saya sedang flu dan demam ringan...
            </p>
          </div>
        </div>

        {/* Live Chat Window (2 columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-stitch flex flex-col h-[600px] overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                BS
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Budi Santoso (Customer)
                </h4>
                <p className="text-[10px] text-slate-500">
                  Sedang menanyakan interaksi Paracetamol & OBH
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              ● Online
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            {messages.map((m) => {
              const isPharmacist = m.sender_role === 'pharmacist';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    isPharmacist ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="text-[10px] text-slate-400 mb-1 px-1">
                    {m.sender_name} • {m.created_at}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      isPharmacist
                        ? 'bg-sky-700 text-white rounded-tr-none'
                        : 'bg-slate-100 text-slate-800 rounded-tl-none'
                    }`}
                  >
                    {m.message}
                  </div>

                  {m.recommended_product && (
                    <div className="mt-2 p-3 bg-white rounded-2xl border border-sky-300 shadow-sm max-w-xs space-y-1">
                      <span className="text-[9px] font-extrabold text-sky-600 uppercase">
                        Rekomendasi Terlampir:
                      </span>
                      <div className="font-bold text-slate-900 text-xs">
                        {m.recommended_product.name}
                      </div>
                      <div className="text-xs font-extrabold text-sky-700">
                        {formatRupiah(m.recommended_product.variants[0]?.price || 0)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pharmacist Reply Box */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50 space-y-2">
            {/* Attach Product Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600">
                Rekomendasikan Obat:
              </span>
              <select
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const prod = mockProducts.find((p) => p.id === e.target.value);
                  setSelectedProduct(prod || null);
                }}
                className="bg-white border border-slate-200 rounded-xl py-1 px-2 text-xs text-slate-700 focus:outline-none"
              >
                <option value="">-- Pilih Obat untuk Direkomendasikan --</option>
                {mockProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatRupiah(p.variants[0]?.price || 0)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendPharmacistReply();
                }}
                placeholder="Ketik balasan edukasi farmasi untuk pasien..."
                className="flex-1 bg-white border border-slate-200 rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <button
                onClick={handleSendPharmacistReply}
                className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>Kirim</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
