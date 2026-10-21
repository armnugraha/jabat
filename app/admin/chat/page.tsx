'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  User,
  ShieldCheck,
  CheckCircle2,
  Package,
  Plus,
  Loader2,
  RefreshCw,
  Clock,
  Phone,
  Bot,
} from 'lucide-react';
import { ChatMessage, Product } from '@/lib/types';
import { formatRupiah, formatChatTime } from '@/lib/utils';
import { useAuth } from '@/lib/store/auth-context';
import { AutoReplyModal } from '@/components/admin/AutoReplyModal';

interface ConversationItem {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_avatar?: string | null;
  status: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export default function AdminChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [replyText, setReplyText] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Cache messages per conversationId for instant UX (Stale-While-Revalidate)
  const messagesCacheRef = useRef<Record<string, ChatMessage[]>>({});
  const activeConvIdRef = useRef<string | null>(null);
  const isFetchingConvsRef = useRef(false);

  // 1. Fetch conversations list from Supabase API
  const fetchConversations = useCallback(async (isInitial = false) => {
    if (isFetchingConvsRef.current) return;
    isFetchingConvsRef.current = true;
    if (isInitial) setIsLoadingConvs(true);
    try {
      const res = await fetch('/api/chat?admin=true', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // Jika ada percakapan yang sedang aktif dibuka, pastikan unread_count nya tetap 0
        const updatedList = json.data.map((c: ConversationItem) =>
          c.id === activeConvIdRef.current ? { ...c, unread_count: 0 } : c
        );
        setConversations(updatedList);

        // Auto-select first conversation if none selected
        setSelectedConversation((prev) => {
          if (prev) {
            const updated = updatedList.find((c: ConversationItem) => c.id === prev.id);
            return updated ? { ...updated, unread_count: 0 } : prev;
          }
          if (updatedList.length > 0) {
            const first = updatedList[0];
            activeConvIdRef.current = first.id;
            if (first.unread_count > 0) {
              fetch('/api/chat', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: first.id }),
              }).catch(() => {});
            }
            return { ...first, unread_count: 0 };
          }
          return null;
        });
      }
    } catch (e) {
      console.error('Failed to fetch admin conversations:', e);
    } finally {
      if (isInitial) setIsLoadingConvs(false);
      isFetchingConvsRef.current = false;
    }
  }, []);

  // 2. Fetch messages for the currently active conversation with SWR cache
  const fetchMessagesForConv = useCallback(async (convId: string, isSilent = false) => {
    if (!convId) return;

    const hasCache = Array.isArray(messagesCacheRef.current[convId]) && messagesCacheRef.current[convId].length > 0;

    // If we have cache, display it immediately (0ms latency!)
    if (hasCache) {
      setMessages(messagesCacheRef.current[convId]);
      setIsLoadingMessages(false);
    } else if (!isSilent) {
      // First time hit: show loader
      setMessages([]);
      setIsLoadingMessages(true);
    }

    try {
      const res = await fetch(`/api/chat?conversationId=${convId}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // Save fresh messages to cache
        messagesCacheRef.current[convId] = json.data;

        // If user is still viewing this conversation, update the UI
        if (activeConvIdRef.current === convId) {
          setMessages(json.data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch conversation messages:', e);
    } finally {
      if (activeConvIdRef.current === convId) {
        setIsLoadingMessages(false);
      }
    }
  }, []);

  // Handle switching conversation with instant cache preview & marking as read
  const handleSelectConversation = (conv: ConversationItem) => {
    activeConvIdRef.current = conv.id;

    // 1. Langsung hilangkan badge jumlah pesan baru pada percakapan yang dibuka
    const openedConv: ConversationItem = { ...conv, unread_count: 0 };
    setSelectedConversation(openedConv);

    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
    );

    // 2. Kirim PATCH ke Supabase untuk menandai semua pesan percakapan ini sebagai terbaca (is_read = true)
    if (conv.unread_count > 0) {
      fetch('/api/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conv.id }),
      }).catch((err) => console.warn('Failed to mark conversation as read:', err));
    }

    const cached = messagesCacheRef.current[conv.id];
    if (cached && cached.length > 0) {
      // Buka dulu dan tampilkan data sebelumnya yang sudah di-hit
      setMessages(cached);
      setIsLoadingMessages(false);
      // Baru setelah itu hit data baru di background secara silent
      fetchMessagesForConv(conv.id, true);
    } else {
      // Belum pernah di-hit: langsung hit dan tampilkan loading
      fetchMessagesForConv(conv.id, false);
    }
  };

  // 3. Fetch products catalog for the recommendation selector
  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setProducts(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load products for chat:', err));
  }, []);

  // Initial load conversations on mount & refresh latar belakang setiap 1 menit
  useEffect(() => {
    fetchConversations(true);

    const ONE_MINUTE = 60 * 1000;
    const interval = setInterval(() => {
      fetchConversations(false);
    }, ONE_MINUTE);

    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Load messages when selected conversation changes & refresh latar belakang setiap 1 menit
  useEffect(() => {
    if (!selectedConversation?.id) {
      setMessages([]);
      return;
    }

    activeConvIdRef.current = selectedConversation.id;

    // Check cache
    const cached = messagesCacheRef.current[selectedConversation.id];
    if (cached && cached.length > 0) {
      setMessages(cached);
      setIsLoadingMessages(false);
      fetchMessagesForConv(selectedConversation.id, true);
    } else {
      fetchMessagesForConv(selectedConversation.id, false);
    }

    const ONE_MINUTE = 60 * 1000;
    const interval = setInterval(() => {
      fetchMessagesForConv(selectedConversation.id, true);
    }, ONE_MINUTE);

    return () => clearInterval(interval);
  }, [selectedConversation?.id, fetchMessagesForConv]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle pharmacist sending reply
  const handleSendPharmacistReply = async () => {
    if ((!replyText.trim() && !selectedProduct) || !selectedConversation || isSending) return;

    const messageText = replyText.trim() || 'Berikut rekomendasi obat dari apoteker:';
    const tempId = `temp-${Date.now()}`;
    const pharmacistName = user?.full_name || 'Staf Farmasi';

    const tempMsg: ChatMessage = {
      id: tempId,
      conversation_id: selectedConversation.id,
      sender_id: user?.id || '',
      sender_role: 'pharmacist',
      sender_name: pharmacistName,
      message: messageText,
      recommended_product: selectedProduct || undefined,
      is_read: true,
      created_at: formatChatTime(new Date().toISOString()),
    };

    const convId = selectedConversation.id;

    setMessages((prev) => {
      const updated = [...prev, tempMsg];
      messagesCacheRef.current[convId] = updated;
      return updated;
    });
    setReplyText('');
    const targetProduct = selectedProduct;
    setSelectedProduct(null);
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          userId: selectedConversation.customer_id,
          senderId: user?.id || undefined,
          senderRole: 'pharmacist',
          senderName: pharmacistName,
          message: messageText,
          recommendedProductId: targetProduct?.id || undefined,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setMessages((prev) => {
          const updated = prev.map((m) => (m.id === tempId ? json.data : m));
          messagesCacheRef.current[convId] = updated;
          return updated;
        });
        // Refresh conversations list to update last message
        fetchConversations(false);
      }
    } catch (e) {
      console.error('Failed to send pharmacist reply:', e);
    } finally {
      setIsSending(false);
    }
  };

  const [isAutoReplyModalOpen, setIsAutoReplyModalOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <span>Meja Konsultasi Apoteker (Live Chat)</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              Live Chat Aktif
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Layanan tanya jawab resep obat, keluhan pasien, dan edukasi farmasi resmi berstandar izin praktik Kemenkes RI
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsAutoReplyModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
          >
            <Bot className="w-3.5 h-3.5 text-sky-600" />
            <span>Pesan Pembuka & Balasan Otomatis</span>
          </button>

          <button
            onClick={() => {
              fetchConversations(true);
              if (selectedConversation) fetchMessagesForConv(selectedConversation.id, true);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Segarkan Data</span>
          </button>
        </div>
      </div>

      <AutoReplyModal
        isOpen={isAutoReplyModalOpen}
        onClose={() => setIsAutoReplyModalOpen(false)}
        products={products}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List (1 col) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3">
          <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Daftar Konsultasi Pasien</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {conversations.length} Percakapan
            </span>
          </h3>

          {isLoadingConvs && conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
              <span className="text-xs">Memuat daftar chat...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">Belum ada pasien yang memulai konsultasi.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {conversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;
                const initials = (conv.customer_name || 'P')
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-3 rounded-2xl border transition cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'bg-sky-50 border-sky-400 shadow-xs'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                          {initials}
                        </div>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {conv.customer_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {conv.last_message_at}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-1 pl-9">
                      {conv.last_message}
                    </p>

                    {conv.unread_count > 0 && (
                      <div className="flex justify-end pt-1">
                        <span className="px-1.5 py-0.5 rounded-full bg-sky-600 text-white text-[9px] font-extrabold">
                          {conv.unread_count} baru
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Chat Window (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-stitch flex flex-col h-[620px] overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                    {(selectedConversation.customer_name || 'P')
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{selectedConversation.customer_name}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[9px] font-bold">
                        Pasien
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {selectedConversation.customer_phone
                        ? `No. Telp: ${selectedConversation.customer_phone}`
                        : 'Konsultasi Farmasi Digital Apotek Jabat'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    ● Terbuka
                  </span>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-slate-50/40">
                {isLoadingMessages && messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                    <span className="text-xs">Memuat pesan percakapan...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-20 text-center text-slate-400">
                    <p className="text-xs">Belum ada riwayat pesan dalam percakapan ini.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isPharmacist = m.sender_role === 'pharmacist' || m.sender_role === 'admin';

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
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-line shadow-2xs ${
                            isPharmacist
                              ? 'bg-sky-700 text-white rounded-tr-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                          }`}
                        >
                          {(m.attachment_path || m.attachment_url) && (
                            <div className="mb-2">
                              <a
                                href={m.attachment_path || m.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="block group relative overflow-hidden rounded-xl border border-slate-200/60 bg-black/5 hover:opacity-95 transition"
                              >
                                <img
                                  src={m.attachment_path || m.attachment_url}
                                  alt="Lampiran Resep / Foto"
                                  className="max-h-56 w-auto max-w-full rounded-xl object-contain mx-auto"
                                />
                                <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur-xs">
                                  Buka Foto ↗
                                </span>
                              </a>
                            </div>
                          )}
                          {m.message}
                        </div>

                        {/* Product Recommendation Card */}
                        {m.recommended_product && (
                          <div className="mt-2 p-3 bg-white rounded-2xl border border-sky-300 shadow-sm max-w-xs space-y-1.5 animate-in fade-in">
                            <span className="text-[9px] font-extrabold text-sky-600 uppercase flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Rekomendasi Terlampir:
                            </span>
                            <div className="flex items-center gap-2">
                              {m.recommended_product.image_url && (
                                <img
                                  src={m.recommended_product.image_url}
                                  alt={m.recommended_product.name}
                                  className="w-10 h-10 rounded-lg object-contain bg-slate-50 border border-slate-100 p-0.5 shrink-0"
                                />
                              )}
                              <div>
                                <div className="font-bold text-slate-900 text-xs line-clamp-1">
                                  {m.recommended_product.name}
                                </div>
                                <div className="text-xs font-extrabold text-sky-700">
                                  {formatRupiah(m.recommended_product.variants?.[0]?.price || 0)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Pharmacist Reply Box */}
              <div className="p-3.5 border-t border-slate-200 bg-white space-y-2.5">
                {/* Attach Product Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-sky-600" />
                    <span>Lampirkan Obat:</span>
                  </span>
                  <select
                    value={selectedProduct?.id || ''}
                    onChange={(e) => {
                      const prod = products.find((p) => p.id === e.target.value);
                      setSelectedProduct(prod || null);
                    }}
                    className="flex-1 min-w-[200px] bg-slate-50 border border-slate-200 rounded-xl py-1 px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">-- Pilih Obat untuk Direkomendasikan --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatRupiah(p.variants?.[0]?.price || 0)})
                      </option>
                    ))}
                  </select>
                  {selectedProduct && (
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="text-[10px] text-rose-600 hover:underline font-bold"
                    >
                      Batal
                    </button>
                  )}
                </div>

                {/* Input text and send */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendPharmacistReply();
                    }}
                    disabled={isSending}
                    placeholder="Ketik balasan edukasi dosis atau aturan pakai obat..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                  <button
                    onClick={handleSendPharmacistReply}
                    disabled={isSending || (!replyText.trim() && !selectedProduct)}
                    className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Kirim</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300" />
              <p className="text-xs">Pilih salah satu percakapan di sebelah kiri untuk melihat pesan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
