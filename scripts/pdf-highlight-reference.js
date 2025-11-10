// PDF 하이라이트 모듈 - 참조 클릭용 (원숫자 클릭)
// 이 모듈은 window.viewerWrapper 변수에 의존합니다.

/**
 * 참조 클릭용 하이라이트 적용 함수
 * URL 파라미터의 키워드와 검색 텍스트를 사용
 * @param {HTMLElement} textLayer - 텍스트 레이어 요소
 * @param {string[]} keywords - 하이라이트할 키워드 배열
 * @param {string} searchText - 검색 텍스트
 */
function applyHighlightForReference(textLayer, keywords, searchText) {
  if (!textLayer || (!keywords.length && !searchText)) {
    console.log('⚠️ [참조] 하이라이트할 키워드나 텍스트가 없습니다.');
    return;
  }
  
  // ✅ 기존 하이라이트 제거
  textLayer.querySelectorAll('.highlight, .highlight-strong').forEach(el => {
    el.classList.remove('highlight', 'highlight-strong');
  });
  
  const textSpans = textLayer.querySelectorAll('span');
  let highlightCount = 0;
  
  // ✅ 참조용: 키워드 우선 하이라이트 (URL 파라미터에서 온 키워드)
  if (keywords.length > 0) {
    const shortKeywords = keywords.filter(k => k && k.trim().length >= 3 && k.trim().length <= 20);
    
    textSpans.forEach((span) => {
      const text = span.textContent || '';
      if (!text.trim()) return;
      
      let shouldHighlight = false;
      
      for (const keyword of shortKeywords) {
        const trimmedKeyword = keyword.trim();
        const keywordRegex = new RegExp(`\\b${trimmedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        
        if (keywordRegex.test(text) || (trimmedKeyword.length >= 4 && text.includes(trimmedKeyword))) {
          shouldHighlight = true;
          break;
        }
      }
      
      if (shouldHighlight) {
        span.classList.add('highlight');
        highlightCount++;
      }
    });
  }
  
  // ✅ 참조용: 검색 텍스트 하이라이트 (긴 문장 지원)
  if (searchText && searchText.trim().length > 0) {
    const trimmedSearchText = searchText.trim();
    const textLength = trimmedSearchText.length;
    
    console.log(`🔍 [참조] 검색 텍스트 길이: ${textLength}자`);
    
    if (textLength >= 30) {
      // 긴 문장: 핵심 부분만 하이라이트
      const coreText = trimmedSearchText.substring(0, 35).trim();
      
      let accumulatedText = '';
      let accumulatedSpans = [];
      
      textSpans.forEach((span) => {
        const text = span.textContent || '';
        if (text.trim()) {
          accumulatedText += text;
          accumulatedSpans.push(span);
          
          if (accumulatedText.toLowerCase().includes(coreText.toLowerCase())) {
            const maxLength = coreText.length * 2;
            if (accumulatedText.length <= maxLength) {
              accumulatedSpans.forEach(s => {
                s.classList.add('highlight-strong');
                highlightCount++;
              });
            }
            accumulatedText = '';
            accumulatedSpans = [];
          }
          
          if (accumulatedText.length > coreText.length * 3) {
            accumulatedText = '';
            accumulatedSpans = [];
          }
        }
      });
    } else {
      // 짧은 텍스트: 정확한 매칭
      const normalizedSearch = trimmedSearchText.toLowerCase();
      
      textSpans.forEach((span) => {
        const text = (span.textContent || '').toLowerCase();
        if (text.includes(normalizedSearch)) {
          span.classList.add('highlight-strong');
          highlightCount++;
        }
      });
    }
  }
  
  console.log(`✅ [참조] 하이라이트 적용 완료: ${highlightCount}개 요소`);
}

/**
 * 참조용 하이라이트된 요소로 스크롤
 * @param {HTMLElement} textLayer - 텍스트 레이어 요소
 */
function scrollToHighlightForReference(textLayer) {
  const highlighted = textLayer.querySelector('.highlight, .highlight-strong');
  if (highlighted) {
    console.log('📍 [참조] 하이라이트 위치로 스크롤 중...');
    highlighted.scrollIntoView({ 
      behavior: 'smooth', // 참조용은 부드러운 스크롤
      block: 'center',
      inline: 'nearest'
    });
    console.log('✅ [참조] 하이라이트 위치로 스크롤 완료');
  } else {
    if (typeof window.viewerWrapper !== 'undefined' && window.viewerWrapper) {
      window.viewerWrapper.scrollTop = 0;
    }
    console.log('📍 [참조] 하이라이트 없음, 페이지 상단으로 스크롤');
  }
}

