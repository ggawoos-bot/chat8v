// PDF 하이라이트 모듈 - 검색용
// 이 모듈은 window.viewerWrapper 변수에 의존합니다.

/**
 * 검색용 하이라이트 적용 함수
 * 사용자가 입력한 검색어를 사용 (복수 검색어 지원)
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
  
  const textSpans = textLayer.querySelectorAll('span');
  let highlightCount = 0;
  
  const trimmedSearchText = searchText.trim();
  
  // ✅ 검색용: 공백으로 구분된 복수 검색어 지원
  const searchQueries = trimmedSearchText
    .split(/\s+/)
    .map(q => q.trim())
    .filter(q => q.length > 0)
    .map(q => q.toLowerCase());
  
  const isMultiSearch = searchQueries.length > 1;
  
  console.log(`🔍 [검색] 검색어: ${isMultiSearch ? '복수' : '단일'}`, searchQueries);
  
  if (isMultiSearch) {
    // 복수 검색어: 모든 검색어가 포함된 부분만 하이라이트
    let accumulatedText = '';
    let accumulatedSpans = [];
    
    textSpans.forEach((span) => {
      const text = span.textContent || '';
      if (text.trim()) {
        accumulatedText += text;
        accumulatedSpans.push(span);
        
        // 모든 검색어가 포함되어 있는지 확인
        const normalizedAccumulated = accumulatedText.toLowerCase();
        const allFound = searchQueries.every(query => 
          normalizedAccumulated.includes(query)
        );
        
        if (allFound) {
          accumulatedSpans.forEach(s => {
            s.classList.add('highlight-strong');
            highlightCount++;
          });
          accumulatedText = '';
          accumulatedSpans = [];
        }
        
        // 너무 길어지면 초기화
        if (accumulatedText.length > trimmedSearchText.length * 3) {
          accumulatedText = '';
          accumulatedSpans = [];
        }
      }
    });
  } else {
    // 단일 검색어: 정확한 매칭
    const query = searchQueries[0];
    const normalizedQuery = query.toLowerCase();
    
    textSpans.forEach((span) => {
      const text = (span.textContent || '').toLowerCase();
      if (text.includes(normalizedQuery)) {
        span.classList.add('highlight-strong');
        highlightCount++;
      }
    });
  }
  
  console.log(`✅ [검색] 하이라이트 적용 완료: ${highlightCount}개 요소`);
}

/**
 * 검색용 하이라이트된 요소로 스크롤
 * 현재 검색 결과에 해당하는 요소를 강조
 * @param {HTMLElement} textLayer - 텍스트 레이어 요소
 * @param {number} currentIndex - 현재 검색 결과 인덱스
 */
function scrollToHighlightForSearch(textLayer, currentIndex = 0) {
  const allHighlighted = textLayer.querySelectorAll('.highlight-strong');
  
  if (allHighlighted.length > 0) {
    // 현재 인덱스에 해당하는 하이라이트 찾기
    const targetIndex = Math.min(currentIndex, allHighlighted.length - 1);
    const target = allHighlighted[targetIndex];
    
    // 현재 검색 결과 강조
    allHighlighted.forEach((el, idx) => {
      el.classList.remove('highlight-current');
      if (idx === targetIndex) {
        el.classList.add('highlight-current');
      }
    });
    
    console.log(`📍 [검색] 하이라이트 위치로 스크롤 중... (${targetIndex + 1}/${allHighlighted.length})`);
    target.scrollIntoView({ 
      behavior: 'auto', // 검색용은 즉시 스크롤
      block: 'center',
      inline: 'nearest'
    });
    console.log('✅ [검색] 하이라이트 위치로 스크롤 완료');
  } else {
    if (typeof window.viewerWrapper !== 'undefined' && window.viewerWrapper) {
      window.viewerWrapper.scrollTop = 0;
    }
    console.log('📍 [검색] 하이라이트 없음, 페이지 상단으로 스크롤');
  }
}

