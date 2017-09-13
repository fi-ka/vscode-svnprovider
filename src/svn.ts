import { OutputChannel, Uri, workspace } from 'vscode'
import * as cp from 'child_process';

export interface FileStatus {
    status: string;
    uri: Uri;
}

export interface NodeLogEntry {
    author: string;
    message: string;
    revision: string;
    path: string;
}

export class Svn {

    private outputChannel: OutputChannel;

    constructor(outputChannel) {
        this.outputChannel = outputChannel;
    }

    async getVersion(): Promise<string> {
        return await this.exec(["--version", "-q"]);
    }

    async getOriginalFileContent(path, rev='BASE'): Promise<string> {
        return await this.exec(["cat", "-r", rev, path]);
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

    async getLog(path): Promise<NodeLogEntry[]> {
        return await this.exec(["log", path, "--xml"]).then((output: string) => {
            const entries: NodeLogEntry[] = [];
            const parseString = require('xml2js').parseString;
            parseString(output, (err, result) => {
                result.log.logentry.forEach(entry => {
                    entries.push({
                        author: entry.author[0],
                        revision: entry.$.revision,
                        message: entry.msg[0],
                        path: path
                    })
                });
            });
            return entries;
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
