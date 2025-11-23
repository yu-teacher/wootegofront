import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { API_CONFIG } from '$lib/config';

/**
 * 로비 WebSocket 서비스
 * 로비의 실시간 방 목록 업데이트를 관리합니다
 */
export class LobbyWebSocketService {
    constructor(onUpdate) {
        this.onUpdate = onUpdate; // 로비 업데이트 콜백
        this.stompClient = null;
    }
    
    /**
     * WebSocket 연결 및 구독
     * @returns {Promise<void>}
     */
    connect() {
        const socket = new SockJS(API_CONFIG.CHAT_WS_URL);
        this.stompClient = Stomp.over(socket);
        this.stompClient.debug = null;
        
        return new Promise((resolve, reject) => {
            this.stompClient.connect({}, () => {
                console.log('✅ 로비 WebSocket 연결 성공');
                
                // 로비 구독
                this.stompClient.subscribe('/topic/lobby', (message) => {
                    const data = JSON.parse(message.body);
                    this.onUpdate(data);
                });
                
                // 초기 방 목록 요청
                this.subscribeLobby();
                resolve();
            }, (error) => {
                console.error('❌ 로비 WebSocket 연결 실패:', error);
                reject(error);
            });
        });
    }
    
    /**
     * 로비 구독 (초기 방 목록 요청)
     */
    subscribeLobby() {
        if (this.stompClient && this.stompClient.connected) {
            this.stompClient.send('/app/lobby.subscribe', {}, '{}');
        }
    }
    
    /**
     * WebSocket 연결 종료
     */
    disconnect() {
        if (this.stompClient && this.stompClient.connected) {
            this.stompClient.disconnect();
            console.log('🔌 로비 WebSocket 연결 종료');
        }
    }
    
    /**
     * 연결 상태 확인
     * @returns {boolean}
     */
    isConnected() {
        return this.stompClient && this.stompClient.connected;
    }
}