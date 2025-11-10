// PDF 하이라이트 모듈 - 검색용
// 이 모듈은 window.viewerWrapper 변수에 의존합니다.

/**
 * Y 좌표를 기준으로 span들을 라인별로 그룹화
 * @param {NodeList|Array} textSpans - 텍스트 span 요소들
 * @returns {Map} 라인 키를 값으로 하는 span 배열 맵
 */
function groupSpansByLine(textSpans) {
  const lines = new Map();
  
  Array.from(textSpans).forEach(span => {
    const style = window.getComputedStyle(span);
    const top = parseFloat(style.top) || 0;
    // Y 좌표를 3px 단위로 반올림하여 라인 그룹화
    const lineKey = Math.round(top / 3) * 3;
    
    if (!lines.has(lineKey)) {
      lines.set(lineKey, []);
    }
    lines.get(lineKey).push(span);
  });
  
  return lines;
}

/**
 * span 배열의 고유 라인 수 계산
 * @param {Array} spans - span 요소 배열
 * @param {Map} lines - 라인별 그룹화된 맵
 * @returns {number} 고유 라인 수
 */
function getLineCount(spans, lines) {
  const uniqueLines = new Set();
  
  spans.forEach(span => {
    const style = window.getComputedStyle(span);
    const top = parseFloat(style.top) || 0;
    const lineKey = Math.round(top / 3) * 3;
    uniqueLines.add(lineKey);
  });
  
  return uniqueLines.size;
}

/**
 * 새로운 라인인지 확인 (Y 좌표 차이 기준)
 * @param {number} currentTop - 현재 span의 top 값
 * @param {number} lastTop - 이전 span의 top 값
 * @returns {boolean} 새로운 라인 여부
 */
function isNewLine(currentTop, lastTop) {
  if (lastTop === null) return false;
  return Math.abs(currentTop - lastTop) > 5;
}

/**
 * 검색용 하이라이트 적용 함수
 * @param {HTMLElement} textLayer - 텍스트 레이어 요소
 * @param {string[]} keywords - 하이라이트할 키워드 배열 (사용 안 함)
 * @param {string} searchText - 검색 텍스트
 */
function applyHighlightForSearch(textLayer, keywords, searchText) {
  if (!textLayer) {
    return;
  }
  
  // ✅ 기존 하이라이트 제거
  textLayer.querySelectorAll('.highlight, .highlight-strong, .highlight-current, .highlight-sentence, .highlight-word').forEach(el => {
    el.classList.remove('highlight', 'highlight-strong', 'highlight-current', 'highlight-sentence', 'highlight-word');
  });
  
  if (!searchText || !searchText.trim()) {
    console.log('ℹ️ [검색] 검색 텍스트가 없습니다.');
    return;
  }
  
  // ✅ 공백으로 구분된 검색어 파싱
  const searchQueries = searchText
    .split(/\s+/)
    .map(q => q.trim())
    .filter(q => q.length > 0)
    .map(q => q.toLowerCase());
  
  if (searchQueries.length === 0) {
    console.log('ℹ️ [검색] 검색어가 없습니다.');
    return;
  }
  
  const textSpans = textLayer.querySelectorAll('span');
  if (textSpans.length === 0) {
    console.log('ℹ️ [검색] 텍스트 span이 없습니다.');
    return;
  }
  
  // 라인별 그룹화 (문장 하이라이트를 위한 준비)
  const lines = groupSpansByLine(textSpans);
  
  // 1단계: 모든 검색어를 개별적으로 하이라이트
  searchQueries.forEach((query) => {
    for (let i = 0; i < textSpans.length; i++) {
      const span = textSpans[i];
      const text = (span.textContent || '').trim();
      
      if (!text) continue;
      
      // 단일 span에서 검색어 찾기
      if (text.toLowerCase().includes(query)) {
        span.classList.add('highlight-word');
        continue;
      }
      
      // 검색어가 여러 span에 걸쳐 있을 수 있으므로 인접한 span들을 결합하여 검색
      let combinedText = '';
      let combinedSpans = [];
      
      for (let j = i; j < Math.min(i + 5, textSpans.length); j++) {
        const nextSpan = textSpans[j];
        const nextText = (nextSpan.textContent || '').trim();
        
        if (nextText) {
          combinedText += nextText;
          combinedSpans.push(nextSpan);
          
          if (combinedText.toLowerCase().includes(query)) {
            combinedSpans.forEach(s => {
              s.classList.add('highlight-word');
            });
            break;
          }
        }
      }
    }
  });
  
  // 2단계: 문장 하이라이트 제거 (단일/복수 검색어 모두)
  // 기존 문장 하이라이트 제거
  textLayer.querySelectorAll('.highlight-sentence').forEach(el => {
    el.classList.remove('highlight-sentence');
  });
  console.log('ℹ️ [검색] 문장 하이라이트를 적용하지 않습니다. 검색어만 하이라이트합니다.');
  
  console.log('✅ [검색] 하이라이트 적용 완료');
}

/**
 * 검색용 하이라이트된 요소로 스크롤
 * 검색어 하이라이트로 스크롤
 * @param {HTMLElement} textLayer - 텍스트 레이어 요소
 * @param {number} currentIndex - 현재 검색 결과 인덱스
 */
function scrollToHighlightForSearch(textLayer, currentIndex = 0) {
  if (!textLayer) {
    if (typeof window.viewerWrapper !== 'undefined' && window.viewerWrapper) {
      window.viewerWrapper.scrollTop = 0;
    }
    return;
  }
  
  // 검색어 하이라이트로 스크롤
  const wordHighlight = textLayer.querySelector('.highlight-word');
  if (wordHighlight) {
    console.log('📍 [검색] 검색어 하이라이트 위치로 스크롤 중...');
    wordHighlight.scrollIntoView({
      behavior: 'auto',
      block: 'center',
      inline: 'nearest'
    });
    console.log('✅ [검색] 검색어 하이라이트 위치로 스크롤 완료');
    return;
  }
  
  // 하이라이트가 없으면 페이지 상단으로
  if (typeof window.viewerWrapper !== 'undefined' && window.viewerWrapper) {
    window.viewerWrapper.scrollTop = 0;
    console.log('📍 [검색] 하이라이트 없음, 페이지 상단으로 스크롤');
  }
}
