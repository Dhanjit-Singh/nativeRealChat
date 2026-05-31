import React, { createContext, useContext, useState, ReactNode } from "react";

type LoadingContextType = {
    isLoading: boolean;
    showLoader: (message?: string) => void;
    hideLoader: () => void;
    loaderMessage: string;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);
    const [loaderMessage, setLoaderMessage] = useState("");

    const showLoader = (message?: string) => {
        setLoaderMessage(message || "");
        setIsLoading(true);
    };

    const hideLoader = () => {
        setIsLoading(false);
        setLoaderMessage("");
    };

    return (
        <LoadingContext.Provider value={{ isLoading, showLoader, hideLoader, loaderMessage }}>
            {children}
        </LoadingContext.Provider>
    );
}

export function useLoading() {
    const context = useContext(LoadingContext);
    if (context === undefined) {
        throw new Error("useLoading must be used within a LoadingProvider");
    }
    return context;
}