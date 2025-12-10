const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 귀여운 돼지저금통 SVG - 민트색 테마
const createPiggyBankSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 그라데이션 배경 -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5CBDB9"/>
      <stop offset="100%" style="stop-color:#3DA5A1"/>
    </linearGradient>

    <!-- 돼지 몸통 그라데이션 -->
    <linearGradient id="pigBody" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD4CC"/>
      <stop offset="100%" style="stop-color:#FFB5A7"/>
    </linearGradient>

    <!-- 뺨 그라데이션 -->
    <radialGradient id="cheek" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#FFADA3"/>
      <stop offset="100%" style="stop-color:#FFB5A7;stop-opacity:0"/>
    </radialGradient>

    <!-- 코 그라데이션 -->
    <linearGradient id="nose" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFB5A7"/>
      <stop offset="100%" style="stop-color:#E89A8C"/>
    </linearGradient>

    <!-- 동전 그라데이션 -->
    <linearGradient id="coin" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFE066"/>
      <stop offset="100%" style="stop-color:#FFD700"/>
    </linearGradient>
  </defs>

  <!-- 배경 원 -->
  <circle cx="256" cy="256" r="240" fill="url(#bgGradient)"/>

  <!-- 배경 장식 원들 -->
  <circle cx="120" cy="120" r="30" fill="rgba(255,255,255,0.15)"/>
  <circle cx="400" cy="380" r="45" fill="rgba(255,255,255,0.1)"/>
  <circle cx="380" cy="130" r="20" fill="rgba(255,255,255,0.12)"/>

  <!-- 돼지 몸통 (큰 타원) -->
  <ellipse cx="256" cy="290" rx="140" ry="110" fill="url(#pigBody)"/>

  <!-- 돼지 머리 -->
  <circle cx="256" cy="230" r="100" fill="url(#pigBody)"/>

  <!-- 왼쪽 귀 -->
  <ellipse cx="175" cy="155" rx="35" ry="45" fill="#FFB5A7" transform="rotate(-20 175 155)"/>
  <ellipse cx="178" cy="160" rx="20" ry="28" fill="#FFCFC6" transform="rotate(-20 178 160)"/>

  <!-- 오른쪽 귀 -->
  <ellipse cx="337" cy="155" rx="35" ry="45" fill="#FFB5A7" transform="rotate(20 337 155)"/>
  <ellipse cx="334" cy="160" rx="20" ry="28" fill="#FFCFC6" transform="rotate(20 334 160)"/>

  <!-- 코 (타원형) -->
  <ellipse cx="256" cy="260" rx="45" ry="35" fill="url(#nose)"/>

  <!-- 코구멍 -->
  <ellipse cx="240" cy="262" rx="8" ry="10" fill="#E89A8C"/>
  <ellipse cx="272" cy="262" rx="8" ry="10" fill="#E89A8C"/>

  <!-- 눈 (왼쪽) -->
  <circle cx="210" cy="210" r="18" fill="#2D3748"/>
  <circle cx="215" cy="205" r="6" fill="white"/>

  <!-- 눈 (오른쪽) -->
  <circle cx="302" cy="210" r="18" fill="#2D3748"/>
  <circle cx="307" cy="205" r="6" fill="white"/>

  <!-- 뺨 홍조 -->
  <ellipse cx="165" cy="245" rx="25" ry="18" fill="url(#cheek)"/>
  <ellipse cx="347" cy="245" rx="25" ry="18" fill="url(#cheek)"/>

  <!-- 동전 투입구 -->
  <rect x="226" cy="130" y="135" width="60" height="12" rx="6" fill="#3DA5A1"/>

  <!-- 동전 -->
  <g transform="translate(256, 105)">
    <ellipse cx="0" cy="0" rx="28" ry="28" fill="url(#coin)"/>
    <ellipse cx="0" cy="0" rx="20" ry="20" fill="none" stroke="#E6B800" stroke-width="3"/>
    <text x="0" y="6" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#CC9900" text-anchor="middle">₩</text>
  </g>

  <!-- 앞다리 -->
  <ellipse cx="180" cy="370" rx="30" ry="40" fill="#FFB5A7"/>
  <ellipse cx="332" cy="370" rx="30" ry="40" fill="#FFB5A7"/>

  <!-- 발굽 -->
  <ellipse cx="180" cy="395" rx="25" ry="15" fill="#E89A8C"/>
  <ellipse cx="332" cy="395" rx="25" ry="15" fill="#E89A8C"/>
