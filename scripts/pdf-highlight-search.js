// PDF 하이라이트 모듈 - 검색용
// 이 모듈은 window.viewerWrapper 변수에 의존합니다.

/**
 * 검색용 하이라이트 적용 함수
 * 1. 2개 이상의 검색어가 포함된 문장을 하이라이트 (5개 라인 제한)
 * 2. 각 검색어를 개별적으로 하이라이트
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
  textLayer.querySelectorAll('.highlight, .highlight-strong, .highlight-current, .highlight-sentence, .highlight-word').forEach(el => {
    el.classList.remove('highlight', 'highlight-strong', 'highlight-current', 'highlight-sentence', 'highlight-word');
  });
  
  const textSpans = Array.from(textLayer.querySelectorAll('span'));
  if (textSpans.length === 0) {
    console.log('⚠️ [검색] 텍스트 레이어에 span이 없습니다.');
    return;
  }
  
  // 검색어 파싱
  const searchQueries = searchText
    .trim()
    .split(/\s+/)
    .map(q => q.trim())
    .filter(q => q.length > 0)
    .map(q => q.toLowerCase());
  
  if (searchQueries.length === 0) {
    return;
  }
  
  console.log(`🔍 [검색] 검색어: ${searchQueries.length > 1 ? '복수' : '단일'}`, searchQueries);
  
  // 1단계: 각 검색어를 개별적으로 하이라이트 (개선된 매칭)
  searchQueries.forEach((query) => {
    // 인접한 span들을 합쳐서 검색어 찾기
    for (let i = 0; i < textSpans.length; i++) {
      let combinedText = '';
      let combinedSpans = [];
      
      // 최대 5개 span까지 합쳐서 검색 (단어가 분리되어 있을 수 있음)
      for (let j = i; j < Math.min(i + 5, textSpans.length); j++) {
        const span = textSpans[j];
        const text = (span.textContent || '').trim();
        if (text) {
          combinedText += text;
          combinedSpans.push(span);
          
          // 합친 텍스트에 검색어가 포함되어 있는지 확인
          if (combinedText.toLowerCase().includes(query)) {
            // 매칭된 span들 모두 하이라이트
            combinedSpans.forEach(s => {
              s.classList.add('highlight-word');
            });
            break; // 찾았으면 다음으로
          }
        }
      }
    }
  });
  
  // 2단계: 2개 이상의 검색어가 포함된 문장을 하이라이트 (5개 라인 제한)
  // 단일 검색어일 때는 문장 하이라이트를 하지 않음
  if (searchQueries.length >= 2) {
    // Y 좌표 기준으로 라인 그룹화
    const lines = groupSpansByLine(textSpans);
    
    // 2개 이상의 검색어가 포함된 문장 찾기
    let accumulatedText = '';
    let accumulatedSpans = [];
    let sentenceCount = 0;
    let lastLineKey = null;
    let consecutiveNewLines = 0;
    
    for (let i = 0; i < textSpans.length; i++) {
      const span = textSpans[i];
      const text = span.textContent || '';
      
      if (text.trim()) {
        accumulatedText += text + ' ';
        accumulatedSpans.push(span);
        
        // 현재 span의 라인 확인
        const style = window.getComputedStyle(span);
        const top = parseFloat(style.top) || 0;
        const currentLineKey = Math.round(top / 3) * 3;
        
        // 줄바꿈 감지
        if (lastLineKey !== null && Math.abs(currentLineKey - lastLineKey) > 5) {
          consecutiveNewLines++;
        } else {
          consecutiveNewLines = 0;
        }
        lastLineKey = currentLineKey;
        
        // 문장 종료 조건 개선
        const hasSentenceEnd = /[.!?]\s*$/.test(text.trim());
        const hasMultipleNewLines = consecutiveNewLines >= 1; // 줄바꿈 1회 이상
        const isTooLong = accumulatedText.length > 200; // 200자 제한 (500자에서 줄임)
        const hasTooManySpans = accumulatedSpans.length > 15; // 15개 span 제한
        
        // 문장 종료 조건: 종료 기호 OR 줄바꿈 OR 너무 길거나 많은 span
        const shouldEnd = hasSentenceEnd || hasMultipleNewLines || isTooLong || hasTooManySpans;
        
        if (shouldEnd) {
          // 문장 내에 포함된 검색어 개수 확인 (2개 이상이어야 함)
          const normalizedText = accumulatedText.toLowerCase();
          const foundQueries = searchQueries.filter(query => 
            normalizedText.includes(query)
          );
          
          // 2개 이상의 검색어가 포함되어 있는지 확인
          if (foundQueries.length >= 2 && accumulatedSpans.length > 0) {
            // 라인 수 확인 (5개 라인 제한)
            const lineCount = getLineCount(accumulatedSpans, lines);
            
            if (lineCount <= 5) {
              // 문장 하이라이트 적용
              accumulatedSpans.forEach(s => {
                s.classList.add('highlight-sentence');
              });
              sentenceCount++;
              console.log(`✅ [검색] 문장 하이라이트 적용 (${foundQueries.length}개 검색어, ${lineCount}개 라인, ${accumulatedSpans.length}개 span)`);
            } else {
              console.log(`⚠️ [검색] 문장이 ${lineCount}개 라인으로 너무 깁니다. 하이라이트 제외`);
            }
          }
          
          // 다음 문장을 위해 초기화
          accumulatedText = '';
          accumulatedSpans = [];
          consecutiveNewLines = 0;
          lastLineKey = null;
        }
      }
    }
    
    // 마지막 남은 텍스트 처리
    if (accumulatedText.length > 0 && accumulatedSpans.length > 0) {
      const normalizedText = accumulatedText.toLowerCase();
      const foundQueries = searchQueries.filter(query => 
        normalizedText.includes(query)
      );
      
      // 2개 이상의 검색어가 포함되어 있는지 확인
      if (foundQueries.length >= 2) {
        const lineCount = getLineCount(accumulatedSpans, lines);
        if (lineCount <= 5) {
          accumulatedSpans.forEach(s => {
            s.classList.add('highlight-sentence');
          });
          sentenceCount++;
        }
      }
    }
    
    console.log(`✅ [검색] 총 ${sentenceCount}개 문장 하이라이트 적용 완료`);
  } else {
    console.log('ℹ️ [검색] 단일 검색어이므로 문장 하이라이트를 하지 않습니다.');
  }
  
  console.log('✅ [검색] 하이라이트 적용 완료');
}

/**
 * span들을 Y 좌표 기준으로 라인 그룹화
 */
