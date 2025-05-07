
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AppSettings } from "@/components/settings-panel"; // Ensure AppSettings is imported

// Local interfaces for model structures, matching what page.tsx will pass.
export interface UtilCombinedModel {
  id: string;
  provider: string;
  name: string;
  unavailable?: boolean; // Added unavailable to UtilCombinedModel for consistency
}

export interface UtilModelMetadata {
  id: string;
  provider: string;
  name: string;
  unavailable?: boolean;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function getProviderNames(
  allModels: UtilCombinedModel[],
  ollamaError: string | null,
  appSettings: AppSettings,
  potentialCloudModels: UtilModelMetadata[]
): string {
  const providers = new Set<string>();
  const warnings = new Set<string>();

  const hasGoogleKey = !!appSettings.googleApiKey;
  const hasOpenRouterKey = !!appSettings.openRouterApiKey;
  const hasHuggingFaceKey = !!appSettings.huggingFaceApiKey;
  const ollamaConfigured = !!appSettings.ollamaBaseUrl;

  const openRouterMeta = potentialCloudModels.find(pm => pm.provider === 'OpenRouter');
  const huggingFaceMeta = potentialCloudModels.find(pm => pm.provider === 'Hugging Face');

  const isOpenRouterPluginAvailable = !openRouterMeta?.unavailable;
  const isHuggingFacePluginAvailable = !huggingFaceMeta?.unavailable;

  // Check Google AI
  if (hasGoogleKey && allModels.some(m => m.provider === 'Google AI' && !m.unavailable)) {
    providers.add('Google');
  } else if (hasGoogleKey) {
    warnings.add("Google(No models)");
  }

  // Check OpenRouter
  if (hasOpenRouterKey && isOpenRouterPluginAvailable && allModels.some(m => m.provider === 'OpenRouter' && !m.unavailable)) {
    providers.add('OpenRouter');
  } else if (hasOpenRouterKey && !isOpenRouterPluginAvailable) {
    warnings.add("OR(Plugin X)");
  } else if (hasOpenRouterKey && isOpenRouterPluginAvailable) {
    warnings.add("OR(No models)");
  }

  // Check Hugging Face
  if (hasHuggingFaceKey && isHuggingFacePluginAvailable && allModels.some(m => m.provider === 'Hugging Face' && !m.unavailable)) {
    providers.add('HF');
  } else if (hasHuggingFaceKey && !isHuggingFacePluginAvailable) {
    warnings.add("HF(Plugin X)");
  } else if (hasHuggingFaceKey && isHuggingFacePluginAvailable) {
    warnings.add("HF(No models)");
  }

  // Check Ollama
  const ollamaCriticallyFailed = ollamaError && (ollamaError.toLowerCase().includes("failed to connect") || ollamaError.toLowerCase().includes("connection refused") || ollamaError.includes("ollama base url is not configured"));
  if (ollamaConfigured && !ollamaCriticallyFailed && allModels.some(m => m.provider === 'Ollama' && !m.unavailable)) {
      providers.add('Ollama');
  } else if (ollamaConfigured && ollamaCriticallyFailed) {
      warnings.add("Ollama(Offline)");
  } else if (ollamaConfigured && ollamaError && !ollamaCriticallyFailed) {
      warnings.add("Ollama(Err)"); // Error loading models, but connected
  } else if (ollamaConfigured && !ollamaError && !allModels.some(m => m.provider === 'Ollama')) {
       warnings.add("Ollama(No models)");
  } else if (!ollamaConfigured){
        // No warning if Ollama just isn't configured
  }


  if (providers.size === 0 && warnings.size === 0) {
      if (!hasGoogleKey && !hasOpenRouterKey && !hasHuggingFaceKey && !ollamaConfigured) {
          return "None Configured";
      }
      return "No Active Providers"; // Keys might be present, but no models/connection
  }

  const activeProviders = Array.from(providers).sort().join(', ');
  const warningText = Array.from(warnings).sort().join(', ');

  if (activeProviders && warningText) {
      return `${activeProviders} | Warn: ${warningText}`;
  } else if (activeProviders) {
      return activeProviders;
  } else {
      // Only warnings exist
      return `Warn: ${warningText}`;
  }
}
