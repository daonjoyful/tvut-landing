# Review inbox

자동 리뷰 생성기는 이 폴더의 JSON을 입력으로 사용합니다. `summary`는 공식 영상 또는 허가된 요약 자료에서 얻은 독자적인 요약문이어야 하며, 전체 대본을 그대로 넣지 않습니다.

필수 필드:

```json
{
  "program": "아침마당",
  "broadcastDate": "2026-08-11",
  "title": "방송 리뷰 제목",
  "summary": "500자 이상 요약문",
  "officialUrl": "https://program.kbs.co.kr/1tv/culture/amplaza/pc/index.html",
  "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

요약문이 500자 미만이면 생성기는 자동으로 중단합니다.

