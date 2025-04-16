import WebTorrent from "webtorrent";

declare module 'webtorrent' {
    const WebTorrent: WebTorrent;
    export = WebTorrent;
}