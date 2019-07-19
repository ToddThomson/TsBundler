import * as ts from "typescript";
import { Module } from "./Module"
import { Utils } from "../../../TsToolsCommon/src/Utils/Utilities"
import { Logger } from "../../../TsToolsCommon/src/Reporting/Logger"

class IdGenerator {
    static nextId = 1;

    static getNextId(): number {
        return this.nextId++;
    }
}

/**
 * A container for {Module} descriptors. A container is created through the entry source file
 * module or an "internal" bundle module defined through the @bundlemodule( moduleName: string ) annotation in an ambient source file.
 */
export class ModuleContainer {
    private entryPoint: Module;

    private parent: ModuleContainer = undefined;
    private children: ModuleContainer[] = [];

    private modules: Module[] = [];
    private moduleByFileName: ts.MapLike<Module> = {};

    private id: number;
    private name: string;

    private isBundleModule: boolean;

    constructor( name: string, entryPoint: Module, isBundleModule: boolean, parent?: ModuleContainer ) {
        this.name = name;
        this.entryPoint = entryPoint;
        this.isBundleModule = isBundleModule;
        this.parent = parent;

        this.id = IdGenerator.getNextId();
    }

    public addModule( module: Module ) {
        const fileName = module.getSourceFile().fileName;

        Logger.trace( "Adding module: ", fileName );

        if ( !Utils.hasProperty( this.moduleByFileName, fileName ) )
        {
            Logger.trace( "New Module added." );

            this.modules.push( module );
            this.moduleByFileName[fileName] = module;
        }
    }

    public isInternalBundleModule(): boolean {
        return this.isBundleModule;
    }

    public getModule( moduleFileName: string ): Module
    {
        return this.moduleByFileName[moduleFileName];
    }

    public getModules(): Module[] {
        return this.modules;
    }

    public addChild( container: ModuleContainer ): void {
        this.children.push( container );
    }

    public getChildren(): ModuleContainer[] {
        return this.children;
    }

    public getParent(): ModuleContainer | undefined {
        return this.parent;
    }

    public getEntryPoint(): Module
    {
        return this.entryPoint;
    }

    public getUniqueName()
    {
        return "__modules_" + this.id + "__" + this.name;  
    }

    //public getName(): string {
    //    return this.name;
    //}

    //public getSourceFile(): ts.SourceFile
    //{
    //    return this.sourceFile;
    //}

    //public getFileName(): string {
    //    return this.sourceFile.fileName;
    //}

    //public getId(): number {
    //    return this.id;
    //}
}