// PDF 하이라이트 모듈 - 검색용
// 이 모듈은 window.viewerWrapper 변수에 의존합니다.

/**
 * Canvas에 직접 하이라이트 그리기 (정확한 위치)
 * @param {HTMLCanvasElement} canvas - PDF 캔버스
 * @param {Object} page - PDF 페이지 객체
 * @param {Object} viewport - PDF 뷰포트
 * @param {Object} textContent - PDF 텍스트 콘텐츠
 * @param {string} searchText - 검색어
 */
function highlightOnCanvas(canvas, page, viewport, textContent, searchText) {
  if (!searchText || !searchText.trim()) {
    return;
  }
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn('⚠️ [Canvas 하이라이트] Canvas 컨텍스트를 가져올 수 없습니다.');
    return;
  }
  
  // ✅ 기존 하이라이트 제거 (캔버스 재그리기)
  // 캔버스를 다시 그리지 않고, 하이라이트만 그리기 위해 별도 레이어 사용
  // 대신 기존 하이라이트 영역을 저장해두고 나중에 제거할 수 있도록 함
  
  // ✅ 공백으로 구분된 검색어 파싱
  const searchQueries = searchText
    .split(/\s+/)
    .map(q => q.trim())
    .filter(q => q.length > 0)
    .map(q => q.toLowerCase());
  
  if (searchQueries.length === 0) {
    return;
  }
  
  console.log(`🎨 [Canvas 하이라이트] 시작: 검색어 ${searchQueries.length}개`, searchQueries);
  
  // 하이라이트 스타일 설정
  const highlightColor = 'rgba(255, 200, 100, 0.4)';
  const highlightBorderColor = 'rgba(255, 150, 50, 0.6)';
  
  // 각 검색어에 대해 하이라이트 그리기
  searchQueries.forEach((query, queryIdx) => {
    console.log(`🎨 [Canvas 하이라이트] 검색어 ${queryIdx + 1}/${searchQueries.length} 처리 중: "${query}"`);
    let highlightedCount = 0;
    
    // 텍스트 아이템들을 순회하며 검색어 찾기
    for (let i = 0; i < textContent.items.length; i++) {
      const item = textContent.items[i];
      if (!item.str || !item.transform) continue;
      
      const text = item.str;
      const textLower = text.toLowerCase();
      
      // 단일 아이템에서 검색어 찾기
      let queryIndex = textLower.indexOf(query);
      
      while (queryIndex !== -1) {
        // 단어 경계 체크
        const beforeChar = queryIndex > 0 ? textLower[queryIndex - 1] : '';
        const afterChar = queryIndex + query.length < textLower.length 
          ? textLower[queryIndex + query.length] 
          : '';
        
        const isWordBoundaryBefore = queryIndex === 0 || /[^\w가-힣]/.test(beforeChar);
        
        // ✅ 한글 조사/어미 패턴
        let isKoreanParticle = false;
        if (afterChar && /[가-힣]/.test(afterChar)) {
          const afterText = textLower.substring(queryIndex + query.length, Math.min(queryIndex + query.length + 3, text.length));
          const koreanParticlePattern = /^[을를이가에에서와과로으로의도만부터까지조차마저은는이다이며으며]/;
          isKoreanParticle = koreanParticlePattern.test(afterText);
        }
        
        const isWordBoundaryAfter = queryIndex + query.length >= textLower.length || 
                                     /[^\w가-힣]/.test(afterChar) ||
                                     isKoreanParticle;
        
        if (isWordBoundaryBefore && isWordBoundaryAfter) {
          // ✅ 검색어 위치 계산
          // transform 매트릭스: [a, b, c, d, e, f]
          // e = translateX, f = translateY
          const x = item.transform[4] || 0;
          const y = item.transform[5] || 0;
          
          // 폰트 크기와 스케일 계산
          const fontSize = item.fontSize || 12;
          const scaleX = item.transform[0] || 1;
          const scaleY = item.transform[3] || 1;
          
          // 검색어가 시작하는 위치 계산
          // beforeText의 너비를 계산해야 함
          const beforeText = text.substring(0, queryIndex);
          const matchText = text.substring(queryIndex, queryIndex + query.length);
          
          // beforeText의 너비 계산 (대략적인 계산)
          // 정확한 계산을 위해서는 폰트 메트릭이 필요하지만, 폰트 크기와 문자 수로 근사치 계산
          const charWidth = fontSize * 0.6; // 대략적인 문자 너비 (폰트에 따라 다름)
          const beforeWidth = beforeText.length * charWidth * scaleX;
          const matchWidth = matchText.length * charWidth * scaleX;
          
          // ✅ Viewport로 변환 (PDF.js의 좌표계 사용)
          // PDF.js의 transform 매트릭스는 PDF 좌표계를 사용하므로 viewport.scale로 변환 필요
          // transform[4] = X 좌표 (PDF 좌표계)
          // transform[5] = Y 좌표 (PDF 좌표계, 아래에서 위로)
          const viewportX = x * viewport.scale;
          const viewportY = viewport.height - (y * viewport.scale); // Y 좌표 반전
          
          // 하이라이트 박스 그리기
          // beforeWidth와 matchWidth도 viewport.scale로 변환 필요
          const highlightX = viewportX + (beforeWidth * viewport.scale);
          const highlightY = viewportY - (fontSize * scaleY * viewport.scale); // 텍스트 기준선에서 위로
          const highlightWidth = matchWidth * viewport.scale;
          const highlightHeight = fontSize * scaleY * viewport.scale;
          
          // 하이라이트 그리기
          ctx.fillStyle = highlightColor;
          ctx.fillRect(highlightX, highlightY, highlightWidth, highlightHeight);
          
          // 테두리 그리기 (선택사항)
          ctx.strokeStyle = highlightBorderColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(highlightX, highlightY, highlightWidth, highlightHeight);
          
          highlightedCount++;
          
          if (highlightedCount <= 5) {
            console.log(`  ✓ [Canvas 하이라이트] "${matchText}" 위치: (${highlightX.toFixed(1)}, ${highlightY.toFixed(1)})`);
          }
        }
        
        // 같은 텍스트 내에서 다음 검색어 위치 찾기
        queryIndex = textLower.indexOf(query, queryIndex + 1);
      }
      
      // ✅ 여러 아이템에 걸친 검색어 처리
      // 인접한 아이템들을 결합하여 검색
      let combinedText = '';
      let combinedItems = [];
      
      for (let j = i; j < Math.min(i + 10, textContent.items.length); j++) {
        const nextItem = textContent.items[j];
        if (!nextItem.str || !nextItem.transform) continue;
        
        combinedItems.push(nextItem);
        combinedText += nextItem.str;
        
        const combinedLower = combinedText.toLowerCase();
        const combinedQueryIndex = combinedLower.indexOf(query);
        
        if (combinedQueryIndex !== -1) {
          // 단어 경계 체크
          const beforeChar = combinedQueryIndex > 0 ? combinedLower[combinedQueryIndex - 1] : '';
          const afterChar = combinedQueryIndex + query.length < combinedLower.length 
            ? combinedLower[combinedQueryIndex + query.length] 
            : '';
          
          const isWordBoundaryBefore = combinedQueryIndex === 0 || /[^\w가-힣]/.test(beforeChar);
          
          // 한글 조사/어미 체크
          let isKoreanParticle = false;
          if (afterChar && /[가-힣]/.test(afterChar)) {
            const afterText = combinedLower.substring(combinedQueryIndex + query.length, Math.min(combinedQueryIndex + query.length + 3, combinedLower.length));
            const koreanParticlePattern = /^[을를이가에에서와과로으로의도만부터까지조차마저은는이다이며으며]/;
            isKoreanParticle = koreanParticlePattern.test(afterText);
          }
          
          const isWordBoundaryAfter = combinedQueryIndex + query.length >= combinedLower.length || 
                                       /[^\w가-힣]/.test(afterChar) ||
                                       isKoreanParticle;
          
          if (isWordBoundaryBefore && isWordBoundaryAfter) {
            // 검색어가 여러 아이템에 걸쳐 있는 경우
            // 첫 번째 아이템의 위치를 기준으로 계산
            const firstItem = combinedItems[0];
            const firstX = firstItem.transform[4] || 0;
            const firstY = firstItem.transform[5] || 0;
            const firstFontSize = firstItem.fontSize || 12;
            const firstScaleX = firstItem.transform[0] || 1;
            const firstScaleY = firstItem.transform[3] || 1;
            
            // 검색어 시작 위치까지의 텍스트 너비 계산
            let charCount = 0;
            let beforeWidth = 0;
            let matchStartItem = null;
            let matchEndItem = null;
            
            for (let k = 0; k < combinedItems.length; k++) {
              const itemText = combinedItems[k].str;
              const itemStart = charCount;
              const itemEnd = charCount + itemText.length;
              
              if (combinedQueryIndex >= itemStart && combinedQueryIndex < itemEnd) {
                matchStartItem = combinedItems[k];
                const localStart = combinedQueryIndex - itemStart;
                const itemFontSize = combinedItems[k].fontSize || 12;
                const itemScaleX = combinedItems[k].transform[0] || 1;
                const charWidth = itemFontSize * 0.6;
                beforeWidth += localStart * charWidth * itemScaleX;
              }
              
              if (combinedQueryIndex + query.length > itemStart && combinedQueryIndex + query.length <= itemEnd) {
                matchEndItem = combinedItems[k];
              }
              
              charCount += itemText.length;
            }
            
            if (matchStartItem) {
              const startX = matchStartItem.transform[4] || 0;
              const startY = matchStartItem.transform[5] || 0;
              const startFontSize = matchStartItem.fontSize || 12;
              const startScaleX = matchStartItem.transform[0] || 1;
              const startScaleY = matchStartItem.transform[3] || 1;
              
              const charWidth = startFontSize * 0.6;
              const matchWidth = query.length * charWidth * startScaleX;
              
              // ✅ Viewport로 변환 (PDF.js의 좌표계 사용)
              const viewportX = startX * viewport.scale;
              const viewportY = viewport.height - (startY * viewport.scale); // Y 좌표 반전
              
              const highlightX = viewportX + (beforeWidth * viewport.scale);
              const highlightY = viewportY - (startFontSize * startScaleY * viewport.scale);
              const highlightHeight = startFontSize * startScaleY * viewport.scale;
              const highlightWidth = matchWidth * viewport.scale;
              
              ctx.fillStyle = highlightColor;
              ctx.fillRect(highlightX, highlightY, matchWidth, highlightHeight);
              
              ctx.strokeStyle = highlightBorderColor;
              ctx.lineWidth = 1;
              ctx.strokeRect(highlightX, highlightY, matchWidth, highlightHeight);
              
              highlightedCount++;
              
              if (highlightedCount <= 5) {
                console.log(`  ✓ [Canvas 하이라이트] 다중 아이템 "${query}" 위치: (${highlightX.toFixed(1)}, ${highlightY.toFixed(1)})`);
              }
            }
            
            break; // 검색어를 찾았으므로 더 이상 조합하지 않음
          }
        }
      }
    }
    
    console.log(`✅ [Canvas 하이라이트] 검색어 "${query}" 처리 완료: ${highlightedCount}개 하이라이트`);
  });
  
  console.log(`✅ [Canvas 하이라이트] 완료`);
}

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
 * span 내부의 텍스트를 검색어 기준으로 분할하고 검색어 부분만 하이라이트
 * @param {HTMLElement} span - 원본 span 요소
 * @param {string} query - 검색어 (원본 대소문자)
 * @param {string} queryLower - 검색어 (소문자)
 * @param {number} queryIndex - 검색어의 시작 인덱스 (소문자 기준)
 * @returns {boolean} 하이라이트 성공 여부
 */
