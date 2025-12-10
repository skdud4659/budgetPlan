import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../config/supabase';

// WebBrowser warm up for faster auth
WebBrowser.maybeCompleteAuthSession();

// Supabase URL에서 프로젝트 ID 추출
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

export const kakaoAuthService = {
  async signInWithKakao() {
    try {
      // Expo의 redirect URI 생성
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'plan-budget',
        path: 'auth/callback',
      });

      // Supabase OAuth URL 생성
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('OAuth URL을 가져올 수 없습니다.');

      // 브라우저에서 카카오 로그인 페이지 열기
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      if (result.type === 'success' && result.url) {
        // URL에서 액세스 토큰과 리프레시 토큰 추출
        const url = new URL(result.url);

        // Fragment(#) 또는 Query(?) 파라미터에서 토큰 추출
        const params = new URLSearchParams(
          url.hash ? url.hash.substring(1) : url.search.substring(1)
        );

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken) {
          // Supabase 세션 설정
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError) throw sessionError;
          return sessionData;
        }

        // 토큰이 없으면 code로 세션 교환 시도
        const code = params.get('code');
        if (code) {
          const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
          if (sessionError) throw sessionError;
          return sessionData;
        }

        throw new Error('인증 토큰을 찾을 수 없습니다.');
      } else if (result.type === 'cancel') {
        throw new Error('로그인이 취소되었습니다.');
      } else {
        throw new Error('로그인에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Kakao login error:', error);
      throw error;
    }
  },
};