function groupSpansByLine(spans) {
  const lines = new Map();
  
  spans.forEach((span, index) => {
    const style = window.getComputedStyle(span);
    const top = parseFloat(style.top) || 0;
    // 3px 단위로 그룹화 (더 정확한 라인 구분)
    const lineKey = Math.round(top / 3) * 3;
    
    if (!lines.has(lineKey)) {
      lines.set(lineKey, []);
    }
    lines.get(lineKey).push({ span, index, top });
  });
  
  return lines;
}

/**
 * span들의 라인 수 계산
 */
function getLineCount(spans, lines) {
  const lineKeys = new Set();
  
  spans.forEach(span => {
    const style = window.getComputedStyle(span);
    const top = parseFloat(style.top) || 0;
    const lineKey = Math.round(top / 3) * 3;
    lineKeys.add(lineKey);
  });
  
  return lineKeys.size;
}

/**
 * 두 span이 다른 라인에 있는지 확인
 */
function isNewLine(span1, span2) {
  if (!span2) return false;
  
  const style1 = window.getComputedStyle(span1);
  const style2 = window.getComputedStyle(span2);
  const top1 = parseFloat(style1.top) || 0;
  const top2 = parseFloat(style2.top) || 0;
  
  // 5px 이상 차이나면 다른 라인으로 간주
  return Math.abs(top2 - top1) > 5;
}

/**
 * 검색용 하이라이트된 요소로 스크롤
 * @param {HTMLElement} textLayer - 텍스트 레이어 요소
 * @param {number} currentIndex - 현재 검색 결과 인덱스
 */
function scrollToHighlightForSearch(textLayer, currentIndex = 0) {
  if (!textLayer || !window.searchViewer || !window.searchViewer.searchText) {
    return;
  }
  
  const searchText = window.searchViewer.searchText.trim();
  if (!searchText) {
    return;
  }
  
  // 문장 하이라이트가 있으면 첫 번째 문장으로 스크롤
  const sentenceSpans = textLayer.querySelectorAll('.highlight-sentence');
  if (sentenceSpans.length > 0) {
    // 문장의 첫 번째 span 찾기
    const firstSentenceSpan = sentenceSpans[0];
    firstSentenceSpan.scrollIntoView({ 
      behavior: 'auto',
      block: 'center',
      inline: 'nearest'
    });
    console.log(`📍 [검색] 문장 위치로 스크롤 완료`);
    return;
  }
  
  // 문장 하이라이트가 없으면 개별 단어로 스크롤
  const searchQueries = searchText
    .split(/\s+/)
    .map(q => q.trim())
    .filter(q => q.length > 0)
    .map(q => q.toLowerCase());
  
  const wordSpans = Array.from(textLayer.querySelectorAll('.highlight-word'));
  if (wordSpans.length > 0) {
    // 첫 번째 검색어의 첫 번째 매칭 위치로 스크롤
    const firstQuery = searchQueries[0];
    const targetSpan = wordSpans.find(span => {
      const text = (span.textContent || '').toLowerCase();
      return text.includes(firstQuery);
    });
    
    if (targetSpan) {
      targetSpan.scrollIntoView({ 
        behavior: 'auto',
        block: 'center',
        inline: 'nearest'
      });
      console.log(`📍 [검색] 검색어 위치로 스크롤 완료`);
    }
  }
}