function highlightWordInSpan(span, query, queryLower, queryIndex) {
  const text = span.textContent || '';
  if (!text || queryIndex === -1) return false;
  
  // 단어 경계 체크
  const textLower = text.toLowerCase();
  const beforeChar = queryIndex > 0 ? textLower[queryIndex - 1] : '';
  const afterChar = queryIndex + query.length < text.length 
    ? textLower[queryIndex + query.length] 
    : '';
  
  const isWordBoundaryBefore = queryIndex === 0 || /[^\w가-힣]/.test(beforeChar);
  
  // ✅ 한글 조사/어미 패턴 (검색어 뒤에 붙을 수 있는 것들)
  // 조사: 을, 를, 이, 가, 에, 에서, 와, 과, 로, 으로, 의, 도, 만, 부터, 까지, 조차, 마저 등
  // 어미: 은, 는, 이다, 이며, 으며 등
  let isKoreanParticle = false;
  if (afterChar && queryIndex + query.length < text.length && /[가-힣]/.test(afterChar)) {
    // 검색어 바로 뒤 문자부터 시작하는 텍스트 확인 (최대 3글자까지)
    const afterText = textLower.substring(queryIndex + query.length, Math.min(queryIndex + query.length + 3, text.length));
    // 일반적인 한글 조사/어미 패턴
    const koreanParticlePattern = /^[을를이가에에서와과로으로의도만부터까지조차마저은는이다이며으며]/;
    isKoreanParticle = koreanParticlePattern.test(afterText);
  }
  
  // ✅ 단어 경계 판단:
  // 1. 문자열의 끝
  // 2. 공백/구두점 등 비문자
  // 3. 한글 조사/어미 (검색어 뒤에 붙어있어도 단어 경계로 인정)
  const isWordBoundaryAfter = queryIndex + query.length >= text.length || 
                               /[^\w가-힣]/.test(afterChar) ||
                               isKoreanParticle;
  
  if (!isWordBoundaryBefore || !isWordBoundaryAfter) {
    return false;
  }
  
  // span의 스타일 복사 함수
  const copySpanStyles = (source, target) => {
    const style = window.getComputedStyle(source);
    // PDF.js span의 필수 스타일 속성들 복사
    const styleProps = [
      'position', 'left', 'top', 'fontSize', 'fontFamily', 'fontWeight',
      'transform', 'transformOrigin', 'color', 'whiteSpace', 'letterSpacing',
      'wordSpacing', 'textRendering', 'textTransform'
    ];
    styleProps.forEach(prop => {
      const value = style[prop];
      if (value) {
        target.style[prop] = value;
      }
    });
    // 클래스도 복사 (PDF.js가 사용하는 클래스들)
    target.className = source.className;
  };
  
  // 텍스트를 검색어 기준으로 분할
  const beforeText = text.substring(0, queryIndex);
  const matchText = text.substring(queryIndex, queryIndex + query.length);
  const afterText = text.substring(queryIndex + query.length);
  
  // 원본 span의 부모
  const parent = span.parentNode;
  
  // 새로운 fragment 생성
  const fragment = document.createDocumentFragment();
  
  // 검색어 이전 텍스트가 있으면 span 생성
  if (beforeText) {
    const beforeSpan = span.cloneNode(false);
    beforeSpan.textContent = beforeText;
    copySpanStyles(span, beforeSpan);
    fragment.appendChild(beforeSpan);
  }
  
  // 검색어 부분 - 하이라이트 적용
  const highlightSpan = span.cloneNode(false);
  highlightSpan.textContent = matchText;
  highlightSpan.classList.add('highlight-word');
  copySpanStyles(span, highlightSpan);
  fragment.appendChild(highlightSpan);
  
  // 검색어 이후 텍스트가 있으면 span 생성
  if (afterText) {
    const afterSpan = span.cloneNode(false);
    afterSpan.textContent = afterText;
    copySpanStyles(span, afterSpan);
    fragment.appendChild(afterSpan);
  }
  
  // 원본 span을 fragment로 교체
  parent.replaceChild(fragment, span);
  
  return true;
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
  
  // ✅ 공백으로 구분된 검색어 파싱 (원본과 소문자 버전 모두 저장)
  const searchQueries = searchText
    .split(/\s+/)
    .map(q => q.trim())
    .filter(q => q.length > 0);
  
  if (searchQueries.length === 0) {
    console.log('ℹ️ [검색] 검색어가 없습니다.');
    return;
  }
  
  // 1단계: 모든 검색어를 개별적으로 하이라이트
  console.log(`🔍 [검색] 하이라이트 시작: 검색어 ${searchQueries.length}개`, searchQueries);
  let totalHighlighted = 0;
  
  searchQueries.forEach((queryOriginal, queryIdx) => {
    const query = queryOriginal.toLowerCase();
    console.log(`🔍 [검색] 검색어 ${queryIdx + 1}/${searchQueries.length} 처리 중: "${queryOriginal}"`);
    let queryHighlighted = 0;
    
    // ✅ DOM이 변경될 수 있으므로 매번 span을 다시 수집
    let textSpans = Array.from(textLayer.querySelectorAll('span'));
    let processedSpans = new Set(); // 이미 처리된 span 추적
    
    for (let i = 0; i < textSpans.length; i++) {
      // 이미 처리된 span은 건너뛰기 (분할로 인해 새로 생성된 span)
      if (processedSpans.has(textSpans[i])) continue;
      
      const span = textSpans[i];
      const text = span.textContent || '';
      
      if (!text.trim()) continue;
      
      // 단일 span에서 검색어 찾기
      const textLower = text.toLowerCase();
      let queryIndex = textLower.indexOf(query);
      
      // ✅ span 내에서 검색어가 여러 번 나타날 수 있으므로 모두 처리
      while (queryIndex !== -1) {
        // span을 분할하여 검색어 부분만 하이라이트
        if (highlightWordInSpan(span, queryOriginal, query, queryIndex)) {
          queryHighlighted++;
          totalHighlighted++;
          
          // ✅ 디버깅: 처음 몇 개만 로그 출력
          if (queryHighlighted <= 5) {
            console.log(`  ✓ [검색] span 분할 하이라이트: "${text.substring(queryIndex, queryIndex + query.length)}"`);
          }
          
          // DOM이 변경되었으므로 span을 다시 수집하고 현재 위치 조정
          processedSpans.add(span);
          textSpans = Array.from(textLayer.querySelectorAll('span'));
          break; // 현재 span 처리는 완료, 다음 span으로 이동
        }
        
        // 같은 span 내에서 다음 검색어 위치 찾기
        queryIndex = textLower.indexOf(query, queryIndex + 1);
      }
      
      // 검색어가 여러 span에 걸쳐 있을 수 있으므로 인접한 span들을 결합하여 검색
      // ✅ 개선: 검색어가 정확히 일치하는 부분만 하이라이트 (문장 전체가 아닌 검색어만)
      let combinedText = '';
      let spanTexts = []; // 각 span의 텍스트와 인덱스를 저장
      
      for (let j = i; j < Math.min(i + 10, textSpans.length); j++) {
        // 이미 처리된 span은 건너뛰기
        if (processedSpans.has(textSpans[j])) continue;
        
        const nextSpan = textSpans[j];
        const nextText = nextSpan.textContent || '';
        
        if (nextText.trim()) {
          spanTexts.push({ text: nextText, span: nextSpan, index: j });
          combinedText += nextText;
          
          // 검색어가 포함되는지 확인
          const lowerCombined = combinedText.toLowerCase();
          const queryIndex = lowerCombined.indexOf(query);
          
          if (queryIndex !== -1) {
            // ✅ 개선: 각 span 내에서 단어 경계를 체크 (span 경계 고려)
            // 검색어가 시작하는 span과 끝나는 span을 찾기
            let charCount = 0;
            let queryStartSpanIdx = -1;
            let queryEndSpanIdx = -1;
            let queryStartInStartSpan = -1;
            let queryEndInEndSpan = -1;
            const queryStart = queryIndex;
            const queryEnd = queryIndex + query.length;
            
            for (let k = 0; k < spanTexts.length; k++) {
              const spanStart = charCount;
              const spanEnd = charCount + spanTexts[k].text.length;
              
              // 검색어 시작이 이 span에 있는지
              if (queryStart >= spanStart && queryStart < spanEnd && queryStartSpanIdx === -1) {
                queryStartSpanIdx = k;
                queryStartInStartSpan = queryStart - spanStart;
              }
              
              // 검색어 끝이 이 span에 있는지
              if (queryEnd > spanStart && queryEnd <= spanEnd && queryEndSpanIdx === -1) {
                queryEndSpanIdx = k;
                queryEndInEndSpan = queryEnd - spanStart;
              }
              
              charCount += spanTexts[k].text.length;
            }
            
            if (queryStartSpanIdx === -1 || queryEndSpanIdx === -1) {
              continue; // span을 찾지 못함
            }
            
            // ✅ 시작 span에서 단어 경계 체크
            const startSpanText = spanTexts[queryStartSpanIdx].text.toLowerCase();
            const beforeChar = queryStartInStartSpan > 0 
              ? startSpanText[queryStartInStartSpan - 1] 
              : '';
            const isWordBoundaryBefore = queryStartInStartSpan === 0 || /[^\w가-힣]/.test(beforeChar);
            
            // ✅ 끝 span에서 단어 경계 체크
            const endSpanText = spanTexts[queryEndSpanIdx].text.toLowerCase();
            const afterChar = queryEndInEndSpan < endSpanText.length 
              ? endSpanText[queryEndInEndSpan] 
              : '';
            
            // ✅ span 경계는 단어 경계로 간주
            // 1. 검색어가 span의 끝에서 끝나는 경우 (queryEndInEndSpan === endSpanText.length)
            // 2. 검색어가 다음 span의 시작에서 끝나는 경우 (queryEndInEndSpan === 0 && 다른 span)
            // 예: span1="과태료", span2="를" → "과태료"는 span1의 끝에서 끝나므로 단어 경계로 인정
            const isAtSpanEnd = queryEndInEndSpan >= endSpanText.length;
            const isAtNextSpanStart = queryEndInEndSpan === 0 && queryEndSpanIdx > queryStartSpanIdx;
            const isAtSpanBoundary = isAtSpanEnd || isAtNextSpanStart;
            
            // ✅ 한글 조사/어미 패턴 (검색어 뒤에 붙을 수 있는 것들)
            // 조사: 을, 를, 이, 가, 에, 에서, 와, 과, 로, 으로, 의, 도, 만, 부터, 까지, 조차, 마저 등
            // 어미: 은, 는, 이다, 이며, 으며 등
            let isKoreanParticle = false;
            if (afterChar && !isAtSpanBoundary && /[가-힣]/.test(afterChar)) {
              // 검색어 바로 뒤 문자부터 시작하는 텍스트 확인 (최대 3글자까지)
              const afterText = endSpanText.substring(queryEndInEndSpan, Math.min(queryEndInEndSpan + 3, endSpanText.length));
              // 일반적인 한글 조사/어미 패턴
              const koreanParticlePattern = /^[을를이가에에서와과로으로의도만부터까지조차마저은는이다이며으며]/;
              isKoreanParticle = koreanParticlePattern.test(afterText);
            }
            
            // ✅ 단어 경계 판단:
            // 1. span 경계
            // 2. 공백/구두점 등 비문자
            // 3. 한글 조사/어미 (검색어 뒤에 붙어있어도 단어 경계로 인정)
            const isWordBoundaryAfter = isAtSpanBoundary || 
                                       /[^\w가-힣]/.test(afterChar) ||
                                       isKoreanParticle;
            
            // ✅ 검색어가 단어 경계에서 일치하는 경우에만 하이라이트
            if (!isWordBoundaryBefore || !isWordBoundaryAfter) {
              // 단어 경계가 아니면 건너뛰기
              if (queryHighlighted <= 3) {
                console.log(`  ✗ [검색] 다중 span 하이라이트 건너뜀 (단어 경계 아님): "${combinedText.substring(0, 50)}"`);
              }
              continue; // 다음 span 조합 시도
            }
            
            // ✅ 검색어가 정확히 일치하는 부분만 하이라이트
            // 검색어의 시작과 끝 위치를 정확히 계산하여 해당 span들을 분할
            charCount = 0;
            let spansToProcess = [];
            
            for (let k = 0; k < spanTexts.length; k++) {
              const spanInfo = spanTexts[k];
              const spanText = spanInfo.text;
              const spanStart = charCount;
              const spanEnd = charCount + spanText.length;
              
              // ✅ 검색어가 이 span과 겹치는지 확인
              // 겹침 조건: span의 시작이 queryEnd보다 작고, span의 끝이 queryStart보다 커야 함
              const hasOverlap = spanStart < queryEnd && spanEnd > queryStart;
              
              if (hasOverlap) {
                // span 내에서 검색어의 시작과 끝 위치 계산
                const spanQueryStart = Math.max(0, queryStart - spanStart);
                const spanQueryEnd = Math.min(spanText.length, queryEnd - spanStart);
                spansToProcess.push({
                  span: spanInfo.span,
                  spanStart: spanStart,
                  spanEnd: spanEnd,
                  queryStartInSpan: spanQueryStart,
                  queryEndInSpan: spanQueryEnd
                });
              }
              
              charCount += spanText.length;
            }
            
            // ✅ 각 span을 검색어 부분만 하이라이트하도록 분할
            // 역순으로 처리하여 인덱스 변경 문제 방지
            for (let k = spansToProcess.length - 1; k >= 0; k--) {
              const spanInfo = spansToProcess[k];
              const span = spanInfo.span;
              const spanText = span.textContent || '';
              
              // span 내에서 검색어 위치
              const localQueryStart = spanInfo.queryStartInSpan;
              const localQueryEnd = spanInfo.queryEndInSpan;
              
              // span을 분할하여 검색어 부분만 하이라이트
              if (localQueryStart === 0 && localQueryEnd === spanText.length) {
                // span 전체가 검색어인 경우
                span.classList.add('highlight-word');
                queryHighlighted++;
                totalHighlighted++;
                processedSpans.add(span);
              } else {
                // span의 일부만 검색어인 경우 - 분할 필요
                const beforeText = spanText.substring(0, localQueryStart);
                const matchText = spanText.substring(localQueryStart, localQueryEnd);
                const afterText = spanText.substring(localQueryEnd);
                
                // span의 스타일 복사 함수
                const copySpanStyles = (source, target) => {
                  const style = window.getComputedStyle(source);
                  const styleProps = [
                    'position', 'left', 'top', 'fontSize', 'fontFamily', 'fontWeight',
                    'transform', 'transformOrigin', 'color', 'whiteSpace', 'letterSpacing',
                    'wordSpacing', 'textRendering', 'textTransform'
                  ];
                  styleProps.forEach(prop => {
                    const value = style[prop];
                    if (value) {
                      target.style[prop] = value;
                    }
                  });
                  target.className = source.className;
                };
                
                const parent = span.parentNode;
                const fragment = document.createDocumentFragment();
                
                if (beforeText) {
                  const beforeSpan = span.cloneNode(false);
                  beforeSpan.textContent = beforeText;
                  copySpanStyles(span, beforeSpan);
                  fragment.appendChild(beforeSpan);
                }
                
                const highlightSpan = span.cloneNode(false);
                highlightSpan.textContent = matchText;
                highlightSpan.classList.add('highlight-word');
                copySpanStyles(span, highlightSpan);
                fragment.appendChild(highlightSpan);
                
                if (afterText) {
                  const afterSpan = span.cloneNode(false);
                  afterSpan.textContent = afterText;
                  copySpanStyles(span, afterSpan);
                  fragment.appendChild(afterSpan);
                }
                
                parent.replaceChild(fragment, span);
                queryHighlighted++;
                totalHighlighted++;
                processedSpans.add(span);
                
                // DOM이 변경되었으므로 span을 다시 수집
                textSpans = Array.from(textLayer.querySelectorAll('span'));
              }
              
              if (queryHighlighted <= 5) {
                console.log(`  ✓ [검색] 다중 span 분할 하이라이트: "${spanText.substring(localQueryStart, localQueryEnd)}"`);
              }
            }
            
            break; // 검색어를 찾았으므로 더 이상 조합하지 않음
          }
        }
      }
    }
    
    console.log(`✅ [검색] 검색어 "${queryOriginal}" 처리 완료: ${queryHighlighted}개 하이라이트`);
  });
  
  console.log(`✅ [검색] 전체 하이라이트 완료: 총 ${totalHighlighted}개 하이라이트`);
  
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
