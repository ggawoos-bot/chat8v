// PDF 하이라이트 모듈
// 이 모듈은 window.viewerWrapper 변수에 의존합니다.

/**
 * 하이라이트 적용 함수 (개선된 버전: 정확한 텍스트 매칭)
 * @param {HTMLElement} textLayer - 텍스트 레이어 요소
 * @param {string[]} keywords - 하이라이트할 키워드 배열
 * @param {string} searchText - 검색 텍스트
 */
function applyHighlight(textLayer, keywords, searchText) {
  if (!textLayer || (!keywords.length && !searchText)) {
    console.log('⚠️ 하이라이트할 키워드나 텍스트가 없습니다.');
    return;
  }
  
  // ✅ 기존 하이라이트 제거
  textLayer.querySelectorAll('.highlight, .highlight-strong').forEach(el => {
    el.classList.remove('highlight', 'highlight-strong');
  });
  
  const textSpans = textLayer.querySelectorAll('span');
  let highlightCount = 0;
  
  // ✅ 1단계: 검색 텍스트로 정확한 매칭 (하이브리드 접근)
  if (searchText && searchText.trim().length > 0) {
    const trimmedSearchText = searchText.trim();
    const textLength = trimmedSearchText.length;
    
    console.log(`🔍 검색 텍스트 길이: ${textLength}자`);
    console.log(`🔍 검색 텍스트: "${searchText}"`);
    console.log(`🔍 PDF 텍스트 레이어 span 개수: ${textSpans.length}개`);
    
    // 텍스트 레이어의 실제 텍스트 샘플 출력
    const sampleText = Array.from(textSpans).slice(0, 20).map(s => s.textContent).join('');
    console.log(`🔍 PDF 텍스트 샘플 (처음 20개 span): "${sampleText.substring(0, 100)}..."`);
    
    // ✅ 길이에 따라 다른 전략 사용
    if (textLength >= 30) {
      // 긴 문장: 핵심 키워드 추출 또는 정확한 매칭
      const coreText = trimmedSearchText.substring(0, 35).trim();
      
      // ✅ 동적 키워드 추출 함수 (하드코딩 없이 검색 텍스트에서 자동 추출)
      function extractKeyPhrasesFromText(text) {
        const phrases = [];
        
        // 1. 한글 명사 패턴 추출 (2-6자 한글 연속)
        const koreanNounPattern = /[가-힣]{2,6}/g;
        const koreanMatches = text.match(koreanNounPattern);
        if (koreanMatches) {
          phrases.push(...koreanMatches);
        }
        
        // 2. 숫자와 단위가 포함된 패턴 (예: "1,000㎡", "1000m²")
        const numberUnitPattern = /[\d,]+[㎡m²]/g;
        const numberMatches = text.match(numberUnitPattern);
        if (numberMatches) {
          phrases.push(...numberMatches);
        }
        
        // 3. 특정 조사/어미 제거 후 명사 추출
        const stopWords = ['은', '는', '이', '가', '을', '를', '의', '에', '에서', '로', '으로', '와', '과', '도', '만', '까지', '부터', '부터', '따라', '따른', '따름', '따름에', '따라서', '따라', '따른', '따름', '따름에', '따라서', '등', '등은', '등이', '등의', '등에', '등을', '등을', '등으로', '등과', '등도', '등만', '등까지', '등부터', '등부터', '등따라', '등따른', '등따름', '등따름에', '등따라서'];
        const cleanedPhrases = phrases
          .map(p => {
            // 조사/어미 제거
            let cleaned = p;
            for (const stopWord of stopWords) {
              if (cleaned.endsWith(stopWord)) {
                cleaned = cleaned.slice(0, -stopWord.length);
              }
            }
            return cleaned;
          })
          .filter(p => p.length >= 2 && p.length <= 10); // 2-10자만
        
        // 4. 중복 제거 및 빈도 기반 정렬 (자주 나오는 단어 우선)
        const phraseCounts = {};
        cleanedPhrases.forEach(p => {
          phraseCounts[p] = (phraseCounts[p] || 0) + 1;
        });
        
        // 빈도순으로 정렬하고 상위 10개만 선택
        const sortedPhrases = Object.entries(phraseCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([phrase]) => phrase);
        
        return sortedPhrases;
      }
      
      // ✅ 동적 키워드 추출
      const extractedKeyPhrases = extractKeyPhrasesFromText(trimmedSearchText);
      console.log(`🔍 동적으로 추출된 키워드:`, extractedKeyPhrases);
      
      // ✅ 기본 키워드와 추출된 키워드 결합 (중복 제거)
      const baseKeyPhrases = ['베란다', '테라스', '옥상', '금연구역', '건축물', '부속물', '공중이용시설'];
      const allKeyPhrases = [...new Set([...baseKeyPhrases, ...extractedKeyPhrases])];
      
      const foundKeyPhrases = allKeyPhrases.filter(phrase => 
        trimmedSearchText.includes(phrase)
      );
      
      console.log(`🔍 발견된 핵심 키워드:`, foundKeyPhrases);
      
      // ✅ 단어 순서 기반 매칭 함수
      function checkWordSequenceMatch(searchText, targetText, minMatches = 3) {
        // 검색 텍스트를 단어로 분리 (2자 이상의 의미있는 단어만)
        const searchWords = searchText
          .split(/[\s,，.。!！?？\n]+/)
          .map(w => w.trim())
          .filter(w => w.length >= 2) // 최소 2자 이상
          .map(w => w.toLowerCase());
        
        if (searchWords.length < minMatches) {
          return { matched: false, count: 0, consecutive: 0, words: [] };
        }
        
        // 타겟 텍스트를 소문자로 변환
        const normalizedTarget = targetText.toLowerCase();
        
        // 순서대로 매칭되는 단어 찾기
        let lastIndex = -1;
        const matchedWords = [];
        
        for (const word of searchWords) {
          const wordIndex = normalizedTarget.indexOf(word, lastIndex + 1);
          if (wordIndex !== -1) {
            matchedWords.push({ word, index: wordIndex });
            lastIndex = wordIndex;
          }
        }
        
        // 연속적으로 매칭된 단어 그룹 찾기
        let maxConsecutive = 0;
        let currentConsecutive = 0;
        
        for (let i = 0; i < matchedWords.length; i++) {
          if (i === 0 || matchedWords[i].index > matchedWords[i - 1].index) {
            currentConsecutive++;
            maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
          } else {
            currentConsecutive = 1;
          }
        }
        
        const totalMatches = matchedWords.length;
        // 최소 3개 단어가 순서대로 매칭되거나, 연속 3개 이상 매칭되면 성공
        const isMatched = totalMatches >= minMatches || maxConsecutive >= Math.min(3, minMatches);
        
        return {
          matched: isMatched,
          count: totalMatches,
          consecutive: maxConsecutive,
          words: matchedWords.map(m => m.word)
        };
      }
      
      // ✅ 단어 순서 기반 매칭 시도 (키워드 매칭 전에 시도)
      const allText = Array.from(textSpans).map(s => s.textContent || '').join('');
      const sentenceRegex = /([^.。!！?？\n]+[.。!！?？\n]+)/g;
      let match;
      const spanArray = Array.from(textSpans);
      
      // span 위치 계산
      const spanPositions = [];
      let currentPos = 0;
      spanArray.forEach(span => {
        const spanText = span.textContent || '';
        spanPositions.push({
          span: span,
          start: currentPos,
          end: currentPos + spanText.length
        });
        currentPos += spanText.length;
      });
      
      // ✅ 단어 순서 기반 매칭으로 문장 찾기
      const sentenceMatches = [];
      while ((match = sentenceRegex.exec(allText)) !== null) {
        const sentenceText = match[0];
        const sentenceStart = match.index;
        const sentenceEnd = sentenceStart + sentenceText.length;
        
        // 단어 순서 매칭 확인 (최소 3개 단어 순서대로 매칭)
        const sequenceMatch = checkWordSequenceMatch(trimmedSearchText, sentenceText, 3);
        
        if (sequenceMatch.matched) {
          sentenceMatches.push({
            text: sentenceText,
            start: sentenceStart,
            end: sentenceEnd,
            match: sequenceMatch
          });
        }
      }
      
      // 단어 순서 매칭 결과가 있으면 하이라이트
      if (sentenceMatches.length > 0) {
        console.log(`✅ 단어 순서 매칭 발견: ${sentenceMatches.length}개 문장`);
        
        sentenceMatches.forEach(({ text, start, end, match }) => {
          console.log(`   - ${match.count}개 단어 매칭 (연속 ${match.consecutive}개): ${text.substring(0, 50)}...`);
          console.log(`     매칭된 단어: ${match.words.join(', ')}`);
          
          // 해당 문장의 span들 하이라이트
          spanPositions.forEach(({ span, start: spanStart, end: spanEnd }) => {
            if (spanStart < end && spanEnd > start) {
              span.classList.add('highlight-strong');
              highlightCount++;
            }
          });
        });
        
        if (highlightCount > 0) {
          console.log(`✅ 단어 순서 기반 하이라이트 완료: ${highlightCount}개 요소`);
          return;
        }
      }
      
      if (foundKeyPhrases.length >= 2) {
        // 핵심 키워드가 2개 이상 포함된 경우: 키워드 기반 하이라이트
        
        // ✅ 정규식 재초기화 (단어 순서 매칭에서 이미 사용했으므로)
        sentenceRegex.lastIndex = 0;
        
        while ((match = sentenceRegex.exec(allText)) !== null) {
          const sentenceText = match[0];
          const normalizedSentence = sentenceText.toLowerCase();
          const sentenceStart = match.index;
          const sentenceEnd = sentenceStart + sentenceText.length;
          
          // ✅ 개선: 핵심 키워드 매칭 + 핵심 텍스트 부분 매칭
          const matchedCount = foundKeyPhrases.filter(phrase => 
            normalizedSentence.includes(phrase.toLowerCase())
          ).length;
          
          // ✅ 추가: 핵심 텍스트의 일부가 포함되어 있는지 확인 (부분 매칭)
          const coreTextLower = coreText.toLowerCase();
          const hasCoreText = normalizedSentence.includes(coreTextLower) || 
                              coreTextLower.includes(normalizedSentence.substring(0, Math.min(30, normalizedSentence.length)));
          
          // ✅ 개선: 키워드 2개 이상 또는 핵심 텍스트 포함 시 하이라이트
          if (matchedCount >= 2 || hasCoreText) {
            console.log(`✅ 매칭 문장 발견 (${matchedCount}개 키워드, 핵심텍스트: ${hasCoreText}): ${sentenceText.substring(0, 50)}...`);
            
            spanPositions.forEach(({ span, start, end }) => {
              if (start < sentenceEnd && end > sentenceStart) {
                span.classList.add('highlight-strong');
                highlightCount++;
              }
            });
          }
        }
        
        if (highlightCount > 0) {
          console.log(`✅ 핵심 키워드 기반 하이라이트 완료: ${highlightCount}개 요소`);
          return;
        }
      } else {
        // 핵심 키워드가 적은 경우: 정확한 매칭 + 부분 매칭
        console.log(`🔍 핵심 키워드 부족, 정확한 매칭 시도: ${coreText}`);
        
        // ✅ 개선: 핵심 텍스트를 여러 부분으로 나누어 매칭 시도
        const coreParts = [
          coreText.substring(0, 20),  // 앞 20자
          coreText.substring(10, 30),  // 중간 20자
          coreText.substring(Math.max(0, coreText.length - 20)) // 뒤 20자
        ].filter(p => p.length >= 10);
        
        let accumulatedText = '';
        let accumulatedSpans = [];
        let foundMatch = false;
        
        textSpans.forEach((span) => {
          const text = span.textContent || '';
          if (text.trim()) {
            accumulatedText += text;
            accumulatedSpans.push(span);
            
            // ✅ 개선: 여러 부분 중 하나라도 포함되면 매칭
            const normalizedAccumulated = accumulatedText.toLowerCase();
            const isMatched = coreParts.some(part => 
              normalizedAccumulated.includes(part.toLowerCase())
            ) || normalizedAccumulated.includes(coreText.toLowerCase());
            
            if (isMatched) {
              foundMatch = true;
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
        
        if (foundMatch && highlightCount > 0) {
          console.log(`✅ 정확한 매칭 하이라이트 완료: ${highlightCount}개 요소`);
          return;
        }
      }
    } else if (textLength >= 10) {
      // 중간 길이: 정확한 매칭
      const coreText = trimmedSearchText.length >= 20 
        ? trimmedSearchText.substring(0, 25).trim()
        : trimmedSearchText;
      
      if (coreText.length >= 3) {
        let accumulatedText = '';
        let accumulatedSpans = [];
        let foundMatch = false;
        
        textSpans.forEach((span) => {
          const text = span.textContent || '';
          if (text.trim()) {
            accumulatedText += text;
            accumulatedSpans.push(span);
            
            if (accumulatedText.toLowerCase().includes(coreText.toLowerCase())) {
              foundMatch = true;
              const maxLength = coreText.length * 2.5;
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
        
        if (foundMatch && highlightCount > 0) {
          console.log(`✅ 검색 텍스트 하이라이트 적용 완료: ${highlightCount}개 요소`);
          return;
        }
      }
    } else {
      // 짧은 검색어: 공백 분리 지원
      const searchQueries = trimmedSearchText
        .split(/\s+/)
        .map(q => q.trim())
        .filter(q => q.length >= 2)
        .map(q => q.toLowerCase());
      
      if (searchQueries.length > 0) {
        const isMultiSearch = searchQueries.length > 1;
        
        if (isMultiSearch) {
          textSpans.forEach((span) => {
            const text = (span.textContent || '').toLowerCase();
            if (!text.trim()) return;
            
            for (const query of searchQueries) {
              if (text.includes(query)) {
                span.classList.add('highlight-strong');
                highlightCount++;
                break;
              }
            }
          });
          
          if (highlightCount > 0) {
            console.log(`✅ 복수 검색어 하이라이트 적용 완료: ${highlightCount}개 요소`);
            return;
          }
        }
      }
    }
  }
  
  // ✅ 2단계: 키워드 하이라이트 (짧고 정확한 키워드만, 단어 단위 매칭)
  if (keywords.length > 0) {
    const shortKeywords = keywords.filter(k => k && k.trim().length >= 3 && k.trim().length <= 20); // 3~20자만
    
    textSpans.forEach((span) => {
      const text = span.textContent || '';
      if (!text.trim()) return;
      
      let shouldHighlight = false;
      
      for (const keyword of shortKeywords) {
        const trimmedKeyword = keyword.trim();
        // ✅ 정확한 단어 단위 매칭 시도 (영어/숫자 포함)
        const keywordRegex = new RegExp(`\\b${trimmedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        
        // 단어 단위 매칭 또는 직접 포함 확인 (한글의 경우 단어 경계가 명확하지 않으므로 포함 확인도 사용)
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
  
  console.log(`✅ 하이라이트 적용 완료: ${highlightCount}개 요소`);
}

/**
 * 하이라이트된 요소로 스크롤 (즉시 실행)
 * @param {HTMLElement} textLayer - 텍스트 레이어 요소
 */
function scrollToHighlight(textLayer) {
  const highlighted = textLayer.querySelector('.highlight, .highlight-strong');
  if (highlighted) {
    console.log('📍 하이라이트 위치로 스크롤 중...');
    // 즉시 스크롤 (smooth 대신 auto로 변경하여 더 빠른 반응)
    highlighted.scrollIntoView({ 
      behavior: 'auto', // 'smooth'에서 'auto'로 변경하여 즉시 스크롤
      block: 'center',
      inline: 'nearest'
    });
    console.log('✅ 하이라이트 위치로 스크롤 완료');
  } else {
    // 하이라이트가 없으면 페이지 상단으로 스크롤
    if (typeof window.viewerWrapper !== 'undefined' && window.viewerWrapper) {
      window.viewerWrapper.scrollTop = 0;
    }
    console.log('📍 하이라이트 없음, 페이지 상단으로 스크롤');
  }
}

