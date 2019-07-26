import { BundleConfig } from "./BundleConfig";

export interface Bundle {
    name: string;
    entryFileNames: string[];
    config: BundleConfig;
}