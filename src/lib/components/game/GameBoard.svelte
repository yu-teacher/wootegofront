<script>
	import { createEventDispatcher, onMount } from 'svelte';

	export let board = [];
	export let currentTurn = 'black';
	export let moveCount = 0;
	export let blackCaptures = 0;
	export let whiteCaptures = 0;
	export let isReady = false;
	export let gameStarted = false;
	export let myRole = null;
	export let myColor = null;
	export let blackPlayer = null;
	export let whitePlayer = null;
	export let recommendedMove = null;

	const dispatch = createEventDispatcher();

	const BOARD_SIZE = 19;
	let SVG_SIZE = 700; // ✅ 바둑판 크기 증가
	let PADDING = 20;
	let CELL_SIZE = 0;

	let containerDiv;

	$: if (containerDiv) {
		const containerHeight = containerDiv.clientHeight;
		const containerWidth = containerDiv.clientWidth;
		SVG_SIZE = Math.min(containerHeight, containerWidth, 750); // 최대 750px
		PADDING = SVG_SIZE * 0.04;
		CELL_SIZE = (SVG_SIZE - 2 * PADDING) / (BOARD_SIZE - 1);
	}

	let hoveredPosition = null;
	let loadingRecommend = false;
	let loadingAnalysis = false;

	$: isMyTurn =
		gameStarted &&
		((currentTurn === 'black' && myColor === 'black') ||
			(currentTurn === 'white' && myColor === 'white'));

	function handleClick(event) {
		if (!isMyTurn) return;

		const rect = event.currentTarget.getBoundingClientRect();
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
		if (!isMyTurn) {
			hoveredPosition = null;
			return;
		}

		const rect = event.currentTarget.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		const col = Math.round((x - PADDING) / CELL_SIZE);
		const row = Math.round((y - PADDING) / CELL_SIZE);

		if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && board[row][col] === null) {
			hoveredPosition = { row, col };
		} else {
			hoveredPosition = null;
		}
	}

	function handleMouseLeave() {
		hoveredPosition = null;
	}

	function handleNewGame() {
		dispatch('requestStart');
	}

	function handleUndo() {
		dispatch('requestUndo');
	}

	async function handleRecommend() {
		loadingRecommend = true;
		dispatch('recommend');
		setTimeout(() => {
			loadingRecommend = false;
		}, 2000);
	}

	async function handleAnalysis() {
		loadingAnalysis = true;
		dispatch('analysis');
		setTimeout(() => {
			loadingAnalysis = false;
		}, 2000);
	}

	function handleScore() {
		dispatch('requestScore');
	}
</script>

