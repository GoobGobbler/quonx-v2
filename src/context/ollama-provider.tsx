// src/context/ollama-provider.tsx
"use client";

import React, { createContext, useState, useEffect, useContext, useCallback, ReactNode } from 'react';
import { listOllamaModels, type OllamaModel } from '@/ai/services/ollama';

interface OllamaContextType {
    models: OllamaModel[];
    selectedModel: string | undefined;
    setSelectedModel: (modelName: string | undefined) => void;
    isLoading: boolean;
    error: string | null;
    refreshModels: () => void;
}

const OllamaContext = createContext<OllamaContextType | undefined>(undefined);

export const OllamaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [models, setModels] = useState<OllamaModel[]>([]);
    const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchModels = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedModels = await listOllamaModels();
            setModels(fetchedModels);
            // Set a default model if none is selected and models are available
             if (!selectedModel && fetchedModels.length > 0) {
                 // Prioritize common models or the first one
                 const defaultCandidates = ['llama3', 'mistral', 'codellama'];
                 let defaultModel = fetchedModels.find(m => defaultCandidates.includes(m.name.split(':')[0])); // Check base name
                 setSelectedModel(defaultModel ? defaultModel.name : fetchedModels[0].name);
             } else if (fetchedModels.length === 0) {
                 setSelectedModel(undefined); // Clear selection if no models
                 setError("No Ollama models found. Is Ollama running and models downloaded?");
             }

        } catch (err: any) {
            console.error("Error fetching Ollama models in provider:", err);
            setError(err.message || 'Failed to fetch models from Ollama.');
            setModels([]); // Clear models on error
            setSelectedModel(undefined); // Clear selection on error
        } finally {
            setIsLoading(false);
        }
    }, [selectedModel]); // Depend on selectedModel to avoid resetting it unnecessarily

    // Fetch models on initial mount
    useEffect(() => {
        fetchModels();
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    const refreshModels = () => {
        fetchModels();
    };

    const contextValue: OllamaContextType = {
        models,
        selectedModel,
        setSelectedModel,
        isLoading,
        error,
        refreshModels,
    };

    return (
        <OllamaContext.Provider value={contextValue}>
            {children}
        </OllamaContext.Provider>
    );
};

export const useOllamaContext = (): OllamaContextType => {
    const context = useContext(OllamaContext);
    if (context === undefined) {
        throw new Error('useOllamaContext must be used within an OllamaProvider');
    }
    return context;
};
