<script>
    import { page } from '$app/stores';
    import { onMount, onDestroy } from 'svelte';
    import SockJS from 'sockjs-client';
    import Stomp from 'stompjs';
    import GameBoard from '$lib/components/game/GameBoard.svelte';
    import ChatPanel from '$lib/components/chat/ChatPanel.svelte';
    import Toast from '$lib/components/Toast.svelte';
    import { API_CONFIG } from '$lib/config';
    import { GameWebSocketService } from '$lib/services/gameWebSocket';
    import { gameApi } from '$lib/services/gameApi';
    
    const gameId = $page.params.id;
    
    $: username = $page.url.searchParams.get('username') || 'Guest';
    $: roomName = $page.url.searchParams.get('roomName') || '대국방';
    
    let chatStompClient;
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
        if (chatStompClient && chatStompClient.connected) {
            chatStompClient.send('/app/chat.sendMessage', {}, JSON.stringify({
                type: 'LEAVE',
                roomId: gameId,
                sender: username,
                message: ''
            }));
            chatStompClient.disconnect();
        }
        
        // 게임 소켓 종료
        if (gameService) {
            gameService.disconnect();
        }
    });
    
    // 채팅 소켓 연결
    function connectChatSocket() {
        const socket = new SockJS(API_CONFIG.CHAT_WS_URL);
        chatStompClient = Stomp.over(socket);
        chatStompClient.debug = null;
        
        chatStompClient.connect({}, () => {
            console.log('✅ 채팅 소켓 연결 성공');
            
            chatStompClient.subscribe(`/topic/chat/room/${gameId}`, (message) => {
                const data = JSON.parse(message.body);
                messages = [...messages, data];
            });
            
            chatStompClient.send('/app/chat.sendMessage', {}, JSON.stringify({
                type: 'ENTER',
                roomId: gameId,
                sender: username,
                message: ''
            }));
        }, (error) => {
            console.error('❌ 채팅 소켓 연결 실패:', error);
        });
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
                
            case 'SCORE':
                // 계가 결과
                if (data.data && data.data.result) {
                    showNotification(`계가 결과: ${data.data.result}`, 'success');
                } else {
                    showNotification('계가 완료', 'info');
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
        
        if (chatStompClient && chatStompClient.connected) {
            chatStompClient.send('/app/chat.sendMessage', {}, JSON.stringify({
                type: 'TALK',
                roomId: gameId,
                sender: username,
                message: message
            }));
        } else {
            showNotification('채팅 서버에 연결되지 않았습니다', 'error');
        }
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
    
    // 새 게임
    function handleNewGame() {
        if (!isReady) {
            showNotification('참가자 2명이 필요합니다', 'error');
            return;
        }
        
        if (myRole !== 'player1' && myRole !== 'player2') {
            showNotification('참가자만 게임을 시작할 수 있습니다', 'error');
            return;
        }
        
        gameService.start();
    }
    
    // 무르기
    function handleUndo() {
        gameService.undo();
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
    
    // 형세 판단 (REST API - 개인용)
    async function handleAnalysis() {
        try {
            const data = await gameApi.getScore(gameId);
            console.log('📊 형세 판단:', data);
            showNotification(`형세 판단: ${data.result}`, 'info');
        } catch (error) {
            console.error('형세 판단 실패:', error);
            showNotification('형세 판단 실패', 'error');
        }
    }
    
    // 계가 (WebSocket - 모두에게 공유)
    function handleScore() {
        gameService.score();
    }
</script>

<div class="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
    <div class="max-w-7xl mx-auto">
        <!-- 헤더 -->
        <div class="text-center mb-8">
            <h1 class="text-5xl font-bold text-amber-900 mb-2 drop-shadow-md">
                WooTeGo
            </h1>
            <div class="flex items-center justify-center gap-4">
                <p class="text-amber-700 text-lg">{roomName} - {username}님</p>
                {#if myRole}
                    <span class="px-4 py-1 rounded-full text-sm font-semibold {
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
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- 바둑판 영역 -->
            <div class="lg:col-span-2 bg-white rounded-2xl shadow-2xl p-8">
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
                    on:newGame={handleNewGame}
                    on:undo={handleUndo}
                    on:recommend={handleRecommend}
                    on:analysis={handleAnalysis}
                    on:score={handleScore}
                />
            </div>
            
            <!-- 채팅 영역 -->
            <div class="lg:col-span-1 h-[800px]">
                <ChatPanel
                    {messages}
                    {username}
                    on:send={handleSendChat}
                />
            </div>
        </div>
    </div>
</div>

<!-- 토스트 알림 -->
{#each toasts as toast (toast.id)}
    <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => removeToast(toast.id)}
    />
{/each}