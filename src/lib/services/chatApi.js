import { API_CONFIG } from '$lib/config';

export const chatApi = {
    // 방 목록 조회
    async getRooms() {
        const response = await fetch(`${API_CONFIG.CHAT_API_BASE}/rooms`);
        return await response.json();
    },
    
    // 방 생성
    async createRoom(roomName) {
        const response = await fetch(`${API_CONFIG.CHAT_API_BASE}/rooms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `name=${encodeURIComponent(roomName)}`
        });
        return await response.json();
    },
    
    // 특정 방 조회
    async getRoom(roomId) {
        const response = await fetch(`${API_CONFIG.CHAT_API_BASE}/rooms/${roomId}`);
        return await response.json();
    }
};