'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Plus,
  Camera,
  SendHorizontal,
  RotateCw,
  ShoppingBag,
  Bike,
  Sparkles,
  Check,
  MessageSquare,
  Loader2,
  X,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react';
import { BottomNav } from '@/components/customer/BottomNav';
import { AuthRequiredCard } from '@/components/customer/AuthRequiredCard';
import { ChatMessage, Product, AutoReplyConfig, StoreSettings } from '@/lib/types';
import { useCart } from '@/lib/store/cart-context';
import { useAuth } from '@/lib/store/auth-context';
import { formatRupiah, formatChatTime, parsePharmacistLicense } from '@/lib/utils';

export default function ChatPage() {
  const router = useRouter();
  const { addItem } = useCart();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isPharmacistTyping, setIsPharmacistTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolledRef = useRef(false);

  // Attachment upload states
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quickChips = [
    'Aturan minum Paracetamol',
    'Dosis untuk anak demam',
    'Konsultasi resep dokter',
    'Vitamin lambung aman',
    'Obat masuk angin aman',
  ];

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  const isFetchingRef = useRef(false);

  // Fetch store settings for pharmacist name and SIPA
  useEffect(() => {
    fetch('/api/store', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setStoreSettings(json.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch chat messages from API for the logged in user
  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!user?.id || isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (isInitial) setIsLoading(true);

    try {
      const res = await fetch(`/api/chat?userId=${user.id}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMessages(json.data);
        if (json.conversationId) {
          setConversationId(json.conversationId);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil pesan chat:', err);
    } finally {
      if (isInitial) setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    fetchMessages(true);

    // Refresh latar belakang setiap 1 menit (60.000 ms)
    const ONE_MINUTE = 60 * 1000;
    const interval = setInterval(() => {
      fetchMessages(false);
    }, ONE_MINUTE);

    return () => clearInterval(interval);
  }, [user, fetchMessages]);

  // Handle scroll to bottom: instant on first render / page refresh, smooth on subsequent interactions
  useEffect(() => {
    if (!user || messages.length === 0) return;

    if (!hasInitialScrolledRef.current) {
      // Posisi default langsung di paling bawah tanpa animasi scroll dari atas
      scrollToBottom('auto');
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });

      const timer = setTimeout(() => {
        scrollToBottom('auto');
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
        hasInitialScrolledRef.current = true;
      }, 50);

      return () => clearTimeout(timer);
    } else {
      scrollToBottom('smooth');
    }
  }, [messages, isPharmacistTyping, user]);

  // Handle file selection and upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAttachment(true);
    setAttachmentName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'chat');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.url) {
        setAttachmentUrl(json.url);
      } else {
        alert(json.error || 'Gagal mengunggah foto.');
        setAttachmentName(null);
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Gagal mengunggah foto. Silakan coba lagi.');
      setAttachmentName(null);
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : inputText;
    const currentAttachment = attachmentUrl;

    if ((!text.trim() && !currentAttachment) || !user || isSending || isUploadingAttachment) return;

    const tempId = `temp-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: tempId,
      conversation_id: conversationId || `conv-${user.id}`,
      sender_id: user.id,
      sender_role: 'customer',
      sender_name: user.full_name || 'Pelanggan',
      message: text.trim() || (currentAttachment ? '(Foto Terlampir)' : ''),
      attachment_path: currentAttachment || undefined,
      attachment_url: currentAttachment || undefined,
      is_read: true,
      created_at: formatChatTime(new Date().toISOString()),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setAttachmentUrl(null);
    setAttachmentName(null);
    setIsSending(true);

    let activeConvId = conversationId;

    // Persist user message to database via API
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          conversationId: activeConvId || undefined,
          senderId: user.id,
          senderName: user.full_name,
          senderRole: 'customer',
          message: text.trim(),
          attachmentPath: currentAttachment || undefined,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? json.data : m))
        );
        if (json.data.conversation_id && !activeConvId) {
          activeConvId = json.data.conversation_id;
          setConversationId(json.data.conversation_id);
        }
      }
    } catch (err) {
      console.warn('Chat send notice:', err);
    } finally {
      setIsSending(false);
    }

    // Process automated pharmacist assistance reply based on managed auto-reply rules
    try {
      setIsPharmacistTyping(true);

      const configRes = await fetch('/api/chat/auto-replies', { cache: 'no-store' });
      const configJson = await configRes.json();
      const autoReplyConfig: AutoReplyConfig = configJson.data;

      if (autoReplyConfig && autoReplyConfig.enabled !== false) {
        const lower = text.toLowerCase();
        let replyMessage = '';
        let recProductId: string | undefined = undefined;
        let shouldReply = false;

        // If user sent a photo/prescription without text
        if (currentAttachment && !text.trim()) {
          replyMessage =
            'Terima kasih telah mengunggah lampiran Kak. Apoteker kami akan segera meninjau foto resep / keluhan yang Anda kirimkan ya.';
          shouldReply = true;
        } else {
          // Match against active keyword rules
          const matchedRule = (autoReplyConfig.rules || []).find(
            (r) =>
              r.is_active &&
              r.keywords &&
              r.keywords.some((k) => lower.includes(k.toLowerCase().trim()))
          );

          if (matchedRule) {
            replyMessage = matchedRule.reply_message;
            recProductId = matchedRule.recommended_product_id || undefined;
            shouldReply = true;
          } else if (autoReplyConfig.fallback_enabled) {
            // Hanya kirim pesan fallback jika settingan Pesan Default aktif (fallback_enabled: true)
            replyMessage =
              autoReplyConfig.fallback_message ||
              'Baik Kak, terima kasih sudah berkonsultasi dengan Apotek Jabat. Apabila keluhan berlanjut lebih dari 3 hari atau bertambah berat, segera konsultasikan langsung ke dokter ya.';
            shouldReply = true;
          }
        }

        if (shouldReply && replyMessage) {
          // Natural typing pause
          await new Promise((resolve) => setTimeout(resolve, 1100));

          // Save pharmacist response to API
          const pharmRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              conversationId: activeConvId || undefined,
              senderRole: 'pharmacist',
              senderName:
                storeSettings?.pharmacist_name && storeSettings.pharmacist_name !== '-'
                  ? storeSettings.pharmacist_name
                  : 'Apoteker Jabat',
              senderId: storeSettings?.pharmacist_id || undefined,
              message: replyMessage,
              recommendedProductId: recProductId,
            }),
          });

          const pharmJson = await pharmRes.json();
          if (pharmJson.success && pharmJson.data) {
            setMessages((prev) => [...prev, pharmJson.data]);
          }
        }
      }
    } catch (e) {
      console.warn('Pharmacist reply sync notice:', e);
    } finally {
      setIsPharmacistTyping(false);
    }
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
                  alt={
                    storeSettings?.pharmacist_name && storeSettings.pharmacist_name !== '-'
                      ? storeSettings.pharmacist_name
                      : 'Apoteker'
                  }
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs md:text-sm font-bold text-slate-900 leading-tight">
                    {storeSettings?.pharmacist_name && storeSettings.pharmacist_name !== '-'
                      ? storeSettings.pharmacist_name
                      : 'Apoteker Farmasi'}
                  </h1>
                  {storeSettings?.pharmacist_name && storeSettings.pharmacist_name !== '-' && (
                    <CheckCircle2 className="w-4 h-4 text-sky-600 fill-sky-100 shrink-0" />
                  )}
                </div>
                {(() => {
                  const lic = parsePharmacistLicense(storeSettings?.pharmacist_sipa);
                  if (!lic.hasLicense) return null;
                  return (
                    <p className="text-[10px] md:text-xs text-slate-500 truncate max-w-[260px]">
                      {lic.displayText}
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              ● Online
            </span>
            <button
              onClick={() => fetchMessages(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 border border-slate-200 bg-white transition active:scale-95"
              title="Segarkan Chat"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 px-4 sm:px-6 md:px-8 py-4 space-y-4 max-w-4xl mx-auto w-full pb-48 md:pb-40">
        {/* If user is NOT logged in, require authentication */}
        {!user ? (
          <AuthRequiredCard
            icon={MessageSquare}
            title="Masuk untuk Konsultasi dengan Apoteker"
            description="Layanan konsultasi farmasi kami resmi dan terverifikasi berstandar Kemenkes RI. Riwayat tanya jawab obat tersimpan aman di akun Anda."
            badge="Konsultasi Terverifikasi"
          />
        ) : (
          <>
            {/* Timestamp Divider */}
            <div className="text-center my-2">
              <span className="px-3 py-1 rounded-full bg-slate-200/80 text-[10px] font-medium text-slate-600">
                Sesi Konsultasi Aktif
              </span>
            </div>

            {/* Message Bubble Stream */}
            <div className="space-y-3">
              {isLoading && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                  <span className="text-xs">Memuat percakapan...</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_role === 'customer' || (user && msg.sender_id === user.id);

                  if (isMe) {
                    return (
                      <div key={msg.id} className="flex flex-col items-end">
                        <div className="max-w-[82%] bg-sky-700 text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm text-xs leading-relaxed">
                          {msg.message}

                          {/* Customer Image Attachment Preview */}
                          {(msg.attachment_path || msg.attachment_url) && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-sky-600/60 bg-sky-800/40">
                              <a
                                href={msg.attachment_path || msg.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block group relative"
                              >
                                <img
                                  src={msg.attachment_path || msg.attachment_url}
                                  alt="Lampiran Foto"
                                  className="w-full h-auto max-h-56 object-cover group-hover:opacity-95 transition"
                                />
                                <div className="p-1.5 text-[9px] text-sky-100 bg-sky-900/80 flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <Paperclip className="w-3 h-3" /> Lampiran Pasien
                                  </span>
                                  <span className="font-bold underline">Buka Foto ↗</span>
                                </div>
                              </a>
                            </div>
                          )}
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
                        src={
                          msg.sender_avatar ||
                          'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&auto=format&fit=crop&q=80'
                        }
                        alt={msg.sender_name || 'Apoteker'}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 mt-1"
                      />
                      <div className="space-y-2">
                        {/* Text Message Bubble */}
                        <div className="bg-white border border-slate-200/80 text-slate-800 rounded-2xl rounded-tl-none p-3.5 shadow-stitch text-xs leading-relaxed whitespace-pre-line">
                          {msg.message}

                          {/* Pharmacist Image Attachment Preview */}
                          {(msg.attachment_path || msg.attachment_url) && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                              <a
                                href={msg.attachment_path || msg.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block group relative"
                              >
                                <img
                                  src={msg.attachment_path || msg.attachment_url}
                                  alt="Lampiran"
                                  className="w-full h-auto max-h-56 object-cover group-hover:opacity-95 transition"
                                />
                                <div className="p-1.5 text-[9px] text-slate-600 bg-slate-100 flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <Paperclip className="w-3 h-3" /> Lampiran Apoteker
                                  </span>
                                  <span className="font-bold text-sky-600">Buka ↗</span>
                                </div>
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Pharmacist Structured Recommendation Card (Stitch Screen 5) */}
                        {msg.recommended_product && (
                          <div className="bg-white rounded-2xl border border-sky-200/90 p-3 shadow-stitch space-y-2.5 animate-in fade-in">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-extrabold text-sky-700 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> REKOMENDASI APOTEKER
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                                {msg.recommended_product.requires_prescription
                                  ? '• Obat Keras / Resep'
                                  : '• Obat Bebas'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  msg.recommended_product.image_url ||
                                  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80'
                                }
                                alt={msg.recommended_product.name}
                                className="w-14 h-14 rounded-xl object-contain bg-slate-50 border border-slate-100 p-1"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                                  {msg.recommended_product.name}
                                </h4>
                                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                  {msg.recommended_product.variants?.[0]?.name || 'Kemasan Standar'} • Farmasi Terverifikasi
                                </p>
                                <div className="text-xs font-extrabold text-sky-700 mt-1">
                                  {formatRupiah(msg.recommended_product.variants?.[0]?.price || 1500)}
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  const targetVariant =
                                    msg.recommended_product!.variants?.[0] || {
                                      id: `${msg.recommended_product!.id}-default`,
                                      product_id: msg.recommended_product!.id,
                                      name: 'Standar',
                                      unit: 'pcs',
                                      quantity_per_package: 1,
                                      price: 1500,
                                      stock: 100,
                                      is_active: true,
                                      created_at: new Date().toISOString(),
                                    };
                                  addItem(msg.recommended_product!, targetVariant, 1);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tambah</span>
                              </button>
                            </div>

                            <div className="p-2 rounded-xl bg-sky-50/50 border border-sky-100 flex items-center gap-2 text-[10px] text-slate-600">
                              <Bike className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <span>
                                Pesanan obat langsung dipacking higienis dan dikirim kurir apotek dalam <strong>30–45 menit</strong>.
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="text-[9px] text-slate-400 ml-1">{msg.created_at}</div>
                      </div>
                    </div>
                  );
                })
              )}

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
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 pt-2 pb-3 shadow-lg">
          {/* Quick Suggestion Chips (Template Pesan Cepat - Selalu Terjangkau di Bawah) */}
          <div className="max-w-4xl mx-auto flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                disabled={isSending || isUploadingAttachment}
                className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-sky-50 border border-slate-200/90 hover:border-sky-300 text-slate-700 hover:text-sky-700 text-[11px] font-medium whitespace-nowrap shadow-2xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50 shrink-0"
              >
                <HelpCircle className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>{chip}</span>
              </button>
            ))}
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Attachment Preview Box */}
          {isUploadingAttachment && (
            <div className="max-w-4xl mx-auto mb-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 flex items-center gap-2 text-xs text-sky-800 animate-in fade-in">
              <Loader2 className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
              <span>Sedang mengunggah foto lampiran resep / keluhan...</span>
            </div>
          )}

          {attachmentUrl && !isUploadingAttachment && (
            <div className="max-w-4xl mx-auto mb-2 p-2 rounded-2xl bg-white border border-sky-300 shadow-sm flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={attachmentUrl}
                  alt="Preview"
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-slate-50 shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {attachmentName || 'Foto Terlampir'}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">
                    Siap dikirimkan ke apoteker
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setAttachmentUrl(null);
                  setAttachmentName(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Hapus Lampiran"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="max-w-4xl mx-auto flex items-center gap-3">
            {/* Plus Attachment Button - NOW FUNCTIONAL! */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAttachment}
              className="w-9 h-9 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-600 flex items-center justify-center transition shrink-0 active:scale-95 disabled:opacity-50"
              title="Unggah Foto Resep / Keluhan"
              aria-label="Lampirkan File"
            >
              {isUploadingAttachment ? (
                <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
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
                disabled={isSending || isUploadingAttachment}
                placeholder={
                  attachmentUrl
                    ? 'Tambahkan catatan untuk foto ini (opsional)...'
                    : 'Ketik pesan atau keluhan kesehatan...'
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-4 pr-10 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttachment}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600 transition"
                title="Ambil / Unggah Foto"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={
                isSending ||
                isUploadingAttachment ||
                (!inputText.trim() && !attachmentUrl)
              }
              className="w-10 h-10 rounded-full bg-sky-700 hover:bg-sky-800 disabled:opacity-40 text-white flex items-center justify-center shadow-md shadow-sky-700/20 transition active:scale-95 shrink-0"
              aria-label="Kirim Pesan"
            >
              {isSending ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <SendHorizontal className="w-4.5 h-4.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
