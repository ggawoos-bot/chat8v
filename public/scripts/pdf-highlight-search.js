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
  console.log(`🔍 [검색] 하이라이트 시작: 검색어 ${searchQueries.length}개`, searchQueries);
  let totalHighlighted = 0;
  
  searchQueries.forEach((query, queryIdx) => {
    console.log(`🔍 [검색] 검색어 ${queryIdx + 1}/${searchQueries.length} 처리 중: "${query}"`);
    let queryHighlighted = 0;
    
    for (let i = 0; i < textSpans.length; i++) {
      const span = textSpans[i];
      const text = (span.textContent || '').trim();
      
      if (!text) continue;
      
      // 단일 span에서 검색어 찾기
      const textLower = text.toLowerCase();
      const queryIndex = textLower.indexOf(query);
      
      if (queryIndex !== -1) {
        // ✅ 개선: 검색어가 정확히 일치하거나, 앞뒤 모두 단어 경계인 경우만 하이라이트
        // 예: "어린이집"을 검색할 때:
        // - "어린이집" (정확 일치) → 하이라이트 ✓
        // - "어린이집·학교" (앞뒤 경계) → 하이라이트 ✓
        // - "유치원·어린이집" (앞뒤 경계) → 하이라이트 ✓
        // - "유치원·어린이집·학교" (앞뒤 경계) → 하이라이트 ✓
        // - "금연지원서비스"에서 "지원" 검색 (중간 포함, 경계 아님) → 하이라이트 ✗
        
        const isExactMatch = textLower === query;
        
        // 앞뒤 단어 경계 체크
        const beforeChar = queryIndex > 0 ? textLower[queryIndex - 1] : '';
        const afterChar = queryIndex + query.length < textLower.length 
          ? textLower[queryIndex + query.length] 
          : '';
        
        const isWordBoundaryBefore = queryIndex === 0 || /[^\w가-힣]/.test(beforeChar);
        const isWordBoundaryAfter = queryIndex + query.length >= textLower.length || /[^\w가-힣]/.test(afterChar);
        
        // ✅ 정확히 일치하거나, 앞뒤 모두 단어 경계인 경우만 하이라이트
        if (isExactMatch || (isWordBoundaryBefore && isWordBoundaryAfter)) {
          span.classList.add('highlight-word');
          queryHighlighted++;
          totalHighlighted++;
          
          // ✅ 디버깅: 처음 몇 개만 로그 출력
          if (queryHighlighted <= 5) {
            console.log(`  ✓ [검색] span 하이라이트: "${text.substring(0, 50)}" (정확: ${isExactMatch}, 앞경계: ${isWordBoundaryBefore}, 뒤경계: ${isWordBoundaryAfter})`);
          }
        } else {
          // ✅ 중간에 포함되거나 경계가 아닌 경우는 로그만 출력 (하이라이트하지 않음)
          if (queryHighlighted <= 5) {
            console.log(`  ✗ [검색] span 하이라이트 건너뜀 (경계 아님): "${text.substring(0, 50)}"`);
          }
        }
        continue;
      }
      
      // 검색어가 여러 span에 걸쳐 있을 수 있으므로 인접한 span들을 결합하여 검색
      // ✅ 개선: 검색어가 정확히 일치하는 부분만 하이라이트 (문장 전체가 아닌 검색어만)
      let combinedText = '';
      let spanTexts = []; // 각 span의 텍스트와 인덱스를 저장
      
      for (let j = i; j < Math.min(i + 10, textSpans.length); j++) {
        const nextSpan = textSpans[j];
        const nextText = (nextSpan.textContent || '').trim();
        
        if (nextText) {
          spanTexts.push({ text: nextText, index: j });
          combinedText += nextText;
          
          // 검색어가 포함되는지 확인
          const lowerCombined = combinedText.toLowerCase();
          const queryIndex = lowerCombined.indexOf(query);
          
          if (queryIndex !== -1) {
            // ✅ 단어 경계 체크: 검색어가 단어 경계에서 일치하는지 확인
            const beforeChar = queryIndex > 0 ? lowerCombined[queryIndex - 1] : '';
            const afterChar = queryIndex + query.length < lowerCombined.length 
              ? lowerCombined[queryIndex + query.length] 
              : '';
            
            // 단어 경계 확인: 검색어 앞뒤가 단어 문자가 아니거나, 문자열의 시작/끝이어야 함
            const isWordBoundaryBefore = queryIndex === 0 || /[^\w가-힣]/.test(beforeChar);
            const isWordBoundaryAfter = queryIndex + query.length >= lowerCombined.length || /[^\w가-힣]/.test(afterChar);
            
            // ✅ 검색어가 단어 경계에서 일치하는 경우에만 하이라이트
            if (!isWordBoundaryBefore || !isWordBoundaryAfter) {
              // 단어 경계가 아니면 건너뛰기
              if (queryHighlighted <= 3) {
                console.log(`  ✗ [검색] 다중 span 하이라이트 건너뜀 (단어 경계 아님): "${combinedText.substring(0, 50)}"`);
              }
              continue; // 다음 span 조합 시도
            }
            
            // ✅ 검색어가 정확히 일치하는 부분만 하이라이트
            // 검색어의 시작과 끝 위치를 정확히 계산하여 해당 span들만 하이라이트
            let charCount = 0;
            const queryStart = queryIndex;
            const queryEnd = queryIndex + query.length;
            let spansToHighlight = [];
            
            for (let k = 0; k < spanTexts.length; k++) {
              const spanInfo = spanTexts[k];
              const spanText = spanInfo.text;
              const spanStart = charCount;
              const spanEnd = charCount + spanText.length;
              
              // ✅ 검색어가 이 span과 겹치는지 확인
              // 겹침 조건: span의 시작이 queryEnd보다 작고, span의 끝이 queryStart보다 커야 함
              const hasOverlap = spanStart < queryEnd && spanEnd > queryStart;
              
              if (hasOverlap) {
                // ✅ 검색어 범위와 겹치는 span만 하이라이트
                // 검색어가 이 span의 일부라도 포함하면 하이라이트
                spansToHighlight.push(spanInfo.index);
              }
              
              charCount += spanText.length;
            }
            
            // ✅ 검색어가 포함된 span들만 하이라이트
            spansToHighlight.forEach(k => {
              if (!textSpans[k].classList.contains('highlight-word')) {
                textSpans[k].classList.add('highlight-word');
                queryHighlighted++;
                totalHighlighted++;
                
                // ✅ 디버깅: 처음 몇 개만 로그 출력
                if (queryHighlighted <= 5) {
                  const spanText = (textSpans[k].textContent || '').trim();
                  console.log(`  ✓ [검색] 다중 span 하이라이트: "${spanText.substring(0, 50)}"`);
                }
              }
            });
            
            break; // 검색어를 찾았으므로 더 이상 조합하지 않음
          }
        }
      }
    }
    
    console.log(`✅ [검색] 검색어 "${query}" 처리 완료: ${queryHighlighted}개 span 하이라이트`);
  });
  
  console.log(`✅ [검색] 전체 하이라이트 완료: 총 ${totalHighlighted}개 span`);
  
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
