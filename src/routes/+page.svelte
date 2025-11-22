<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { chatApi } from '$lib/services/chatApi';

	let roomName = '';
	let rooms = [];
	let username = '';
	let showUsernameModal = false;
	let selectedRoom = null;

	onMount(() => {
		loadRooms();
		const interval = setInterval(loadRooms, 3000);
		return () => clearInterval(interval);
	});

	async function loadRooms() {
		try {
			rooms = await chatApi.getRooms();
		} catch (error) {
			console.error('방 목록 로딩 실패:', error);
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
			await loadRooms();
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

<div class="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 px-4 py-12">
	<div class="mx-auto max-w-6xl">
		<div class="mb-12 text-center">
			<h1 class="mb-4 text-6xl font-bold text-amber-900 drop-shadow-lg">WooTeGo</h1>
			<p class="text-2xl font-semibold text-amber-700">우아한 바둑 - 대국 로비</p>
		</div>

		<div class="mb-8 rounded-2xl bg-white p-8 shadow-xl">
			<h2 class="mb-6 text-2xl font-bold text-gray-800">새로운 대국방 만들기</h2>
			<div class="flex gap-4">
				<input
					type="text"
					bind:value={roomName}
					placeholder="방 이름을 입력하세요"
					on:keypress={(e) => e.key === 'Enter' && createRoom()}
					class="flex-1 rounded-xl border-2 border-amber-300 px-6 py-4 text-lg focus:border-transparent focus:ring-2 focus:ring-amber-500 focus:outline-none"
				/>
				<button
					on:click={createRoom}
					class="rounded-xl bg-amber-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-amber-700"
				>
					방 만들기
				</button>
			</div>
		</div>

		<div class="rounded-2xl bg-white p-8 shadow-xl">
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-2xl font-bold text-gray-800">대국 중인 방</h2>
				<span class="text-sm text-gray-500">총 {rooms.length}개의 방</span>
			</div>

			{#if rooms.length === 0}
				<div class="py-20 text-center">
					<div class="mb-4 text-6xl">🎯</div>
					<p class="text-xl text-gray-500">아직 방이 없습니다</p>
					<p class="mt-2 text-gray-400">새로운 대국방을 만들어보세요!</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each rooms as room}
						<div
							class="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-white to-amber-50 p-6 transition-all hover:border-amber-400 hover:shadow-lg"
						>
							<div class="mb-4 flex items-start justify-between">
								<div class="flex-1">
									<h3 class="mb-2 text-xl font-bold text-gray-800">
										{room.roomName}
									</h3>
									<div class="flex items-center text-gray-600">
										<svg class="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
											<path
												d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"
											/>
										</svg>
										<span class="font-semibold">{room.userCount}명 대국 중</span>
									</div>
								</div>
							</div>

							<button
								on:click={() => enterRoom(room)}
								class="w-full rounded-lg bg-amber-500 py-3 font-bold text-white transition-colors hover:bg-amber-600"
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

{#if showUsernameModal}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
		<div class="animate-scale-in w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
			<h2 class="mb-6 text-center text-2xl font-bold text-gray-800">대국방 입장</h2>

			<div class="mb-6">
				<label for="username-input" class="mb-2 block font-semibold text-gray-700">
					사용할 닉네임
				</label>
				<input
					id="username-input"
					type="text"
					bind:value={username}
					placeholder="닉네임을 입력하세요"
					on:keypress={(e) => e.key === 'Enter' && confirmEnter()}
					class="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-amber-500 focus:outline-none"
					autofocus
				/>
			</div>

			<div class="flex gap-3">
				<button
					on:click={() => {
						showUsernameModal = false;
						username = '';
					}}
					class="flex-1 rounded-lg bg-gray-300 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-400"
				>
					취소
				</button>
				<button
					on:click={confirmEnter}
					class="flex-1 rounded-lg bg-amber-600 py-3 font-semibold text-white transition-colors hover:bg-amber-700"
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
			transform: scale(0.9);
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
