const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const authService = {
  async login(email: string, password: string): Promise<boolean> {
    await delay(300);
    // Simple mock check
    if (email && password.length >= 4) {
      return true;
    }
    return false;
  }
};
