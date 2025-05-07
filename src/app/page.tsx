--- a/src/app/page.tsx
+++ b/src/app/page.tsx
@@ -1237,7 +1237,7 @@
 
                  {/* Footer */}
                  <footer className="pt-1 mt-auto border-t-2 border-border text-center text-xs text-muted-foreground font-mono flex-shrink-0">
-                 [ CodeSynth IDE v0.7 | Active Providers: {getProviderNames(allModels)} | Status: {validationStatus} | &copy; {new Date().getFullYear()} ]
+                 [ CodeSynth IDE v0.7 | Active Providers: {getProviderNames(allModels, modelError)} | Status: {validationStatus} | &copy; {new Date().getFullYear()} ]
                </footer>
              </SidebarInset>
         </div>
@@ -1255,7 +1255,7 @@
 }
 
 // Helper function to get unique provider names from the model list (only counts AVAILABLE providers)
-function getProviderNames(models: CombinedModel[]): string {
+function getProviderNames(models: CombinedModel[], modelError: string | null): string {
     if (!models || models.length === 0) return "None Loaded";
 
     // Filter models based on actual availability (plugin AND key if applicable)
@@ -1265,7 +1265,7 @@
       ((m.provider === 'Google AI' && !!appSettings.googleApiKey) ||
        (m.provider === 'OpenRouter' && !!appSettings.openRouterApiKey && !POTENTIAL_CLOUD_MODELS.find(pm => pm.id === m.id)?.unavailable) ||
        (m.provider === 'Hugging Face' && !!appSettings.huggingFaceApiKey && !POTENTIAL_CLOUD_MODELS.find(pm => pm.id === m.id)?.unavailable) ||
-       (m.provider === 'Ollama' && (modelError === null || !modelError.includes('Failed to connect'))) // More robust check for Ollama
+       (m.provider === 'Ollama' && (modelError === null || !modelError.includes('Failed to connect')))
       )
     );
 
