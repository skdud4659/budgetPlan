import { supabase } from '../config/supabase';

export interface Inquiry {
  id: string;
  userId: string;
  userEmail: string;
  category: InquiryCategory;
  title: string;
  content: string;
  status: InquiryStatus;
  reply?: string;
  repliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type InquiryCategory = 'bug' | 'feature' | 'account' | 'payment' | 'other';
export type InquiryStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';

export interface CreateInquiryData {
  category: InquiryCategory;
  title: string;
  content: string;
}

const categoryLabels: Record<InquiryCategory, string> = {
  bug: '버그 신고',
  feature: '기능 제안',
  account: '계정 문의',
  payment: '결제 문의',
  other: '기타',
};

const statusLabels: Record<InquiryStatus, string> = {
  pending: '접수됨',
  in_progress: '처리 중',
  resolved: '답변 완료',
  closed: '종료',
};

export const inquiryService = {
  getCategoryLabel: (category: InquiryCategory) => categoryLabels[category],
  getStatusLabel: (status: InquiryStatus) => statusLabels[status],

  // 문의 생성
  async createInquiry(data: CreateInquiryData): Promise<Inquiry> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('인증이 필요합니다');

    const { data: inquiry, error } = await supabase
      .from('inquiries')
      .insert({
        user_id: user.id,
        user_email: user.email,
        category: data.category,
        title: data.title,
        content: data.content,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: inquiry.id,
      userId: inquiry.user_id,
      userEmail: inquiry.user_email,
      category: inquiry.category,
      title: inquiry.title,
      content: inquiry.content,
      status: inquiry.status,
      reply: inquiry.reply,
      repliedAt: inquiry.replied_at,
      createdAt: inquiry.created_at,
      updatedAt: inquiry.updated_at,
    };
  },

  // 내 문의 목록 조회
  async getMyInquiries(): Promise<Inquiry[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('인증이 필요합니다');

    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((inquiry) => ({
      id: inquiry.id,
      userId: inquiry.user_id,
      userEmail: inquiry.user_email,
      category: inquiry.category,
      title: inquiry.title,
      content: inquiry.content,
      status: inquiry.status,
      reply: inquiry.reply,
      repliedAt: inquiry.replied_at,
      createdAt: inquiry.created_at,
      updatedAt: inquiry.updated_at,
    }));
  },

  // 문의 상세 조회
  async getInquiry(id: string): Promise<Inquiry | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('인증이 필요합니다');

    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      userEmail: data.user_email,
      category: data.category,
      title: data.title,
      content: data.content,
      status: data.status,
      reply: data.reply,
      repliedAt: data.replied_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },
};
