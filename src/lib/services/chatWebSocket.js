import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { API_CONFIG } from '$lib/config';

/**
 * 채팅 WebSocket 서비스
 * 채팅방의 실시간 통신을 관리합니다
 */
export class ChatWebSocketService {
    constructor(roomId, username, onMessage) {
        this.roomId = roomId;
        this.username = username;
        this.onMessage = onMessage; // 메시지 수신 콜백
        this.stompClient = null;
        
        console.log('💬 [ChatWebSocket] 생성:', { roomId, username });
    }
    
    /**
     * WebSocket 연결 및 구독
     * @returns {Promise<void>}
     */
    connect() {
        console.log('💬 [ChatWebSocket] 연결 시도:', API_CONFIG.CHAT_WS_URL);
        
        const socket = new SockJS(API_CONFIG.CHAT_WS_URL);
        this.stompClient = Stomp.over(socket);
        this.stompClient.debug = (msg) => {
            console.log('💬 [STOMP Debug]', msg);
        };
        
        return new Promise((resolve, reject) => {
            this.stompClient.connect({}, () => {
                console.log('✅ [ChatWebSocket] 연결 성공');
                
                // 채팅방 구독 (username 헤더 전달)
                const subscription = this.stompClient.subscribe(
                    `/topic/chat/room/${this.roomId}`, 
                    (message) => {
                        console.log('💬 [ChatWebSocket] 메시지 수신:', message.body);
                        const data = JSON.parse(message.body);
                        console.log('💬 [ChatWebSocket] 파싱된 데이터:', data);
                        this.onMessage(data);
                    },
                    { username: this.username } // ✅ 헤더 추가
                );
                
                console.log('💬 [ChatWebSocket] 구독 완료:', `/topic/chat/room/${this.roomId}`);
                console.log('💬 [ChatWebSocket] Subscription:', subscription);
                
                // 자동 입장
                this.enter();
                resolve();
            }, (error) => {
                console.error('❌ [ChatWebSocket] 연결 실패:', error);
                reject(error);
            });
        });
    }
    
    /**
     * 채팅방 입장
     */
    enter() {
        console.log('💬 [ChatWebSocket] 입장 메시지 전송');
        this.send('/app/chat.sendMessage', {
            type: 'ENTER',
            roomId: this.roomId,
            sender: this.username,
            message: ''
        });
    }
    
    /**
     * 채팅 메시지 전송
     * @param {string} message - 메시지 내용
     */
    sendMessage(message) {
        console.log('💬 [ChatWebSocket] 메시지 전송:', message);
        this.send('/app/chat.sendMessage', {
            type: 'TALK',
            roomId: this.roomId,
            sender: this.username,
            message: message
        });
    }
    
    /**
     * 채팅방 퇴장
     */
    leave() {
        console.log('💬 [ChatWebSocket] 퇴장 메시지 전송');
        this.send('/app/chat.sendMessage', {
            type: 'LEAVE',
            roomId: this.roomId,
            sender: this.username,
            message: ''
        });
    }
    
    /**
     * 메시지 전송 (내부 헬퍼)
     * @private
     */
    send(destination, payload) {
        if (this.stompClient && this.stompClient.connected) {
            console.log('💬 [ChatWebSocket] 전송:', destination, payload);
            this.stompClient.send(destination, {}, JSON.stringify(payload));
        } else {
            console.error('❌ [ChatWebSocket] WebSocket이 연결되지 않았습니다');
        }
    }
    
    /**
     * WebSocket 연결 종료
     */
    disconnect() {
        if (this.stompClient && this.stompClient.connected) {
            this.leave();
            this.stompClient.disconnect();
            console.log('🔌 [ChatWebSocket] 연결 종료');
        }
    }
    
    /**
     * 연결 상태 확인
     * @returns {boolean}
     */
    isConnected() {
        const connected = this.stompClient && this.stompClient.connected;
        console.log('💬 [ChatWebSocket] 연결 상태:', connected);
        return connected;
    }
}