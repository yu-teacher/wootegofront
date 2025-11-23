<script>
    import { createEventDispatcher } from 'svelte';
    import { onMount } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    export let title = '';
    export let message = '';
    export let show = false;
    
    let timeLeft = 30;
    let interval;
    
    $: if (show) {
        startTimer();
    } else {
        stopTimer();
    }
    
    function startTimer() {
        timeLeft = 30;
        interval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                handleReject(); // 타임아웃 시 자동 거절
            }
        }, 1000);
    }
    
    function stopTimer() {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
    }
    
    function handleAccept() {
        stopTimer();
        dispatch('accept');
    }
    
    function handleReject() {
        stopTimer();
        dispatch('reject');
    }
    
    onMount(() => {
        return () => stopTimer();
    });
</script>

{#if show}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div class="w-full max-w-md animate-scale-in rounded-2xl bg-white p-8 shadow-2xl">
            <h2 class="mb-4 text-center text-2xl font-bold text-gray-800">{title}</h2>
            
            <p class="mb-6 text-center text-gray-600">{message}</p>
            
            <!-- 타이머 -->
            <div class="mb-6 text-center">
                <div class="text-3xl font-bold text-amber-600">{timeLeft}초</div>
                <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div 
                        class="h-full bg-amber-500 transition-all duration-1000"
                        style="width: {(timeLeft / 30) * 100}%"
                    ></div>
                </div>
            </div>
            
            <div class="flex gap-3">
                <button
                    on:click={handleReject}
                    class="flex-1 rounded-lg bg-red-500 py-3 font-semibold text-white transition-colors hover:bg-red-600"
                >
                    거절
                </button>
                <button
                    on:click={handleAccept}
                    class="flex-1 rounded-lg bg-green-500 py-3 font-semibold text-white transition-colors hover:bg-green-600"
                >
                    수락
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