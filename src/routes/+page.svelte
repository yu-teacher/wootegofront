<script>
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { chatApi } from '$lib/services/chatApi';
	import { LobbyWebSocketService } from '$lib/services/lobbyWebSocket';

	let roomName = '';
	let rooms = [];
	let username = '';
	let showUsernameModal = false;
	let selectedRoom = null;
	let lobbyService;

	onMount(() => {
		loadRooms();
		connectLobby();
	});

	onDestroy(() => {
		if (lobbyService) {
			lobbyService.disconnect();
		}
	});

	async function loadRooms() {
		try {
			rooms = await chatApi.getRooms();
		} catch (error) {
			console.error('방 목록 로딩 실패:', error);
		}
	}

	function connectLobby() {
		lobbyService = new LobbyWebSocketService(handleLobbyUpdate);
		lobbyService.connect().catch(error => {
			console.error('로비 WebSocket 연결 실패:', error);
		});
	}

	function handleLobbyUpdate(data) {
		if (Array.isArray(data)) {
			rooms = data;
		} else if (data.type === 'CREATED') {
			const newRoom = data.data;
			rooms = [...rooms, newRoom];
		} else if (data.type === 'DELETED') {
			const deletedRoomId = data.data;
			rooms = rooms.filter(r => r.roomId !== deletedRoomId);
		}
	}

	async function createRoom() {
		if (!roomName.trim()) {
			alert('방 이름을 입력해주세요');
			return;
		}

		try {
			const newRoom = await chatApi.createRoom(roomName);
			roomName = '';
			enterRoom(newRoom);
		} catch (error) {
			console.error('방 생성 실패:', error);
			alert('방 생성에 실패했습니다');
		}
	}

	function enterRoom(room) {
		selectedRoom = room;
		showUsernameModal = true;
	}

	function confirmEnter() {
		if (!username.trim()) {
			alert('닉네임을 입력해주세요');
			return;
		}

		goto(
			`/game/${selectedRoom.roomId}?username=${encodeURIComponent(username)}&roomName=${encodeURIComponent(selectedRoom.roomName)}`
		);
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 px-4 py-6">
	<div class="mx-auto max-w-7xl h-[calc(100vh-48px)] flex flex-col">
		<!-- 헤더 (축소) -->
		<div class="mb-6 text-center flex-shrink-0">
			<h1 class="mb-2 text-5xl font-bold text-amber-900 drop-shadow-lg">WooTeGo</h1>
			<p class="text-xl font-semibold text-amber-700">우아한 바둑 - 대국 로비</p>
		</div>

		<!-- 방 만들기 (축소) -->
		<div class="mb-4 rounded-xl bg-white p-4 shadow-xl flex-shrink-0">
			<h2 class="mb-3 text-lg font-bold text-gray-800">새로운 대국방 만들기</h2>
			<div class="flex gap-3">
				<input
					type="text"
					bind:value={roomName}
					placeholder="방 이름을 입력하세요"
					on:keypress={(e) => e.key === 'Enter' && createRoom()}
					class="flex-1 rounded-lg border-2 border-amber-300 px-4 py-3 text-base focus:border-transparent focus:ring-2 focus:ring-amber-500 focus:outline-none"
				/>
				<button
					on:click={createRoom}
					class="rounded-lg bg-amber-600 px-6 py-3 text-base font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-amber-700"
				>
					방 만들기
				</button>
			</div>
		</div>

		<!-- 방 목록 (flex-1로 남은 공간 채우기) -->
		<div class="rounded-xl bg-white p-4 shadow-xl flex-1 flex flex-col min-h-0">
			<div class="mb-3 flex items-center justify-between flex-shrink-0">
				<h2 class="text-lg font-bold text-gray-800">대국 중인 방</h2>
				<span class="text-xs text-gray-500">총 {rooms.length}개</span>
			</div>

			<!-- 방 목록 스크롤 영역 -->
			<div class="flex-1 overflow-y-auto min-h-0">
				{#if rooms.length === 0}
					<div class="flex flex-col items-center justify-center h-full">
						<div class="mb-3 text-5xl">🎯</div>
						<p class="text-lg text-gray-500">아직 방이 없습니다</p>
						<p class="mt-1 text-sm text-gray-400">새로운 대국방을 만들어보세요!</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-2">
						{#each rooms as room (room.roomId)}
							<div
								class="rounded-lg border-2 border-amber-200 bg-gradient-to-br from-white to-amber-50 p-4 transition-all hover:border-amber-400 hover:shadow-lg"
							>
								<div class="mb-3">
									<h3 class="mb-2 text-base font-bold text-gray-800 truncate">
										{room.roomName}
									</h3>
									<div class="flex items-center text-gray-600 text-sm">
										<svg class="mr-1.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
											<path
												d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"
											/>
										</svg>
										<span class="font-semibold">{room.userCount}명</span>
									</div>
								</div>

								<button
									on:click={() => enterRoom(room)}
									class="w-full rounded-lg bg-amber-500 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-600"
								>
									입장하기
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- 닉네임 입력 모달 -->
{#if showUsernameModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
		<div class="animate-scale-in w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
			<h2 class="mb-4 text-center text-xl font-bold text-gray-800">대국방 입장</h2>

			<div class="mb-4">
				<label for="username-input" class="mb-2 block text-sm font-semibold text-gray-700">
					사용할 닉네임
				</label>
				<input
					id="username-input"
					type="text"
					bind:value={username}
					placeholder="닉네임을 입력하세요"
					on:keypress={(e) => e.key === 'Enter' && confirmEnter()}
					class="w-full rounded-lg border-2 border-gray-300 px-4 py-2.5 text-base focus:border-transparent focus:ring-2 focus:ring-amber-500 focus:outline-none"
					autofocus
				/>
			</div>

			<div class="flex gap-2">
				<button
					on:click={() => {
						showUsernameModal = false;
						username = '';
					}}
					class="flex-1 rounded-lg bg-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-400"
				>
					취소
				</button>
				<button
					on:click={confirmEnter}
					class="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
				>
					입장
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes scale-in {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.animate-scale-in {
		animation: scale-in 0.2s ease-out;
	}
</style>