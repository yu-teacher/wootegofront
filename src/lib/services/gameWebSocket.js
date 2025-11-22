import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { API_CONFIG } from '$lib/config';

/**
 * 게임 WebSocket 서비스
 * 게임방의 실시간 통신을 관리합니다
 */
export class GameWebSocketService {
    constructor(gameId, username, onMessage) {
        this.gameId = gameId;
        this.username = username;
        this.onMessage = onMessage; // 메시지 수신 콜백
        this.stompClient = null;
    }
    
    /**
     * WebSocket 연결 및 구독
     * @returns {Promise<void>}
     */
    connect() {
        const socket = new SockJS(API_CONFIG.GAME_WS_URL);
        this.stompClient = Stomp.over(socket);
        this.stompClient.debug = null; // 디버그 로그 비활성화
        
        return new Promise((resolve, reject) => {
            this.stompClient.connect({}, () => {
                console.log('✅ 게임 WebSocket 연결 성공');
                
                // 게임방 구독
                this.stompClient.subscribe(`/topic/game.${this.gameId}`, (message) => {
                    const data = JSON.parse(message.body);
                    this.onMessage(data);
                });
                
                // 자동 입장
                this.join();
                resolve();
            }, (error) => {
                console.error('❌ 게임 WebSocket 연결 실패:', error);
                reject(error);
            });
        });
    }
    
    /**
     * 게임방 입장
     */
    join() {
        this.send('/app/game/join', {
            gameId: this.gameId,
            username: this.username
        });
    }
    
    /**
     * 게임 시작
     */
    start() {
        this.send('/app/game/start', {
            gameId: this.gameId,
            username: this.username
        });
    }
    
    /**
     * 착수
     * @param {number} x - 1-19 (백엔드 좌표)
     * @param {number} y - 1-19 (백엔드 좌표)
     */
    move(x, y) {
        this.send('/app/game/move', {
            gameId: this.gameId,
            username: this.username,
            x,
            y
        });
    }
    
    /**
     * 무르기
     */
    undo() {
        this.send('/app/game/undo', {
            gameId: this.gameId,
            username: this.username
        });
    }
    
    /**
     * 계가 (모두에게 브로드캐스트)
     */
    score() {
        this.send('/app/game/score', {
            gameId: this.gameId,
            username: this.username
        });
    }
    
    /**
     * 게임방 퇴장
     */
    leave() {
        this.send('/app/game/leave', {
            gameId: this.gameId,
            username: this.username
        });
    }
    
    /**
     * 메시지 전송 (내부 헬퍼)
     * @private
     */
    send(destination, payload) {
        if (this.stompClient && this.stompClient.connected) {
            this.stompClient.send(destination, {}, JSON.stringify(payload));
        } else {
            console.error('❌ WebSocket이 연결되지 않았습니다');
        }
    }
    
    /**
     * WebSocket 연결 종료
     */
    disconnect() {
        if (this.stompClient && this.stompClient.connected) {
            this.leave();
            this.stompClient.disconnect();
            console.log('🔌 게임 WebSocket 연결 종료');
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