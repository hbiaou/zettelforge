export class TokenManager {
    static setToken(provider: string, token: string): void {
        window.localStorage.setItem(`zettelforge_token_${provider}`, token);
    }

    static getToken(provider: string): string | null {
        return window.localStorage.getItem(`zettelforge_token_${provider}`);
    }

    static deleteToken(provider: string): void {
        window.localStorage.removeItem(`zettelforge_token_${provider}`);
    }
}
