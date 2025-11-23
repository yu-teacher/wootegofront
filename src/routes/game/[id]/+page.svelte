<script>
    import { page } from '$app/stores';
    import { onMount, onDestroy } from 'svelte';
    import GameBoard from '$lib/components/game/GameBoard.svelte';
    import ChatPanel from '$lib/components/chat/ChatPanel.svelte';
    import Toast from '$lib/components/Toast.svelte';
    import Modal from '$lib/components/Modal.svelte';
    import { GameWebSocketService } from '$lib/services/gameWebSocket';
    import { ChatWebSocketService } from '$lib/services/chatWebSocket';
    import { gameApi } from '$lib/services/gameApi';
    
    const gameId = $page.params.id;
    
    $: username = $page.url.searchParams.get('username') || 'Guest';
    $: roomName = $page.url.searchParams.get('roomName') || '대국방';
    
    let chatService;
    let gameService;
    let myRole = null;
    let myColor = null;
    
    // 게임 방 상태
    let player1Name = null;
    let player2Name = null;
    let blackPlayer = null;
    let whitePlayer = null;
    let isReady = false;
    let gameStarted = false;
    
    // 게임 상태
    let board = Array(19).fill(null).map(() => Array(19).fill(null));
    let currentTurn = 'BLACK';
    let moveCount = 0;
    let blackCaptures = 0;
    let whiteCaptures = 0;
    
    // 블루스팟 (추천 착수)
    let recommendedMove = null;
    
    // 채팅 상태
    let messages = [];
    
    // 토스트 알림
    let toasts = [];
    let toastId = 0;
    
    // 모달 상태
    let showModal = false;
    let modalTitle = '';
    let modalMessage = '';
    let pendingRequestType = null; // 'START', 'UNDO', 'SCORE'
    
    function showNotification(message, type = 'info') {
        const id = toastId++;
        toasts = [...toasts, { id, message, type }];
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    function removeToast(id) {
        toasts = toasts.filter(t => t.id !== id);
    }
    
    onMount(() => {
        console.log('🎮 게임 시작:', gameId, username);
        connectChatSocket();
        connectGameSocket();
    });
    
    onDestroy(() => {
        // 채팅 소켓 종료
        if (chatService) {
            chatService.disconnect();
        }
        
        // 게임 소켓 종료
        if (gameService) {
            gameService.disconnect();
        }
    });
    
    // 채팅 소켓 연결
    function connectChatSocket() {
        chatService = new ChatWebSocketService(gameId, username, handleChatMessage);
        chatService.connect().catch(error => {
            console.error('채팅 소켓 연결 실패:', error);
            showNotification('채팅 서버 연결 실패', 'error');
        });
    }
    
    // 채팅 메시지 처리
    function handleChatMessage(data) {
        console.log('💬 채팅 메시지:', data);
        messages = [...messages, data];
    }
    
    // 게임 소켓 연결
    function connectGameSocket() {
        gameService = new GameWebSocketService(gameId, username, handleGameMessage);
        gameService.connect().catch(error => {
            console.error('게임 소켓 연결 실패:', error);
            showNotification('게임 서버 연결 실패', 'error');
        });
    }
    
    // 게임 메시지 처리
    function handleGameMessage(data) {
        console.log('🎮 게임 메시지 타입:', data.type, 'from:', data.username);
        
        switch(data.type) {
            case 'JOIN':
                if (data.data) {
                    // 내 역할 저장
                    if (data.username === username && data.data.role) {
                        myRole = data.data.role;
                        console.log('🎭 내 역할:', myRole);
                        
                        if (myRole === 'player1') {
                            showNotification('참가자 1로 입장했습니다', 'success');
                        } else if (myRole === 'player2') {
                            showNotification('참가자 2로 입장했습니다', 'success');
                        } else {
                            showNotification('관전자로 입장했습니다', 'info');
                        }
                    }
                    
                    // 방 상태 업데이트
                    player1Name = data.data.player1;
                    player2Name = data.data.player2;
                    isReady = data.data.ready || false;
                    gameStarted = data.data.gameStarted || false;
                    
                    console.log('👥 참가자:', player1Name, player2Name, '준비:', isReady);
                    
                    // 게임 상태 업데이트
                    if (data.data.gameState) {
                        updateGameState(data.data.gameState);
                    }
                }
                
                if (data.username !== username) {
                    showNotification(`${data.username}님이 입장했습니다`, 'info');
                }
                break;
                
            case 'START':
                // 백엔드에서 배정한 흑/백 사용
                if (data.data) {
                    blackPlayer = data.data.blackPlayer;
                    whitePlayer = data.data.whitePlayer;
                    
                    console.log('🎲 서버 배정:', '흑:', blackPlayer, '백:', whitePlayer);
                    
                    // 내 색깔 판단
                    if (username === blackPlayer) {
                        myColor = 'black';
                        showNotification('당신은 흑돌입니다. 먼저 착수하세요!', 'success');
                    } else if (username === whitePlayer) {
                        myColor = 'white';
                        showNotification('당신은 백돌입니다. 차례를 기다리세요!', 'info');
                    } else {
                        myColor = null;
                        showNotification('게임이 시작되었습니다!', 'info');
                    }
                    
                    gameStarted = true;
                    
                    // 게임 상태 업데이트
                    if (data.data.gameState) {
                        updateGameState(data.data.gameState);
                    }
                }
                break;
                
            case 'MOVE':
                updateGameState(data.data);
                recommendedMove = null; // 착수 후 블루스팟 제거
                break;
                
            case 'UNDO':
                updateGameState(data.data);
                showNotification('무르기 완료', 'info');
                recommendedMove = null; // 무르기 후 블루스팟 제거
                break;
                
            case 'ANALYSIS':
                // 형세 판단 - 게임 계속
                if (data.data && data.data.result) {
                    showNotification(`형세 판단: ${data.data.result}`, 'info');
                }
                break;
                
            case 'SCORE':
                // 계가 결과 - 게임 종료
                if (data.data && data.data.result) {
                    showNotification(`계가 결과: ${data.data.result} - 게임 종료`, 'success');
                }
                
                // 게임 상태 초기화
                gameStarted = false;
                myColor = null;
                blackPlayer = null;
                whitePlayer = null;
                board = Array(19).fill(null).map(() => Array(19).fill(null));
                moveCount = 0;
                blackCaptures = 0;
                whiteCaptures = 0;
                recommendedMove = null;
                break;
                
            
            case 'REQUEST_START':
            case 'REQUEST_UNDO':
            case 'REQUEST_SCORE':
                // 요청 받음 - 내가 응답자인 경우만 모달 표시
                if (data.data && data.data.requester !== username) {
                    const requestTypes = {
                        'REQUEST_START': 'START',
                        'REQUEST_UNDO': 'UNDO',
                        'REQUEST_SCORE': 'SCORE'
                    };
                    
                    pendingRequestType = requestTypes[data.type];
                    modalTitle = getRequestTitle(pendingRequestType);
                    modalMessage = data.data.message || `${data.data.requester}님의 요청`;
                    showModal = true;
                } else if (data.data && data.data.requester === username) {
                    showNotification('상대방의 응답을 기다리는 중...', 'info');
                }
                break;
                
            case 'RESPOND_START':
            case 'RESPOND_UNDO':
            case 'RESPOND_SCORE':
                // 거절 응답만 처리 (수락은 START/UNDO/SCORE로 처리됨)
                if (data.data && !data.data.accepted) {
                    showNotification(data.data.message || '상대방이 거절했습니다', 'warning');
                }
                break;
                
            case 'TIMEOUT_REQUEST':
                // 요청 타임아웃
                if (data.data) {
                    showNotification(data.data.message || '요청 시간이 초과되었습니다', 'warning');
                }
                showModal = false;
                pendingRequestType = null;
                break;
                
            case 'DISCONNECT':
                // 연결 끊김
                if (data.data) {
                    showNotification(data.data.message || `${data.data.username}님의 연결이 끊어졌습니다`, 'warning');
                }
                break;
                
            case 'LEAVE':
                showNotification(`${data.username}님이 퇴장했습니다`, 'info');
                break;
                
            case 'ERROR':
                const errorMsg = data.data?.error || data.data?.message || data.data || '오류가 발생했습니다';
                showNotification(errorMsg, 'error');
                break;
                
            default:
                console.log('알 수 없는 메시지:', data);
        }
    }
    
    function getRequestTitle(type) {
        const titles = {
            'START': '게임 시작 요청',
            'UNDO': '무르기 요청',
            'SCORE': '계가 요청'
        };
        return titles[type] || '요청';
    }
    
    // 모달 수락
    function handleModalAccept() {
        console.log('✅ 요청 수락:', pendingRequestType);
        
        if (pendingRequestType === 'START') {
            gameService.respondStart(true);
        } else if (pendingRequestType === 'UNDO') {
            gameService.respondUndo(true);
        } else if (pendingRequestType === 'SCORE') {
            gameService.respondScore(true);
        }
        
        showModal = false;
        pendingRequestType = null;
    }
    
    // 모달 거절
    function handleModalReject() {
        console.log('❌ 요청 거절:', pendingRequestType);
        
        if (pendingRequestType === 'START') {
            gameService.respondStart(false);
        } else if (pendingRequestType === 'UNDO') {
            gameService.respondUndo(false);
        } else if (pendingRequestType === 'SCORE') {
            gameService.respondScore(false);
        }
        
        showModal = false;
        pendingRequestType = null;
    }
    
    // 게임 상태 업데이트
    function updateGameState(gameState) {
        if (!gameState) return;
        
        board = convertBackendBoardToFrontend(gameState.board);
        currentTurn = gameState.currentTurn;
        moveCount = gameState.moveCount || 0;
        blackCaptures = gameState.blackCaptures || 0;
        whiteCaptures = gameState.whiteCaptures || 0;
    }
    
    // 백엔드 board를 프론트 board로 변환
    function convertBackendBoardToFrontend(backendBoard) {
        if (!backendBoard) return board;
        
        return backendBoard.map(row => 
            row.map(stone => {
                if (stone === 'BLACK') return 'black';
                if (stone === 'WHITE') return 'white';
                return null;
            })
        );
    }
    
    // 채팅 메시지 전송
    function handleSendChat(event) {
        const { message } = event.detail;
        chatService.sendMessage(message);
    }
    
    // 착수
    function handleMove(event) {
        const { row, col } = event.detail;
        
        if (!gameStarted) {
            showNotification('게임이 아직 시작되지 않았습니다', 'error');
            return;
        }
        
        if (!myColor) {
            showNotification('관전자는 돌을 놓을 수 없습니다', 'error');
            return;
        }
        
        const isMyTurn = (currentTurn === 'BLACK' && myColor === 'black') ||
                         (currentTurn === 'WHITE' && myColor === 'white');
        
        if (!isMyTurn) {
            const turnName = currentTurn === 'BLACK' ? '흑' : '백';
            showNotification(`${turnName}의 차례입니다`, 'error');
            return;
        }
        
        console.log('🎯 착수 요청:', row, col);
        gameService.move(row + 1, col + 1);
    }
    
    // 게임 시작 요청
    function handleRequestStart() {
        if (!isReady) {
            showNotification('참가자 2명이 필요합니다', 'error');
            return;
        }
        
        if (myRole !== 'player1' && myRole !== 'player2') {
            showNotification('참가자만 게임을 시작할 수 있습니다', 'error');
            return;
        }
        
        console.log('📢 게임 시작 요청 전송');
        gameService.requestStart();
    }
    
    // 무르기 요청
    function handleRequestUndo() {
        console.log('📢 무르기 요청 전송');
        gameService.requestUndo();
    }
    
    // 계가 요청
    function handleRequestScore() {
        console.log('📢 계가 요청 전송');
        gameService.requestScore();
    }
    
    // 착수 추천 (REST API - 개인용)
    async function handleRecommend() {
        try {
            const data = await gameApi.getBlueSpots(gameId);
            console.log('📍 착수 추천:', data);
            recommendedMove = { x: data.x, y: data.y }; // 블루스팟 표시
            showNotification(`추천 착수: (${data.x}, ${data.y})`, 'success');
        } catch (error) {
            console.error('착수 추천 실패:', error);
            showNotification('착수 추천 실패', 'error');
        }
    }
    
    // 형세 판단 (WebSocket - 모두에게 공유)
    function handleAnalysis() {
        console.log('📊 형세 판단 요청');
        gameService.analysis();
    }
</script>

<div class="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
    <div class="max-w-[1880px] mx-auto h-[calc(100vh-32px)] flex flex-col">
        <!-- 헤더 (축소) -->
        <div class="text-center mb-4">
            <h1 class="text-4xl font-bold text-amber-900 mb-1 drop-shadow-md">
                WooTeGo
            </h1>
            <div class="flex items-center justify-center gap-3">
                <p class="text-amber-700 text-base">{roomName} - {username}님</p>
                {#if myRole}
                    <span class="px-3 py-1 rounded-full text-xs font-semibold {
                        myRole === 'player1' ? 'bg-gray-800 text-white' :
                        myRole === 'player2' ? 'bg-gray-100 text-gray-800 border-2 border-gray-400' :
                        'bg-blue-100 text-blue-800'
                    }">
                        {myRole === 'player1' ? '참가자 1' : 
                         myRole === 'player2' ? '참가자 2' : 
                         '관전자'}
                    </span>
                {/if}
            </div>
        </div>
        
        <!-- 게임 + 채팅 레이아웃 -->
        <div class="flex-1 grid grid-cols-3 gap-4 min-h-0">
            <!-- 바둑판 영역 (2/3) -->
            <div class="col-span-2 bg-white rounded-xl shadow-2xl p-4 flex flex-col min-h-0">
                <GameBoard
                    {board}
                    currentTurn={currentTurn === 'BLACK' ? 'black' : 'white'}
                    {moveCount}
                    {blackCaptures}
                    {whiteCaptures}
                    {isReady}
                    {gameStarted}
                    {myRole}
                    {myColor}
                    {blackPlayer}
                    {whitePlayer}
                    {recommendedMove}
                    on:move={handleMove}
                    on:requestStart={handleRequestStart}
                    on:requestUndo={handleRequestUndo}
                    on:requestScore={handleRequestScore}
                    on:recommend={handleRecommend}
                    on:analysis={handleAnalysis}
                />
            </div>
            
            <!-- 채팅 영역 (1/3) -->
            <div class="col-span-1 min-h-0">
                <ChatPanel
                    {messages}
                    {username}
                    on:send={handleSendChat}
                />
            </div>
        </div>
    </div>
</div>

<!-- 요청 모달 -->
<Modal
    show={showModal}
    title={modalTitle}
    message={modalMessage}
    on:accept={handleModalAccept}
    on:reject={handleModalReject}
/>

<!-- 토스트 알림 -->
{#each toasts as toast (toast.id)}
    <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => removeToast(toast.id)}
    />
{/each}