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
  
  // 2단계: 2단어 이상이 같은 문장에 있으면 문장 전체 하이라이트
  if (searchQueries.length >= 2) {
    let accumulatedText = '';
    let accumulatedSpans = [];
    let lastLineKey = null;
    let consecutiveNewLines = 0;
    
    for (let i = 0; i < textSpans.length; i++) {
      const span = textSpans[i];
      const text = span.textContent || '';
      
      if (text.trim()) {
        accumulatedText += text + ' ';
        accumulatedSpans.push(span);
        
        // 현재 span의 라인 키 계산
        const style = window.getComputedStyle(span);
        const top = parseFloat(style.top) || 0;
        const currentLineKey = Math.round(top / 3) * 3;
        
        // 새로운 라인인지 확인
        if (lastLineKey !== null && Math.abs(currentLineKey - lastLineKey) > 5) {
          consecutiveNewLines++;
        } else {
          consecutiveNewLines = 0;
        }
        lastLineKey = currentLineKey;
        
        // 문장 종료 조건 확인
        const hasSentenceEnd = /[.!?]\s*$/.test(text.trim());
        const hasMultipleNewLines = consecutiveNewLines >= 1;
        const isTooLong = accumulatedText.length > 200;
        const hasTooManySpans = accumulatedSpans.length > 15;
        const shouldEnd = hasSentenceEnd || hasMultipleNewLines || isTooLong || hasTooManySpans;
        
        if (shouldEnd) {
          const normalizedText = accumulatedText.toLowerCase();
          
          // 문장에 포함된 검색어 개수 확인
          const foundQueries = searchQueries.filter(query => normalizedText.includes(query));
          
          // 2단어 이상이 포함되어 있고, 5개 라인 이하인 경우
          if (foundQueries.length >= 2 && accumulatedSpans.length > 0) {
            const lineCount = getLineCount(accumulatedSpans, lines);
            
            if (lineCount <= 5) {
              // 모든 검색어가 문장에 포함되어 있는지 확인
              const allQueriesInSentence = searchQueries.every(query => normalizedText.includes(query));
              
              if (allQueriesInSentence) {
                accumulatedSpans.forEach(s => {
                  s.classList.add('highlight-sentence');
                });
                console.log(`✅ [검색] 문장 하이라이트 적용 (${foundQueries.length}개 검색어, ${lineCount}개 라인, ${accumulatedSpans.length}개 span)`);
              }
            } else {
              console.log(`⚠️ [검색] 문장이 ${lineCount}개 라인으로 너무 깁니다. 하이라이트 제외`);
            }
          }
          
          // 문장 초기화
          accumulatedText = '';
          accumulatedSpans = [];
          consecutiveNewLines = 0;
          lastLineKey = null;
        }
      }
    }
    
    // 마지막 누적된 텍스트 처리
    if (accumulatedText.trim() && accumulatedSpans.length > 0) {
      const normalizedText = accumulatedText.toLowerCase();
      const foundQueries = searchQueries.filter(query => normalizedText.includes(query));
      
      if (foundQueries.length >= 2) {
        const lineCount = getLineCount(accumulatedSpans, lines);
        
        if (lineCount <= 5) {
          const allQueriesInSentence = searchQueries.every(query => normalizedText.includes(query));
          
          if (allQueriesInSentence) {
            accumulatedSpans.forEach(s => {
              s.classList.add('highlight-sentence');
            });
            console.log(`✅ [검색] 마지막 문장 하이라이트 적용 (${foundQueries.length}개 검색어, ${lineCount}개 라인)`);
          }
        }
      }
    }
  }
  
  console.log('✅ [검색] 하이라이트 적용 완료');
}

/**
 * 검색용 하이라이트된 요소로 스크롤
 * 문장 하이라이트 우선, 없으면 검색어 하이라이트로 스크롤
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
  
  // 문장 하이라이트 우선 찾기
  const sentenceHighlight = textLayer.querySelector('.highlight-sentence');
  if (sentenceHighlight) {
    console.log('📍 [검색] 문장 하이라이트 위치로 스크롤 중...');
    sentenceHighlight.scrollIntoView({
      behavior: 'auto',
      block: 'center',
      inline: 'nearest'
    });
    console.log('✅ [검색] 문장 하이라이트 위치로 스크롤 완료');
    return;
  }
  
  // 문장 하이라이트가 없으면 검색어 하이라이트로 스크롤
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
