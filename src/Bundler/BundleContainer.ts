import * as ts from "typescript";
import { ModuleDescriptor } from "./ModuleDescriptor"
import { Utils } from "../../../TsToolsCommon/src/Utils/Utilities"

class IdGenerator {
    static nextId = 1;

    static getNextId(): number {
        return this.nextId++;
    }
}

/**
 * A bundle container for module descriptors. A bundle may be the global, 
 * top-level source file module or an "internal" bundle module defined through
 * the @bundlemodule( moduleName: string ) annotation in an ambient source file.
 */
export class BundleContainer {
    private entrysourceFile: ts.SourceFile;

    private parent: BundleContainer = undefined;
    private children: BundleContainer[] = [];

    private modules: ModuleDescriptor[] = [];
    private moduleByFileName: ts.MapLike<ModuleDescriptor> = {};

    private id: number;
    private name: string;

    private isInternalBundle: boolean;

    constructor( name: string, sourceFile: ts.SourceFile, isBundleModule: boolean, parent?: BundleContainer ) {
        this.name = name;
        this.entrysourceFile = sourceFile;
        this.isInternalBundle = isBundleModule;
        this.parent = parent;

        this.id = IdGenerator.getNextId();
    }

    public addModule( module: ModuleDescriptor ) {
        const fileName = module.getFileName();

        if ( !Utils.hasProperty( this.moduleByFileName, fileName ) )
        {
            this.modules.push( module );
            this.moduleByFileName[fileName] = module;
        }
    }

    public isInternal(): boolean {
        return this.isInternalBundle;
    }

    public getModule( moduleFileName: string ): ModuleDescriptor
    {
        return this.moduleByFileName[moduleFileName];
    }

    public getModules(): ModuleDescriptor[] {
        return this.modules;
    }

    public addChild( container: BundleContainer ): void {
        this.children.push( container );
    }

    public getChildren(): BundleContainer[] {
        return this.children;
    }

    public getParent(): BundleContainer {
        return this.parent;
    }

    public getName(): string {
        return this.name;
    }

    public getFileName(): string {
        return this.entrysourceFile.fileName;
    }

    public getId(): number {
        return this.id;
    }
}