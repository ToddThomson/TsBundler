import * as ts from "typescript";
import { ModuleDescriptor } from "./ModuleDescriptor"
import { Utils } from "../Utils/Utilities"
import { Logger } from "../Reporting/Logger"

class IdGenerator {
    static nextId = 1;

    static getNextId(): number {
        return this.nextId++;
    }
}

/**
 * A container for module dependencies.
 */
export class ModuleContainer {
    private sourceFile: ts.SourceFile;

    private parent: ModuleContainer = undefined;
    private children: ModuleContainer[] = [];

    private modules: ModuleDescriptor[] = [];
    private modulesAdded: ts.MapLike<boolean> = {};

    private id: number;
    private name: string;
    private isBundleNamespace: boolean;

    constructor( name: string, sourceFile: ts.SourceFile, isBundleNamespace: boolean, parent?: ModuleContainer ) {
        this.name = name;
        this.sourceFile = sourceFile;
        this.isBundleNamespace = isBundleNamespace;
        this.parent = parent;

        this.id = IdGenerator.getNextId();
    }

    public addModule( module: ModuleDescriptor, fileName: string ) {
        if ( !Utils.hasProperty( this.modulesAdded, fileName ) ) {
            this.modules.push( module );
            this.modulesAdded[ fileName ] = true;
        }
    }

    public isGeneratedNamespace(): boolean {
        return this.isBundleNamespace;
    }

    public getModules(): ModuleDescriptor[] {
        return this.modules;
    }

    public addChild( container: ModuleContainer ): void {
        this.children.push( container );
    }

    public getChildren(): ModuleContainer[] {
        return this.children;
    }

    public getParent(): ModuleContainer {
        return this.parent;
    }

    public getName(): string {
        return this.name;
    }

    public getFileName(): string {
        return this.sourceFile.fileName;
    }

    public getId(): number {
        return this.id;
    }
}