
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
  appSettings: AppSettings, // This parameter was missing in the call
  potentialCloudModels: UtilModelMetadata[] // This parameter was missing in the call
): string {
  const providers = new Set<string>();

  const hasGoogleKey = !!appSettings.googleApiKey;
  // Ensure OpenRouter and HuggingFace checks use the 'unavailable' flag from POTENTIAL_CLOUD_MODELS
  const openRouterMeta = potentialCloudModels.find(pm => pm.provider === 'OpenRouter');
  const huggingFaceMeta = potentialCloudModels.find(pm => pm.provider === 'Hugging Face');

  const hasOpenRouterKey = !!appSettings.openRouterApiKey;
  const hasHuggingFaceKey = !!appSettings.huggingFaceApiKey;


  // Check Google AI
  if (hasGoogleKey && allModels.some(m => m.provider === 'Google AI' && !m.unavailable)) {
    providers.add('Google AI');
  }

  // Check OpenRouter
  if (hasOpenRouterKey && !openRouterMeta?.unavailable && allModels.some(m => m.provider === 'OpenRouter' && !m.unavailable)) {
    providers.add('OpenRouter');
  }

  // Check Hugging Face
  if (hasHuggingFaceKey && !huggingFaceMeta?.unavailable && allModels.some(m => m.provider === 'Hugging Face' && !m.unavailable)) {
    providers.add('Hugging Face');
  }
  
  // Check Ollama
  const ollamaConfigured = appSettings.ollamaBaseUrl && !ollamaError?.includes("Ollama Base URL is not configured");
  const ollamaCriticallyFailed = ollamaError && (ollamaError.toLowerCase().includes("failed to connect") || ollamaError.toLowerCase().includes("connection refused") || ollamaError.includes("Ollama Base URL is not configured"));
  
  if (ollamaConfigured && !ollamaCriticallyFailed && allModels.some(m => m.provider === 'Ollama' && !m.unavailable)) {
      providers.add('Ollama');
  }


  if (providers.size === 0) {
    if (ollamaError) {
        if (ollamaError.includes("Ollama Base URL is not configured")) return "Ollama Not Configured";
        if (ollamaError.toLowerCase().includes("failed to connect") || ollamaError.toLowerCase().includes("connection refused")) return "Ollama Connection Error";
        if (ollamaError.toLowerCase().includes("failed to fetch ollama models")) return "Ollama Model Load Error";
        return "Ollama Error";
    }
    if (!hasGoogleKey && !hasOpenRouterKey && !hasHuggingFaceKey && !ollamaConfigured) {
        return "None Configured";
    }
    // If keys are present but associated plugins are marked unavailable
    let unavailableMessages = [];
    if (hasOpenRouterKey && openRouterMeta?.unavailable) unavailableMessages.push("OpenRouter (Plugin Unavailable)");
    if (hasHuggingFaceKey && huggingFaceMeta?.unavailable) unavailableMessages.push("HF (Plugin Unavailable)");
    if (unavailableMessages.length > 0) return unavailableMessages.join(', ') + ( (hasGoogleKey || ollamaConfigured) ? " + No other models" : "");

    return "No Models Available"; 
  }

  let result = Array.from(providers).sort().join(', ');
  
  // Append warnings for configured but unavailable plugins if they weren't added to active providers
  if (hasOpenRouterKey && openRouterMeta?.unavailable && !providers.has('OpenRouter')) {
      result += (result ? ", " : "") + "OpenRouter (Plugin Unavailable)";
  }
  if (hasHuggingFaceKey && huggingFaceMeta?.unavailable && !providers.has('Hugging Face')) {
      result += (result ? ", " : "") + "HF (Plugin Unavailable)";
  }
  
  if (ollamaConfigured && !ollamaCriticallyFailed && !providers.has('Ollama') && ollamaError && ollamaError.toLowerCase().includes("failed to fetch ollama models")) {
     result += (result ? ", " : "") + "Ollama (Model Load Error)";
  }

  return result || "Status Unknown";
}
