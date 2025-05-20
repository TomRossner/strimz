// import React, { useEffect, useMemo, useState } from 'react';
// import '@vidstack/react/player/styles/base.css';
// import '@vidstack/react/player/styles/plyr/theme.css';
// import { MediaPlayer, MediaProvider, Poster, Time, Track } from '@vidstack/react';
// import { PlyrLayout, plyrLayoutIcons } from '@vidstack/react/player/layouts/plyr';
// import { useSearchParams } from 'react-router-dom';
// import Page from './Page';
// import BackButton from './BackButton';
// import Container from './Container';
// import { useAppDispatch, useAppSelector } from '@/store/hooks';
// import { openModal } from '@/store/modals/modals.slice';
// import LoadingIcon from './LoadingIcon';
// import Progress from './Progress';
// import { selectSubtitleFilePath, selectSubtitleLang } from '@/store/movies/movies.selectors';
// import { getFileExtension } from '@/utils/getFileExtension';
// import { getSubtitleMetadata } from '@/utils/detectLanguage';
// import { selectSocket } from '@/store/socket/socket.selectors';
// import { DownloadProgressData } from '@/utils/types';

// interface Props {
//     movieSrc: string;
// }

// type CaptionsFileFormat = "vtt" | "srt" | "ssa" | "ass" | "json" | undefined;

// const VidStackPlayer = ({movieSrc}: Props) => {
//     const [searchParams] = useSearchParams();
//     const hash = searchParams.get('hash');
//     const dispatch = useAppDispatch();
//     const [isPlayable, setIsPlaying] = useState<boolean>(false);

//     const [subtitleBlobUrl, setSubtitleBlobUrl] = useState<string | null>(null);
//     const subtitleFilePath = useAppSelector(selectSubtitleFilePath);
//     const subtitleLang = useAppSelector(selectSubtitleLang);

//     const { label, lang } = useMemo(() => getSubtitleMetadata(subtitleLang as string), [subtitleLang]);

//     const socket = useAppSelector(selectSocket);

//     useEffect(() => {
//         if (!subtitleFilePath) {
//             setSubtitleBlobUrl(null);
//             return;
//         }

//         const loadSubtitle = async () => {
//             const content = await window.electronAPI.readSubtitleFile(subtitleFilePath as string);

//             if (content) {
//                 const ext = getFileExtension(subtitleFilePath as string);
//                 const mimeType = ext === 'vtt' ? 'text/vtt' : 'text/plain';
//                 const blob = new Blob([content], { type: mimeType });
//                 const url = URL.createObjectURL(blob);

//                 setSubtitleBlobUrl(url);
//             } else {
//                 setSubtitleBlobUrl(null);
//             }
//         }

//         loadSubtitle();

//         return () => {
//             if (subtitleBlobUrl) {
//                 URL.revokeObjectURL(subtitleBlobUrl);
//                 setSubtitleBlobUrl(null);
//             }
//         }
//     }, [subtitleFilePath]);

//     const [bufferWidth, setBufferWidth] = useState<number>(0);

//     useEffect(() => {
//       if (!socket?.id || !hash) return;

//       socket.on('downloadProgress', (data: DownloadProgressData) => {
//         if (data.hash.toLowerCase() === hash.toLowerCase()) {
//             setBufferWidth(Number((data.progress * 100).toFixed(2)));;
//         }
//       })
//     }, [socket, hash]);

//   return (
//     <Page>
//       <Container id="watchMovie" className="min-h-0 max-h-[100vh] overflow-hidden grow">
//         <BackButton className="absolute top-1 left-1 z-20" cb={() => dispatch(openModal('movie'))} />

//         <MediaPlayer
//           src={{ src: movieSrc, type: 'video/mp4' }}
//           autoPlay
//           viewType="video"
//           title={searchParams.get('title') as string}
//           style={{ height: '90vh' }}
//           onPlay={() => setIsPlaying(true)}
//         >
//           <MediaProvider>
//             {!isPlayable && (
//               <Poster
//                 className="media-poster"
//                 src={searchParams.get('poster') as string}
//               />
//             )}

//             {subtitleBlobUrl && (
//                 <Track
//                     src={subtitleBlobUrl}
//                     kind="subtitles"
//                     label={label}
//                     lang={lang}
//                     type={getFileExtension(subtitleFilePath as string) as CaptionsFileFormat}
//                     default
//                 />
//             )}
//           </MediaProvider>

//           <PlyrLayout
//             displayDuration            
//             title={searchParams.get('title') as string}
//             icons={plyrLayoutIcons}
//           >
//             <Time type='buffered' />
//           </PlyrLayout>

//           <div className='absolute bottom-7 w-[66%] h-1.5 bg-stone-700 left-14'>
//             <div className='h-full bg-blue-500' style={{width: `${bufferWidth}%`}}></div>
//           </div>

//           {!isPlayable && (
//             <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
//               <div className="flex relative items-center justify-center bg-stone-900 rounded-full aspect-square z-30">
//                 <Progress progressOnly hash={searchParams.get('hash') as string} />
//                 <LoadingIcon size={70} />
//               </div>
//             </div>
//           )}

//           <div className="absolute top-10 left-4 z-20 bg-black/50 text-white p-2 rounded">
//             Buffered: <Time type="buffered" />
//           </div>
//         </MediaPlayer>
//       </Container>
//     </Page>
//   );
// }

// export default VidStackPlayer;