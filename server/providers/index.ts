import { IDataProvider } from './types.js';
import { NepseDemoProvider } from './nepseDemoProvider.js';
import { SourceCodeMdpProvider } from './sourceCodeMdpProvider.js';
import { MockMdpVerificationProvider } from './mockMdpVerificationProvider.js';

let activeProvider: IDataProvider | null = null;

export function getDataProvider(): IDataProvider {
  if (!activeProvider) {
    const mode = (process.env.NEPSE_DATA_MODE || 'demo').toLowerCase();
    
    if (mode === 'sourcecode' || mode === 'live') {
      const sourceCodeProvider = new SourceCodeMdpProvider();
      if (!sourceCodeProvider.hasValidCredentials()) {
        console.warn('⚠️ [Nepshare Warning] NEPSE_DATA_MODE is set to "sourcecode", but SOURCECODE_API_KEY, SOURCECODE_API_SECRET, or SOURCECODE_ACCESS_ID are missing in .env.');
        console.warn('⚠️ Please obtain an authorized API subscription from Source Code Pvt. Ltd. (NEPSE Licensed Vendor) to stream verified market feeds.');
        console.warn('⚠️ Defaulting to explicitly labeled Demo Mode until valid credentials are provided.');
        activeProvider = new NepseDemoProvider();
      } else {
        console.log('✅ [Nepshare] Connected to Source Code MDP (NEPSE Licensed Market Data Provider).');
        activeProvider = sourceCodeProvider;
      }
    } else if (mode === 'mock_mdp') {
      activeProvider = new MockMdpVerificationProvider();
    } else {
      activeProvider = new NepseDemoProvider();
    }
  }
  return activeProvider;
}

export function setCustomDataProvider(provider: IDataProvider | null): void {
  activeProvider = provider;
}

export function resetDataProvider(): void {
  activeProvider = null;
}

export * from './types.js';
export { SourceCodeMdpProvider } from './sourceCodeMdpProvider.js';
export { NepseDemoProvider } from './nepseDemoProvider.js';
export { MockMdpVerificationProvider } from './mockMdpVerificationProvider.js';
