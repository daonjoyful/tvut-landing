# 자막 연결 규격

Chrome의 YouTube TT 또는 YouTube Summary에서 전체 Transcript를 `transcript.txt`로 저장하고, RSS 메타데이터 JSON과 함께 다음 명령으로 가져옵니다.

```bash
node scripts/import-youtube-transcript.mjs transcript.txt metadata.json
```

생성된 JSON은 기존 리뷰 생성 템플릿에서 사용하며, 제목·목차·서론 박스·소제목·문단·광고·버튼·푸터 구조는 변경하지 않습니다.