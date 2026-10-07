import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let tray = null;

export function createTray(getWindow) {
    if (tray) return tray;

    const iconPath = path.join(__dirname, '..', 'assets', 'strimzicon.ico');
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    tray.setToolTip('Strimz');

    const showWindow = () => {
        const win = getWindow();
        if (!win) return;
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
    };

    const menu = Menu.buildFromTemplate([
        { label: 'Show Strimz', click: showWindow },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() },
    ]);

    tray.setContextMenu(menu);
    tray.on('click', showWindow);
    return tray;
}

export function attachCloseToTray(win, shouldCloseToTray, isQuitting) {
    win.on('close', (event) => {
        if (isQuitting() || !shouldCloseToTray()) return;
        event.preventDefault();
        win.hide();
    });
}
