<script>
    import { onMount } from 'svelte';
    import { fly } from 'svelte/transition';
    
    export let message = '';
    export let type = 'info'; // 'success', 'error', 'info', 'warning'
    export let duration = 3000;
    export let onClose = () => {};
    
    let visible = true;
    
    const typeStyles = {
        success: 'bg-green-500 border-green-600',
        error: 'bg-red-500 border-red-600',
        info: 'bg-blue-500 border-blue-600',
        warning: 'bg-orange-500 border-orange-600'
    };
    
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };
    
    onMount(() => {
        const timer = setTimeout(() => {
            visible = false;
            setTimeout(onClose, 300); // 애니메이션 후 제거
        }, duration);
        
        return () => clearTimeout(timer);
    });
    
    function handleClose() {
        visible = false;
        setTimeout(onClose, 300);
    }
</script>

{#if visible}
    <div
        transition:fly={{ y: -20, duration: 300 }}
        class="fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl text-white border-l-4 {typeStyles[type]} min-w-[300px] max-w-md"
    >
        <span class="text-2xl font-bold">{icons[type]}</span>
        <p class="flex-1 font-semibold">{message}</p>
        <button
            on:click={handleClose}
            class="text-white hover:text-gray-200 text-xl font-bold"
        >
            ×
        </button>
    </div>
{/if}