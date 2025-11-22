<script>
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    export let messages = [];
    export let username = 'Player';
    
    let chatInput = '';
    let messagesContainer;
    
    $: if (messagesContainer && messages.length) {
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 0);
    }
    
    function handleSend() {
        if (!chatInput.trim()) return;
        
        dispatch('send', { message: chatInput });
        chatInput = '';
    }
    
    function handleKeyPress(event) {
        if (event.key === 'Enter') {
            handleSend();
        }
    }
</script>

<div class="flex flex-col h-full bg-white rounded-lg shadow-lg border border-gray-200">
    <!-- 헤더 -->
    <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-amber-100">
        <h3 class="text-lg font-bold text-amber-900">채팅</h3>
    </div>
    
    <!-- 메시지 리스트 -->
    <div 
        bind:this={messagesContainer}
        class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
    >
        {#each messages as msg}
            <div class="animate-fade-in">
                {#if msg.type === 'ENTER' || msg.type === 'LEAVE'}
                    <!-- 시스템 메시지 -->
                    <div class="text-center">
                        <span class="inline-block px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm italic">
                            {msg.message}
                        </span>
                    </div>
                {:else}
                    <!-- 일반 메시지 -->
                    <div class="flex flex-col {msg.sender === username ? 'items-end' : 'items-start'}">
                        <div class="text-xs text-gray-500 mb-1 px-2">
                            {msg.sender}
                        </div>
                        <div class="max-w-[80%] px-4 py-2 rounded-2xl {
                            msg.sender === username 
                                ? 'bg-blue-500 text-white rounded-tr-sm' 
                                : 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-200'
                        }">
                            <p class="break-words">{msg.message}</p>
                        </div>
                        <div class="text-xs text-gray-400 mt-1 px-2">
                            {new Date(msg.timestamp).toLocaleTimeString('ko-KR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            })}
                        </div>
                    </div>
                {/if}
            </div>
        {:else}
            <div class="flex items-center justify-center h-full text-gray-400">
                <p>아직 메시지가 없습니다</p>
            </div>
        {/each}
    </div>
    
    <!-- 입력 영역 -->
    <div class="p-4 border-t border-gray-200 bg-white">
        <div class="flex gap-2">
            <input
                type="text"
                bind:value={chatInput}
                on:keypress={handleKeyPress}
                placeholder="메시지를 입력하세요..."
                class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
                on:click={handleSend}
                class="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!chatInput.trim()}
            >
                전송
            </button>
        </div>
    </div>
</div>

<style>
    @keyframes fade-in {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .animate-fade-in {
        animation: fade-in 0.3s ease-out;
    }
</style>