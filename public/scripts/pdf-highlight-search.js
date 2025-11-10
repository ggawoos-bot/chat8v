// PDF 하이라이트 모듈 - 검색용
// 이 모듈은 window.viewerWrapper 변수에 의존합니다.

/**
 * 검색용 하이라이트 적용 함수
 * 사용자가 입력한 검색어를 사용 (복수 검색어 지원)
 * 검색 모드에서는 하이라이트 스타일을 적용하지 않음
 * @param {HTMLElement} textLayer - 텍스트 레이어 요소
 * @param {string[]} keywords - 하이라이트할 키워드 배열 (사용 안 함)
 * @param {string} searchText - 검색 텍스트
 */
function applyHighlightForSearch(textLayer, keywords, searchText) {
  if (!textLayer || !searchText || !searchText.trim()) {
    console.log('⚠️ [검색] 검색 텍스트가 없습니다.');
    return;
  }
  
  // ✅ 기존 하이라이트 제거
  textLayer.querySelectorAll('.highlight, .highlight-strong, .highlight-current').forEach(el => {
    el.classList.remove('highlight', 'highlight-strong', 'highlight-current');
  });
  
  // 검색 모드에서는 하이라이트 스타일을 적용하지 않음
  // 검색 결과 찾기 기능은 pdf-search.js에서 처리
  console.log('✅ [검색] 하이라이트 스타일 제거 완료 (검색 모드에서는 시각적 하이라이트 없음)');
}

/**
 * 검색용 하이라이트된 요소로 스크롤
 * 검색 모드에서는 하이라이트 스타일을 적용하지 않고 스크롤만 수행
 * @param {HTMLElement} textLayer - 텍스트 레이어 요소
 * @param {number} currentIndex - 현재 검색 결과 인덱스
 */
function scrollToHighlightForSearch(textLayer, currentIndex = 0) {
  // 검색 모드에서는 하이라이트 스타일을 적용하지 않음
  // 검색 결과 위치로 스크롤만 수행 (하이라이트 없이)
  if (!textLayer || !window.searchViewer || !window.searchViewer.searchText) {
    return;
  }
  
  const searchText = window.searchViewer.searchText.trim();
  if (!searchText) {
    return;
  }
  
  // 검색어를 찾아서 해당 위치로 스크롤 (하이라이트 스타일 없이)
  const searchQueries = searchText
    .split(/\s+/)
    .map(q => q.trim())
    .filter(q => q.length > 0)
    .map(q => q.toLowerCase());
  
  const textSpans = textLayer.querySelectorAll('span');
  let foundCount = 0;
  let targetSpan = null;
  
  if (searchQueries.length > 1) {
    // 복수 검색어: 모든 검색어가 포함된 첫 번째 위치 찾기
    let accumulatedText = '';
    let accumulatedSpans = [];
    
    for (const span of textSpans) {
      const text = span.textContent || '';
      if (text.trim()) {
        accumulatedText += text;
        accumulatedSpans.push(span);
        
        const normalizedAccumulated = accumulatedText.toLowerCase();
        const allFound = searchQueries.every(query => 
          normalizedAccumulated.includes(query)
        );
        
        if (allFound && foundCount === currentIndex) {
          targetSpan = accumulatedSpans[0];
          break;
        }
        
        if (allFound) {
          foundCount++;
          accumulatedText = '';
          accumulatedSpans = [];
        }
        
        if (accumulatedText.length > searchText.length * 3) {
          accumulatedText = '';
          accumulatedSpans = [];
        }
      }
    }
  } else {
    // 단일 검색어: 해당 인덱스의 위치 찾기
    const query = searchQueries[0];
    const normalizedQuery = query.toLowerCase();
    
    for (const span of textSpans) {
      const text = (span.textContent || '').toLowerCase();
      if (text.includes(normalizedQuery)) {
        if (foundCount === currentIndex) {
          targetSpan = span;
          break;
        }
        foundCount++;
      }
    }
  }
  
  // 찾은 위치로 스크롤 (하이라이트 스타일 없이)
  if (targetSpan) {
    targetSpan.scrollIntoView({ 
      behavior: 'auto',
      block: 'center',
      inline: 'nearest'
    });
    console.log(`📍 [검색] 검색 결과 위치로 스크롤 완료 (하이라이트 스타일 없음)`);
  } else {
    // 찾지 못한 경우 페이지 상단으로
    if (typeof window.viewerWrapper !== 'undefined' && window.viewerWrapper) {
      window.viewerWrapper.scrollTop = 0;
    }
  }
}
