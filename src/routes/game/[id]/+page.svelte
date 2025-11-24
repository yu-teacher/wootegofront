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
    
    let player1Name = null;
    let player2Name = null;
    let blackPlayer = null;
    let whitePlayer = null;
    let isReady = false;
    let gameStarted = false;
    
    let board = Array(19).fill(null).map(() => Array(19).fill(null));
    let currentTurn = 'BLACK';
    let moveCount = 0;
    let blackCaptures = 0;
    let whiteCaptures = 0;
    
    let recommendedMove = null;
    let messages = [];
    
    let toasts = [];
    let toastId = 0;
    
    let showModal = false;
    let modalTitle = '';
    let modalMessage = '';
    let pendingRequestType = null;
    
    function showNotification(message, type = 'info') {
        const id = toastId++;
        toasts = [...toasts, { id, message, type }];
    }
    
    function removeToast(id) {
        toasts = toasts.filter(t => t.id !== id);
    }
    
    onMount(() => {
        connectChatSocket();
        connectGameSocket();
    });
    
    onDestroy(() => {
        if (chatService) {
            chatService.disconnect();
        }
        if (gameService) {
            gameService.disconnect();
        }
    });
    
    function connectChatSocket() {
        chatService = new ChatWebSocketService(gameId, username, handleChatMessage);
        chatService.connect().catch(error => {
            console.error('채팅 소켓 연결 실패:', error);
            showNotification('채팅 서버 연결 실패', 'error');
        });
    }
    
    function handleChatMessage(data) {
        messages = [...messages, data];
    }
    
    function connectGameSocket() {
        gameService = new GameWebSocketService(gameId, username, handleGameMessage);
        gameService.connect().catch(error => {
            console.error('게임 소켓 연결 실패:', error);
            showNotification('게임 서버 연결 실패', 'error');
        });
    }
    
    function handleGameMessage(data) {
        switch(data.type) {
            case 'JOIN':
                if (data.data) {
                    if (data.username === username && data.data.role) {
                        myRole = data.data.role;
                        
                        if (myRole === 'player1') {
                            showNotification('참가자 1로 입장했습니다', 'success');
                        } else if (myRole === 'player2') {
                            showNotification('참가자 2로 입장했습니다', 'success');
                        } else {
                            showNotification('관전자로 입장했습니다', 'info');
                        }
                    }
                    
                    player1Name = data.data.player1;
                    player2Name = data.data.player2;
                    isReady = data.data.ready || false;
                    gameStarted = data.data.gameStarted || false;
                    
                    if (data.data.gameState) {
                        updateGameState(data.data.gameState);
                    }
                }
                
                if (data.username !== username) {
                    showNotification(`${data.username}님이 입장했습니다`, 'info');
                }
                break;
                
            case 'START':
                if (data.data) {
                    blackPlayer = data.data.blackPlayer;
                    whitePlayer = data.data.whitePlayer;
                    
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
                    
                    if (data.data.gameState) {
                        updateGameState(data.data.gameState);
                    }
                }
                break;
                
            case 'MOVE':
                updateGameState(data.data);
                recommendedMove = null;
                break;
                
            case 'UNDO':
                updateGameState(data.data);
                showNotification('무르기 완료', 'info');
                recommendedMove = null;
                break;
                
            case 'ANALYSIS':
                if (data.data && data.data.result) {
                    showNotification(`형세 판단: ${data.data.result}`, 'info');
                }
                break;
                
            case 'SCORE':
                if (data.data && data.data.result) {
                    showNotification(`계가 결과: ${data.data.result} - 게임 종료`, 'success');
                }
                
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
                if (data.data && !data.data.accepted) {
                    showNotification(data.data.message || '상대방이 거절했습니다', 'warning');
                }
                break;
                
            case 'TIMEOUT_REQUEST':
                if (data.data) {
                    showNotification(data.data.message || '요청 시간이 초과되었습니다', 'warning');
                }
                showModal = false;
                pendingRequestType = null;
                break;
                
            case 'DISCONNECT':
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
    
    function handleModalAccept() {
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
    
    function handleModalReject() {
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
    
    function updateGameState(gameState) {
        if (!gameState) return;
        
        board = convertBackendBoardToFrontend(gameState.board);
        currentTurn = gameState.currentTurn;
        moveCount = gameState.moveCount || 0;
        blackCaptures = gameState.blackCaptures || 0;
        whiteCaptures = gameState.whiteCaptures || 0;
    }
    
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
    
    function handleSendChat(event) {
        const { message } = event.detail;
        chatService.sendMessage(message);
    }
    
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
        
        gameService.move(row + 1, col + 1);
    }
    
    function handleRequestStart() {
        if (!isReady) {
            showNotification('참가자 2명이 필요합니다', 'error');
            return;
        }
        
        if (myRole !== 'player1' && myRole !== 'player2') {
            showNotification('참가자만 게임을 시작할 수 있습니다', 'error');
            return;
        }
        
        gameService.requestStart();
    }
    
    function handleRequestUndo() {
        gameService.requestUndo();
    }
    
    function handleRequestScore() {
        gameService.requestScore();
    }
    
    async function handleRecommend() {
        try {
            const data = await gameApi.getBlueSpots(gameId);
            recommendedMove = { x: data.x, y: data.y };
            showNotification(`추천 착수: (${data.x}, ${data.y})`, 'success');
        } catch (error) {
            console.error('착수 추천 실패:', error);
            showNotification('착수 추천 실패', 'error');
        }
    }
    
    function handleAnalysis() {
        gameService.analysis();
    }
</script>

<div class="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
    <div class="max-w-[1880px] mx-auto h-[calc(100vh-32px)] flex flex-col">
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
        
        <div class="flex-1 grid grid-cols-3 gap-4 min-h-0">
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

<Modal
    show={showModal}
    title={modalTitle}
    message={modalMessage}
    on:accept={handleModalAccept}
    on:reject={handleModalReject}
/>

{#each toasts as toast (toast.id)}
    <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => removeToast(toast.id)}
    />
{/each}