<div class="flex h-full gap-4">
	<!-- 왼쪽: 상태창 + 버튼 -->
	<div class="flex w-56 flex-shrink-0 flex-col gap-2">
		<!-- 게임 상태 -->
		<div class="rounded-lg bg-amber-50 p-3 shadow-md">
			<h3 class="mb-2 text-base font-bold text-amber-900">게임 정보</h3>

			<div class="space-y-1.5 text-xs">
				<div class="flex items-center justify-between rounded bg-white p-1.5">
					<span class="font-semibold text-gray-700">차례</span>
					<span class="font-bold text-amber-700">
						{currentTurn === 'black' ? '● 흑' : '○ 백'}
					</span>
				</div>

				<div class="flex items-center justify-between rounded bg-white p-1.5">
					<span class="font-semibold text-gray-700">착수</span>
					<span class="font-bold text-amber-700">{moveCount}</span>
				</div>

				<div class="flex items-center justify-between rounded bg-white p-1.5">
					<span class="font-semibold text-gray-700">● 흑</span>
					<span class="font-bold text-gray-900">{blackCaptures}</span>
				</div>

				<div class="flex items-center justify-between rounded bg-white p-1.5">
					<span class="font-semibold text-gray-700">○ 백</span>
					<span class="font-bold text-gray-700">{whiteCaptures}</span>
				</div>
			</div>
		</div>

		<!-- 플레이어 정보 -->
		{#if !gameStarted}
			<div class="rounded-lg bg-amber-100 p-2 text-center">
				{#if isReady}
					<p class="text-xs font-semibold text-amber-800">🎮 준비완료</p>
				{:else}
					<p class="text-xs text-amber-600">⏳ 대기중</p>
				{/if}
			</div>
		{:else if myColor}
			<div class="rounded-lg bg-blue-100 p-2">
				<p class="text-center text-xs font-semibold text-blue-800">
					{myColor === 'black' ? '● 흑' : '○ 백'} ({myColor === 'black'
						? blackPlayer
						: whitePlayer})
				</p>
			</div>
		{:else}
			<div class="rounded-lg bg-purple-100 p-2 text-center">
				<p class="text-xs font-semibold text-purple-800">👁️ 관전</p>
			</div>
		{/if}

		<!-- 게임 버튼 -->
		{#if myRole === 'player1' || myRole === 'player2'}
			<div class="flex flex-col gap-1.5">
				<button
					class="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white shadow-md transition-all
                       {isReady && !gameStarted
						? 'hover:bg-green-700'
						: 'cursor-not-allowed opacity-50'}"
					on:click={handleNewGame}
					disabled={!isReady || gameStarted}
				>
					🎮 게임 시작
				</button>

				<button
					class="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-md transition-all
                       {gameStarted ? 'hover:bg-amber-600' : 'cursor-not-allowed opacity-50'}"
					on:click={handleUndo}
					disabled={!gameStarted}
				>
					↶ 무르기
				</button>

				<button
					class="rounded-lg bg-blue-500 px-3 py-2 text-xs font-bold text-white shadow-md transition-all
                       {!loadingRecommend ? 'hover:bg-blue-600' : 'cursor-not-allowed opacity-50'}"
					on:click={handleRecommend}
					disabled={loadingRecommend}
				>
					{loadingRecommend ? '⏳ 분석중' : '💡 추천'}
				</button>

				<button
					class="rounded-lg bg-purple-500 px-3 py-2 text-xs font-bold text-white shadow-md transition-all
                       {!loadingAnalysis ? 'hover:bg-purple-600' : 'cursor-not-allowed opacity-50'}"
					on:click={handleAnalysis}
					disabled={loadingAnalysis}
				>
					{loadingAnalysis ? '⏳ 분석중' : '📊 형세'}
				</button>

				<button
					class="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-md transition-all
                       {gameStarted ? 'hover:bg-red-700' : 'cursor-not-allowed opacity-50'}"
					on:click={handleScore}
					disabled={!gameStarted}
				>
					🏁 계가
				</button>
			</div>
		{/if}
	</div>

	<!-- 중앙: 바둑판 -->
	<div bind:this={containerDiv} class="flex flex-1 items-center justify-center">
		<svg
			width={SVG_SIZE}
			height={SVG_SIZE}
			class="rounded-lg bg-amber-600 shadow-2xl {isMyTurn
				? 'cursor-crosshair'
				: 'cursor-not-allowed'}"
			on:click={handleClick}
			on:mousemove={handleMouseMove}
			on:mouseleave={handleMouseLeave}
		>
			<!-- 그리드 선 -->
			{#each Array(BOARD_SIZE) as _, i}
				<line
					x1={PADDING + i * CELL_SIZE}
					y1={PADDING}
					x2={PADDING + i * CELL_SIZE}
					y2={PADDING + (BOARD_SIZE - 1) * CELL_SIZE}
					stroke="#8B4513"
					stroke-width="1.5"
				/>
				<line
					x1={PADDING}
					y1={PADDING + i * CELL_SIZE}
					x2={PADDING + (BOARD_SIZE - 1) * CELL_SIZE}
					y2={PADDING + i * CELL_SIZE}
					stroke="#8B4513"
					stroke-width="1.5"
				/>
			{/each}

			<!-- 화점 -->
			{#each [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]] as [row, col]}
				<circle
					cx={PADDING + col * CELL_SIZE}
					cy={PADDING + row * CELL_SIZE}
					r={SVG_SIZE * 0.008}
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
							r={CELL_SIZE * 0.45}
							fill={cell === 'black' ? '#000' : '#fff'}
							stroke={cell === 'black' ? '#333' : '#ccc'}
							stroke-width="1.5"
						/>
					{/if}
				{/each}
			{/each}

			<!-- 호버 미리보기 -->
			{#if hoveredPosition && isMyTurn}
				<circle
					cx={PADDING + hoveredPosition.col * CELL_SIZE}
					cy={PADDING + hoveredPosition.row * CELL_SIZE}
					r={CELL_SIZE * 0.45}
					fill={currentTurn === 'black' ? '#000' : '#fff'}
					opacity="0.4"
					class="pointer-events-none"
				/>
			{/if}

			<!-- 추천 착수점 (블루스팟) -->
			{#if recommendedMove}
				<circle
					cx={PADDING + (recommendedMove.y - 1) * CELL_SIZE}
					cy={PADDING + (recommendedMove.x - 1) * CELL_SIZE}
					r={CELL_SIZE * 0.35}
					fill="#3B82F6"
					opacity="0.7"
					class="pointer-events-none animate-pulse"
				/>
			{/if}
		</svg>
	</div>
</div>
