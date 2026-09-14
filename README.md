# 매매일지 Tape

미국 주식 매매일지. 매수–매도 한 쌍이 한 줄이고, 승률·손익비·누적 손익 곡선을 자동으로 계산한다.
정적 페이지 하나(`index.html`)가 전부이고 기록은 이 저장소의 `trades.json`에 커밋된다. 서버도 빌드도 없다.

## 올리기

1. 이 폴더를 GitHub 저장소로 push (`main` 브랜치).
2. **Settings ▸ Pages ▸ Source = GitHub Actions** 선택.
3. `https://<사용자명>.github.io/<저장소명>/` 접속.

## 기록하려면 (쓰기 토큰)

읽기는 로그인 없이 되고, **기록할 때만** 토큰이 필요하다.

1. [fine-grained PAT 만들기](https://github.com/settings/personal-access-tokens/new)
   → Repository access: **이 저장소 하나만** → Permissions ▸ Contents: **Read and write**
2. 사이트 오른쪽 위 **설정** → 저장소(`사용자명/저장소명`)와 토큰 입력.

토큰은 브라우저 `localStorage`에만 남고 저장소에는 커밋되지 않는다. 기기마다 한 번씩 넣으면 된다.
(로컬에서 `index.html`을 그냥 열어서 써도 똑같이 동작한다.)

## 알아둘 것

- **공개 저장소면 매매 기록도 공개된다.** 비공개로 쓰려면 저장소를 private으로 만들고 Pages 대신 로컬에서 `index.html`을 열어 쓴다 (private 저장소 Pages는 유료).
- 분할 매수/매도는 **평균단가 + 총수량**으로 한 줄에 입력한다.
- 수익은 빨강, 손실은 파랑 (국내 관례). 바꾸려면 `index.html` 상단 `--up` / `--down` 값을 서로 바꾼다.
- 계산식 점검: `index.html#selftest` 로 열면 손익·승률·손익비·MDD 계산을 검증하고 상단에 결과 배너가 뜬다.

## 데이터 형식 (`trades.json`)

```json
[{ "id": 1726300000000, "ticker": "NVDA", "side": "long",
   "qty": 10, "entryDate": "2026-09-01", "entryPrice": 170.5,
   "exitDate": "2026-09-08", "exitPrice": 182.0,
   "fees": 1.2, "tag": "돌파", "memo": "거래량 터진 날 진입" }]
```

`side`는 `long` 또는 `short`. 손익 = `(청산가 − 진입가) × 수량 − 수수료` (숏이면 부호 반대).
