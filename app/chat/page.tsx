'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Info,
  HelpCircle,
  Plus,
  Camera,
  Send,
  ShoppingBag,
  Bike,
  Sparkles,
  Check,
  MessageSquare,
} from 'lucide-react';
import { BottomNav } from '@/components/customer/BottomNav';
import { AuthRequiredCard } from '@/components/customer/AuthRequiredCard';
import { mockInitialMessages, mockStoreSettings, mockProducts } from '@/lib/data/mock-data';
import { ChatMessage, Product } from '@/lib/types';
import { useCart } from '@/lib/store/cart-context';
import { useAuth } from '@/lib/store/auth-context';
import { formatRupiah } from '@/lib/utils';

export default function ChatPage() {
  const router = useRouter();
  const { addItem } = useCart();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPharmacistTyping, setIsPharmacistTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickChips = [
    'Aturan minum Paracetamol',
    'Dosis untuk anak demam',
    'Konsultasi resep dokter',
    'Vitamin lambung aman',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch chat messages from API for the logged in user
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch(`/api/chat?userId=${user.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setMessages(json.data);
        }
      })
      .catch((err) => console.error('Failed to fetch chat messages:', err))
      .finally(() => setIsLoading(false));
  }, [user]);

  useEffect(() => {
    if (user) {
      scrollToBottom();
    }
  }, [messages, isPharmacistTyping, user]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !user) return;

    const userMessage: ChatMessage = {
      id: `m-${Date.now()}`,
      conversation_id: `conv-${user.id}`,
      sender_id: user.id,
      sender_role: 'customer',
      sender_name: user.full_name,
      message: text.trim(),
      is_read: true,
      created_at: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    // Send to API
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          senderName: user.full_name,
          senderRole: user.role,
          message: text.trim(),
        }),
      });
    } catch (err) {
      console.warn('Chat send notice:', err);
    }

    // Pharmacist automated response simulation
    setIsPharmacistTyping(true);
    setTimeout(async () => {
      setIsPharmacistTyping(false);
      let replyMessage = 'Baik Kak, terima kasih sudah berkonsultasi. Apabila ada gejala bertambah seperti demam tinggi lebih dari 3 hari, segera hubungi dokter ya.';
      let recProduct: Product | undefined = undefined;

      if (text.toLowerCase().includes('paracetamol') || text.toLowerCase().includes('demam')) {
        replyMessage = 'Untuk Paracetamol diminum 1 tablet saat demam, beri jeda minimal 4–6 jam antar dosis ya Kak. Jangan diminum saat perut kosong jika ada riwayat maag.';
        recProduct = mockProducts[0];
      } else if (text.toLowerCase().includes('resep')) {
        replyMessage = 'Silakan unggah foto resep dokter Anda melalui menu Keranjang / Checkout tebus resep. Saya akan bantu verifikasi dosis dan ketersediaan stoknya.';
      } else if (text.toLowerCase().includes('vitamin')) {
        replyMessage = 'Untuk menjaga imunitas harian, Enervon-C sangat baik dikonsumsi 1x sehari di pagi hari setelah sarapan.';
        recProduct = mockProducts[4];
      }

      const pharmacistResponse: ChatMessage = {
        id: `m-${Date.now() + 1}`,
        conversation_id: `conv-${user.id}`,
        sender_id: 'pharm-siti',
        sender_role: 'pharmacist',
        sender_name: 'apt. Siti Rahma, S.Farm.',
        message: replyMessage,
        is_read: true,
        created_at: new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB',
        recommended_product: recProduct,
      };

      setMessages((prev) => [...prev, pharmacistResponse]);

      // Save pharmacist response to API
      try {
        await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            senderName: 'apt. Siti Rahma, S.Farm.',
            senderRole: 'pharmacist',
            message: replyMessage,
          }),
        });
      } catch (e) {
        console.warn('Pharmacist reply sync notice:', e);
      }
    }, 1200);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      {/* Top Verified Pharmacist Header (Stitch Screen 5) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 py-2.5 shadow-xs">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-xl text-slate-700 hover:bg-slate-100 transition border border-slate-200 bg-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Pharmacist Avatar & SIPA info */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&auto=format&fit=crop&q=80"
                  alt="apt. Siti Rahma, S.Farm."
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs md:text-sm font-bold text-slate-900 leading-tight">
                    apt. Siti Rahma, S.Farm.
                  </h1>
                  <CheckCircle2 className="w-4 h-4 text-sky-600 fill-sky-100 shrink-0" />
                </div>
                <p className="text-[10px] md:text-xs text-slate-500 truncate max-w-[260px]">
                  Apoteker Penanggung Jawab • SIPA Resmi Kemenkes RI
                </p>
              </div>
            </div>
          </div>

          <button className="p-2 rounded-xl text-slate-400 hover:text-slate-700 border border-slate-200 bg-white">
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 px-4 sm:px-6 md:px-8 py-4 space-y-4 max-w-4xl mx-auto w-full pb-32 md:pb-24">
        {/* If user is NOT logged in, require authentication */}
        {!user ? (
          <AuthRequiredCard
            icon={MessageSquare}
            title="Masuk untuk Konsultasi dengan Apoteker"
            description="Layanan konsultasi farmasi kami resmi dan terverifikasi oleh Apoteker Penanggung Jawab (SIPA) berstandar Kemenkes RI. Riwayat tanya jawab obat tersimpan aman di akun Anda."
            badge="Konsultasi Terverifikasi"
          />
        ) : (
          <>
            {/* Official Pharmacy Verification Banner (Stitch Screen 5) */}
            <div className="rounded-3xl border border-sky-100 bg-sky-50/70 p-3.5 space-y-2 shadow-stitch">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-sky-500 text-white flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      Konsultasi Resmi & Terverifikasi
                    </h3>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-extrabold tracking-wide">
                  BPOM / Kemenkes
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Apotek Sehat Mandiri Tebet siap melayani informasi aturan minum, dosis obat, kontraindikasi, & suplemen harian.
              </p>

              <div className="pt-2 border-t border-sky-200/60 flex items-center justify-between text-[10px] text-slate-600">
                <span>🏥 SIPA: 19870412/SIPA-31.74/2021/2048</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Siap Respon
                </span>
              </div>
            </div>

            {/* Quick Suggestion Chips (Stitch Screen 5) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  className="px-3 py-1.5 rounded-full bg-white border border-sky-200 hover:border-sky-400 text-sky-800 text-[11px] font-medium whitespace-nowrap shadow-2xs transition flex items-center gap-1 active:scale-95"
                >
                  <HelpCircle className="w-3 h-3 text-sky-600" />
                  <span>{chip}</span>
                </button>
              ))}
            </div>

            {/* Timestamp Divider */}
            <div className="text-center my-2">
              <span className="px-3 py-1 rounded-full bg-slate-200/80 text-[10px] font-medium text-slate-600">
                Hari ini, 10:15 WIB
              </span>
            </div>

            {/* Message Bubble Stream */}
            <div className="space-y-3">
              {messages.map((msg) => {
                const isMe = msg.sender_role === 'customer';

                if (isMe) {
                  return (
                    <div key={msg.id} className="flex flex-col items-end">
                      <div className="max-w-[82%] bg-sky-700 text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm text-xs leading-relaxed">
                        {msg.message}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-1 mr-1">
                        <span>{msg.created_at}</span>
                        <Check className="w-3 h-3 text-sky-600" />
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex items-start gap-2 max-w-[92%]">
                    <img
                      src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&auto=format&fit=crop&q=80"
                      alt="Apoteker"
                      className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 mt-1"
                    />
                    <div className="space-y-2">
                      {/* Text Message Bubble */}
                      <div className="bg-white border border-slate-200/80 text-slate-800 rounded-2xl rounded-tl-none p-3.5 shadow-stitch text-xs leading-relaxed whitespace-pre-line">
                        {msg.message}
                      </div>

                      {/* Pharmacist Structured Recommendation Card (Stitch Screen 5) */}
                      {msg.recommended_product && (
                        <div className="bg-white rounded-2xl border border-sky-200/90 p-3 shadow-stitch space-y-2.5 animate-in fade-in">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-extrabold text-sky-700 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> REKOMENDASI APOTEKER
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                              • Obat Bebas
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <img
                              src={msg.recommended_product.image_url}
                              alt={msg.recommended_product.name}
                              className="w-14 h-14 rounded-xl object-contain bg-slate-50 border border-slate-100 p-1"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                                {msg.recommended_product.name}
                              </h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Strip (4 Tablet) • Vitamin C & B-Kompleks
                              </p>
                              <div className="text-xs font-extrabold text-sky-700 mt-1">
                                {formatRupiah(msg.recommended_product.variants[0]?.price || 6500)}
                              </div>
                            </div>

                            <button
                              onClick={() =>
                                addItem(
                                  msg.recommended_product!,
                                  msg.recommended_product!.variants[0],
                                  1
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah</span>
                            </button>
                          </div>

                          <div className="p-2 rounded-xl bg-sky-50/50 border border-sky-100 flex items-center gap-2 text-[10px] text-slate-600">
                            <Bike className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span>
                              Pesanan obat langsung dipacking higienis dan dikirim kurir apotek dalam <strong>30–45 menit</strong> ke Tebet Barat.
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="text-[9px] text-slate-400 ml-1">{msg.created_at}</div>
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {isPharmacistTyping && (
                <div className="flex items-center gap-2 text-xs text-slate-400 italic pl-9">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]" />
                  <span>Apoteker sedang mengetik...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </main>

      {/* Message Input Bar (Only visible when logged in) */}
      {user && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-3 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            {/* Plus Attachment Button */}
            <button
              className="w-9 h-9 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition shrink-0"
              aria-label="Lampirkan File"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Input Box with Camera Icon */}
            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                placeholder="Ketik pesan atau keluhan kesehatan..."
                className="w-full bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-4 pr-10 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
              className="w-10 h-10 rounded-full bg-sky-700 hover:bg-sky-800 text-white flex items-center justify-center shadow-md shadow-sky-700/20 transition active:scale-95 shrink-0"
              aria-label="Kirim Pesan"
            >
              <Send className="w-4.5 h-4.5 ml-0.5" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
