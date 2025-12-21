const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 지갑 아이콘 SVG - 크기를 줄여서 더 예쁘게 (약 55% 차지)
const createWalletSVG = (size) => {
  const scale = size / 512;

  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5CBDB9"/>
      <stop offset="100%" style="stop-color:#4AA8A5"/>
    </linearGradient>
    <linearGradient id="walletBody" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FAFAFA"/>
      <stop offset="100%" style="stop-color:#F0F0F0"/>
    </linearGradient>
    <linearGradient id="walletFlap" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#EEEEEE"/>
      <stop offset="100%" style="stop-color:#E0E0E0"/>
    </linearGradient>
    <linearGradient id="coin1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFE066"/>
      <stop offset="100%" style="stop-color:#F5D547"/>
    </linearGradient>
    <linearGradient id="coin2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F5D547"/>
      <stop offset="100%" style="stop-color:#E8C83A"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- 배경 원 -->
  <circle cx="256" cy="256" r="256" fill="url(#bgGradient)"/>

  <!-- 배경 장식 원들 -->
  <circle cx="380" cy="120" r="25" fill="rgba(255,255,255,0.1)"/>
  <circle cx="420" cy="380" r="35" fill="rgba(255,255,255,0.08)"/>
  <circle cx="100" cy="400" r="20" fill="rgba(255,255,255,0.1)"/>

  <!-- 동전 1 (큰 것, $ 마크) -->
  <circle cx="148" cy="158" r="32" fill="url(#coin1)" filter="url(#shadow)"/>
  <text x="148" y="168" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#B8960A" text-anchor="middle">$</text>

  <!-- 동전 2 (작은 것) -->
  <circle cx="205" cy="180" r="24" fill="url(#coin2)"/>

  <!-- 지갑 몸통 -->
  <rect x="138" y="205" width="236" height="150" rx="16" fill="url(#walletBody)" filter="url(#shadow)"/>

  <!-- 지갑 윗부분 (플랩) -->
  <rect x="138" y="205" width="236" height="52" rx="16" fill="url(#walletFlap)"/>
  <rect x="138" y="235" width="236" height="22" fill="url(#walletFlap)"/>

  <!-- 버튼/잠금장치 -->
  <circle cx="328" cy="295" r="22" fill="#4AA8A5"/>
  <circle cx="328" cy="295" r="13" fill="#3D8B88"/>

  <!-- W 글자 -->
  <text x="230" y="315" font-family="Arial, sans-serif" font-size="70" font-weight="bold" fill="#5CBDB9" text-anchor="middle">W</text>
</svg>`;
};

// 간단한 버전 (favicon용 - 더 단순화)
const createSimpleWalletSVG = (size) => {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5CBDB9"/>
      <stop offset="100%" style="stop-color:#4AA8A5"/>
    </linearGradient>
  </defs>

  <!-- 배경 -->
  <circle cx="32" cy="32" r="32" fill="url(#bgGrad)"/>

  <!-- 동전들 -->
  <circle cx="18" cy="18" r="5" fill="#F5D547"/>
  <circle cx="26" cy="21" r="4" fill="#E8C83A"/>

  <!-- 지갑 -->
  <rect x="15" y="25" width="34" height="22" rx="3" fill="#F5F5F5"/>
  <rect x="15" y="25" width="34" height="8" rx="3" fill="#E8E8E8"/>

  <!-- 버튼 -->
  <circle cx="44" cy="38" r="3.5" fill="#4AA8A5"/>
  <circle cx="44" cy="38" r="2" fill="#3D8B88"/>

  <!-- W -->
  <text x="28" y="42" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#5CBDB9" text-anchor="middle">W</text>
</svg>`;
};

