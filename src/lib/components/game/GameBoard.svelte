<script>
    import { onMount } from 'svelte';
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    export let board = Array(19).fill(null).map(() => Array(19).fill(null));
    export let currentTurn = 'black';
    export let moveCount = 0;
    export let blackCaptures = 0;
    export let whiteCaptures = 0;
    export let isReady = false;
    export let gameStarted = false;
    export let myColor = null;
    export let blackPlayer = null;
    export let whitePlayer = null;
    
    const BOARD_SIZE = 19;
    const CELL_SIZE = 30;
    const PADDING = 30;
    const SVG_SIZE = CELL_SIZE * (BOARD_SIZE - 1) + PADDING * 2;
    
    let hoveredPosition = null;
    let lastMove = null;
    let recommendedMoves = [];
    
    function handleClick(event) {
        const svg = event.currentTarget;
        const rect = svg.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const col = Math.round((x - PADDING) / CELL_SIZE);
        const row = Math.round((y - PADDING) / CELL_SIZE);
        
        if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
            if (board[row][col] === null) {
                dispatch('move', { row, col });
            }
        }
    }
    
    function handleMouseMove(event) {
        const svg = event.currentTarget;
        const rect = svg.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const col = Math.round((x - PADDING) / CELL_SIZE);
        const row = Math.round((y - PADDING) / CELL_SIZE);
        
        if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
            if (board[row][col] === null) {
                hoveredPosition = { row, col };
            } else {
                hoveredPosition = null;
            }
        } else {
            hoveredPosition = null;
        }
    }
    
    function handleMouseLeave() {
        hoveredPosition = null;
    }
</script>

<div class="flex flex-col items-center gap-6">
    <!-- 게임 정보 -->
    <div class="grid grid-cols-2 gap-4 w-full max-w-2xl bg-amber-50 p-4 rounded-lg">
        <div class="flex justify-between items-center">
            <span class="font-semibold text-amber-900">현재 차례:</span>
            <span class="text-lg font-bold text-amber-700">
                {currentTurn === 'black' ? '흑' : '백'}
            </span>
        </div>
        <div class="flex justify-between items-center">
            <span class="font-semibold text-amber-900">착수 횟수:</span>
            <span class="text-lg font-bold text-amber-700">{moveCount}</span>
        </div>
        <div class="flex justify-between items-center">
            <span class="font-semibold text-amber-900">흑이 딴 돌:</span>
            <span class="text-lg font-bold text-amber-700">{blackCaptures}</span>
        </div>
        <div class="flex justify-between items-center">
            <span class="font-semibold text-amber-900">백이 딴 돌:</span>
            <span class="text-lg font-bold text-amber-700">{whiteCaptures}</span>
        </div>
        
        <!-- 게임 상태 표시 -->
        {#if !gameStarted}
            <div class="col-span-2 text-center p-2 bg-amber-100 rounded">
                {#if isReady}
                    <span class="text-amber-800 font-semibold">🎮 2명 준비 완료! 게임 시작 버튼을 눌러주세요</span>
                {:else}
                    <span class="text-amber-600">⏳ 참가자를 기다리는 중...</span>
                {/if}
            </div>
        {:else if myColor}
            <div class="col-span-2 text-center p-2 bg-blue-100 rounded">
                <span class="font-semibold text-blue-800">
                    당신은 {myColor === 'black' ? '흑돌' : '백돌'}입니다
                    ({myColor === 'black' ? blackPlayer : whitePlayer})
                </span>
            </div>
        {/if}
    </div>
    
    <!-- 바둑판 -->
    <svg
        width={SVG_SIZE}
        height={SVG_SIZE}
        class="bg-amber-600 rounded shadow-xl cursor-crosshair"
        on:click={handleClick}
        on:mousemove={handleMouseMove}
        on:mouseleave={handleMouseLeave}
    >
        <!-- 그리드 선 -->
        {#each Array(BOARD_SIZE) as _, i}
            <!-- 세로선 -->
            <line
                x1={PADDING + i * CELL_SIZE}
                y1={PADDING}
                x2={PADDING + i * CELL_SIZE}
                y2={PADDING + (BOARD_SIZE - 1) * CELL_SIZE}
                stroke="#8B4513"
                stroke-width="1"
            />
            <!-- 가로선 -->
            <line
                x1={PADDING}
                y1={PADDING + i * CELL_SIZE}
                x2={PADDING + (BOARD_SIZE - 1) * CELL_SIZE}
                y2={PADDING + i * CELL_SIZE}
                stroke="#8B4513"
                stroke-width="1"
            />
        {/each}
        
        <!-- 화점 -->
        {#each [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]] as [row, col]}
            <circle
                cx={PADDING + col * CELL_SIZE}
                cy={PADDING + row * CELL_SIZE}
                r="4"
                fill="#8B4513"
            />
        {/each}
        
        <!-- 바둑돌 -->
        {#each board as row, rowIndex}
            {#each row as cell, colIndex}
                {#if cell !== null}
                    <circle
                        cx={PADDING + colIndex * CELL_SIZE}
                        cy={PADDING + rowIndex * CELL_SIZE}
                        r="13"
                        fill={cell === 'black' ? '#000' : '#fff'}
                        stroke={cell === 'black' ? '#333' : '#ccc'}
                        stroke-width="1"
                    />
                {/if}
            {/each}
        {/each}
        
        <!-- 호버 미리보기 -->
        {#if hoveredPosition && gameStarted}
            <circle
                cx={PADDING + hoveredPosition.col * CELL_SIZE}
                cy={PADDING + hoveredPosition.row * CELL_SIZE}
                r="13"
                fill={currentTurn === 'black' ? '#000' : '#fff'}
                opacity="0.4"
                class="pointer-events-none"
            />
        {/if}
        
        <!-- 추천 착수점 -->
        {#each recommendedMoves as move}
            <circle
                cx={PADDING + move.col * CELL_SIZE}
                cy={PADDING + move.row * CELL_SIZE}
                r="8"
                fill="#3B82F6"
                opacity="0.6"
                class="animate-pulse"
            />
        {/each}
    </svg>
    
    <!-- 컨트롤 버튼 -->
    <div class="flex flex-wrap gap-3 justify-center">
        <button
            class="px-6 py-3 bg-amber-700 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5 shadow-md hover:shadow-lg
                   {isReady && !gameStarted ? 'hover:bg-amber-800' : 'opacity-50 cursor-not-allowed'}"
            on:click={() => dispatch('newGame')}
            disabled={!isReady || gameStarted}
        >
            게임 시작
        </button>
        <button
            class="px-6 py-3 bg-amber-500 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5 shadow-md hover:shadow-lg
                   {gameStarted ? 'hover:bg-amber-600' : 'opacity-50 cursor-not-allowed'}"
            on:click={() => dispatch('undo')}
            disabled={!gameStarted}
        >
            무르기
        </button>
        <button
            class="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-all hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            on:click={() => dispatch('recommend')}
        >
            착수 추천
        </button>
        <button
            class="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            on:click={() => dispatch('analysis')}
        >
            형세 판단
        </button>
        <button
            class="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5 shadow-md hover:shadow-lg
                   {gameStarted ? 'hover:bg-green-700' : 'opacity-50 cursor-not-allowed'}"
            on:click={() => dispatch('score')}
            disabled={!gameStarted}
        >
            계가
        </button>
    </div>
</div>