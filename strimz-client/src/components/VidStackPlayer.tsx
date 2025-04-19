import React from 'react';
import '@vidstack/react/player/styles/base.css';
import '@vidstack/react/player/styles/plyr/theme.css';
import { MediaPlayer, MediaProvider, Poster } from '@vidstack/react';
import { PlyrLayout, plyrLayoutIcons } from '@vidstack/react/player/layouts/plyr';
import { useSearchParams } from 'react-router-dom';
import Page from './Page';
import BackButton from './BackButton';
import Container from './Container';
import { useAppDispatch } from '@/store/hooks';
import { openModal } from '@/store/modals/modals.slice';

interface Props {
    movieSrc: string;
}

const VidStackPlayer = ({movieSrc}: Props) => {
    const [searchParams] = useSearchParams();
    const dispatch = useAppDispatch();

  return (
    <Page>
        <Container id='watchMovie' className='min-h-0 max-h-[100vh] overflow-hidden grow'>
            <BackButton className='absolute top-1 left-1 z-20' cb={() => dispatch(openModal('movie'))} />
            
            <MediaPlayer
                src={{
                    src: movieSrc,
                    type: 'video/mp4'
                }}
                autoPlay
                viewType='video'
                title={searchParams.get('title') as string}
                style={{height: '90vh'}}
            >
                <MediaProvider>
                    <Poster
                        className="media-poster"
                        src={searchParams.get('poster') as string}
                    />
                </MediaProvider>

                <PlyrLayout
                    displayDuration
                    title={searchParams.get('title') as string}
                    icons={plyrLayoutIcons}
                />
            </MediaPlayer>
        </Container>
    </Page>
  )
}

export default VidStackPlayer;