import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SourceCodeMdpProvider } from '../providers/sourceCodeMdpProvider.js';
import { MockMdpVerificationProvider } from '../providers/mockMdpVerificationProvider.js';
import { NepseDemoProvider } from '../providers/nepseDemoProvider.js';
import { getDataProvider, setCustomDataProvider, resetDataProvider } from '../providers/index.js';
import { analyzeTechnicalSetup } from '../engine/technicalAnalysis.js';
import { generatePredictiveOutlook } from '../engine/predictiveEngine.js';
import { Candle } from '../providers/types.js';

describe('NEPSE Market Data Provider Integration Suite', () => {
  beforeEach(() => {
    resetDataProvider();
  });

  afterEach(() => {
    resetDataProvider();
    vi.restoreAllMocks();
  });

  describe('1. Source Code MDP Credentials & Adapter Configuration', () => {
    it('detects missing or placeholder credentials accurately', () => {
      const emptyProvider = new SourceCodeMdpProvider({
        apiKey: '',
        apiSecret: '',
        accessId: ''
      });
      expect(emptyProvider.hasValidCredentials()).toBe(false);

      const placeholderProvider = new SourceCodeMdpProvider({
        apiKey: 'your_sourcecode_api_key_here',
        apiSecret: 'your_sourcecode_api_secret_here',
        accessId: 'your_sourcecode_access_id_here'
      });
      expect(placeholderProvider.hasValidCredentials()).toBe(false);

      const validProvider = new SourceCodeMdpProvider({
        apiKey: 'LIVE_MDP_KEY_TEST_9918',
        apiSecret: 'LIVE_MDP_SEC_TEST_8819',
        accessId: 'ACC_NEPSE_COMMERCIAL_01'
      });
      expect(validProvider.hasValidCredentials()).toBe(true);
    });

    it('reports official NEPSE licensing attribution metadata in DataSourceInfo', () => {
      const provider = new SourceCodeMdpProvider({
        baseUrl: 'https://uat.sourcecode.com.np',
        apiKey: 'VALID_KEY',
        apiSecret: 'VALID_SECRET',
        accessId: 'ACC_01',
        feedType: 'DELAYED_15MIN'
      });

      const ds = provider.getDataSourceInfo();
      expect(ds.providerName).toContain('Source Code MDP');
      expect(ds.officialAuthorization).toContain('NEPSE Licensed');
      expect(ds.attributionUrl).toBe('https://sourcecode.com.np');
      expect(ds.feedType).toBe('DELAYED_15MIN');
      expect(ds.delayMinutes).toBe(15);
      expect(ds.isDemo).toBe(false);
      expect(ds.observedAtNPT).toBeTruthy();
      expect(ds.retrievedAtNPT).toBeTruthy();
    });
  });

  describe('2. Authentication Failure Handling (HTTP 401 / 403)', () => {
    it('rejects execution when credentials are missing and never silently falls back to demo data', async () => {
      const unconfiguredProvider = new SourceCodeMdpProvider({
        apiKey: '',
        apiSecret: '',
        accessId: ''
      });

      await expect(unconfiguredProvider.getMarketSummary()).rejects.toThrow(
        /Source Code MDP credentials missing or unconfigured/
      );
    });

    it('handles HTTP 401 authentication rejection without endless retry loops', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        json: async () => ({ error: 'Unauthorized AccessId or Expired Token' })
      });
      vi.stubGlobal('fetch', mockFetch);

      const provider = new SourceCodeMdpProvider({
        baseUrl: 'https://uat.sourcecode.com.np',
        apiKey: 'INVALID_KEY',
        apiSecret: 'INVALID_SECRET',
        accessId: 'INVALID_ACC'
      });

      await expect(provider.getMarketSummary()).rejects.toThrow(
        /Authentication failed with Source Code MDP \(HTTP 401\)/
      );
      // HTTP 401 must not trigger retries
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Rate-Limit Handling (HTTP 429) & Bounded Retries', () => {
    it('retries with Retry-After header and fails boundedly if limit continues', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 429,
        ok: false,
        headers: new Headers({ 'Retry-After': '0' }),
        json: async () => ({ error: 'Rate limit exceeded' })
      });
      vi.stubGlobal('fetch', mockFetch);

      const provider = new SourceCodeMdpProvider({
        baseUrl: 'https://uat.sourcecode.com.np',
        apiKey: 'VALID_KEY',
        apiSecret: 'VALID_SECRET',
        accessId: 'ACC_01',
        timeoutMs: 1000
      });

      await expect(provider.getMarketSummary()).rejects.toThrow(
        /Source Code MDP rate limit exceeded \(HTTP 429\)/
      );
      // Max 2 retries = 3 total attempts
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('4. Provider Outage, Stale Tagging & No-Silent-Demo Guarantee', () => {
    it('serves cached data with explicit STALE flag and notice during network interruption', async () => {
      let indexCallCount = 0;
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/Indices/live')) {
          indexCallCount++;
          if (indexCallCount === 1) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({
                nepseIndex: 2750.45,
                pointChange: 15.2,
                percentageChange: 0.55,
                totalTurnover: 6500000000,
                totalVolume: 15000000,
                totalTransactions: 55000,
                timestamp: '2024-10-05 14:15 PM NPT'
              })
            });
          }
          // Subsequent index calls simulate network timeout / outage
          const abortErr = new Error('Network timeout');
          abortErr.name = 'AbortError';
          return Promise.reject(abortErr);
        }

        // Return empty array for secondary endpoints (e.g. top movers / companies)
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => []
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const provider = new SourceCodeMdpProvider({
        baseUrl: 'https://uat.sourcecode.com.np',
        apiKey: 'VALID_KEY',
        apiSecret: 'VALID_SECRET',
        accessId: 'ACC_01',
        cacheTtlSeconds: 0 // force fresh fetch to test stale fallback
      });

      // 1. Initial valid fetch succeeds
      const first = await provider.getMarketSummary();
      expect(first.nepseIndex).toBe(2750.45);
      expect(first.dataSource.isStale).toBe(false);

      // 2. Second fetch fails on wire -> must return last valid data marked as STALE
      const second = await provider.getMarketSummary();
      expect(second.nepseIndex).toBe(2750.45);
      expect(second.dataSource.isStale).toBe(true);
      expect(second.dataSource.dataStatus).toBe('STALE');
      expect(second.dataSource.notes).toContain('Data stale');
      // Crucial: Must NEVER silently switch to demo provider
      expect(second.dataSource.isDemo).toBe(false);
    });

    it('throws explicit error when initial request fails without prior cached records', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Gateway 502 Bad Gateway'));
      vi.stubGlobal('fetch', mockFetch);

      const provider = new SourceCodeMdpProvider({
        baseUrl: 'https://uat.sourcecode.com.np',
        apiKey: 'VALID_KEY',
        apiSecret: 'VALID_SECRET',
        accessId: 'ACC_01'
      });

      await expect(provider.getMarketSummary()).rejects.toThrow(
        /Source Code MDP unavailable: Gateway 502 Bad Gateway/
      );
    });
  });

  describe('5. Schema Validation & Numeric Sanity', () => {
    it('rejects malformed or non-numeric index payloads from provider', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          nepseIndex: 'NOT_A_NUMBER',
          pointChange: 'CORRUPTED'
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const provider = new SourceCodeMdpProvider({
        baseUrl: 'https://uat.sourcecode.com.np',
        apiKey: 'VALID_KEY',
        apiSecret: 'VALID_SECRET',
        accessId: 'ACC_01'
      });

      await expect(provider.getMarketSummary()).rejects.toThrow(
        /Malformed market index payload received from Source Code MDP/
      );
    });
  });

  describe('6. Multi-Scrip Comparison Against Reference Data (5 Scrips)', () => {
    it('validates NEPSE index and 5 reference companies (NABIL, GBIME, UPPER, SHIVM, CIT)', async () => {
      const mockProvider = new MockMdpVerificationProvider({ delayMinutes: 15 });
      setCustomDataProvider(mockProvider);

      const summary = await mockProvider.getMarketSummary();
      expect(summary.nepseIndex).toBeGreaterThan(1000);
      expect(typeof summary.pointChange).toBe('number');
      expect(typeof summary.percentChange).toBe('number');
      expect(summary.totalTurnover).toBeGreaterThan(0);
      expect(summary.dataSource.isDemo).toBe(false);

      const targetSymbols = ['NABIL', 'GBIME', 'UPPER', 'SHIVM', 'CIT'];
      for (const sym of targetSymbols) {
        const details = await mockProvider.getCompanyDetails(sym);
        expect(details, `Scrip ${sym} must be returned`).not.toBeNull();
        expect(details!.symbol).toBe(sym);
        expect(details!.ltp).toBeGreaterThan(0);
        expect(typeof details!.change).toBe('number');
        expect(typeof details!.pChange).toBe('number');
        expect(details!.volume).toBeGreaterThanOrEqual(0);
        expect(details!.high).toBeGreaterThanOrEqual(details!.low);
        expect(details!.observedAtNPT).toBeTruthy();
        expect(details!.retrievedAtNPT).toBeTruthy();
        expect(details!.isAdjustedPrice).toBe(true);
      }
    });
  });

  describe('7. Signal & Predictive Outlook Suppression on Stale Data', () => {
    const mockCandles: Candle[] = Array.from({ length: 60 }, (_, i) => ({
      date: `2024-0${Math.floor(i / 30) + 1}-${(i % 28) + 1}`,
      open: 500 + i * 2,
      high: 505 + i * 2,
      low: 495 + i * 2,
      close: 502 + i * 2,
      volume: 15000 + i * 100
    }));

    it('suppresses technical trading signals when data is marked STALE', () => {
      // Normal fresh execution returns actionable or hold signal
      const freshResult = analyzeTechnicalSetup('NABIL', mockCandles, { isStale: false });
      expect(freshResult.signal).not.toBe('INSUFFICIENT_DATA');

      // Stale feed execution must return INSUFFICIENT_DATA with notice
      const staleResult = analyzeTechnicalSetup('NABIL', mockCandles, { isStale: true });
      expect(staleResult.signal).toBe('INSUFFICIENT_DATA');
      expect(staleResult.reasonsEn[0].toLowerCase()).toContain('stale');
      expect(staleResult.reasonsNe[0]).toContain('पुरानो');
      expect(staleResult.entryRange).toBeNull();
      expect(staleResult.stopLoss).toBeNull();
    });

    it('suspends forward predictive projections when data is marked STALE', () => {
      // Normal fresh execution returns projection horizons
      const freshOutlook = generatePredictiveOutlook('NABIL', mockCandles, { isStale: false });
      expect(freshOutlook.isAvailable).toBe(true);
      expect(freshOutlook.nextSession).not.toBeNull();

      // Stale feed execution suspends projections to prevent misleading users
      const staleOutlook = generatePredictiveOutlook('NABIL', mockCandles, { isStale: true });
      expect(staleOutlook.isAvailable).toBe(false);
      expect(staleOutlook.nextSession).toBeNull();
      expect(staleOutlook.next5Sessions).toBeNull();
      expect(staleOutlook.descriptiveTrendEn).toContain('Projections disabled');
      expect(staleOutlook.descriptiveTrendNe).toContain('प्रक्षेपण निष्कृय');
    });
  });
});