</svg>
`;

// 간단한 버전 (favicon용)
const createSimplePiggyBankSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5CBDB9"/>
      <stop offset="100%" style="stop-color:#3DA5A1"/>
    </linearGradient>
    <linearGradient id="pigGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD4CC"/>
      <stop offset="100%" style="stop-color:#FFB5A7"/>
    </linearGradient>
  </defs>

  <!-- 배경 -->
  <circle cx="32" cy="32" r="30" fill="url(#bgGrad)"/>

  <!-- 돼지 몸통 -->
  <ellipse cx="32" cy="36" rx="18" ry="14" fill="url(#pigGrad)"/>

  <!-- 머리 -->
  <circle cx="32" cy="28" r="13" fill="url(#pigGrad)"/>

  <!-- 귀 -->
  <ellipse cx="22" cy="18" rx="4" ry="6" fill="#FFB5A7" transform="rotate(-15 22 18)"/>
  <ellipse cx="42" cy="18" rx="4" ry="6" fill="#FFB5A7" transform="rotate(15 42 18)"/>

  <!-- 코 -->
  <ellipse cx="32" cy="32" rx="6" ry="5" fill="#E89A8C"/>
  <circle cx="30" cy="32" r="1.5" fill="#D18B7E"/>
  <circle cx="34" cy="32" r="1.5" fill="#D18B7E"/>

  <!-- 눈 -->
  <circle cx="27" cy="26" r="2.5" fill="#2D3748"/>
  <circle cx="37" cy="26" r="2.5" fill="#2D3748"/>
  <circle cx="28" cy="25" r="1" fill="white"/>
  <circle cx="38" cy="25" r="1" fill="white"/>

  <!-- 동전 투입구 -->
  <rect x="27" y="16" width="10" height="2" rx="1" fill="#3DA5A1"/>

  <!-- 동전 -->
  <circle cx="32" cy="12" r="5" fill="#FFD700"/>
  <text x="32" y="14" font-family="Arial" font-size="6" font-weight="bold" fill="#CC9900" text-anchor="middle">₩</text>
</svg>
`;

async function generateIcons() {
  const assetsDir = path.join(__dirname, '..', 'assets');

  // 디렉토리 확인
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  console.log('🐷 귀여운 돼지저금통 아이콘 생성 중...\n');

  try {
    // 1. 메인 앱 아이콘 (1024x1024)
    console.log('📱 icon.png (1024x1024) 생성 중...');
    await sharp(Buffer.from(createPiggyBankSVG(1024)))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(assetsDir, 'icon.png'));
    console.log('   ✅ icon.png 완료\n');

    // 2. Adaptive 아이콘 (1024x1024)
    console.log('🤖 adaptive-icon.png (1024x1024) 생성 중...');
    await sharp(Buffer.from(createPiggyBankSVG(1024)))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(assetsDir, 'adaptive-icon.png'));
    console.log('   ✅ adaptive-icon.png 완료\n');

    // 3. Favicon (48x48)
    console.log('🌐 favicon.png (48x48) 생성 중...');
    await sharp(Buffer.from(createSimplePiggyBankSVG(256)))
      .resize(48, 48)
      .png()
      .toFile(path.join(assetsDir, 'favicon.png'));
    console.log('   ✅ favicon.png 완료\n');

    // 4. Splash 아이콘 (200x200 정도 중앙에 배치될 아이콘)
    console.log('💫 splash-icon.png (512x512) 생성 중...');
    await sharp(Buffer.from(createPiggyBankSVG(512)))
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
