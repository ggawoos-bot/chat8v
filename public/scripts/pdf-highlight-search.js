// PDF 하이라이트 모듈 - 검색용
// 이 모듈은 window.viewerWrapper 변수에 의존합니다.

/**
 * 검색용 하이라이트 적용 함수
 * 검색 모드에서는 하이라이트를 적용하지 않음
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
  
  // 검색 모드에서는 하이라이트를 적용하지 않음
  console.log('ℹ️ [검색] 검색 모드에서는 하이라이트를 적용하지 않습니다.');
}

/**
 * 검색용 하이라이트된 요소로 스크롤
 * 검색 모드에서는 하이라이트 없이 페이지 상단으로 스크롤
 * @param {HTMLElement} textLayer - 텍스트 레이어 요소
 * @param {number} currentIndex - 현재 검색 결과 인덱스
 */
function scrollToHighlightForSearch(textLayer, currentIndex = 0) {
  // 검색 모드에서는 하이라이트 없이 페이지 상단으로 스크롤
  if (typeof window.viewerWrapper !== 'undefined' && window.viewerWrapper) {
    window.viewerWrapper.scrollTop = 0;
    console.log('📍 [검색] 페이지 상단으로 스크롤 완료');
  }
}