// Adaptive icon용 SVG (Android - 더 작게, safe zone 고려)
const createAdaptiveWalletSVG = (size) => {
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5CBDB9"/>
      <stop offset="100%" style="stop-color:#4AA8A5"/>
    </linearGradient>
    <linearGradient id="walletBody2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FAFAFA"/>
      <stop offset="100%" style="stop-color:#F0F0F0"/>
    </linearGradient>
    <linearGradient id="walletFlap2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#EEEEEE"/>
      <stop offset="100%" style="stop-color:#E0E0E0"/>
    </linearGradient>
    <linearGradient id="coin1b" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFE066"/>
      <stop offset="100%" style="stop-color:#F5D547"/>
    </linearGradient>
    <linearGradient id="coin2b" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F5D547"/>
      <stop offset="100%" style="stop-color:#E8C83A"/>
    </linearGradient>
  </defs>

  <!-- 배경 원 -->
  <circle cx="256" cy="256" r="256" fill="url(#bgGradient2)"/>

  <!-- 동전 1 ($ 마크) - 더 안쪽으로 -->
  <circle cx="168" cy="175" r="28" fill="url(#coin1b)"/>
  <text x="168" y="184" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#B8960A" text-anchor="middle">$</text>

  <!-- 동전 2 -->
  <circle cx="218" cy="193" r="21" fill="url(#coin2b)"/>

  <!-- 지갑 몸통 - 더 작게 -->
  <rect x="156" y="215" width="200" height="128" rx="14" fill="url(#walletBody2)"/>

  <!-- 지갑 윗부분 -->
  <rect x="156" y="215" width="200" height="45" rx="14" fill="url(#walletFlap2)"/>
  <rect x="156" y="242" width="200" height="18" fill="url(#walletFlap2)"/>

  <!-- 버튼 -->
  <circle cx="316" cy="290" r="18" fill="#4AA8A5"/>
  <circle cx="316" cy="290" r="11" fill="#3D8B88"/>

  <!-- W 글자 -->
  <text x="235" y="305" font-family="Arial, sans-serif" font-size="58" font-weight="bold" fill="#5CBDB9" text-anchor="middle">W</text>
</svg>`;
};

async function generateIcons() {
  const assetsDir = path.join(__dirname, '..', 'assets');

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  console.log('💳 지갑 아이콘 생성 중 (크기 축소 버전)...\n');

  try {
    // 1. 메인 앱 아이콘 (1024x1024)
    console.log('📱 icon.png (1024x1024) 생성 중...');
    await sharp(Buffer.from(createWalletSVG(1024)))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(assetsDir, 'icon.png'));
    console.log('   ✅ icon.png 완료\n');

    // 2. Adaptive 아이콘 (1024x1024)
    console.log('🤖 adaptive-icon.png (1024x1024) 생성 중...');
    await sharp(Buffer.from(createAdaptiveWalletSVG(1024)))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(assetsDir, 'adaptive-icon.png'));
    console.log('   ✅ adaptive-icon.png 완료\n');

    // 3. Favicon (48x48)
    console.log('🌐 favicon.png (48x48) 생성 중...');
    await sharp(Buffer.from(createSimpleWalletSVG(256)))
      .resize(48, 48)
      .png()
      .toFile(path.join(assetsDir, 'favicon.png'));
    console.log('   ✅ favicon.png 완료\n');

    // 4. Splash 아이콘 (512x512)
    console.log('💫 splash-icon.png (512x512) 생성 중...');
    await sharp(Buffer.from(createWalletSVG(512)))
      .resize(512, 512)
      .png()
      .toFile(path.join(assetsDir, 'splash-icon.png'));
    console.log('   ✅ splash-icon.png 완료\n');

    console.log('🎉 모든 아이콘이 성공적으로 생성되었습니다!');
    console.log('\n생성된 파일들:');
    console.log('  - assets/icon.png (앱 아이콘)');
    console.log('  - assets/adaptive-icon.png (Android 적응형 아이콘)');
    console.log('  - assets/favicon.png (웹 파비콘)');
    console.log('  - assets/splash-icon.png (스플래시 화면 아이콘)');

  } catch (error) {
    console.error('❌ 아이콘 생성 중 오류 발생:', error);
    process.exit(1);
  }
}

generateIcons();
