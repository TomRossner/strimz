import React, { useCallback, useEffect, useMemo } from 'react';
import CloseButton from '../CloseButton';
import CoverImage from './CoverImage';
import MovieInfoPanel from './MovieInfoPanel';
import DialogBackground from './DialogBackground';
import Dialog from '../Dialog';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectMovieModal, selectSummaryModal, selectTrailerModal } from '../../store/modals/modals.selectors';
import { closeModal } from '../../store/modals/modals.slice';
import { setAvailableSubtitlesLanguages, setLanguageFiles, setSubtitleLang, setSelectedSubtitleFileId, setSubtitleFilePath, setIsSubtitlesEnabled, setVttSubtitlesContent, setSubtitleDelay } from '../../store/movies/movies.slice';
import { selectMovie } from '../../store/movies/movies.selectors';
import Overlay from '../Overlay';
import TrailerPlayer from '../TrailerPlayer';
import SummaryDialog from './SummaryDialog';
import { searchSubtitlesByImdb } from '@/services/subtitles';

const MovieDialog = () => {
  const isOpen = useAppSelector(selectMovieModal);
  const dispatch = useAppDispatch();
  const [isLoadingSubtitles, setIsLoadingSubtitles] = React.useState(false);

  const handleClose = useCallback(() => {
    dispatch(closeModal('movie'));
    // Reset all subtitle states when closing the dialog
    dispatch(setSubtitleFilePath(null));
    dispatch(setSubtitleLang(null));
    dispatch(setSelectedSubtitleFileId(null));
    dispatch(setIsSubtitlesEnabled(false));
    dispatch(setAvailableSubtitlesLanguages([]));
    dispatch(setLanguageFiles({}));
    dispatch(setVttSubtitlesContent(null));
    dispatch(setSubtitleDelay(0));
    // Don't clear selectedMovie here - it should persist when navigating to player
    // Only clear it when explicitly closing (not when navigating to play)
    // The Player component will handle clearing it when appropriate
  }, [dispatch]);

  const isTrailerDialogOpen = useAppSelector(selectTrailerModal);
  const isSummaryModalOpen = useAppSelector(selectSummaryModal);

  const movie = useAppSelector(selectMovie);

  // Compute summary using the same logic as Metadata component
  const movieSummary = useMemo(() => {
    if (!movie) return "";
    
    if (!movie.summary?.length && !movie.description_full?.length) {
      return "No summary";
    }

    const regex = /\s*[-–—]+[^-–—]*\.?$|[-–—]\.$/;
    const punctuationRegex = /[?.!]$/;

    const summary = movie.summary 
      ? movie.summary.replace(regex, "").trim() 
      : movie.description_full!.replace(regex, "").trim();

    return `${summary}${punctuationRegex.test(summary) ? "" : "."}`;
  }, [movie]);

  useEffect(() => {
      if (isOpen) {
          window.addEventListener('keydown', (ev) => ev.key === 'Escape' && handleClose());
      }

      return () => {
          window.removeEventListener('keydown', (ev) => ev.key === 'Escape' && handleClose());
      }
  }, [isOpen, handleClose]);

  const prevMovieImdbRef = React.useRef<string | null>(null);

  // Always fetch subtitle languages when modal opens with a movie
  // State persists from dialog to player, and is reset when quitting player
  useEffect(() => {
    // Only fetch when modal is open
    if (!isOpen) {
      return;
    }

    // Modal is open - check if we have a movie
    if (!movie?.imdb_code) {
      // No movie - clear languages if we had a previous movie
      if (prevMovieImdbRef.current !== null) {
        prevMovieImdbRef.current = null;
        dispatch(setAvailableSubtitlesLanguages([]));
        dispatch(setLanguageFiles({}));
      }
      return;
    }

    // If movie changed (different imdb_code), clear subtitle selection
    if (prevMovieImdbRef.current && prevMovieImdbRef.current !== movie.imdb_code) {
      // Different movie - clear subtitle selection and languages
      dispatch(setSubtitleLang(null));
      dispatch(setSelectedSubtitleFileId(null));
      dispatch(setSubtitleFilePath(null));
      dispatch(setIsSubtitlesEnabled(false));
      dispatch(setVttSubtitlesContent(null));
      dispatch(setAvailableSubtitlesLanguages([]));
      dispatch(setLanguageFiles({}));
    }

    // Update ref to track current movie
    prevMovieImdbRef.current = movie.imdb_code;

    // Always fetch languages for the current movie when modal opens
    const checkAvailableLanguages = async () => {
      setIsLoadingSubtitles(true);
      try {
        const response = await searchSubtitlesByImdb(movie.imdb_code, undefined, 'movie');
        const { languages, languageFiles } = response.data;

        if (languages && languages.length > 0) {
          dispatch(setAvailableSubtitlesLanguages(languages));
          dispatch(setLanguageFiles(languageFiles || {}));
        } else {
          dispatch(setAvailableSubtitlesLanguages([]));
          dispatch(setLanguageFiles({}));
        }
      } catch (error) {
        console.error('Error fetching subtitles from OpenSubtitles API:', error);
        dispatch(setAvailableSubtitlesLanguages([]));
        dispatch(setLanguageFiles({}));
      } finally {
        setIsLoadingSubtitles(false);
      }
    };

    checkAvailableLanguages();
  }, [movie?.imdb_code, movie?.year, isOpen, dispatch]);
    
  return (
    <Dialog isOpen={isOpen} size='large'>
      <Overlay
        active={isSummaryModalOpen || isTrailerDialogOpen}
        onClick={() => isTrailerDialogOpen ? dispatch(closeModal('trailer')) : undefined}
        className='backdrop-blur-[2px]'
      />
      
      <TrailerPlayer isOpen={isTrailerDialogOpen} title={movie?.title ?? ""} yt_trailer_code={movie?.yt_trailer_code} />
      <SummaryDialog isOpen={isSummaryModalOpen} summary={movieSummary} />
      
      {movie && (
        <>
          <CloseButton onClose={handleClose} />
          <CoverImage imageSrc={movie.large_cover_image} />
          <MovieInfoPanel close={handleClose} movie={movie} isLoadingSubtitles={isLoadingSubtitles} />
          <DialogBackground imgSrc={movie.background_image} />
        </>
      )}
    </Dialog>
  )
}

export default MovieDialog;