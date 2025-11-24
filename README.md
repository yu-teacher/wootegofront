# WooTeGo Frontend

온라인 바둑 게임 프론트엔드 (SvelteKit)

## 기술 스택

- SvelteKit
- Tailwind CSS
- SockJS + STOMP
- JavaScript (ES6+)

## 주요 기능

### 로비 시스템
- 실시간 방 목록 업데이트
- 방 생성/입장
- 닉네임 설정

### 게임 기능
- SVG 기반 19x19 바둑판
- 실시간 멀티플레이어 (2인 대국 + 관전)
- 호버 미리보기
- 착수 추천 표시 (블루스팟)
- 요청/응답 시스템 (모달)

### 채팅 기능
- 실시간 채팅
- 입장/퇴장 알림
- 자동 스크롤

### UI/UX
- 반응형 디자인
- Toast 알림
- 타임아웃 타이머 (30초)

## 프로젝트 구조

```
src/
├── lib/
│   ├── components/
│   │   ├── game/
│   │   │   └── GameBoard.svelte    # 바둑판 컴포넌트
│   │   ├── chat/
│   │   │   └── ChatPanel.svelte    # 채팅 패널
│   │   ├── Modal.svelte            # 요청 모달
│   │   └── Toast.svelte            # 토스트 알림
│   ├── services/
│   │   ├── chatApi.js              # 채팅 REST API
│   │   ├── chatWebSocket.js        # 채팅 WebSocket
│   │   ├── gameApi.js              # 게임 REST API (KataGo)
│   │   ├── gameWebSocket.js        # 게임 WebSocket
│   │   └── lobbyWebSocket.js       # 로비 WebSocket
│   └── config.js                   # API 설정
└── routes/
    ├── +page.svelte                # 로비
    └── game/[id]/+page.svelte      # 게임방
```

## 설정

### API 엔드포인트 (`src/lib/config.js`)

```javascript
export const API_CONFIG = {
    CHAT_WS_URL: 'http://localhost:9002/ws-chat',
    GAME_WS_URL: 'http://localhost:9001/ws-game',
    CHAT_API_BASE: 'http://localhost:9002/api',
    GAME_API_BASE: 'http://localhost:9001/api'
};
```

## 실행 방법

### 개발 모드
```bash
npm install
npm run dev
```

### 빌드
```bash
npm run build
```

### 프리뷰
```bash
npm run preview
```

기본 포트: `3003`

## 컴포넌트 설명

### GameBoard.svelte
- 19x19 바둑판 렌더링
- 착수 처리 및 검증
- 게임 컨트롤 버튼
- 블루스팟 표시

### ChatPanel.svelte
- 메시지 리스트
- 메시지 전송
- 시스템 알림

### Modal.svelte
- 요청/응답 처리
- 30초 타이머
- 수락/거절 버튼

### Toast.svelte
- 알림 메시지 표시
- 자동 사라짐 (3초)
- 타입별 스타일 (success/error/info/warning)

## WebSocket 통신

### 게임 메시지 타입
- `JOIN` - 방 입장
- `START` - 게임 시작
- `MOVE` - 착수
- `UNDO` - 무르기
- `ANALYSIS` - 형세 판단
- `SCORE` - 계가
- `REQUEST_*` - 요청
- `RESPOND_*` - 응답
- `TIMEOUT_REQUEST` - 타임아웃
- `DISCONNECT` - 연결 끊김
- `ERROR` - 에러

### 채팅 메시지 타입
- `ENTER` - 입장
- `TALK` - 대화
- `LEAVE` - 퇴장

## 상태 관리

### 게임 상태
- `board` - 바둑판 (19x19)
- `currentTurn` - 현재 차례
- `moveCount` - 착수 횟수
- `blackCaptures` / `whiteCaptures` - 따낸 돌
- `myRole` - 내 역할 (player1/player2/spectator)
- `myColor` - 내 색상 (black/white/null)
- `recommendedMove` - 추천 착수

### 방 상태
- `player1Name` / `player2Name` - 참가자
- `blackPlayer` / `whitePlayer` - 흑/백 배정
- `isReady` - 준비 완료 (2명)
- `gameStarted` - 게임 시작 여부

## 좌표 변환

프론트엔드(0-based) ↔ 백엔드(1-based)
```javascript
// 프론트 → 백엔드
gameService.move(row + 1, col + 1);

// 백엔드 → 프론트
recommendedMove = { x: data.x, y: data.y }; // 1-19
cy={PADDING + (recommendedMove.x - 1) * CELL_SIZE}
```

## 스타일

- Tailwind CSS 사용
- 반응형 그리드 레이아웃
- 커스텀 스크롤바
- 애니메이션 (fade-in, scale-in, pulse)

## 의존성

```json
{
  "sockjs-client": "^1.6.1",
  "stompjs": "^2.3.3",
  "tailwindcss": "^3.x",
  "@sveltejs/kit": "^2.x"
}
```