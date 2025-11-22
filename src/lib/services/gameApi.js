import { API_CONFIG } from '$lib/config';

/**
 * KataGo REST API 서비스
 * AI 착수 추천 및 형세 판단 기능
 */
export const gameApi = {
	/**
	 * 착수 추천 (블루스팟) - 멀티플레이어용
	 * @param {string} gameId - 게임방 ID
	 * @returns {Promise<{x: number, y: number}>}
	 */
	async getBlueSpots(gameId) {
		const response = await fetch(`${API_CONFIG.GAME_API_BASE}/katago/bluespots/${gameId}`);

		if (!response.ok) {
			throw new Error('착수 추천 실패');
		}

		return await response.json();
	},

	/**
	 * 계가 (형세 판단) - 멀티플레이어용
	 * @param {string} gameId - 게임방 ID
	 * @returns {Promise<{result: string}>}
	 */
	async getScore(gameId) {
		const response = await fetch(`${API_CONFIG.GAME_API_BASE}/katago/score/${gameId}`);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('❌ 백엔드 응답:', errorText);
			throw new Error('형세 판단 실패');
		}

		return await response.json();
	}
};
