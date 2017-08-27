import { Command, Event, EventEmitter, SourceControlResourceGroup, SourceControlResourceDecorations, SourceControlResourceState, Uri } from "vscode";
import { Svn, FileStatus } from './svn'
import * as path from 'path';

const iconsRootPath = path.join(path.dirname(__dirname), '..', 'resources', 'icons');

function getIconUri(iconName: string, theme: string): Uri {
    return Uri.file(path.join(iconsRootPath, theme, `${iconName}.svg`));
}

export class Model {
    workingCopyResources: SourceControlResourceState[];

    private _onDidChange = new EventEmitter<void>();
    readonly onDidChange: Event<void> = this._onDidChange.event;

    constructor(private svn: Svn) {
        this.updateWorkingCopyResourceState()        
        setInterval(() => {this.updateWorkingCopyResourceState();}, 15000);
    }

    private updateWorkingCopyResourceState() {
        this.svn.getStatus().then((result: FileStatus[]) => {
            this.workingCopyResources = this.parseStatus(result);
            this._onDidChange.fire()        
        });
    }

    private parseStatus(svnStatus: FileStatus[]): Resource[] {
        const workingCopy = [];
        svnStatus.forEach(entry => {
            switch (entry.status) {
                case "M":
                    return workingCopy.push(new Resource(entry.uri, Status.MODIFIED));
                case "A":
                    return workingCopy.push(new Resource(entry.uri, Status.ADDED));
                default:
                    return; //Skipping files with other statuses for now.
            }
        });
        return workingCopy;
    }
}

export enum Status {
    MODIFIED,
    ADDED,
    DELETED,
    UNTRACKED,
    IGNORED,
    MISSING,
}

export class Resource implements SourceControlResourceState {

    resourceUri: Uri;
    status: Status;

    get command(): Command {
        return {
            command: "svn.diffDocument",
            title: "open",
            arguments: [this.resourceUri]
        };
    }

    get decorations(): SourceControlResourceDecorations {
        const light = { iconPath: this.getIconPath('light') };
        const dark = { iconPath: this.getIconPath('dark') };

        return { light, dark };
    }

    constructor(
        resourceUri: Uri,
        status: Status,
    ) {
        this.resourceUri = resourceUri;
        this.status = status;
    }

    private static Icons = {
        light: {
            Status: getIconUri('status-modified', 'light'),
            Added: getIconUri('status-added', 'light'),
            Deleted: getIconUri('status-deleted', 'light'),
            Renamed: getIconUri('status-renamed', 'light'),
            Copied: getIconUri('status-copied', 'light'),
            Untracked: getIconUri('status-untracked', 'light'),
            Ignored: getIconUri('status-ignored', 'light'),
            Conflict: getIconUri('status-conflict', 'light'),
        },
        dark: {
            Modified: getIconUri('status-modified', 'dark'),
            Added: getIconUri('status-added', 'dark'),
            Deleted: getIconUri('status-deleted', 'dark'),
            Renamed: getIconUri('status-renamed', 'dark'),
            Copied: getIconUri('status-copied', 'dark'),
            Untracked: getIconUri('status-untracked', 'dark'),
            Ignored: getIconUri('status-ignored', 'dark'),
            Conflict: getIconUri('status-conflict', 'dark')
        }
    };

    private getIconPath(theme: string): Uri | undefined {
        switch (this.status) {
            case Status.MODIFIED: return Resource.Icons[theme].Modified;
            case Status.ADDED: return Resource.Icons[theme].Added;
            default: return void 0;
        }
    }
}
