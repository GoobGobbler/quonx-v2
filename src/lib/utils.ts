import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AppSettings } from "@/components/settings-panel";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Local interfaces for model structures, matching what page.tsx will pass.
export interface UtilCombinedModel {
  id: string;
  provider: string;
  name: string;
}

export interface UtilModelMetadata {
  id: string;
  provider: string;
  name: string;
  unavailable?: boolean;
}

export function getProviderNames(
  allModels: UtilCombinedModel[],
  ollamaError: string | null,
  appSettings: AppSettings,
  potentialCloudModels: UtilModelMetadata[]
): string {
  const providers = new Set<string>();

  const hasGoogleKey = !!appSettings.googleApiKey;
  const hasOpenRouterKey = !!appSettings.openRouterApiKey;
  const hasHuggingFaceKey = !!appSettings.huggingFaceApiKey;

  // Check Google AI
  if (hasGoogleKey && allModels.some(m => m.provider === 'Google AI')) {
    providers.add('Google AI');
  }

  // Check OpenRouter
  const openRouterMeta = potentialCloudModels.find(pm => pm.provider === 'OpenRouter' && pm.id.startsWith('openrouter/'));
  if (hasOpenRouterKey && !openRouterMeta?.unavailable && allModels.some(m => m.provider === 'OpenRouter')) {
    providers.add('OpenRouter');
  }

  // Check Hugging Face
  const huggingFaceMeta = potentialCloudModels.find(pm => pm.provider === 'Hugging Face' && pm.id.startsWith('huggingface/'));
  if (hasHuggingFaceKey && !huggingFaceMeta?.unavailable && allModels.some(m => m.provider === 'Hugging Face')) {
    providers.add('Hugging Face');
  }
  
  // Check Ollama
  const ollamaConfigured = appSettings.ollamaBaseUrl && !ollamaError?.includes("Ollama Base URL is not configured");
  const ollamaCriticallyFailed = ollamaError && (ollamaError.toLowerCase().includes("failed to connect") || ollamaError.toLowerCase().includes("connection refused") || ollamaError.includes("Ollama Base URL is not configured"));
  
  if (ollamaConfigured && !ollamaCriticallyFailed && allModels.some(m => m.provider === 'Ollama')) {
      providers.add('Ollama');
  }


  if (providers.size === 0) {
    // No providers are active based on models and keys. Determine specific status.
    if (ollamaError) {
        if (ollamaError.includes("Ollama Base URL is not configured")) return "Ollama Not Configured";
        if (ollamaError.toLowerCase().includes("failed to connect") || ollamaError.toLowerCase().includes("connection refused")) return "Ollama Connection Error";
        // This implies Ollama is configured, connection OK, but no models fetched (empty allModels or fetch error)
        if (ollamaError.toLowerCase().includes("failed to fetch ollama models")) return "Ollama Model Load Error";
         // Fallback for other Ollama errors if no other providers are active
        return "Ollama Error";
    }
    // No Ollama error, check if any cloud keys are set
    if (!hasGoogleKey && !hasOpenRouterKey && !hasHuggingFaceKey && !ollamaConfigured) {
        return "None Configured"; // Absolutely nothing is set up
    }
    // Keys might be set, or Ollama configured, but no models listed from them (e.g. Ollama server empty)
    return "No Models Available"; 
  }

  let result = Array.from(providers).sort().join(', ');

  // Append warnings for configured but unavailable plugins if not already listed as active
  if (hasOpenRouterKey && openRouterMeta?.unavailable && !providers.has('OpenRouter')) {
      result += (result ? ", " : "") + "OpenRouter (Plugin Unavailable)";
  }
  if (hasHuggingFaceKey && huggingFaceMeta?.unavailable && !providers.has('Hugging Face')) {
      result += (result ? ", " : "") + "HF (Plugin Unavailable)";
  }
  
  // Handle case where Ollama is configured but had non-critical fetch errors, yet other providers ARE active.
  // If Ollama is not in `providers` set (due to empty `allModels` for Ollama) but was configured and didn't have critical connection error:
  if (ollamaConfigured && !ollamaCriticallyFailed && !providers.has('Ollama') && ollamaError && ollamaError.toLowerCase().includes("failed to fetch ollama models")) {
     result += (result ? ", " : "") + "Ollama (Model Load Error)";
  }


  return result || "Status Unknown"; // Should ideally not hit "Status Unknown"
}
