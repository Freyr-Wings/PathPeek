import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

function extractPathAtCursor(document: vscode.TextDocument, position: vscode.Position): { filePath: string, lineNum?: number } | null {
    const line = document.lineAt(position.line).text;

    // Match paths with optional :line (e.g., ./src/file.ts:12)
    const regex = /([~./\w\\-]+(?:\.\w+))(?:[:](\d+))?/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;
        if (position.character >= start && position.character <= end) {
            const rawPath = match[1];
            const lineNum = match[2] ? parseInt(match[2]) : undefined;
            return { filePath: rawPath, lineNum };
        }
    }
    return null;
}

export function activate(context: vscode.ExtensionContext) {
    // Peek command
    let peekCommand = vscode.commands.registerCommand('peekFileAtCursor', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }

        const document = editor.document;
        const position = editor.selection.active;

        const pathInfo = extractPathAtCursor(document, position);
        if (!pathInfo) {
            vscode.window.showErrorMessage("No valid path at cursor.");
            return;
        }

        let { filePath, lineNum } = pathInfo;

        // Resolve relative paths
        if (!path.isAbsolute(filePath)) {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage("No workspace folder open.");
                return;
            }
            filePath = path.join(workspaceFolders[0].uri.fsPath, filePath);
        }

        if (!fs.existsSync(filePath)) {
            vscode.window.showErrorMessage(`File not found: ${filePath}`);
            return;
        }

        const fileUri = vscode.Uri.file(filePath);
		const location = new vscode.Location(fileUri, new vscode.Position(lineNum ? lineNum - 1 : 0, 0));

        // Open peek
        vscode.commands.executeCommand('editor.action.peekLocations', document.uri, position, [location], "peek");
    });

    // Close peek command
    let closeCommand = vscode.commands.registerCommand('closePeek', async () => {
        vscode.commands.executeCommand('cancelSelection');
        vscode.commands.executeCommand('closeReferenceSearch');
		vscode.commands.executeCommand('workbench.action.closeQuickOpen');
    });

    context.subscriptions.push(peekCommand);
    context.subscriptions.push(closeCommand);
}

export function deactivate() {}
