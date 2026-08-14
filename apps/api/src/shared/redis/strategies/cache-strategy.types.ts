export interface CacheStrategy {
  read<T>(key: string): Promise<T | null>;
  refresh<T>(key: string, ttlSeconds: number, loadFresh: () => Promise<T>): Promise<T | null>;
}
