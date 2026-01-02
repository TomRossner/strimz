import { API_URL } from "@/utils/constants";
import axios from "axios";

export const getAllDownloads = async () => {
    return await axios.get(`${API_URL}/downloads/get-downloads`);
}

export const getDownloadedFiles = async (dir: string) => {
    return await axios.get(`${API_URL}/downloads/get-downloaded-files?dir=${encodeURIComponent(dir)}`);
}