import { getAllDownloads, getDownloadedFiles } from '@/services/downloads';
import { DownloadProgressData } from '@/utils/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type DownloadedFile = {
    name: string;
    path: string;
    size: number;
    modified: string;
    extension: string;
}

interface DownloadsState {
  downloadsError: string | null;
  isLoadingDownloads: boolean;
  downloads: Download[];
  completed: string[];
  downloadedFiles: DownloadedFile[];
  isLoadingDownloadedFiles: boolean;
  downloadedFilesError: string | null;
}

export type Download = DownloadProgressData & {
    name: string;
    title: string;
}

const initialState: DownloadsState = {
  downloads: [],
  completed: [],
  downloadsError: null,
  isLoadingDownloads: false,
  downloadedFiles: [],
  isLoadingDownloadedFiles: false,
  downloadedFilesError: null,
}

export const fetchAllDownloadsAsync = createAsyncThunk(
    'downloads/fetchAllDownloads',
    async (_, {rejectWithValue}) => {
        try {
            const {data: {downloads}} = await getAllDownloads();
            return downloads;
        } catch (error) {
            return rejectWithValue(error);
        }
    }
)

export const fetchDownloadedFilesAsync = createAsyncThunk(
    'downloads/fetchDownloadedFiles',
    async (dir: string, {rejectWithValue}) => {
        try {
            const {data: {files}} = await getDownloadedFiles(dir);
            console.log(files);
            return files;
        } catch (error) {
            return rejectWithValue(error);
        }
    }
)

const downloadsSlice = createSlice({
  name: 'downloads',
  initialState,
  reducers: {
    setDownloads: (state, action: PayloadAction<Download[]>) => {
        state.downloads = action.payload;
    },
    setCompleted: (state, action: PayloadAction<string[]>) => {
        state.completed = action.payload;
    },
    removeDownload: (state, action: PayloadAction<string>) => {
        const hash = action.payload.toLowerCase();
        state.downloads = state.downloads.filter(d => d.hash.toLowerCase() !== hash);
        state.completed = state.completed.filter(c => c !== hash);
    },
    removeDownloadedFile: (state, action: PayloadAction<string>) => {
        const filePath = action.payload;
        state.downloadedFiles = state.downloadedFiles.filter(f => f.path !== filePath && !f.path.includes(filePath));
    },
  },
  extraReducers(builder) {
      builder
        .addCase(fetchAllDownloadsAsync.fulfilled, (state, action) => {
            state.downloads = action.payload;
            state.downloadsError = null;
            state.isLoadingDownloads = false;
        })
        .addCase(fetchAllDownloadsAsync.rejected, (state, action) => {
            state.downloadsError = action.payload as string;
            state.isLoadingDownloads = false;
        })
        .addCase(fetchAllDownloadsAsync.pending, (state) => {
            state.isLoadingDownloads = true;
            state.downloadsError = null;
        })
        .addCase(fetchDownloadedFilesAsync.fulfilled, (state, action) => {
            state.downloadedFiles = action.payload;
            state.downloadedFilesError = null;
            state.isLoadingDownloadedFiles = false;
        })
        .addCase(fetchDownloadedFilesAsync.rejected, (state, action) => {
            state.downloadedFilesError = action.payload as string;
            state.isLoadingDownloadedFiles = false;
        })
        .addCase(fetchDownloadedFilesAsync.pending, (state) => {
            state.isLoadingDownloadedFiles = true;
            state.downloadedFilesError = null;
        })
  },
});

export const { setDownloads, setCompleted, removeDownload, removeDownloadedFile } = downloadsSlice.actions;
export default downloadsSlice.reducer;