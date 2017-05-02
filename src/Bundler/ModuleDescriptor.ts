import { ModuleContainer } from "./ModuleContainer"
import { Utils } from "../Utils/Utilities";
import * as ts from "typescript";

export class ModuleDescriptor {
    private sourceFile: ts.SourceFile;
    private node: ts.Node;
    private symbol: ts.Symbol;
    private isBundleContainer: boolean;

    private containers: ts.MapLike<ModuleContainer> = {};
    
    private dependencies: ts.Node[] = [];

    constructor( node: ts.Node, dependencies: ts.Node[], sourceFile: ts.SourceFile, symbol: ts.Symbol, isContainer: boolean, container: ModuleContainer ) {
        this.node = node;
        this.dependencies = dependencies;
        this.sourceFile = sourceFile;
        this.symbol = symbol;
        this.isBundleContainer = isContainer;

        this.containers[ container.getId().toString() ] = container;
    }

    public getNode(): ts.Node {
        return this.node;
    }

    public getDependencies(): ts.Node[] {
        return this.dependencies;
    }

    public getContainers(): ts.MapLike<ModuleContainer> {
        return this.containers;
    }

    public getFileName(): string {
        return this.sourceFile.fileName;
    }

    public getSourceFile(): ts.SourceFile {
        return this.sourceFile;
    }

    public isContainer(): boolean {
        return this.isBundleContainer;
    }

    public isExternalModule(): boolean {
        return ( (<any>this.sourceFile).externalModuleIndicator != undefined );
    }
}