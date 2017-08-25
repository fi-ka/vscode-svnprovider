import { Uri, workspace } from 'vscode'
import * as cp from 'child_process';

export interface FileStatus {
    status: string;
    uri: Uri;
}

export class Svn {

    private outputChannel;

    constructor(outputChannel) {
        this.outputChannel = outputChannel;
    }        

    async getVersion(): Promise<string> {
        return await this.exec(["--version", "-q"]);
    }

    async getOriginalFileContent(path): Promise<string> {
        return await this.exec(["cat", path]);
    }

    async getStatus(): Promise<FileStatus[]> {
        return await this.exec(["status", workspace.rootPath]).then((output: string) => {
            const result: FileStatus[] = []
            const lines = output.split("\n");
            lines.forEach(line => {
                const flags = line.substr(0, 7);
                const file = line.substr(8).trim();
                const entry: FileStatus = {
                    uri: Uri.file(file),
                    status: flags[0]
                }
                result.push(entry)
            });
            return result;
        });
    }

    private exec(args: string[], options: any = {}): Promise<string> {
       return new Promise<string>((c, e) => {
            const buffers: Buffer[] = [];
            const child = cp.spawn("svn", args, options);
            this.outputChannel.appendLine("svn " + args.join(" "))
            child.stdout.on('data', (b: Buffer) => buffers.push(b));
            child.on('error', e);
            child.on('exit', code => { 
                code ? e(new Error('SVN Error')) : c(Buffer.concat(buffers).toString('utf8'))});
        });
    }
}
