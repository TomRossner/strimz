# 🎬 Strimz

**Strimz** is a lightweight, cross-platform desktop application that lets you **stream `.torrent` files or magnet links** instantly—no need to wait for downloads to finish. Built with **Electron**, **React**, and **Node.js**, Strimz is designed for fast, intuitive streaming with subtitle support and smooth playback.

> ⚠️ This project is intended for educational and personal use only. Strimz utilizes publicly available torrent metadata and does **not** host or promote copyrighted content.

---

## 🚀 Features

- 🎥 **Instant Streaming** – Watch videos directly from `.torrent` or magnet links
- 🌐 **P2P-Powered** – Uses WebTorrent for peer-to-peer content delivery
- 📂 **Manual File Selection** – Choose which file to stream from the torrent
- 📄 **Subtitles Support** – Upload `.srt` files and enjoy subtitles in sync
- 🧰 **Custom Player** – Built-in video player with controls and playback tracking
- ⚡ **Minimal UI** – Clean and simple interface focused on the media experience

---

## 🛠️ Tech Stack

- **Electron** – Desktop app framework
- **React** – Frontend UI
- **Node.js** – Backend logic (file handling, torrent streaming)
- **WebTorrent** – P2P torrent engine

---

## 📦 Installation

```bash
# Clone the repo
git clone https://github.com/TomRossner/strimz.git
cd strimz

# Install dependencies
npm install

# Install dependencies
cd strimz-backend && npm install

# Install dependencies
cd strimz-client && npm install

# Start the Electron app
npm run dev
